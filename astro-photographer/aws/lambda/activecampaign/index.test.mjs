// Offline unit tests for the ActiveCampaign proxy Lambda.
// Run via: npm run test:lambda  (node --test aws/lambda/activecampaign/)
// No network, no AWS/AC credentials, no third-party deps.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handler, _internal } from './index.mjs';

// --- Helpers ---------------------------------------------------------------

const SECRET = 'test-api-token';

function makeEvent({ method = 'POST', contentType = 'application/json', body = '', isBase64Encoded = false, headers = {} } = {}) {
  return {
    requestContext: { http: { method } },
    headers: { 'content-type': contentType, ...headers },
    body,
    isBase64Encoded,
  };
}

const VALID_FIELDS = {
  first: 'Heather',
  last: 'Jones',
  email: 'heather@example.com',
  phone: '(123) 456-7890',
  reason: 'A new chapter',
  more: 'Some details',
  feel: 'Confident',
  hear: 'Instagram',
};

// A fetch mock that records calls and returns scripted responses in order
// (or by a per-URL matcher). Each response: { status, json }.
function mockFetch(scripts) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts, body: opts && opts.body ? JSON.parse(opts.body) : undefined });
    const script = typeof scripts === 'function' ? scripts(url, calls.length - 1) : scripts[calls.length - 1];
    if (!script) throw new Error(`no scripted response for call ${calls.length} ${url}`);
    if (script.networkError) throw new Error('network down');
    return {
      status: script.status,
      async text() {
        return script.json !== undefined ? JSON.stringify(script.json) : '';
      },
    };
  };
  fn.calls = calls;
  return fn;
}

const silentLog = { info() {}, warn() {}, error() {} };

// Clean env between tests so one test's config can't leak into another.
const SAVED_ENV = {};
const ENV_KEYS = [
  'AC_API_URL', 'AC_LIST_ID', 'AC_LIST_ID_GIVEAWAY', 'AC_LIST_ID_WEDDINGS', 'AC_TAGS',
  'AC_FIELD_REASON', 'AC_FIELD_MORE', 'AC_FIELD_FEEL', 'AC_FIELD_HEAR',
  'CORS_ALLOW_ORIGIN', 'CONTACT_SUCCESS_URL',
];

beforeEach(() => {
  for (const k of ENV_KEYS) {
    SAVED_ENV[k] = process.env[k];
    delete process.env[k];
  }
  // Baseline config for the happy path; individual tests override.
  process.env.AC_API_URL = 'https://acct.api-us1.com';
  process.env.AC_LIST_ID = '7';
});

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (SAVED_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED_ENV[k];
  }
}

// --- Case 1: happy path ----------------------------------------------------

test('happy path: inquire/sync then contactLists, returns 200 {ok:true}', async () => {
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } }, // inquire/sync
    { status: 200, json: {} }, // contactLists
  ]);
  const res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });

  // Correct call order + URLs.
  assert.equal(fetchMock.calls.length, 2);
  assert.match(fetchMock.calls[0].url, /\/api\/3\/inquire\/sync$/);
  assert.match(fetchMock.calls[1].url, /\/api\/3\/contactLists$/);

  // inquire/sync body carries standard fields + phone.
  const syncBody = fetchMock.calls[0].body;
  assert.equal(syncBody.inquire.email, 'heather@example.com');
  assert.equal(syncBody.inquire.firstName, 'Heather');
  assert.equal(syncBody.inquire.lastName, 'Jones');
  assert.equal(syncBody.inquire.phone, '(123) 456-7890');

  // Api-Token header present (and equals the injected secret).
  assert.equal(fetchMock.calls[0].opts.headers['Api-Token'], SECRET);

  // contactLists body: status 1, list id, inquire id (coerced to string).
  const listBody = fetchMock.calls[1].body;
  assert.deepEqual(listBody.contactList, { list: '7', inquire: '42', status: 1 });

  restoreEnv();
});

