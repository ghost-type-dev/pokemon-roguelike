import { Dex } from '@pkmn/dex'
import { Generations } from '@pkmn/data'
import type { StatID } from '@pkmn/data'

export const generations = new Generations(Dex)

export function getGen(num = 9) {
  return generations.get(num)
}

export function allSpecies(genNum = 9) {
  const gen = getGen(genNum)
  const list: Array<{ name: string; num: number; types: string[] }> = []
  for (const s of gen.species) {
    if (s.num <= 0) continue // Skip CAP/fake pokemon
    list.push({ name: s.name, num: s.num, types: [...s.types] })
  }
  return list.sort((a, b) => a.num - b.num)
}

export function getSpecies(name: string, genNum = 9) {
  return getGen(genNum).species.get(name)
}

export function getAbilities(speciesName: string, genNum = 9): string[] {
  const species = getGen(genNum).species.get(speciesName)
  if (!species) return []
  const abilities: string[] = []
  const raw = species.abilities as unknown as Record<string, string>
  for (const key of Object.keys(raw)) {
    if (raw[key]) abilities.push(raw[key])
  }
  return abilities
}

/** Get only non-hidden abilities (slots 0, 1, S — excludes H) */
export function getRegularAbilities(speciesName: string, genNum = 9): string[] {
  const species = getGen(genNum).species.get(speciesName)
  if (!species) return []
  const abilities: string[] = []
  const raw = species.abilities as unknown as Record<string, string>
  for (const key of Object.keys(raw)) {
    if (key !== 'H' && raw[key]) abilities.push(raw[key])
  }
  return abilities
}

export async function getLearnableMoves(speciesName: string, genNum = 9): Promise<string[]> {
  const gen = getGen(genNum)
  const learnable = await gen.learnsets.learnable(speciesName)
  if (!learnable) return []
  return Object.keys(learnable).map(id => {
    const move = gen.moves.get(id)
    return move?.name || id
  }).filter(Boolean).sort()
}

export function getMove(name: string, genNum = 9) {
  return getGen(genNum).moves.get(name)
}

export function allItems(genNum = 9): string[] {
  const gen = getGen(genNum)
  const items: string[] = []
  for (const item of gen.items) {
    if (item.num <= 0) continue
    items.push(item.name)
  }
  return items.sort()
}

export function allNatures(genNum = 9): Array<{ name: string; plus?: StatID; minus?: StatID }> {
  const gen = getGen(genNum)
  const natures: Array<{ name: string; plus?: StatID; minus?: StatID }> = []
  for (const n of gen.natures) {
    natures.push({ name: n.name, plus: n.plus, minus: n.minus })
  }
  return natures.sort((a, b) => a.name.localeCompare(b.name))
}

export function calcStat(
  stat: StatID,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature?: { plus?: StatID; minus?: StatID },
): number {
  if (stat === 'hp') {
    if (base === 1) return 1 // Shedinja
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
  }
  let value = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5
  if (nature?.plus === stat) value = Math.floor(value * 1.1)
  if (nature?.minus === stat) value = Math.floor(value * 0.9)
  return value
}

export const STAT_NAMES: Record<StatID, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}

export const STAT_IDS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
