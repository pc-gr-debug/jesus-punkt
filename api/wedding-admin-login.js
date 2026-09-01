const { createSessionCookie } = require('./_wedding-cookie');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const password = process.env.WEDDING_ADMIN_PASSWORD;
  if (!password) {
    res.status(500).json({ error: 'WEDDING_ADMIN_PASSWORD is not configured' });
    return;
  }

  const submitted = req.body && req.body.password;
  if (submitted !== password) {
    res.status(401).json({ error: 'Falsches Passwort' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};