// --- Case 2: AC error on a required call -----------------------------------

test('AC 4xx on inquire/sync -> 502 ac_error', async () => {
  const fetchMock = mockFetch([{ status: 422, json: { errors: [{ title: 'bad' }] } }]);
  const res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 502);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'ac_error' });
  assert.equal(fetchMock.calls.length, 1); // did not proceed to contactLists
  restoreEnv();
});

test('AC 5xx on contactLists -> 502 ac_unavailable', async () => {
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 503, json: {} },
  ]);
  const res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 502);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'ac_unavailable' });
  restoreEnv();
});

// --- Case 3: missing email -> 400, no AC fetch -----------------------------

test('missing email -> 400 invalid_email and no AC call', async () => {
  const fetchMock = mockFetch([]);
  const { email, ...noEmail } = VALID_FIELDS;
  const res = await handler(
    makeEvent({ body: JSON.stringify(noEmail) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'invalid_email' });
  assert.equal(fetchMock.calls.length, 0);
  restoreEnv();
});

// --- Case 4: OPTIONS preflight -> 204 + CORS -------------------------------

test('OPTIONS preflight -> 204 with CORS headers', async () => {
  process.env.CORS_ALLOW_ORIGIN = 'https://d123.cloudfront.net';
  const fetchMock = mockFetch([]);
  const res = await handler(
    makeEvent({ method: 'OPTIONS' }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://d123.cloudfront.net');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  assert.equal(res.headers['Access-Control-Allow-Headers'], 'Content-Type');
  assert.equal(res.headers['Access-Control-Max-Age'], '86400');
  assert.equal(res.headers['Vary'], 'Origin');
  assert.equal(fetchMock.calls.length, 0);
  restoreEnv();
});

// --- Case 5: AC_TAGS with a failing tag call -> still 200 ------------------

test('failing tag call is best-effort -> still 200 {ok:true}', async () => {
  process.env.AC_TAGS = '10, 11';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } }, // sync
    { status: 200, json: {} }, // contactLists
    { status: 500, json: {} }, // tag 10 fails
    { status: 200, json: {} }, // tag 11 ok
  ]);
  const res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
  assert.equal(fetchMock.calls.length, 4);
  assert.match(fetchMock.calls[2].url, /\/api\/3\/contactTags$/);
  assert.deepEqual(fetchMock.calls[2].body.contactTag, { inquire: '42', tag: '10' });
  restoreEnv();
});

// --- Case 6: AC_FIELD_* unset -> fieldValues omitted -----------------------

test('AC_FIELD_* unset -> empty fieldValues; set -> included', async () => {
  // Unset case.
  let fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  let res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(fetchMock.calls[0].body.inquire.fieldValues, []);

  // Set case: two field ids mapped.
  process.env.AC_FIELD_REASON = '1';
  process.env.AC_FIELD_FEEL = '3';
  fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(fetchMock.calls[0].body.inquire.fieldValues, [
    { field: '1', value: 'A new chapter' },
    { field: '3', value: 'Confident' },
  ]);
  restoreEnv();
});

// --- Case 7: native form-encoded POST -> 303 (or HTML when url empty) ------

