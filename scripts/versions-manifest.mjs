// Run by the release workflow on the gh-pages checkout: writes versions.json listing every release
// hosted under v/, and makes the newest one the root page.
//   node scripts/versions-manifest.mjs <site dir> <version just published>
import { copyFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [site, published] = process.argv.slice(2);
const parts = (v) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
const compare = (a, b) => {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

const dir = join(site, 'v');
const versions = existsSync(dir)
  ? readdirSync(dir).filter((v) => /^\d+(\.\d+)*$/.test(v) && existsSync(join(dir, v, 'index.html'))).sort(compare)
  : [];
if (!versions.includes(published)) throw new Error(`v/${published}/index.html is missing`);
const latest = versions[versions.length - 1];
// Re-publishing an older release must not replace the newer root page.
if (latest === published) copyFileSync(join(dir, published, 'index.html'), join(site, 'index.html'));
writeFileSync(join(site, 'versions.json'), JSON.stringify({ latest, versions }, null, 2) + '\n');
console.log(`versions.json: latest ${latest}, ${versions.length} hosted`);
