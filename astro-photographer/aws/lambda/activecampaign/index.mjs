// ActiveCampaign lead-capture proxy Lambda (Node.js 20.x).
//
// Single HTTP API route handles both the real submission and the CORS preflight:
//   POST    /ac/subscribe  -> create-or-update AC inquire, subscribe to list, best-effort tags
//   OPTIONS /ac/subscribe  -> 204 preflight
//
// Design: ../../.agents/tasks/activecampaign-aws/design.md §1.
//
// Dependencies are injected (the `deps` arg of `handler`) so the unit test can
// run fully offline with a mocked `fetch` and `getSecret`. Defaults are the Node
// 20 global `fetch` and an @aws-sdk/client-secrets-manager read of AC_SECRET_ARN.

const PLACEHOLDER_SECRET = 'REPLACE_ME';

// ---------------------------------------------------------------------------
// Secret handling (§1.8). The SecretString is used verbatim as the API token
// (bare string, no JSON parse). Cached module-scope for the warm container.
// ---------------------------------------------------------------------------
let cachedSecret;

async function defaultGetSecret() {
  if (cachedSecret !== undefined) return cachedSecret;
  const arn = process.env.AC_SECRET_ARN;
  if (!arn) throw new Error('AC_SECRET_ARN not set');
  // Imported lazily so the module loads in tests without the AWS SDK on the path.
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({});
  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  cachedSecret = res.SecretString ?? '';
  return cachedSecret;
}

// ---------------------------------------------------------------------------
// CORS (§1.6). Attached to every response, including errors and the OPTIONS 204.
// ---------------------------------------------------------------------------
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(bodyObj),
  };
}

// Native (no-JS form) path responses (§1.1). Success/failure are serialized as a
// 303 redirect when CONTACT_SUCCESS_URL is set, else a minimal inline HTML body.
function nativeResponse(ok, errorCode, enhancedStatus) {
  const base = process.env.CONTACT_SUCCESS_URL;
  if (base) {
    const location = ok ? `${base}?sent=1` : `${base}?sent=0&error=${encodeURIComponent(errorCode)}`;
    return { statusCode: 303, headers: { Location: location, ...corsHeaders() }, body: '' };
  }
  // No redirect target configured: return a minimal self-contained HTML page so
  // the no-JS visitor never sees raw JSON. Status mirrors the enhanced contract.
  if (ok) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
      body: '<!doctype html><title>Thank you</title><p>Thanks — your message was sent.</p>',
    };
  }
  return {
    statusCode: enhancedStatus,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
    body: `<!doctype html><title>Something went wrong</title><p>Please try again. (code: ${errorCode})</p>`,
  };
}

// ---------------------------------------------------------------------------
// Logging (§1.7). Never log the key/token or full PII — email domain only.
// ---------------------------------------------------------------------------
function emailDomain(email) {
  const at = typeof email === 'string' ? email.indexOf('@') : -1;
  return at >= 0 ? `***@${email.slice(at + 1)}` : '***';
}

// ---------------------------------------------------------------------------
// Body parsing — accept JSON and application/x-www-form-urlencoded (§1.1).
// Returns { fields, mode } where mode is 'json' | 'native'.
// Throws 'bad_json' when neither parse succeeds for a JSON content type.
// ---------------------------------------------------------------------------
function parseBody(event) {
  const headers = lowerCaseHeaders(event.headers);
  const contentType = headers['content-type'] || '';
  let raw = event.body || '';
  if (event.isBase64Encoded && raw) {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }

  const isJson = contentType.includes('application/json');
  if (isJson) {
    try {
      return { fields: raw ? JSON.parse(raw) : {}, mode: 'json' };
    } catch {
      // Fall through to a form parse; if that also fails it is bad_json.
      const form = tryParseForm(raw);
      if (form) return { fields: form, mode: 'json' };
      throw new Error('bad_json');
    }
  }

  // Non-JSON content type -> native form path.
  const form = tryParseForm(raw);
  return { fields: form || {}, mode: 'native' };
}

function tryParseForm(raw) {
  if (!raw) return {};
  try {
    const params = new URLSearchParams(raw);
    const obj = {};
    for (const [k, v] of params) obj[k] = v;
    return obj;
  } catch {
    return null;
  }
}

