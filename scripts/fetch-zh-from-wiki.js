/**
 * Scrapes Chinese name mappings from 52Poké Wiki (神奇宝贝百科) via MediaWiki API.
 * Generates complete static TypeScript mapping files — no network access needed at runtime.
 *
 * Usage: node scripts/fetch-zh-from-wiki.js
 *
 * Replaces fetch-zh-names.js + fetch-zh-abilities.js with better coverage.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Dex } from '@pkmn/dex'
import { Generations } from '@pkmn/data'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const I18N_DIR = path.join(__dirname, '../src/i18n')

const WIKI_API = 'https://wiki.52poke.com/api.php'
const BATCH_SIZE = 50
const DELAY_MS = 600

function toKey(name) {
  return name.toLowerCase().replace(/ /g, '-')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Query the wiki for up to 50 English names at once.
 * Returns { englishName: chineseName } for any that had redirects.
 */
async function batchQuery(names) {
  const params = new URLSearchParams({
    action: 'query',
    titles: names.join('|'),
    redirects: '1',
    format: 'json',
    origin: '*',
  })
  const res = await fetch(`${WIKI_API}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const result = {}
  for (const { from, to } of (data?.query?.redirects ?? [])) {
    // Strip disambiguation suffixes: 喷射火焰（招式）→ 喷射火焰
    result[from] = to.replace(/（[^）]+）$/, '').trim()
  }
  return result
}

/**
 * Fetch Chinese translations for a list of English display names.
 */
async function fetchTranslations(displayNames, label) {
  console.log(`\n[${label}] ${displayNames.length} names`)
  const result = {}
  let found = 0

  for (let i = 0; i < displayNames.length; i += BATCH_SIZE) {
    const batch = displayNames.slice(i, i + BATCH_SIZE)
    try {
      const translations = await batchQuery(batch)
      for (const name of batch) {
        if (translations[name]) {
          result[toKey(name)] = translations[name]
          found++
        }
      }
    } catch (e) {
      process.stderr.write(`\n  [warn] batch ${i}–${i + BATCH_SIZE} failed: ${e.message}\n`)
    }

    const done = Math.min(i + BATCH_SIZE, displayNames.length)
    process.stdout.write(`\r  ${done}/${displayNames.length} fetched, ${found} translated`)

    if (done < displayNames.length) await sleep(DELAY_MS)
  }
  console.log()
  return result
}

/**
 * Write a TypeScript mapping file.
 */
function writeTsFile(filename, varName, data) {
  const entries = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const escKey = k.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      const escVal = v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      return `  '${escKey}': '${escVal}'`
    })
    .join(',\n')

  const content = `/**
 * Auto-generated Chinese ${varName.replace('zh', '')} name mappings from 52Poké Wiki (神奇宝贝百科)
 * DO NOT EDIT MANUALLY — regenerate with: node scripts/fetch-zh-from-wiki.js
 */

export const ${varName} = {
${entries}
} as const;
`
  fs.writeFileSync(path.join(I18N_DIR, filename), content)
  console.log(`✓ ${filename} (${Object.keys(data).length} entries)`)
}

async function main() {
  console.log('Scraping 52Poké Wiki (神奇宝贝百科) for Chinese name mappings...')

  const gen = new Generations(Dex).get(9)

  // Collect English display names from @pkmn/dex (same data the game uses)
  const speciesNames = []
  for (const s of gen.species) {
    if (s.num > 0) speciesNames.push(s.name)
  }

  const moveNames = []
  for (const m of gen.moves) {
    if (m.num > 0) moveNames.push(m.name)
  }

  const itemNames = []
  for (const i of gen.items) {
    if (i.num > 0) itemNames.push(i.name)
  }

  const abilityNames = []
  for (const a of gen.abilities) {
    if (a.num > 0) abilityNames.push(a.name)
  }

  const pokemon   = await fetchTranslations(speciesNames,  'Pokemon')
  const moves     = await fetchTranslations(moveNames,     'Moves')
  const items     = await fetchTranslations(itemNames,     'Items')
  const abilities = await fetchTranslations(abilityNames,  'Abilities')

  console.log('\nWriting TypeScript files...')
  writeTsFile('pokemon-zh.ts',  'pokemonzh',  pokemon)
  writeTsFile('move-zh.ts',     'movezh',     moves)
  writeTsFile('item-zh.ts',     'itemzh',     items)
  writeTsFile('ability-zh.ts',  'abilityzh',  abilities)

  console.log('\n✅ Done! Run `npm run build` to verify.')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
