import { pokemonzh } from './pokemon-zh'
import { movezh } from './move-zh'
import { itemzh } from './item-zh'
import { abilityzh } from './ability-zh'

/** Normalize a display name to PokeAPI kebab-case key */
function toKey(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

/** Translate a Pokemon species name to Chinese. Falls back to English. */
export function zhPokemon(name: string): string {
  return pokemonzh[toKey(name) as keyof typeof pokemonzh] ?? name
}

/** Translate a move name to Chinese. Falls back to English. */
export function zhMove(name: string): string {
  return movezh[toKey(name) as keyof typeof movezh] ?? name
}

/** Translate an item name to Chinese. Falls back to English. */
export function zhItem(name: string): string {
  return itemzh[toKey(name) as keyof typeof itemzh] ?? name
}

/** Translate an ability name to Chinese. Falls back to English. */
export function zhAbility(name: string): string {
  return abilityzh[toKey(name) as keyof typeof abilityzh] ?? name
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
