const { put } = require('@vercel/blob');

const PATHNAME = 'wedding/guests.json';

// `list()`'s metadata index lags behind the object itself after a `put()` —
// the object is already fetchable directly while list() can still miss it.
// Since PATHNAME is fixed (addRandomSuffix: false), the direct URL is
// deterministic from the store id embedded in BLOB_READ_WRITE_TOKEN
// (format: vercel_blob_rw_<storeId>_<secret>), so read that way instead.
function storeUrl() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const match = /^vercel_blob_rw_([a-zA-Z0-9]+)_/.exec(token);
  if (!match) {
    throw new Error('BLOB_READ_WRITE_TOKEN is missing or has an unexpected format');
  }
  return `https://${match[1].toLowerCase()}.public.blob.vercel-storage.com/${PATHNAME}`;
}

async function readGuests() {
  const response = await fetch(storeUrl(), { cache: 'no-store' });
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
