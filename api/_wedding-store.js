const { put, list } = require('@vercel/blob');

// One file per guest (named by their unique id) rather than one shared JSON
// file. Vercel Blob is not read-your-writes consistent — a shared file with
// read-modify-write appends can silently drop an entry if two submissions
// land within the same few-second propagation window. A dedicated file per
// guest makes every submission an independent `put()`, so no write ever
// depends on reading a possibly-stale prior state. `list()`'s index can still
// lag a few seconds before showing the newest file, but no data is ever lost
// — it just takes a moment to appear in the admin view.
const PREFIX = 'wedding/guests/';

async function appendGuest(guest) {
  await put(`${PREFIX}${guest.id}.json`, JSON.stringify(guest), {
    access: 'public',
    contentType: 'application/json',
  });
}

async function readGuests() {
  const guests = [];
  let cursor;
  do {
    const result = await list({ prefix: PREFIX, cursor, limit: 1000 });
    const files = await Promise.all(
      result.blobs.map((blob) =>
        fetch(blob.url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
      )
    );
    guests.push(...files.filter(Boolean));
    cursor = result.cursor;
  } while (cursor);

  guests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return guests;
}

module.exports = { readGuests, appendGuest };
