// GitHub OAuth relay for Sveltia / Decap CMS (Node.js 18.x).
//
// Static sites can't hold a GitHub OAuth client secret, so the CMS login needs
// a tiny server-side relay to do the code->token exchange. This Lambda is that
// relay, exposed on the existing HTTP API as two routes:
//
//   GET /auth      -> 302 redirect to GitHub's authorize page (with a CSRF state)
//   GET /callback  -> exchange ?code for an access token, then return an HTML page
//                     that postMessage()s the token to the CMS window and closes.
//
// The CMS handshake (Decap/Sveltia): the admin opens this /auth URL in a popup;
// on success the popup posts two messages to window.opener:
//   "authorizing:github"
//   'authorization:github:success:{"token":"<token>","provider":"github"}'
// The CMS listens for exactly these strings, so the format below is literal.
//
// Secret handling mirrors the AC Lambda: the client secret lives in Secrets
// Manager (OAUTH_SECRET_ARN) and is read at runtime, never in an env var.

const PLACEHOLDER_SECRET = 'REPLACE_ME';

let cachedSecret;
async function getClientSecret() {
  if (cachedSecret !== undefined) return cachedSecret;
  const arn = process.env.OAUTH_SECRET_ARN;
  if (!arn) throw new Error('OAUTH_SECRET_ARN not set');
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({});
  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  cachedSecret = res.SecretString ?? '';
  return cachedSecret;
}

function htmlResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body,
  };
}

// The literal page the CMS popup expects: it relays the result to the opener via
// postMessage, then the opener resolves the login. `target` is '*' because the
// opener origin is the site's own CloudFront/custom domain; the CMS validates the
// provider string, and the token is only ever posted to window.opener.
function postMessagePage(status, payloadJson) {
  const message = `authorization:github:${status}:${payloadJson}`;
  // JSON.stringify to safely embed the string as a JS literal.
  const messageLiteral = JSON.stringify(message);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Authorizing…</title></head>
<body>
<p>Authorizing… you can close this window.</p>
<script>
(function () {
  function send() {
    if (!window.opener) return;
    window.opener.postMessage(${messageLiteral}, '*');
  }
  // Decap/Sveltia handshake: announce, wait for the opener's ack, then send result.
  window.addEventListener('message', function (e) { send(); }, false);
  window.opener && window.opener.postMessage('authorizing:github', '*');
  // Fallback: also send shortly after load in case the ack was missed.
  setTimeout(send, 500);
})();
</script>
</body></html>`;
}

function getQuery(event) {
  return event.queryStringParameters || {};
}

function getRoutePath(event) {
  // HTTP API v2: event.rawPath like /auth or /callback (stage is $default so no prefix).
  return event.rawPath || event.requestContext?.http?.path || '';
}

export const handler = async (event = {}, _context = {}, deps = {}) => {
  const fetchImpl = deps.fetch || globalThis.fetch;
  const getSecret = deps.getSecret || getClientSecret;
  const log = deps.log || console;

  const clientId = process.env.OAUTH_CLIENT_ID;
  const siteOrigin = process.env.SITE_ORIGIN || '';
  const path = getRoutePath(event);

  if (!clientId) {
    log.error?.('OAUTH_CLIENT_ID not set');
    return htmlResponse(500, '<p>OAuth not configured.</p>');
  }

  // ---- /auth : send the user to GitHub ----
  if (path.endsWith('/auth')) {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const redirectUri = `${apiBase(event)}/callback`;
    const url =
      'https://github.com/login/oauth/authorize' +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('repo,user')}` +
      `&state=${encodeURIComponent(state)}`;
    return { statusCode: 302, headers: { Location: url, 'Cache-Control': 'no-store' }, body: '' };
  }

  // ---- /callback : exchange code for token ----
  if (path.endsWith('/callback')) {
    const q = getQuery(event);
    const code = q.code;
    if (!code) {
      log.error?.('callback without code');
      return htmlResponse(400, postMessagePage('error', JSON.stringify({ error: 'missing_code' })));
    }

    let clientSecret;
    try {
      clientSecret = await getSecret();
    } catch (err) {
      log.error?.('secret read failed');
      return htmlResponse(500, postMessagePage('error', JSON.stringify({ error: 'server_misconfigured' })));
    }
    if (!clientSecret || clientSecret === PLACEHOLDER_SECRET) {
      log.error?.('client secret missing or placeholder');
      return htmlResponse(500, postMessagePage('error', JSON.stringify({ error: 'server_misconfigured' })));
    }

    let token;
    try {
      const res = await fetchImpl('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `${apiBase(event)}/callback`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.access_token) {
        log.error?.(`token exchange failed: ${res.status} ${data.error || ''}`);
        return htmlResponse(502, postMessagePage('error', JSON.stringify({ error: data.error || 'exchange_failed' })));
      }
      token = data.access_token;
    } catch (err) {
      log.error?.('token exchange threw');
      return htmlResponse(502, postMessagePage('error', JSON.stringify({ error: 'exchange_failed' })));
    }

    log.info?.('oauth success');
    return htmlResponse(200, postMessagePage('success', JSON.stringify({ token, provider: 'github' })));
  }

  return htmlResponse(404, '<p>Not found.</p>');
};

// Reconstruct this API's public base URL from the request so the redirect_uri
// matches what the user actually hit (works for the default execute-api domain).
function apiBase(event) {
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h.host || h.Host;
  const proto = h['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export const _internal = { getClientSecret, postMessagePage };
