const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const usernamePattern = /^[a-z0-9._]{1,30}$/;

const subdomainPattern = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
// Vanta's own sites; never an artist's booking address.
const reservedSubdomains = new Set(['www', 'studio', 'studios', 'api', 'app', 'admin']);

// The artist's own address, <name>.vanta.tattoo, as a booking reference ("sub:<name>").
// Empty for vanta.tattoo itself, Vanta's own subdomains and any other host.
export function subdomainReference(hostname) {
  const match = /^([a-z0-9-]+)\.vanta\.tattoo$/.exec((hostname || '').toLowerCase());
  if (!match) return '';
  const name = match[1];
  if (!subdomainPattern.test(name) || name.includes('--') || reservedSubdomains.has(name)) return '';
  return `sub:${name}`;
}

// Instagram usernames and booking addresses resolve to UUIDs before any booking request is submitted.
export async function resolveBookingArtist(reference, backendUrl, fetcher = fetch, signal) {
  if (uuidPattern.test(reference || '')) return reference;
  if ((reference || '').startsWith('sub:')) {
    const name = reference.slice(4);
    if (!subdomainPattern.test(name)) throw new Error('Artist not found');
    const response = await fetcher(`${backendUrl}/booking-subdomains/${encodeURIComponent(name)}`, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Artist not found');
    const data = await response.json();
    if (!uuidPattern.test(data.artist_id || '')) throw new Error('Artist not found');
    return data.artist_id;
  }
  const username = (reference || '').trim().toLowerCase();
  if (!usernamePattern.test(username)) throw new Error('Artist not found');
  const response = await fetcher(`${backendUrl}/artists/by-username/${encodeURIComponent(username)}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Artist not found');
  const data = await response.json();
  if (!uuidPattern.test(data.artist_id || '')) throw new Error('Artist not found');
  return data.artist_id;
}
