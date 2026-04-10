import { pokemonzh } from './pokemon-zh'
import { movezh } from './move-zh'
import { itemzh } from './item-zh'
import { abilityzh } from './ability-zh'
import { itemdeschzh } from './item-desc-zh'
import { abilitydeschzh } from './ability-desc-zh'
import { movedeschzh } from './move-desc-zh'
import { getLanguage } from './useLanguage'

/** Normalize a display name to PokeAPI kebab-case key */
function toKey(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

/** Chinese prefixes for regional / special form suffixes used by Showdown names. */
const FORM_PREFIXES: Record<string, string> = {
  galar: '伽勒尔',
  alola: '阿罗拉',
  hisui: '洗翠',
  paldea: '帕底亚',
  mega: '超级',
}

/** Translate a Pokemon species name to the active language. */
export function zhPokemon(name: string): string {
  if (getLanguage() === 'en') return name
  const key = toKey(name)
  const direct = pokemonzh[key as keyof typeof pokemonzh]
  if (direct) return direct

  // Fallback for forms like "slowpoke-galar", "charizard-mega-x", "tauros-paldea-aqua"
  const dashIdx = key.indexOf('-')
  if (dashIdx > 0) {
    const base = key.slice(0, dashIdx)
    const rest = key.slice(dashIdx + 1) // e.g. "galar" or "mega-x"
    const formKey = rest.split('-')[0]
    const prefix = FORM_PREFIXES[formKey]
    const baseZh = pokemonzh[base as keyof typeof pokemonzh]
    if (prefix && baseZh) {
      // For mega-x / mega-y, preserve the X/Y suffix
      const suffix = rest.slice(formKey.length) // "" or "-x"
      return prefix + baseZh + suffix.toUpperCase().replace(/-/g, '')
    }
  }
  return name
}

/** Translate a move name to the active language. */
export function zhMove(name: string): string {
  if (getLanguage() === 'en') return name
  return movezh[toKey(name) as keyof typeof movezh] ?? name
}

/** Translate an item name to the active language. */
export function zhItem(name: string): string {
  if (getLanguage() === 'en') return name
  return itemzh[toKey(name) as keyof typeof itemzh] ?? name
}

/** Translate an ability name to the active language. */
export function zhAbility(name: string): string {
  if (getLanguage() === 'en') return name
  return abilityzh[toKey(name) as keyof typeof abilityzh] ?? name
}

/** Localized flavor text for an item. Returns null if not available (or in English mode — caller falls back to dex). */
export function zhItemDesc(name: string): string | null {
  if (getLanguage() === 'en') return null
  return itemdeschzh[toKey(name) as keyof typeof itemdeschzh] ?? null
}

/** Localized flavor text for an ability. Returns null if not available. */
export function zhAbilityDesc(name: string): string | null {
  if (getLanguage() === 'en') return null
  return abilitydeschzh[toKey(name) as keyof typeof abilitydeschzh] ?? null
}

/** Localized flavor text for a move. Returns null if not available. */
export function zhMoveDesc(name: string): string | null {
  if (getLanguage() === 'en') return null
  return movedeschzh[toKey(name) as keyof typeof movedeschzh] ?? null
}

/**
 * Translate a Pokemon identifier from the battle protocol.
 * These are formatted as "p1a: Pikachu" — translate only the name part.
 */
export function zhPokemonId(id: string): string {
  const colonIdx = id.indexOf(': ')
  if (colonIdx >= 0) {
    const prefix = id.slice(0, colonIdx + 2)
    const name = id.slice(colonIdx + 2)
    return prefix + zhPokemon(name)
  }
  return zhPokemon(id)
}
