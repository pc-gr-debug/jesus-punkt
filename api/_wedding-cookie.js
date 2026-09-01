const crypto = require('crypto');

const COOKIE_NAME = 'wedding_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;

function sign(payload) {
  const secret = process.env.WEDDING_ADMIN_SECRET;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function createSessionCookie() {
  const exp = Date.now() + SESSION_MS;
  const payload = String(exp);
  const value = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; Path=/; Max-Age=${SESSION_MS / 1000}; SameSite=Lax`;
}

function isValidSession(cookieHeader) {
  if (!cookieHeader) return false;
  const match = new RegExp(`${COOKIE_NAME}=([^;]+)`).exec(cookieHeader);
  if (!match) return false;
  const [payload, sig] = match[1].split('.');
  if (!payload || !sig) return false;

  const expected = sign(payload);
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  const exp = Number(payload);
  return Number.isFinite(exp) && Date.now() < exp;
}

module.exports = { COOKIE_NAME, createSessionCookie, isValidSession };
