/* GitHub OAuth step 2 — exchanges the code for a token and hands it to the
   CMS window via the Decap/Sveltia postMessage handshake.
   Env: GH_OAUTH_ID, GH_OAUTH_SECRET. */
module.exports = async (req, res) => {
  const { code, state } = req.query;
  const cookieState = /gh_oauth_state=([a-f0-9]+)/.exec(req.headers.cookie || '');
  if (!code || !state || !cookieState || cookieState[1] !== state) {
    res.status(400).send('OAuth state mismatch — please close this window and try again.');
    return;
  }
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GH_OAUTH_ID,
      client_secret: process.env.GH_OAUTH_SECRET,
      code,
    }),
  });
  const data = await r.json();
  const payload = data.error
    ? `authorization:github:error:${JSON.stringify(data)}`
    : `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`;
  const safe = JSON.stringify(payload).replace(/</g, '\\u003c');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Set-Cookie', 'gh_oauth_state=; Path=/api; Max-Age=0');
  res.send(
    '<!DOCTYPE html><html><body><script>' +
    '(function () {' +
    '  function receiveMessage(e) {' +
    `    window.opener.postMessage(${safe}, e.origin);` +
    '    window.removeEventListener("message", receiveMessage, false);' +
    '  }' +
    '  window.addEventListener("message", receiveMessage, false);' +
    '  window.opener.postMessage("authorizing:github", "*");' +
    '})();' +
    '</script></body></html>'
  );
};
