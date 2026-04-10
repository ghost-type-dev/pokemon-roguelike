/**
 * Fill Chinese description gaps using 52Poké Wiki.
 *
 * Reads the PokeAPI baseline (move/ability/item-desc-zh.ts, owned by
 * fetch-zh-descs.js) to find missing keys, then fetches short in-game
 * flavor text from 52Poké Wiki and writes a sibling file:
 *
 *   src/i18n/move-desc-zh-wiki.ts
 *   src/i18n/ability-desc-zh-wiki.ts
 *   src/i18n/item-desc-zh-wiki.ts
 *
 * The PokeAPI files are never modified — zh-helpers.ts consults the
 * PokeAPI dict first and falls through to the wiki dict for gaps.
 *
 * Usage: node scripts/fetch-zh-descs-wiki.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const I18N_DIR = path.join(__dirname, '../src/i18n')

const WIKI_API = 'https://wiki.52poke.com/api.php'
const DELAY_MS = 600
const MAX_LEN = 200
const USER_AGENT = 'pokemon-roguelike-zh-desc-scraper/1.0 (educational use)'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/**
 * Parse a `*-zh.ts` autogen file as { kebabKey: chineseValue }.
 * The autogen format is strict — single-quoted keys and values, one per line.
 */
function readDict(filename) {
  const text = fs.readFileSync(path.join(I18N_DIR, filename), 'utf8')
  const out = {}
  const re = /^  '((?:[^'\\]|\\.)+)': '((?:[^'\\]|\\.)*)'/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    const val = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    out[key] = val
  }
  return out
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

/** Strip HTML, decode entities, drop wiki edit-link noise, collapse whitespace. */
function cleanHtml(html) {
  let t = html.replace(/<[^>]+>/g, ' ')
  t = decodeEntities(t)
  t = t.replace(/\[\s*编辑\s*(\|\s*编辑源代码\s*)?\]/g, '')
  t = t.replace(/\u200b/g, '')
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/**
 * If text begins with "主页面：..." (the rendered {{main|...}} template),
 * strip it. The "main" link can extend past the colon and is followed by
 * the actual description on the next visual line.
 */
function stripMainPagePrefix(text) {
  // Rendered {{main|...}} template — handles both simplified (主页面) and
  // traditional (主頁面) wiki variants. The link target follows the colon and
  // is followed by whitespace, then the actual prose.
  return text.replace(/^主[页頁]面[:：]\s*\S+\s*/, '').trim()
}

/**
 * Take just the first sentence of a long-form description.
 * Used for items, where there's no short flavor-text section to pull from —
 * the full effect prose is too long, but the leading sentence is usually a
 * usable summary.
 */
function firstSentence(text) {
  const idx = text.indexOf('。')
  if (idx === -1) return text
  return text.slice(0, idx + 1).trim()
}

/**
 * Parse the 招式说明 / 特性说明 HTML table that lists per-game flavor text.
 * Each row has two <td> cells: game-version label and description.
 * Returns the description from the FIRST data row (most recent main-series game).
 *
 * Returns null if no table is found.
 */
function extractTableFlavor(html) {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/)
  if (!tableMatch) return null
  const tbody = tableMatch[1]

  // Each row's cells (header rows use <th>, data rows use <td>)
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g
  let row
  while ((row = rowRe.exec(tbody)) !== null) {
    const inner = row[1]
    if (/<th\b/.test(inner)) continue // skip header row
    const cells = [...inner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1])
    if (cells.length < 2) continue
    const desc = cleanHtml(cells[cells.length - 1])
    if (desc && desc.length >= 4) return desc
  }
  return null
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Get the section index list for a wiki page; returns [{ index, line }] or null. */
async function fetchSections(title) {
  const params = new URLSearchParams({
    action: 'parse', page: title, prop: 'sections',
    format: 'json', origin: '*', redirects: '1',
  })
  const data = await fetchJson(`${WIKI_API}?${params}`)
  if (data.error) return null
  return data?.parse?.sections ?? null
}

/** Get the rendered HTML for a single section. */
async function fetchSectionHtml(title, sectionIndex) {
  const params = new URLSearchParams({
    action: 'parse', page: title, prop: 'text', section: String(sectionIndex),
    format: 'json', origin: '*', redirects: '1',
  })
  const data = await fetchJson(`${WIKI_API}?${params}`)
  if (data.error) return null
  return data?.parse?.text?.['*'] ?? null
}

/**
 * Fetch a description for one entry, preferring short flavor text.
 *
 * Strategy:
 *   1. Get the section list for `<zhName>（<suffix>）` (and bare title fallback).
 *   2. Find the FLAVOR section (招式说明 / 特性说明 / 效果). If present,
 *      fetch and parse the per-game table to get the latest short description.
 *   3. If the flavor section is missing OR the table parse fails, fall back
 *      to the EFFECT section (招式附加效果 / 特性效果 / 效果) as long-form prose.
 *   4. Strip 主页面 prefix, decode entities, truncate.
 */
async function fetchDesc(zhName, { flavorHeadings, effectHeadings, suffix, summarize }) {
  const titles = [`${zhName}（${suffix}）`, zhName]

  for (const title of titles) {
    let sections
    try {
      sections = await fetchSections(title)
    } catch (_) { continue }
    if (!sections) continue

    const findIdx = (names) => {
      for (const s of sections) {
        if (names.includes(s.line) && s.toclevel === 1) return s.index
      }
      return null
    }

    // 1. Try the short flavor-text section.
    const flavorIdx = findIdx(flavorHeadings)
    if (flavorIdx) {
      try {
        const html = await fetchSectionHtml(title, flavorIdx)
        if (html) {
          const tableDesc = extractTableFlavor(html)
          if (tableDesc) {
            const cleaned = stripMainPagePrefix(tableDesc)
            if (cleaned && !cleaned.includes('{{') && !cleaned.includes('[[')) {
              return cleaned.length > MAX_LEN
                ? cleaned.slice(0, MAX_LEN).trim() + '…'
                : cleaned
            }
          }
        }
      } catch (_) { /* fall through */ }
      await sleep(DELAY_MS)
    }

    // 2. Fall back to long-form effect prose.
    const effectIdx = findIdx(effectHeadings)
    if (effectIdx) {
      try {
        const html = await fetchSectionHtml(title, effectIdx)
        if (html) {
          let text = cleanHtml(html)
          // Drop the section header that prop=text leaves at the start
          for (const h of effectHeadings) {
            text = text.replace(new RegExp(`^${h}\\s*`), '')
          }
          // Drop subsection header noise like "对战中"
          text = text.replace(/(?:^|\s)对战中\s*/, ' ').trim()
          text = stripMainPagePrefix(text)
          if (summarize) text = firstSentence(text)
          if (text && text.length >= 4 && !text.includes('{{') && !text.includes('[[')) {
            return text.length > MAX_LEN
              ? text.slice(0, MAX_LEN).trim() + '…'
              : text
          }
        }
      } catch (_) { /* try next title */ }
    }
  }
  return null
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
 * Auto-generated Chinese ${varName.includes('move') ? 'move' : varName.includes('ability') ? 'ability' : 'item'} description gap-fill from 52Poké Wiki.
 * Augments ${filename.replace('-wiki', '')} (PokeAPI) for entries PokeAPI doesn't cover.
 * DO NOT EDIT MANUALLY — regenerate with: node scripts/fetch-zh-descs-wiki.js
 */

export const ${varName} = {
${entries}
} as const;
`
  fs.writeFileSync(path.join(I18N_DIR, filename), content)
  console.log(`✓ ${filename} (${Object.keys(data).length} entries)`)
}

async function fillCategory({ label, namesFile, baselineDescFile, wikiDescFile, varName, flavorHeadings, effectHeadings, suffix, summarize }) {
  console.log(`\n[${label}]`)
  const names = readDict(namesFile)               // kebabKey -> chineseName
  const baseline = readDict(baselineDescFile)     // kebabKey -> existing PokeAPI desc

  const missing = Object.keys(names).filter(k => !(k in baseline))
  console.log(`  ${Object.keys(baseline).length} in PokeAPI baseline, ${missing.length} need filling`)

  const result = {}
  const failed = []
  for (let i = 0; i < missing.length; i++) {
    const key = missing[i]
    const zhName = names[key]
    try {
      const desc = await fetchDesc(zhName, { flavorHeadings, effectHeadings, suffix, summarize })
      if (desc) {
        result[key] = desc
      } else {
        failed.push(`${key} (${zhName})`)
      }
    } catch (e) {
      failed.push(`${key} (${zhName}) — ${e.message}`)
    }
    process.stdout.write(`\r  ${i + 1}/${missing.length} processed, ${Object.keys(result).length} filled`)
    if (i + 1 < missing.length) await sleep(DELAY_MS)
  }
  console.log()
  if (failed.length) {
    console.log(`  ${failed.length} unfilled:`)
    for (const f of failed) console.log(`    - ${f}`)
  }

  writeTsFile(wikiDescFile, varName, result)
  return { filled: Object.keys(result).length, failed: failed.length }
}

async function main() {
  console.log('Filling Chinese description gaps from 52Poké Wiki...')

  const moves = await fillCategory({
    label: 'Moves',
    namesFile: 'move-zh.ts',
    baselineDescFile: 'move-desc-zh.ts',
    wikiDescFile: 'move-desc-zh-wiki.ts',
    varName: 'movedeschwikizh',
    flavorHeadings: ['招式说明'],
    effectHeadings: ['招式附加效果', '招式效果'],
    suffix: '招式',
  })

  const abilities = await fillCategory({
    label: 'Abilities',
    namesFile: 'ability-zh.ts',
    baselineDescFile: 'ability-desc-zh.ts',
    wikiDescFile: 'ability-desc-zh-wiki.ts',
    varName: 'abilitydeschwikizh',
    flavorHeadings: ['特性说明'],
    effectHeadings: ['特性效果'],
    suffix: '特性',
  })

  const items = await fillCategory({
    label: 'Items',
    namesFile: 'item-zh.ts',
    baselineDescFile: 'item-desc-zh.ts',
    wikiDescFile: 'item-desc-zh-wiki.ts',
    varName: 'itemdeschwikizh',
    flavorHeadings: ['道具说明'],
    effectHeadings: ['使用效果', '效果', '道具效果', '说明'],
    suffix: '道具',
    summarize: true,
  })

  console.log(`\n✅ Done. Filled: moves +${moves.filled}, abilities +${abilities.filled}, items +${items.filled}`)
  console.log(`   Unfilled: moves ${moves.failed}, abilities ${abilities.failed}, items ${items.failed}`)
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
