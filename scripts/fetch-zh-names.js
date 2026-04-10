/**
 * Efficient fetch of Chinese names from PokeAPI using parallel requests
 * Usage: node scripts/fetch-zh-names.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.join(__dirname, '../src/i18n');

if (!fs.existsSync(I18N_DIR)) {
  fs.mkdirSync(I18N_DIR, { recursive: true });
}

const API_BASE = 'https://pokeapi.co/api/v2';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return await res.json();
}

/**
 * Fetch Pokemon names using parallel requests
 */
async function fetchPokemonNames() {
  console.log('Fetching Pokemon list...');
  const { results } = await fetchJson(`${API_BASE}/pokemon?limit=2000`);

  console.log(`Fetching ${results.length} Pokemon details in parallel...`);
  const result = {};

  // Parallel fetches with concurrency limit (50 at a time)
  const concurrency = 50;
  for (let i = 0; i < results.length; i += concurrency) {
    const batch = results.slice(i, i + concurrency);
    const promises = batch.map(async (poke) => {
      try {
        const species = await fetchJson(`${API_BASE}/pokemon-species/${poke.name}`);
        const zhName = species.names.find(n => n.language.name === 'zh-hans')?.name;
        if (zhName) {
          result[poke.name] = zhName;
        }
      } catch (e) {
        // Silently skip
      }
    });

    await Promise.all(promises);
    console.log(`  ... processed ${Math.min(i + concurrency, results.length)}/${results.length}`);
  }

  return result;
}

/**
 * Fetch move names using parallel requests
 */
async function fetchMoveNames() {
  console.log('Fetching move list...');
  const { results } = await fetchJson(`${API_BASE}/move?limit=2000`);

  console.log(`Fetching ${results.length} moves in parallel...`);
  const result = {};

  const concurrency = 50;
  for (let i = 0; i < results.length; i += concurrency) {
    const batch = results.slice(i, i + concurrency);
    const promises = batch.map(async (move) => {
      try {
        const detail = await fetchJson(move.url);
        const zhName = detail.names.find(n => n.language.name === 'zh-hans')?.name;
        if (zhName) {
          result[move.name] = zhName;
        }
      } catch (e) {
        // Silently skip
      }
    });

    await Promise.all(promises);
    console.log(`  ... processed ${Math.min(i + concurrency, results.length)}/${results.length}`);
  }

  return result;
}

/**
 * Fetch item names using parallel requests
 */
async function fetchItemNames() {
  console.log('Fetching item list...');
  const { results } = await fetchJson(`${API_BASE}/item?limit=2000`);

  console.log(`Fetching ${results.length} items in parallel...`);
  const result = {};

  const concurrency = 50;
  for (let i = 0; i < results.length; i += concurrency) {
    const batch = results.slice(i, i + concurrency);
    const promises = batch.map(async (item) => {
      try {
        const detail = await fetchJson(item.url);
        const zhName = detail.names.find(n => n.language.name === 'zh-hans')?.name;
        if (zhName) {
          result[item.name] = zhName;
        }
      } catch (e) {
        // Silently skip
      }
    });

    await Promise.all(promises);
    console.log(`  ... processed ${Math.min(i + concurrency, results.length)}/${results.length}`);
  }

  return result;
}

/**
 * Generate TypeScript mapping file
 */
function generateTsFile(filename, data) {
  const entries = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  '${k}': '${v.replace(/'/g, "\\'")}'`)
    .join(',\n');

  const varName = path.basename(filename, '.ts').replace(/-/g, '');
  const content = `/**
 * Auto-generated Chinese name mappings from PokeAPI
 * DO NOT EDIT MANUALLY
 */

export const ${varName} = {
${entries}
} as const;
`;

  fs.writeFileSync(path.join(I18N_DIR, filename), content);
  console.log(`✓ Generated ${filename} (${Object.keys(data).length} entries)`);
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log('Fetching Chinese names from PokeAPI (with parallel requests)\n');

    const pokemon = await fetchPokemonNames();
    const moves = await fetchMoveNames();
    const items = await fetchItemNames();

    console.log('\nGenerating TypeScript files...');
    generateTsFile('pokemon-zh.ts', pokemon);
    generateTsFile('move-zh.ts', moves);
    generateTsFile('item-zh.ts', items);

    console.log('\n✅ Done! Created:');
    console.log('  - src/i18n/pokemon-zh.ts');
    console.log('  - src/i18n/move-zh.ts');
    console.log('  - src/i18n/item-zh.ts');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
