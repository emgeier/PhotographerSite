// Offline unit tests for the Love Story Lambda.
// Run via: npm run test:lambda  (node --test aws/lambda/lovestory/)
// No network, no AWS or Anthropic credentials.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handler, validate, buildEmail, _internal } from './index.mjs';

const silentLog = { info() {}, warn() {}, error() {} };
const ENV_KEYS = ['LOVESTORY_TO_EMAIL', 'LOVESTORY_FROM_EMAIL', 'LLM_ENABLED', 'LLM_MODEL', 'CORS_ALLOW_ORIGIN'];
const saved = {};
for (const k of ENV_KEYS) saved[k] = process.env[k];
beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.LOVESTORY_TO_EMAIL = 'reviewer@example.test';
  process.env.LOVESTORY_FROM_EMAIL = 'sender@example.test';
  _internal.resetKeyCache();
});

const VALID = { type: 'engagement', names: 'Alex & Jordan', email: 'aj@example.com', q01: 'We met at a cafe.', q04: 'On a hill.', permission: 'on', website: '' };
const ev = (body, method = 'POST') => ({
  requestContext: { http: { method } },
  headers: { 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
function mailer() {
  const sent = [];
  const fn = async (m) => { sent.push(m); };
  fn.sent = sent;
  return fn;
}

test('OPTIONS returns 204 with CORS', async () => {
  const r = await handler(ev('', 'OPTIONS'), {}, { log: silentLog });
  assert.equal(r.statusCode, 204);
  assert.ok(r.headers['Access-Control-Allow-Origin']);
});

test('non-POST is 405', async () => {
  const r = await handler(ev('', 'GET'), {}, { log: silentLog });
  assert.equal(r.statusCode, 405);
});

test('valid submission emails raw answers, recipient/sender from env, no LLM by default', async () => {
  const sendEmail = mailer();
  const fetchSpy = async () => { throw new Error('must not call LLM'); };
  const r = await handler(ev(VALID), {}, { sendEmail, fetch: fetchSpy, log: silentLog });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(JSON.parse(r.body), { ok: true });
  assert.equal(sendEmail.sent.length, 1);
  const m = sendEmail.sent[0];
  assert.equal(m.to, 'reviewer@example.test');
  assert.equal(m.from, 'sender@example.test');
  assert.equal(m.replyTo, 'aj@example.com');
  assert.match(m.text, /We met at a cafe\./);
  assert.match(m.text, /Permission to share \(optional\): YES/);
  assert.doesNotMatch(m.text, /AI DRAFT/);
});

test('honeypot filled: 200 but nothing sent', async () => {
  const sendEmail = mailer();
  const r = await handler(ev({ ...VALID, website: 'http://spam' }), {}, { sendEmail, log: silentLog });
  assert.equal(r.statusCode, 200);
  assert.equal(sendEmail.sent.length, 0);
});

test('validation errors', () => {
  assert.equal(validate({ ...VALID, type: 'nope' }).error, 'invalid_type');
  assert.equal(validate({ ...VALID, names: '  ' }).error, 'missing_names');
  assert.equal(validate({ ...VALID, email: 'bad' }).error, 'invalid_email');
  assert.equal(validate({ type: 'wedding', names: 'A', email: 'a@b.co' }).error, 'missing_answers');
  assert.equal(validate(null).error, 'bad_request');
});

test('sanitizes: strips control chars, newlines in single-line fields, caps length', () => {
  const v = validate({ ...VALID, names: 'Al\r\nBcc: x@y.z\u0000', q01: 'a'.repeat(5000) + '\u0007' });
  assert.equal(v.ok, true);
  assert.doesNotMatch(v.data.names, /[\r\n\u0000]/);
  assert.equal(v.data.answers[0].answer.length, 2000);
});

test('unknown extra fields are ignored; questions come from the server allowlist', () => {
  const v = validate({ ...VALID, q99: 'x', question01: 'injected' });
  assert.equal(v.ok, true);
  assert.equal(v.data.answers.length, 10);
  assert.doesNotMatch(JSON.stringify(v.data), /injected/);
});

test('CMS-edited question text is used, sanitized, capped, and extra questions are kept', () => {
  const v = validate({
    ...VALID,
    q01_text: 'A new first question?\r\nBcc: x@y.z\u0000',
    q12: 'answer to an added question',
    q12_text: 'Added in the CMS?',
    q13_text: 'q'.repeat(900),
    q99_text: 'ignored',
  });
  assert.equal(v.ok, true);
  const a = v.data.answers;
  assert.equal(a[0].question, 'A new first question? Bcc: x@y.z');
  assert.doesNotMatch(a[0].question, /[\r\n\u0000]/);
  // q11 has neither text nor answer and is past the defaults, so it is skipped.
  assert.equal(a[10].question, 'Added in the CMS?');
  assert.equal(a[10].answer, 'answer to an added question');
  assert.equal(a[11].question.length, 300);
  assert.equal(a.length, 12);
  assert.doesNotMatch(JSON.stringify(a), /ignored/);
});

test('oversized body is 413 and bad JSON is 400', async () => {
  const sendEmail = mailer();
  const big = await handler(ev(JSON.stringify({ ...VALID, q02: 'x'.repeat(40000) })), {}, { sendEmail, log: silentLog });
  assert.equal(big.statusCode, 413);
  const bad = await handler(ev('{nope'), {}, { sendEmail, log: silentLog });
  assert.equal(bad.statusCode, 400);
  assert.equal(sendEmail.sent.length, 0);
});

test('missing env config is 500', async () => {
  delete process.env.LOVESTORY_TO_EMAIL;
  const r = await handler(ev(VALID), {}, { sendEmail: mailer(), log: silentLog });
  assert.equal(r.statusCode, 500);
});

test('SES failure is 502', async () => {
  const sendEmail = async () => { throw new Error('MessageRejected'); };
  const r = await handler(ev(VALID), {}, { sendEmail, log: silentLog });
  assert.equal(r.statusCode, 502);
  assert.equal(JSON.parse(r.body).error, 'email_failed');
});

test('LLM_ENABLED=true: draft is appended to the email, key from getSecret, labelled unpublished', async () => {
  process.env.LLM_ENABLED = 'true';
  const sendEmail = mailer();
  const calls = [];
  const fetchMock = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'DRAFT TEXT' }] }) };
  };
  const r = await handler(ev(VALID), {}, { sendEmail, fetch: fetchMock, getSecret: async () => 'sk-test', log: silentLog });
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].opts.headers['x-api-key'], 'sk-test');
  assert.match(calls[0].body.messages[0].content, /<answers>/);
  assert.match(sendEmail.sent[0].text, /AI DRAFT \(NOT PUBLISHED/);
  assert.match(sendEmail.sent[0].text, /DRAFT TEXT/);
  assert.match(sendEmail.sent[0].text, /We met at a cafe\./);
});

test('LLM failure still emails the raw answers', async () => {
  process.env.LLM_ENABLED = 'true';
  const sendEmail = mailer();
  const fetchMock = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const r = await handler(ev(VALID), {}, { sendEmail, fetch: fetchMock, getSecret: async () => 'sk-test', log: silentLog });
  assert.equal(r.statusCode, 200);
  assert.equal(sendEmail.sent.length, 1);
  assert.match(sendEmail.sent[0].text, /draft unavailable/);
});

test('LLM placeholder secret is treated as missing', async () => {
  process.env.LLM_ENABLED = 'true';
  const sendEmail = mailer();
  const r = await handler(ev(VALID), {}, { sendEmail, fetch: async () => { throw new Error('no'); }, getSecret: async () => 'REPLACE_ME', log: silentLog });
  assert.equal(r.statusCode, 200);
  assert.match(sendEmail.sent[0].text, /draft unavailable/);
});

test('buildEmail wedding label', () => {
  const v = validate({ ...VALID, type: 'wedding' });
  assert.match(buildEmail(v.data).subject, /^Wedding love story/);
});
