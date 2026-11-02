import { copyFile, mkdir } from 'node:fs/promises';
// Keep trailing-slash HTML and Next navigation data together. Without index.txt,
// a client navigation to /studio/ requests a missing data file on static hosts.
for (const route of ['studio', 'artists', 'studios', 'pricing', 'artist/account', 'bookings', 'auth/callback']) {
  const directory = new URL(`../out/${route}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await copyFile(new URL(`../out/${route}.html`, import.meta.url), new URL('index.html', directory));
  await copyFile(new URL(`../out/${route}.txt`, import.meta.url), new URL('index.txt', directory));
}
