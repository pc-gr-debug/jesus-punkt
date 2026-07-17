/* GitHub OAuth step 1 — Sveltia CMS (/admin/) opens this in a popup.
   Redirects to GitHub's consent screen; GitHub returns to /api/callback.
   Env: GH_OAUTH_ID (docs/cms-integration-plan.md §2/§7). */
const crypto = require('crypto');

module.exports = (req, res) => {
  const clientId = process.env.GH_OAUTH_ID;
  if (!clientId) {
    res.status(500).send('GH_OAUTH_ID is not configured');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `https://${req.headers.host}/api/callback`,
    scope: 'repo',
    state,
  });
  res.setHeader('Set-Cookie',
    `gh_oauth_state=${state}; HttpOnly; Secure; Path=/api; Max-Age=600; SameSite=Lax`);
  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
