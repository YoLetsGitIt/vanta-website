import { copyFile, mkdir } from 'node:fs/promises';

// Clean URLs and trailing-slash links must both work on GitHub Pages.
// /bookings also contains nested confirmation pages, so it needs its own index.
for (const route of ['artist/account', 'bookings', 'auth/callback']) {
  const directory = new URL(`../out/${route}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await copyFile(new URL(`../out/${route}.html`, import.meta.url), new URL('index.html', directory));
}
