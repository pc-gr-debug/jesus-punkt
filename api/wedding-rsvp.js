const crypto = require('crypto');
const { appendGuest } = require('./_wedding-store');

const MAX_FAMILY_MEMBERS = 10;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const familyMembersRaw = Array.isArray(body.familyMembers) ? body.familyMembers : [];
  const familyMembers = familyMembersRaw
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (!name) {
    res.status(400).json({ error: 'Name ist erforderlich' });
    return;
  }
  if (familyMembers.length > MAX_FAMILY_MEMBERS) {
    res.status(400).json({ error: `Maximal ${MAX_FAMILY_MEMBERS} Familienmitglieder` });
    return;
  }

  await appendGuest({
    id: crypto.randomUUID(),
    name,
    familyMembers,
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({ ok: true });
};