test('native form POST with CONTACT_SUCCESS_URL -> 303 ?sent=1 on success', async () => {
  process.env.CONTACT_SUCCESS_URL = 'https://d123.cloudfront.net/inquire';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const form = new URLSearchParams(VALID_FIELDS).toString();
  const res = await handler(
    makeEvent({ contentType: 'application/x-www-form-urlencoded', body: form }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 303);
  assert.equal(res.headers.Location, 'https://d123.cloudfront.net/inquire?sent=1');
  restoreEnv();
});

test('native form POST with CONTACT_SUCCESS_URL -> 303 ?sent=0&error on failure', async () => {
  process.env.CONTACT_SUCCESS_URL = 'https://d123.cloudfront.net/inquire';
  const fetchMock = mockFetch([{ status: 422, json: {} }]);
  const form = new URLSearchParams(VALID_FIELDS).toString();
  const res = await handler(
    makeEvent({ contentType: 'application/x-www-form-urlencoded', body: form }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 303);
  assert.equal(res.headers.Location, 'https://d123.cloudfront.net/inquire?sent=0&error=ac_error');
  restoreEnv();
});

test('native form POST with CONTACT_SUCCESS_URL empty -> text/html body', async () => {
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const form = new URLSearchParams(VALID_FIELDS).toString();
  const res = await handler(
    makeEvent({ contentType: 'application/x-www-form-urlencoded', body: form }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['Content-Type'], /text\/html/);
  assert.match(res.body, /Thanks/);
  restoreEnv();
});

// --- Extra: secret placeholder / method not allowed ------------------------

test('placeholder secret -> 500 server_misconfigured', async () => {
  const fetchMock = mockFetch([]);
  const res = await handler(
    makeEvent({ body: JSON.stringify(VALID_FIELDS) }),
    {},
    { fetch: fetchMock, getSecret: async () => 'REPLACE_ME', log: silentLog }
  );
  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'server_misconfigured' });
  assert.equal(fetchMock.calls.length, 0);
  restoreEnv();
});

test('GET method -> 405 method_not_allowed', async () => {
  const res = await handler(
    makeEvent({ method: 'GET' }),
    {},
    { fetch: mockFetch([]), getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 405);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'method_not_allowed' });
  restoreEnv();
});