function lowerCaseHeaders(headers) {
  const out = {};
  if (headers) {
    for (const [k, v] of Object.entries(headers)) out[k.toLowerCase()] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation (§1.2). Order: email -> first -> last. Returns { ok, error, data }.
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
}

function truncate(v, max) {
  const s = str(v);
  return s.length > max ? s.slice(0, max) : s;
}

// Split a single full-name string into { first, last } on the first space.
// A single word fills both parts (AC's lastName is effectively required for
// clean dedupe/greetings). Returns null for an empty input.
function splitName(full) {
  const s = str(full);
  if (!s) return null;
  const idx = s.indexOf(' ');
  if (idx === -1) return { first: s, last: s };
  return { first: s.slice(0, idx).trim(), last: s.slice(idx + 1).trim() };
}

// Derive first/last from whatever a form sent. Priority:
//   1. explicit first/last (muse inquire)
//   2. a single full-name field split on the first space:
//        name    -> weddings inquire
//        bride   -> engagement giveaway
// This lets every form post its own natural field names while AC always
// receives firstName/lastName. Returns { first, last } (either may be '').
function deriveName(fields) {
  const first = str(fields.first);
  const last = str(fields.last);
  if (first || last) return { first, last };
  const fromFull = splitName(fields.name) || splitName(fields.bride);
  return fromFull || { first: '', last: '' };
}

function validate(fields, log) {
  const email = str(fields.email);
  const { first, last } = deriveName(fields);

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }
  if (!first) return { ok: false, error: 'missing_first' };
  if (first.length > 100) {
    log.warn('field truncated: first');
  }
  if (!last) return { ok: false, error: 'missing_last' };

  const data = {
    email,
    first: truncate(first, 100),
    last: truncate(last, 100),
    phone: truncate(fields.phone, 40),
    reason: truncate(fields.reason, 5000),
    more: truncate(fields.more, 5000),
    feel: truncate(fields.feel, 5000),
    hear: truncate(fields.hear, 5000),
  };
  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// fieldValues (§1.4): include a pair only when its AC_FIELD_* env id is set.
// ---------------------------------------------------------------------------
function buildFieldValues(data) {
  const map = [
    [process.env.AC_FIELD_REASON, data.reason],
    [process.env.AC_FIELD_MORE, data.more],
    [process.env.AC_FIELD_FEEL, data.feel],
    [process.env.AC_FIELD_HEAR, data.hear],
  ];
  const out = [];
  for (const [fieldId, value] of map) {
    if (fieldId) out.push({ field: fieldId, value: value ?? '' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// List selection. Forms may send a SYMBOLIC key (e.g. "giveaway") to subscribe
// the contact to a segmented list. The key is allowlisted against configured
// env vars — never the raw list id — so a visitor cannot inject an arbitrary
// AC list. Unknown/absent keys fall back to the default AC_LIST_ID.
//   list=giveaway -> AC_LIST_ID_GIVEAWAY (the engagement-giveaway list)
//   list=weddings -> AC_LIST_ID_WEDDINGS (wedding inquiries)
//   (anything else / absent) -> AC_LIST_ID
// A mapped-but-unconfigured key also falls back to the default, so the site
// never fails closed on a list that hasn't been set up yet.
function resolveListId(listKey) {
  const key = typeof listKey === 'string' ? listKey.trim().toLowerCase() : '';
  const map = {
    giveaway: process.env.AC_LIST_ID_GIVEAWAY,
    weddings: process.env.AC_LIST_ID_WEDDINGS,
  };
  return map[key] || process.env.AC_LIST_ID;
}

// ---------------------------------------------------------------------------
// ActiveCampaign v3 calls (§1.3). Each is a single fetch.
// Returns a classification: 'ok' | 'client' (4xx) | 'server' (>=5xx/network).
// ---------------------------------------------------------------------------
async function acCall(fetchImpl, url, token, bodyObj) {
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Api-Token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(bodyObj),
    });
  } catch (err) {
    return { kind: 'server', status: 0, err };
  }
  const status = res.status;
  let json;
  let text = '';
  try {
    text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (status >= 200 && status < 300) return { kind: 'ok', status, json };
  if (status >= 400 && status < 500) return { kind: 'client', status, json, snippet: text.slice(0, 500) };
  return { kind: 'server', status, json, snippet: text.slice(0, 500) };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler = async (event = {}, context = {}, deps = {}) => {
  const fetchImpl = deps.fetch || globalThis.fetch;
  const getSecret = deps.getSecret || defaultGetSecret;
  const log = deps.log || console;

  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    'POST';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (method !== 'POST') {
    log.info?.(`method_not_allowed: ${method}`);
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  const respond = (responseMode, status, errorCode, okBody) => {
    if (responseMode === 'native') {
      return nativeResponse(status >= 200 && status < 300, errorCode, status);
    }
    return jsonResponse(status, okBody || { ok: false, error: errorCode });
  };

  // Parse body (determines response mode).
  let fields;
  let mode;
  try {
    ({ fields, mode } = parseBody(event));
  } catch (err) {
    log.error?.('bad_json');
    return respond(detectModeOnParseError(event), 400, 'bad_json');
  }

  // Validate.
  const v = validate(fields, { warn: (m) => log.warn?.(m) });
  if (!v.ok) {
    log.info?.(`validation_failed: ${v.error} (${emailDomain(fields.email)})`);
    return respond(mode, 400, v.error);
  }
  const data = v.data;

  // Resolve secret / config.
  let token;
  try {
    token = await getSecret();
  } catch (err) {
    log.error?.('secret read failed');
    return respond(mode, 500, 'server_misconfigured');
  }
  if (!token || token === PLACEHOLDER_SECRET) {
    log.error?.('secret missing or placeholder');
    return respond(mode, 500, 'server_misconfigured');
  }
  const apiUrl = process.env.AC_API_URL;
  const listId = resolveListId(fields.list);
  if (!apiUrl || !listId) {
    log.error?.('AC_API_URL or AC_LIST_ID not set');
    return respond(mode, 500, 'server_misconfigured');
  }
  const base = apiUrl.replace(/\/+$/, '');

  // (a) inquire/sync — create-or-update, dedupe on email.
  const contactBody = {
    inquire: {
      email: data.email,
      firstName: data.first,
      lastName: data.last,
      fieldValues: buildFieldValues(data),
    },
  };
  if (data.phone) contactBody.inquire.phone = data.phone;

  const sync = await acCall(fetchImpl, `${base}/api/3/inquire/sync`, token, contactBody);
  log.info?.(`inquire/sync: ${sync.status} (${emailDomain(data.email)})`);
  if (sync.kind === 'client') {
    log.error?.(`inquire/sync 4xx ${sync.status}: ${sync.snippet || ''}`);
    return respond(mode, 502, 'ac_error');
  }
  if (sync.kind === 'server') {
    log.error?.(`inquire/sync unavailable ${sync.status}: ${sync.snippet || ''}`);
    return respond(mode, 502, 'ac_unavailable');
  }
  const contactId = sync.json?.inquire?.id != null ? String(sync.json.inquire.id) : '';
  if (!contactId) {
    log.error?.('inquire/sync 2xx without inquire.id');
    return respond(mode, 502, 'ac_no_contact_id');
  }

  // (b) contactLists — subscribe (status 1). Required; body uninspected.
  const listRes = await acCall(fetchImpl, `${base}/api/3/contactLists`, token, {
    contactList: { list: listId, inquire: contactId, status: 1 },
  });
  log.info?.(`contactLists: ${listRes.status}`);
  if (listRes.kind === 'client') {
    log.error?.(`contactLists 4xx ${listRes.status}: ${listRes.snippet || ''}`);
    return respond(mode, 502, 'ac_error');
  }
  if (listRes.kind === 'server') {
    log.error?.(`contactLists unavailable ${listRes.status}: ${listRes.snippet || ''}`);
    return respond(mode, 502, 'ac_unavailable');
  }

  // (c) tags — best-effort, failures swallowed (WARN).
  const tags = (process.env.AC_TAGS || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  for (const tagId of tags) {
    const tagRes = await acCall(fetchImpl, `${base}/api/3/contactTags`, token, {
      contactTag: { inquire: contactId, tag: tagId },
    });
    if (tagRes.kind !== 'ok') {
      log.warn?.(`tag ${tagId} failed: ${tagRes.status}`);
    }
  }

  return respond(mode, 200, null, { ok: true });
};

// Best-effort mode detection when the body never parsed (bad_json): a JSON
// content type means the enhanced path; otherwise native.
function detectModeOnParseError(event) {
  const headers = lowerCaseHeaders(event.headers);
  const contentType = headers['content-type'] || '';
  return contentType.includes('application/json') ? 'json' : 'native';
}

// Exported for unit tests (DI seam + cache reset).
export const _internal = {
  defaultGetSecret,
  resetSecretCache() {
    cachedSecret = undefined;
  },
  validate,
  buildFieldValues,
  parseBody,
  resolveListId,
  splitName,
  deriveName,
};
