const { list, put } = require('@vercel/blob');

const PATHNAME = 'wedding/guests.json';

async function readGuests() {
  const { blobs } = await list({ prefix: PATHNAME, limit: 1 });
  if (blobs.length === 0) return [];
  const response = await fetch(blobs[0].url);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.guests) ? data.guests : [];
}

async function appendGuest(guest) {
  const guests = await readGuests();
  guests.push(guest);
  await put(PATHNAME, JSON.stringify({ guests }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  return guests;
}

module.exports = { readGuests, appendGuest };