test('base64-encoded JSON body is decoded', async () => {
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const b64 = Buffer.from(JSON.stringify(VALID_FIELDS), 'utf8').toString('base64');
  const res = await handler(
    makeEvent({ body: b64, isBase64Encoded: true }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
  restoreEnv();
});

// --- Case 8: per-form list override (allowlisted) --------------------------

test('list=giveaway with AC_LIST_ID_GIVEAWAY set -> subscribes to giveaway list', async () => {
  process.env.AC_LIST_ID_GIVEAWAY = '54';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } }, // inquire/sync
    { status: 200, json: {} }, // contactLists
  ]);
  const res = await handler(
    makeEvent({ body: JSON.stringify({ ...VALID_FIELDS, list: 'giveaway' }) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  // contactLists used the giveaway list id (54), not the default (7).
  assert.equal(fetchMock.calls[1].body.contactList.list, '54');
  restoreEnv();
});

test('list=weddings with AC_LIST_ID_WEDDINGS set -> subscribes to weddings list', async () => {
  process.env.AC_LIST_ID_WEDDINGS = '55';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const res = await handler(
    makeEvent({ body: JSON.stringify({ ...VALID_FIELDS, list: 'weddings' }) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(fetchMock.calls[1].body.contactList.list, '55');
  restoreEnv();
});

test('list=giveaway but AC_LIST_ID_GIVEAWAY unset -> falls back to default list', async () => {
  // AC_LIST_ID_GIVEAWAY is deliberately not set (cleared in beforeEach).
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const res = await handler(
    makeEvent({ body: JSON.stringify({ ...VALID_FIELDS, list: 'giveaway' }) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  // No giveaway list configured -> default AC_LIST_ID (7).
  assert.equal(fetchMock.calls[1].body.contactList.list, '7');
  restoreEnv();
});

test('unknown list key -> default list (no open relay to arbitrary lists)', async () => {
  process.env.AC_LIST_ID_GIVEAWAY = '54';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const res = await handler(
    // A tampered/raw value must NOT select an arbitrary list.
    makeEvent({ body: JSON.stringify({ ...VALID_FIELDS, list: '999' }) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(fetchMock.calls[1].body.contactList.list, '7');
  restoreEnv();
});

// --- Case 9: name derivation from per-form full-name fields ----------------
// The muse form sends first/last; weddings sends `name`; giveaway sends `bride`.
// validate()/deriveName must map all of them to AC firstName/lastName.

const { splitName, deriveName } = _internal;

test('splitName: two words, single word, empty', () => {
  assert.deepEqual(splitName('Heather Jones'), { first: 'Heather', last: 'Jones' });
  // Multi-word surname: everything after the first space is the last name.
  assert.deepEqual(splitName('Mary Anne Van Der Berg'), { first: 'Mary', last: 'Anne Van Der Berg' });
  // Single word duplicates into both parts.
  assert.deepEqual(splitName('Cher'), { first: 'Cher', last: 'Cher' });
  // Surrounding whitespace is trimmed.
  assert.deepEqual(splitName('  Heather   Jones  '), { first: 'Heather', last: 'Jones' });
  assert.equal(splitName(''), null);
  assert.equal(splitName(undefined), null);
});

test('deriveName: explicit first/last wins over full-name fields', () => {
  assert.deepEqual(
    deriveName({ first: 'Heather', last: 'Jones', name: 'Ignore Me', bride: 'Ignore Me Too' }),
    { first: 'Heather', last: 'Jones' }
  );
  // first-only is honored (last stays empty, validate() then rejects missing_last).
  assert.deepEqual(deriveName({ first: 'Solo' }), { first: 'Solo', last: '' });
});

test('deriveName: weddings `name` and giveaway `bride` are split', () => {
  assert.deepEqual(deriveName({ name: 'Taylor Rivera' }), { first: 'Taylor', last: 'Rivera' });
  assert.deepEqual(deriveName({ bride: 'Jordan Lee' }), { first: 'Jordan', last: 'Lee' });
  // `name` takes priority over `bride` when both are present.
  assert.deepEqual(deriveName({ name: 'Taylor Rivera', bride: 'Jordan Lee' }), { first: 'Taylor', last: 'Rivera' });
  // nothing provided -> empty parts.
  assert.deepEqual(deriveName({}), { first: '', last: '' });
});

test('end-to-end: weddings form (name/partner) -> AC firstName/lastName', async () => {
  process.env.AC_LIST_ID_WEDDINGS = '55';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const res = await handler(
    makeEvent({
      body: JSON.stringify({
        list: 'weddings',
        name: 'Taylor Rivera',
        partner: 'Sam Rivera',
        email: 'taylor@example.com',
      }),
    }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(fetchMock.calls[0].body.inquire.firstName, 'Taylor');
  assert.equal(fetchMock.calls[0].body.inquire.lastName, 'Rivera');
  assert.equal(fetchMock.calls[1].body.contactList.list, '55');
  restoreEnv();
});

test('end-to-end: giveaway form (bride/groom) -> AC firstName/lastName', async () => {
  process.env.AC_LIST_ID_GIVEAWAY = '54';
  const fetchMock = mockFetch([
    { status: 200, json: { inquire: { id: '42' } } },
    { status: 200, json: {} },
  ]);
  const res = await handler(
    makeEvent({
      body: JSON.stringify({
        list: 'giveaway',
        bride: 'Jordan Lee',
        groom: 'Alex Lee',
        email: 'jordan@example.com',
      }),
    }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(fetchMock.calls[0].body.inquire.firstName, 'Jordan');
  assert.equal(fetchMock.calls[0].body.inquire.lastName, 'Lee');
  assert.equal(fetchMock.calls[1].body.contactList.list, '54');
  restoreEnv();
});

test('no name fields at all -> 400 missing_first, no AC call', async () => {
  const fetchMock = mockFetch([]);
  const res = await handler(
    makeEvent({ body: JSON.stringify({ email: 'nobody@example.com', list: 'weddings' }) }),
    {},
    { fetch: fetchMock, getSecret: async () => SECRET, log: silentLog }
  );
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'missing_first' });
  assert.equal(fetchMock.calls.length, 0);
  restoreEnv();
});
