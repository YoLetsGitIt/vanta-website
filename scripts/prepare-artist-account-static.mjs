import { copyFile, mkdir } from 'node:fs/promises';
const directory = new URL('../out/artist/account/', import.meta.url);
await mkdir(directory, { recursive: true });
await copyFile(new URL('../out/artist/account.html', import.meta.url), new URL('index.html', directory));
