const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const usernamePattern = /^[a-z0-9._]{1,30}$/;

// Instagram usernames resolve to UUIDs before any booking request is submitted.
export async function resolveBookingArtist(reference, backendUrl, fetcher = fetch, signal) {
  if (uuidPattern.test(reference || '')) return reference;
  const username = (reference || '').trim().toLowerCase();
  if (!usernamePattern.test(username)) throw new Error('Artist not found');
  const response = await fetcher(`${backendUrl}/artists/by-username/${encodeURIComponent(username)}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Artist not found');
  const data = await response.json();
  if (!uuidPattern.test(data.artist_id || '')) throw new Error('Artist not found');
  return data.artist_id;
}
