const { readGuests } = require('./_wedding-store');
const { isValidSession } = require('./_wedding-cookie');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isValidSession(req.headers.cookie)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const guests = await readGuests();
  const total = guests.reduce((sum, guest) => sum + 1 + guest.familyMembers.length, 0);
  res.status(200).json({ guests, total });
};
