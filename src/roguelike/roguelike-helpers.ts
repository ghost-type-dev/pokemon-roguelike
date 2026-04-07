import { getGen, getSpecies, getAbilities, allNatures } from '../teambuilder/dex-helpers'
import { createEmptySet, type PokemonSet } from '../teambuilder/useTeamBuilder'
import { BATTLE_ITEMS, STARTERS, STAT_LABELS, type RewardOption } from './constants'
import type { StatID } from '@pkmn/data'

// ─── Gender ─────────────────────────────────────────────────────────────────

/** Pick a random gender based on species gender ratio */
export function randomGender(speciesName: string): '' | 'M' | 'F' {
  const species = getSpecies(speciesName)
  if (!species) return ''
  // Fixed gender species (e.g. Chansey=F, Tauros=M) or genderless (Magnemite)
  if (species.gender === 'M') return 'M'
  if (species.gender === 'F') return 'F'
  if (species.gender === 'N') return ''
  // Random based on ratio
  const ratio = species.genderRatio as { M: number; F: number }
  if (!ratio || (ratio.M === 0 && ratio.F === 0)) return ''
  return Math.random() < ratio.M ? 'M' : 'F'
}

// ─── Move filtering ─────────────────────────────────────────────────────────

// Natural source types: L=level-up, E=egg, T=tutor
// Non-natural: M=TM, S=event, R=reminder-only, D=dream world
const NATURAL_SOURCES = new Set(['L', 'E', 'T'])

/** Check if a source string is from a specific generation */
function isFromGen(source: string, genNum: number): boolean {
  return source.charAt(0) === String(genNum)
}

function getSourceType(source: string): string {
  return source.length > 1 ? source.charAt(1) : source.charAt(0)
}

/**
 * Returns moves a Pokemon can learn through natural means in the current gen.
 * Only considers gen 9 sources: level-up, egg, tutor.
 * Excludes TM, event, dream world, and moves only available in past gens.
 */
export async function getNaturalMoves(speciesName: string, genNum = 9): Promise<string[]> {
  const gen = getGen(genNum)
  const learnable = await gen.learnsets.learnable(speciesName)
  if (!learnable) return []

  const moves: string[] = []
  for (const [moveId, sources] of Object.entries(learnable)) {
    const hasNaturalSource = (sources as string[]).some(s =>
      isFromGen(s, genNum) && NATURAL_SOURCES.has(getSourceType(s))
    )
    if (hasNaturalSource) {
      const move = gen.moves.get(moveId)
      if (move) moves.push(move.name)
    }
  }
  return moves.sort()
}

/**
 * Returns moves a Pokemon can learn via TM in the current gen
 * but NOT through natural means in the current gen.
 * These are unlockable via TM rewards in roguelike mode.
 */
export async function getTMMoves(speciesName: string, genNum = 9): Promise<string[]> {
  const gen = getGen(genNum)
  const learnable = await gen.learnsets.learnable(speciesName)
  if (!learnable) return []

  const moves: string[] = []
  for (const [moveId, sources] of Object.entries(learnable)) {
    const genSources = (sources as string[]).filter(s => isFromGen(s, genNum))
    const hasTMSource = genSources.some(s => getSourceType(s) === 'M')
    const hasNaturalSource = genSources.some(s => NATURAL_SOURCES.has(getSourceType(s)))
    if (hasTMSource && !hasNaturalSource) {
      const move = gen.moves.get(moveId)
      if (move) moves.push(move.name)
    }
  }
  return moves.sort()
}

/**
 * Returns all moves a Pokemon can learn from any source in the given gen.
 * Used for reward move selection — any learnable move is fair game.
 */
export async function getAllLearnableMoves(speciesName: string, genNum = 9): Promise<string[]> {
  const gen = getGen(genNum)
  const learnable = await gen.learnsets.learnable(speciesName)
  if (!learnable) return []

  const moves: string[] = []
  for (const moveId of Object.keys(learnable)) {
    const move = gen.moves.get(moveId)
    if (move) moves.push(move.name)
  }
  return moves.sort()
}

// ─── Starter helpers ────────────────────────────────────────────────────────

