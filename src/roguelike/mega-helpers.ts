import { Dex } from '@pkmn/dex'

interface MegaStoneEntry {
  itemName: string
  baseSpecies: string
  megaForme: string
}

let _cache: MegaStoneEntry[] | null = null

/** Mega stones with broken or missing sprites — hidden from PrepareStage. */
const BROKEN_MEGA_STONES = new Set(['Lucarionite Z'])

/** Returns a cached list of all mega stones from @pkmn/dex item data. */
export function getAllMegaStones(): MegaStoneEntry[] {
  if (_cache) return _cache
  _cache = []
  for (const item of Dex.items.all()) {
    const ms = (item as any).megaStone as Record<string, string> | undefined
    if (ms && !BROKEN_MEGA_STONES.has(item.name)) {
      for (const [baseSpecies, megaForme] of Object.entries(ms)) {
        _cache.push({ itemName: item.name, baseSpecies, megaForme })
      }
    }
  }
  return _cache
}

/**
 * Returns the names of all mega stones compatible with the given species.
 * Matches against the base species so e.g. 'Charizard' → ['Charizardite X', 'Charizardite Y'].
 */
export function getMegaStonesForSpecies(species: string): string[] {
  const baseSpecies = Dex.species.get(species).baseSpecies || species
  return getAllMegaStones()
    .filter((e) => e.baseSpecies === baseSpecies)
    .map((e) => e.itemName)
}
