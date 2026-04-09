/**
 * Fetch Chinese ability names from PokeAPI
 * Usage: node scripts/fetch-zh-abilities.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.join(__dirname, '../src/i18n');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return await res.json();
}

async function main() {
  console.log('Fetching ability list...');
  const { results } = await fetchJson('https://pokeapi.co/api/v2/ability?limit=500');
  console.log(`Fetching ${results.length} abilities in parallel...`);

  const result = {};
  const concurrency = 50;
  for (let i = 0; i < results.length; i += concurrency) {
    const batch = results.slice(i, i + concurrency);
    await Promise.all(batch.map(async (ability) => {
      try {
        const detail = await fetchJson(ability.url);
        const zhName = detail.names.find(n => n.language.name === 'zh-hans')?.name;
        if (zhName) result[ability.name] = zhName;
      } catch (_) { /* skip */ }
    }));
    console.log(`  ... processed ${Math.min(i + concurrency, results.length)}/${results.length}`);
  }

  const entries = Object.entries(result)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  '${k}': '${v.replace(/'/g, "\\'")}'`)
    .join(',\n');

  const content = `/**
 * Auto-generated Chinese ability name mappings from PokeAPI
 * DO NOT EDIT MANUALLY
 */

export const abilityzh = {
${entries}
} as const;
`;

  fs.writeFileSync(path.join(I18N_DIR, 'ability-zh.ts'), content);
  console.log(`\n✅ Generated ability-zh.ts (${Object.keys(result).length} entries)`);
}

main().catch(e => { console.error(e); process.exit(1); });
