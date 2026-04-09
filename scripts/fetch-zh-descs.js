/**
 * Fetch Chinese flavor text descriptions for items, abilities, and moves from PokeAPI.
 * Generates static TypeScript mapping files.
 *
 * Usage: node scripts/fetch-zh-descs.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Dex } from '@pkmn/dex'
import { Generations } from '@pkmn/data'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const I18N_DIR = path.join(__dirname, '../src/i18n')
const API_BASE = 'https://pokeapi.co/api/v2'
const CONCURRENCY = 30

function toKey(name) {
  return name.toLowerCase().replace(/ /g, '-')
}

function cleanText(text) {
  // Replace newlines and multiple spaces with a single space
  return text.replace(/[\n\r\f]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Pick the last zh-hans entry (most recent game version) */
function pickZhFlavor(entries) {
  const zhEntries = (entries ?? []).filter(e => e.language?.name === 'zh-hans')
  if (zhEntries.length === 0) return null
  const text = zhEntries[zhEntries.length - 1].flavor_text ?? zhEntries[zhEntries.length - 1].text
  return text ? cleanText(text) : null
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

async function fetchDescs(names, endpoint, label) {
  console.log(`\n[${label}] ${names.length} entries`)
  const result = {}
  let found = 0

  for (let i = 0; i < names.length; i += CONCURRENCY) {
    const batch = names.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (name) => {
      try {
        const data = await fetchJson(`${API_BASE}/${endpoint}/${toKey(name)}`)
        const zh = pickZhFlavor(data.flavor_text_entries)
        if (zh) {
          result[toKey(name)] = zh
          found++
        }
      } catch (_) { /* skip missing */ }
    }))
    const done = Math.min(i + CONCURRENCY, names.length)
    process.stdout.write(`\r  ${done}/${names.length} fetched, ${found} with zh desc`)
  }
  console.log()
  return result
}

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
 * Auto-generated Chinese description mappings from PokeAPI (flavor text)
 * DO NOT EDIT MANUALLY — regenerate with: node scripts/fetch-zh-descs.js
 */

export const ${varName} = {
${entries}
} as const;
`
  fs.writeFileSync(path.join(I18N_DIR, filename), content)
  console.log(`✓ ${filename} (${Object.keys(data).length} entries)`)
}

async function main() {
  console.log('Fetching Chinese descriptions from PokeAPI...')

  const gen = new Generations(Dex).get(9)

  const itemNames = []
  for (const i of gen.items) { if (i.num > 0) itemNames.push(i.name) }

  const abilityNames = []
  for (const a of gen.abilities) { if (a.num > 0) abilityNames.push(a.name) }

  const moveNames = []
  for (const m of gen.moves) { if (m.num > 0) moveNames.push(m.name) }

  const items     = await fetchDescs(itemNames,    'item',    'Items')
  const abilities = await fetchDescs(abilityNames, 'ability', 'Abilities')
  const moves     = await fetchDescs(moveNames,    'move',    'Moves')

  console.log('\nWriting TypeScript files...')
  writeTsFile('item-desc-zh.ts',    'itemdeschzh',    items)
  writeTsFile('ability-desc-zh.ts', 'abilitydeschzh', abilities)
  writeTsFile('move-desc-zh.ts',    'movedeschzh',    moves)

  console.log('\n✅ Done!')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
