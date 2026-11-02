// One editable walkthrough source; this self-contained snapshot can deploy independently.
import { access, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
const source = new URL('../../vanta-studio/', import.meta.url);
const target = new URL('../components/walkthrough/', import.meta.url);
try { await access(new URL('components/studio-cinematic/CinematicJourney.js', source)); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await access(new URL('components/studio-cinematic/CinematicJourney.js', target));
  console.log('Building from the committed walkthrough snapshot (source repository not present).');
  process.exit(0);
}
await mkdir(target, { recursive: true });
for (const path of ['components/studio-cinematic', 'components/FeatureDemoPlayer.js', 'components/FeatureDemoPlayer.module.css', 'components/ui/DetailParts.js', 'components/ui/DetailParts.module.css', 'lib/studioFeatureCatalog.js', 'lib/artistFeatureCatalog.js', 'lib/studioFeatureDemos.js', 'lib/artistAppTour.js']) {
  const dest = new URL(path, target);
  await mkdir(new URL('./', dest), { recursive: true });
  await cp(new URL(path, source), dest, { recursive: true });
}
async function rewrite(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(entry.name, directory);
    if (entry.isDirectory()) await rewrite(new URL(entry.name + '/', directory));
    else if (entry.name.endsWith('.js')) {
      const text = await readFile(path, 'utf8');
      await writeFile(path, text.replaceAll("@/components/", "@/components/walkthrough/components/").replaceAll("@/lib/", "@/components/walkthrough/lib/"));
    }
  }
}
await rewrite(target);
for (const path of ['studio/walkthrough', 'studio/artist', 'studio/demos', 'studio/cinematic', 'studio/screenshots', 'studio/flash-sheet.webp']) {
  await cp(new URL('public/' + path, source), new URL('../public/' + path, import.meta.url), { recursive: true });
}
const catalogue = await readFile(new URL('lib/studioFeatureCatalog.js', source), 'utf8');
for (const [, asset] of catalogue.matchAll(/['"](\/signup\/[^'"]+)['"]/g)) {
  await mkdir(new URL('../public/signup/', import.meta.url), { recursive: true });
  await cp(new URL('public' + asset, source), new URL('../public' + asset, import.meta.url));
}
console.log('Synced walkthrough components, catalogues and assets.');