/** Pick n random unique starters from the 27 */
export function pickRandomStarters(count: number): string[] {
  const shuffled = [...STARTERS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/** Create a PokemonSet for a starter */
export function createStarterSet(speciesName: string): PokemonSet {
  const abilities = getAbilities(speciesName)
  return {
    ...createEmptySet(),
    species: speciesName,
    name: speciesName,
    ability: abilities[0] || '',
    level: 50,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: allNatures()[Math.floor(Math.random() * allNatures().length)].name,
    gender: randomGender(speciesName),
  }
}

/** Max team size based on round bracket */
export function getMaxTeamSize(round: number): number {
  if (round <= 10) return 3
  if (round <= 20) return 4
  if (round <= 30) return 5
  return 6
}

/** Get all possible evolutions of a species */
export function getEvolutions(speciesName: string): Array<{ name: string; bst: number }> {
  const species = getSpecies(speciesName)
  if (!species || !species.evos || species.evos.length === 0) return []
  return species.evos.map(evoName => {
    const evo = getSpecies(evoName)
    if (!evo) return null
    const bs = evo.baseStats as Record<string, number>
    const bst = Object.values(bs).reduce((a, b) => a + b, 0)
    return { name: evo.name, bst }
  }).filter(Boolean) as Array<{ name: string; bst: number }>
}

/** Target avg BST for a given round's opponent */
export function getTargetBST(round: number): number {
  return 300 + 10 * round
}

/** Evolution progress for each possible evolution */
export function getEvolutionProgress(speciesName: string, round: number): Array<{ evoName: string; evoBst: number; progress: number }> {
  const evos = getEvolutions(speciesName)
  if (evos.length === 0) return []
  const nextRoundBST = getTargetBST(round)
  return evos.map(evo => ({
    evoName: evo.name,
    evoBst: evo.bst,
    progress: Math.min(100, Math.round((nextRoundBST / evo.bst) * 100)),
  }))
}

/** Generate random Pokemon below a BST cap for the initial draft pick */
export function generateInitialDraftPicks(excludeSpecies: string[], count = 6, bstCap = 330): string[] {
  const candidates = getCandidates()
  const eligible = candidates.filter(c => c.bst < bstCap && !excludeSpecies.includes(c.name))
  const shuffled = [...eligible].sort(() => Math.random() - 0.5)
  const usedNames = new Set<string>()
  const picks: string[] = []
  for (const c of shuffled) {
    if (picks.length >= count) break
    if (usedNames.has(c.name)) continue
    picks.push(c.name)
    usedNames.add(c.name)
  }
  return picks
}

// ─── AI Team generation ─────────────────────────────────────────────────────

interface SpeciesCandidate {
  name: string
  bst: number
  types: string[]
  baseStats: Record<string, number>
}

function getAllCandidates(): SpeciesCandidate[] {
  const gen = getGen(9)
  const candidates: SpeciesCandidate[] = []
  for (const species of gen.species) {
    if (species.num <= 0) continue
    const bs = species.baseStats as Record<string, number>
    const bst = Object.values(bs).reduce((a, b) => a + b, 0)
    candidates.push({ name: species.name, bst, types: [...species.types], baseStats: bs })
  }
  return candidates
}

let _candidatesCache: SpeciesCandidate[] | null = null
function getCandidates(): SpeciesCandidate[] {
  if (!_candidatesCache) _candidatesCache = getAllCandidates()
  return _candidatesCache
}

/** Generate an AI team for a given round */
export function generateAITeam(round: number): PokemonSet[] {
  const targetBST = 300 + 10 * round
  const teamSize = getMaxTeamSize(round)
  const candidates = getCandidates()

  // Filter to BST window
  const minBST = Math.max(180, targetBST - 60)
  const maxBST = targetBST + 20
  let eligible = candidates.filter(c => c.bst >= minBST && c.bst <= maxBST)

  // Shuffle
  eligible = [...eligible].sort(() => Math.random() - 0.5)

  const team: SpeciesCandidate[] = []
  const usedNames = new Set<string>()

  for (const c of eligible) {
    if (team.length >= teamSize) break
    if (usedNames.has(c.name)) continue
    team.push(c)
    usedNames.add(c.name)
  }

  // Fallback: widen window if not enough
  if (team.length < teamSize) {
    const wider = candidates
      .filter(c => !usedNames.has(c.name))
      .sort((a, b) => Math.abs(a.bst - targetBST) - Math.abs(b.bst - targetBST))
    for (const c of wider) {
      if (team.length >= teamSize) break
      team.push(c)
      usedNames.add(c.name)
    }
  }

  return team.map(c => generateAIPokemonSet(c.name, c.baseStats, round))
}

function generateAIPokemonSet(
  speciesName: string,
  baseStats: Record<string, number>,
  round: number,
): PokemonSet {
  const abilities = getAbilities(speciesName)
  const ability = abilities[Math.floor(Math.random() * abilities.length)] || ''

  const totalEVs = Math.min(510, round * 15)
  const evs = distributeEVs(totalEVs, baseStats)
  const natures = allNatures()
  const nature = natures[Math.floor(Math.random() * natures.length)].name
  const item = BATTLE_ITEMS[Math.floor(Math.random() * BATTLE_ITEMS.length)]

  return {
    species: speciesName,
    name: speciesName,
    item,
    ability,
    moves: ['', '', '', ''], // Will be filled async
    nature,
    evs,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level: 50,
    gender: randomGender(speciesName),
  }
}

/** How many smart (optimized) move slots based on round bracket */
function getSmartMoveSlots(round: number): number {
  if (round <= 10) return 0
  if (round <= 20) return 1
  if (round <= 30) return 2
  return 3
}

/** Fill moves for a team. round=0 means fully random (used for draft picks). */
export async function fillAIMoves(team: PokemonSet[], round = 0): Promise<PokemonSet[]> {
  const gen = getGen(9)
  const smartSlots = getSmartMoveSlots(round)
  // Draft picks (round 0): cap at 50 BP. Opponent AI: cap at 50 + 3*round.
  const maxMovePower = round === 0 ? 50 : 50 + 3 * round
  const result: PokemonSet[] = []

  for (const poke of team) {
    const species = getSpecies(poke.species)
    if (!species) {
      result.push(poke)
      continue
    }

    const learnable = await gen.learnsets.learnable(poke.species)
    if (!learnable) {
      result.push(poke)
      continue
    }

    // Get all moves with their data
    const movePool: Array<{ name: string; type: string; basePower: number; category: string }> = []
    for (const moveId of Object.keys(learnable)) {
      const move = gen.moves.get(moveId)
      if (!move) continue
      // Filter out moves exceeding the power cap (status moves always allowed)
      if (move.category !== 'Status' && move.basePower > maxMovePower) continue
      movePool.push({
        name: move.name,
        type: move.type,
        basePower: move.basePower,
        category: move.category,
      })
    }

    const types = [...species.types]
    const moves = pickAIMoves(movePool, types, smartSlots)
    result.push({ ...poke, moves })
  }

  return result
}

function pickAIMoves(
  pool: Array<{ name: string; type: string; basePower: number; category: string }>,
  types: string[],
  smartSlots: number,
): [string, string, string, string] {
  const selected: string[] = []
  const usedTypes = new Set<string>()

  // Smart slots: pick optimized moves (STAB > coverage)
  if (smartSlots > 0) {
    const attacking = pool
      .filter(m => m.category !== 'Status' && m.basePower > 0)
      .sort((a, b) => b.basePower - a.basePower)

    // Pick best STAB moves first
    for (const m of attacking) {
      if (selected.length >= smartSlots) break
      if (types.includes(m.type) && !usedTypes.has(m.type)) {
        selected.push(m.name)
        usedTypes.add(m.type)
      }
    }

    // Fill with coverage (different types, highest BP)
    for (const m of attacking) {
      if (selected.length >= smartSlots) break
      if (!selected.includes(m.name) && !usedTypes.has(m.type)) {
        selected.push(m.name)
        usedTypes.add(m.type)
      }
    }
  }

  // Guarantee at least one attacking move
  const hasAttack = selected.some(name => {
    const m = pool.find(p => p.name === name)
    return m && m.category !== 'Status' && m.basePower > 0
  })
  if (!hasAttack) {
    const attackMoves = pool.filter(m => m.category !== 'Status' && m.basePower > 0 && !selected.includes(m.name))
    if (attackMoves.length > 0) {
      selected.push(attackMoves[Math.floor(Math.random() * attackMoves.length)].name)
    }
  }

  // Random slots: fill remaining with random moves from pool
  const remaining = pool.filter(m => !selected.includes(m.name))
  const shuffled = [...remaining].sort(() => Math.random() - 0.5)
  for (const m of shuffled) {
    if (selected.length >= 4) break
    selected.push(m.name)
  }

  while (selected.length < 4) selected.push('')
  return selected.slice(0, 4) as [string, string, string, string]
}

// ─── EV / Nature helpers ────────────────────────────────────────────────────

function distributeEVs(total: number, baseStats: Record<string, number>): Record<StatID, number> {
  const evs: Record<StatID, number> = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const statIds: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

  // Weight distribution toward highest base stats
  const weights = statIds.map(s => baseStats[s] || 50)
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  let remaining = total
  for (let i = 0; i < statIds.length && remaining > 0; i++) {
    const share = Math.min(252, Math.floor((weights[i] / totalWeight) * total))
    const capped = Math.min(share, remaining)
    evs[statIds[i]] = capped
    remaining -= capped
  }

  // Distribute leftover to speed
  if (remaining > 0) {
    evs.spe = Math.min(252, evs.spe + remaining)
  }

  return evs
}

export function pickNatureForStats(baseStats: Record<StatID, number>): string {
  const physical = baseStats.atk >= baseStats.spa
  if (physical) {
    if (baseStats.spe >= baseStats.def && baseStats.spe >= baseStats.spd) return 'Jolly'
    return 'Adamant'
  } else {
    if (baseStats.spe >= baseStats.def && baseStats.spe >= baseStats.spd) return 'Timid'
    return 'Modest'
  }
}

// ─── Reward generation ──────────────────────────────────────────────────────

export function generateRewardOptions(
  _round: number,
  roster: PokemonSet[],
  lastOpponentTeam: PokemonSet[],
  inventory: { items: string[]; unlockedTMs: Record<string, string[]> },
): RewardOption[] {
  const options: RewardOption[] = []

  // 1. Item reward
  const availableItems = BATTLE_ITEMS.filter(i => !inventory.items.includes(i))
  if (availableItems.length > 0) {
    const item = availableItems[Math.floor(Math.random() * availableItems.length)]
    options.push({
      type: 'item',
      label: `Item: ${item}`,
      description: `Add ${item} to your inventory.`,
      itemName: item,
    })
  }

  // 2. New move reward — player picks Pokemon, gets 4 random unlearned moves to choose from
  options.push({
    type: 'tm',
    label: 'Learn New Move',
    description: 'Teach a new move to a random Pokemon.',
  })

  // 3. Ability change
  const abilityTargets = roster.filter(p => {
    if (!p.species) return false
    const abs = getAbilities(p.species)
    return abs.length > 1
  })
  if (abilityTargets.length > 0) {
    const target = abilityTargets[Math.floor(Math.random() * abilityTargets.length)]
    const abs = getAbilities(target.species).filter(a => a !== target.ability)
    if (abs.length > 0) {
      const newAbility = abs[Math.floor(Math.random() * abs.length)]
      options.push({
        type: 'ability',
        label: `Ability: ${newAbility}`,
        description: `Change ${target.species}'s ability to ${newAbility}.`,
        targetSpecies: target.species,
      })
    }
  }

  // 4. EV boost — fixed Pokemon and stat, +80 EVs
  const stats: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
  const stat = stats[Math.floor(Math.random() * stats.length)]
  const evTarget = roster[Math.floor(Math.random() * roster.length)]
  const statNames: Record<StatID, string> = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp.Atk', spd: 'Sp.Def', spe: 'Speed' }
  if (evTarget?.species) {
    options.push({
      type: 'ev-boost',
      label: `+80 ${statNames[stat]} EV`,
      description: `Add 80 ${statNames[stat]} EVs to ${evTarget.species}.`,
      stat,
      targetSpecies: evTarget.species,
    })
  }

  // 5. Nature change — random Pokemon, random different nature
  const natureTarget = roster[Math.floor(Math.random() * roster.length)]
  if (natureTarget?.species) {
    const natures = allNatures().filter(n => n.name !== natureTarget.nature)
    const newNature = natures[Math.floor(Math.random() * natures.length)]
    if (newNature) {
      const plus = newNature.plus ? STAT_LABELS[newNature.plus] : null
      const minus = newNature.minus ? STAT_LABELS[newNature.minus] : null
      const effect = plus && minus ? ` (+${plus}, -${minus})` : ' (Neutral)'
      options.push({
        type: 'nature',
        label: `Nature: ${newNature.name}`,
        description: `Change ${natureTarget.species}'s nature to ${newNature.name}${effect}.`,
        targetSpecies: natureTarget.species,
        natureName: newNature.name,
      })
    }
  }

  // 6. New Pokemon from opponent
  if (lastOpponentTeam.length > 0) {
    const opponent = lastOpponentTeam[Math.floor(Math.random() * lastOpponentTeam.length)]
    if (opponent?.species) {
      const desc = roster.length >= 6
        ? `Replace a team member with ${opponent.species} from the defeated team.`
        : `Add ${opponent.species} from the defeated team to your roster.`
      options.push({
        type: 'new-pokemon',
        label: `Recruit: ${opponent.species}`,
        description: desc,
        pokemonSpecies: opponent.species,
      })
    }
  }

  return options
}
