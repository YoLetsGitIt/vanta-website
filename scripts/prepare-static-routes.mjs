import { copyFile, mkdir } from 'node:fs/promises';
// Supply directory indexes for trailing-slash links and pages sharing asset or child-route prefixes.
for (const route of ['studio', 'artists', 'studios', 'pricing', 'artist/account', 'bookings', 'auth/callback']) {
  const directory = new URL(`../out/${route}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await copyFile(new URL(`../out/${route}.html`, import.meta.url), new URL('index.html', directory));
}
