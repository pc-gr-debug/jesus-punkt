/* Form backend — Kontakt + Spendenbescheinigung (docs/pipeline.md §Cutover).
   Receives the urlencoded payload from js/contact.js (form_id + data = JSON
   array of {name, value, label, type, required}) and mails it to the church
   inbox via Google Workspace SMTP. Zero dependencies on purpose: the project
   has no package.json, and with outputDirectory "." a node_modules would be
   deployed as static files.
   Env: SMTP_PASS (Google app password) — required;
        SMTP_USER / CONTACT_TO — default info@jesus-punkt.de. */
const tls = require('tls');

const FORMS = {
  zhlgpfbejuyehftgwpexkcwcbegjxutqzoab: 'Kontaktformular',
  xfutwawjbspglbauonoinafqweyiovtanobn: 'Spendenbescheinigung',
};

const MAX_FIELDS = 30;
const MAX_VALUE_LEN = 5000;
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_TIMEOUT_MS = 15000;

/* ---------- minimal SMTPS client (implicit TLS, AUTH PLAIN) ---------- */
function sendMail({ user, pass, to, replyTo, subject, text }) {
  return new Promise((resolve, reject) => {
    const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
    const message = [
      `From: Jesus Punkt Website <${user}>`,
      `To: <${to}>`,
      replyTo ? `Reply-To: <${replyTo}>` : null,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(text).replace(/.{76}/g, '$&\r\n'),
    ].filter((l) => l !== null).join('\r\n');

    /* command → expected reply code, walked one step per server response */
    const steps = [
      { expect: 220, send: 'EHLO jesus-punkt.de' },
      { expect: 250, send: `AUTH PLAIN ${b64(`\u0000${user}\u0000${pass}`)}` },
      { expect: 235, send: `MAIL FROM:<${user}>` },
      { expect: 250, send: `RCPT TO:<${to}>` },
      { expect: 250, send: 'DATA' },
      { expect: 354, send: `${message}\r\n.` },
      { expect: 250, send: 'QUIT', done: true },
    ];
    let step = 0;
    let buffer = '';
    let settled = false;

    const socket = tls.connect(SMTP_PORT, SMTP_HOST, { servername: SMTP_HOST });
    const fail = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(SMTP_TIMEOUT_MS, () => fail(new Error('SMTP timeout')));
    socket.on('error', fail);

    socket.on('data', (chunk) => {
      if (settled) return;
      buffer += chunk.toString('utf8');
      /* responses can span packets and be multi-line: "250-…" continues,
         "250 …" on the last line ends the reply */
      const lines = buffer.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last || !/^\d{3} /.test(last)) return;
      buffer = '';

      const code = Number(last.slice(0, 3));
      const current = steps[step];
      if (code !== current.expect) {
        fail(new Error(`SMTP step ${step}: expected ${current.expect}, got ${last}`));
        return;
      }
      socket.write(`${current.send}\r\n`);
      if (current.done && !settled) {
        settled = true;
        socket.end();
        resolve();
      }
      step += 1;
    });
  });
}

/* ---------- request handling ---------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  if (!process.env.SMTP_PASS) {
    res.status(503).json({ error: 'SMTP_PASS is not configured' });
    return;
  }

  let formId;
  let fields;
  try {
    const raw = await readBody(req);
    const params = new URLSearchParams(raw);
    formId = params.get('form_id');
    fields = JSON.parse(params.get('data'));
  } catch {
    res.status(400).json({ error: 'bad payload' });
    return;
  }

  const formName = FORMS[formId];
  if (!formName || !Array.isArray(fields) || fields.length === 0 || fields.length > MAX_FIELDS) {
    res.status(400).json({ error: 'bad payload' });
    return;
  }
  const clean = fields
    .filter((f) => f && typeof f.value === 'string' && typeof f.label === 'string')
    .map((f) => ({ ...f, value: f.value.slice(0, MAX_VALUE_LEN).trim() }));
  if (!clean.some((f) => f.value)) {
    res.status(400).json({ error: 'bad payload' });
    return;
  }

  const email = (clean.find((f) => f.type === 'Email') || {}).value || '';
  const name = ['Vorname', 'Nachname']
    .map((l) => (clean.find((f) => f.label === l) || {}).value)
    .filter(Boolean)
    .join(' ');
  const user = process.env.SMTP_USER || 'info@jesus-punkt.de';

  try {
    await sendMail({
      user,
      pass: process.env.SMTP_PASS,
      to: process.env.CONTACT_TO || user,
      replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null,
      subject: name ? `${formName} — ${name}` : formName,
      text: clean.map((f) => `${f.label}:\n${f.value || '—'}`).join('\n\n'),
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact:', err.message);
    res.status(502).json({ error: 'mail delivery failed' });
  }
};
