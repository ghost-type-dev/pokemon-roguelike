import { create } from 'zustand'
import type { StatID } from '@pkmn/data'
import type { PokemonSet } from '../teambuilder/useTeamBuilder'
import { getAbilities } from '../teambuilder/dex-helpers'
import type { RewardOption } from './constants'
import {
  createStarterSet,
  generateRewardOptions,
  generateInitialDraftPicks,
  fillAIMoves,
  getEvolutionProgress,
  getMaxTeamSize,
} from './roguelike-helpers'

export type RoguelikePhase = 'idle' | 'draft-pick' | 'prepare' | 'battle' | 'reward' | 'game-over'

export interface RoguelikeInventory {
  items: string[]
  unlockedTMs: Record<string, string[]> // speciesName -> move names
}

interface Snapshot {
  roster: PokemonSet[]
  inventory: RoguelikeInventory
  round: number
  roundsWon: number
  rewardOptions: RewardOption[]
  lastOpponentTeam: PokemonSet[]
}

/** Stored opponent team to replay on retry after a loss */

interface RoguelikeState {
  phase: RoguelikePhase
  round: number
  roster: PokemonSet[]
  inventory: RoguelikeInventory
  aiDifficulty: 'random' | 'smart'
  starterChoices: string[]
  draftChoices: PokemonSet[]
  draftPicked: string[]
  rewardOptions: RewardOption[]
  lastOpponentTeam: PokemonSet[]
  roundsWon: number
  /** State before reward was applied — used to retry on loss */
  preRewardSnapshot: Snapshot | null
  /** Opponent team to reuse on retry after a loss */
  pendingOpponentTeam: PokemonSet[] | null

  // Actions
  startNewRun: (aiDifficulty: 'random' | 'smart') => void
  pickDraft: (species: string) => void
  updateRosterPokemon: (index: number, update: Partial<PokemonSet>) => void
  updateRosterMove: (index: number, moveIdx: number, move: string) => void
  swapRoster: (a: number, b: number) => void
  evolvePokemon: (index: number, evoSpecies: string) => void
  finishPrepare: () => void
  onBattleFinished: (won: boolean, opponentTeam: PokemonSet[]) => void
  applyReward: (reward: RewardOption, targetPokemonIdx?: number, stat?: StatID) => void
  setPhase: (phase: RoguelikePhase) => void
  saveRun: () => void
  loadRun: () => boolean
  exportRun: () => void
  importRun: (json: string) => boolean
  abandonRun: () => void
}

const STORAGE_KEY = 'pokemon-battle-tower-roguelike'

export const useRoguelikeStore = create<RoguelikeState>((set, get) => ({
  phase: 'idle',
  round: 1,
  roster: [],
  inventory: { items: [], unlockedTMs: {} },
  aiDifficulty: 'smart',
  starterChoices: [],
  draftChoices: [],
  draftPicked: [],
  rewardOptions: [],
  lastOpponentTeam: [],
  roundsWon: 0,
  preRewardSnapshot: null,
  pendingOpponentTeam: null,

  startNewRun: async (aiDifficulty) => {
    const speciesNames = generateInitialDraftPicks([], 6, 330)
    const draftSets = speciesNames.map(name => createStarterSet(name))
    // Show draft screen immediately while moves load
    set({
      phase: 'draft-pick',
      round: 1,
      roster: [],
      inventory: { items: [], unlockedTMs: {} },
      aiDifficulty,
      starterChoices: [],
      draftChoices: draftSets,
      draftPicked: [],
      rewardOptions: [],
      lastOpponentTeam: [],
      roundsWon: 0,
      preRewardSnapshot: null,
      pendingOpponentTeam: null,
    })
    // Fill moves async then update
    const withMoves = await fillAIMoves(draftSets)
    set({ draftChoices: withMoves })
    get().saveRun()
  },

  pickDraft: (species) => {
    const s = get()

    // Toggle off if already picked
    if (s.draftPicked.includes(species)) {
      set({
        draftPicked: s.draftPicked.filter(n => n !== species),
        roster: s.roster.filter(p => p.species !== species),
      })
      get().saveRun()
      return
    }

    const newPicked = [...s.draftPicked, species]
    const draftPoke = s.draftChoices.find(p => p.species === species)
    const newPoke = draftPoke ? { ...draftPoke } : createStarterSet(species)
    const newRoster = [...s.roster, newPoke]

    // Seed initial moves into unlockedTMs so they can be re-learned if swapped out
    const inventory = {
      items: [...s.inventory.items],
      unlockedTMs: { ...s.inventory.unlockedTMs },
    }
    const initialMoves = newPoke.moves.filter(Boolean)
    if (initialMoves.length > 0) {
      const existing = inventory.unlockedTMs[species] || []
      const combined = new Set([...existing, ...initialMoves])
      inventory.unlockedTMs[species] = [...combined]
    }

    if (newPicked.length >= 3) {
      // Done picking — go to reward before first round
      const rewards = generateRewardOptions(0, newRoster, [], inventory)
      set({
        phase: 'reward',
        roster: newRoster,
        inventory,
        draftPicked: newPicked,
        draftChoices: [],
        rewardOptions: rewards,
        roundsWon: 0,
      })
    } else {
      set({
        roster: newRoster,
        inventory,
        draftPicked: newPicked,
      })
    }
    get().saveRun()
  },

  updateRosterPokemon: (index, update) => {
    set((s) => {
      const roster = [...s.roster]
      if (roster[index]) {
        roster[index] = { ...roster[index], ...update }
      }
      return { roster }
    })
    get().saveRun()
  },

  updateRosterMove: (index, moveIdx, move) => {
    set((s) => {
      const roster = [...s.roster]
      if (roster[index]) {
        const moves = [...roster[index].moves] as [string, string, string, string]
        moves[moveIdx] = move
        roster[index] = { ...roster[index], moves }
      }
      return { roster }
    })
    get().saveRun()
  },

  swapRoster: (a, b) => {
    set((s) => {
      const roster = [...s.roster]
      if (a >= 0 && b >= 0 && a < roster.length && b < roster.length) {
        ;[roster[a], roster[b]] = [roster[b], roster[a]]
      }
      return { roster }
    })
    get().saveRun()
  },

  evolvePokemon: (index, evoSpecies) => {
    set((s) => {
      const roster = [...s.roster]
      const p = roster[index]
      if (!p?.species) return { roster }
      const evos = getEvolutionProgress(p.species, s.round)
      const evo = evos.find(e => e.evoName === evoSpecies)
      if (!evo || evo.progress < 100) return { roster }
      const newAbilities = getAbilities(evoSpecies)
      roster[index] = {
        ...p,
        species: evoSpecies,
        name: evoSpecies,
        ability: newAbilities[0] || p.ability,
      }
      return { roster }
    })
    get().saveRun()
  },

  finishPrepare: () => {
    set({ phase: 'battle' })
    get().saveRun()
  },

  onBattleFinished: (won, opponentTeam) => {
    if (won) {
      const s = get()
      // Grant +2 EVs in each stat to every Pokemon that participated
      const maxSize = getMaxTeamSize(s.round)
      const statIds: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
      const updatedRoster = s.roster.map((p, i) => {
        if (i >= maxSize) return p
        const evs = { ...p.evs }
        const currentTotal = Object.values(evs).reduce((a, b) => a + b, 0)
        let added = 0
        for (const stat of statIds) {
          const add = Math.min(2, 252 - evs[stat], 510 - currentTotal - added)
          if (add > 0) {
            evs[stat] += add
            added += add
          }
        }
        return { ...p, evs }
      })
      set({ roster: updatedRoster })
      const newRoundsWon = s.roundsWon + 1
      // Round 40 is the final round — victory!
      if (s.round >= 40) {
        set({
          phase: 'game-over',
          roundsWon: newRoundsWon,
          lastOpponentTeam: opponentTeam,
          pendingOpponentTeam: null,
        })
      } else {
        const rewards = generateRewardOptions(s.round, s.roster, opponentTeam, s.inventory)
        set({
          phase: 'reward',
          roundsWon: newRoundsWon,
          lastOpponentTeam: opponentTeam,
          pendingOpponentTeam: null,
          rewardOptions: rewards,
          // Save snapshot so we can retry from this reward screen on loss
          preRewardSnapshot: {
            roster: s.roster.map(p => ({ ...p, evs: { ...p.evs }, ivs: { ...p.ivs }, moves: [...p.moves] as [string, string, string, string] })),
            inventory: { items: [...s.inventory.items], unlockedTMs: { ...s.inventory.unlockedTMs } },
            round: s.round,
            roundsWon: newRoundsWon,
            rewardOptions: rewards,
            lastOpponentTeam: opponentTeam,
          },
        })
      }
    } else {
      // On loss: go back to prepare so the player can adjust, then retry
      // with the exact same opponent team
      set({
        phase: 'prepare',
        lastOpponentTeam: opponentTeam,
        pendingOpponentTeam: opponentTeam,
      })
    }
    get().saveRun()
  },

  applyReward: (reward, _targetPokemonIdx, _stat) => {
    set((s) => {
      const roster = [...s.roster]
      const inventory = {
        items: [...s.inventory.items],
        unlockedTMs: { ...s.inventory.unlockedTMs },
      }

      switch (reward.type) {
        case 'item':
          if (reward.itemName) {
            inventory.items.push(reward.itemName)
          }
          break

        case 'tm':
          if (reward.moveName && reward.targetSpecies) {
            const existing = inventory.unlockedTMs[reward.targetSpecies] || []
            inventory.unlockedTMs[reward.targetSpecies] = [...existing, reward.moveName]
          }
          break

        case 'ability':
          if (reward.targetSpecies) {
            const idx = roster.findIndex(p => p.species === reward.targetSpecies)
            if (idx >= 0) {
              const abs = getAbilities(roster[idx].species).filter(a => a !== roster[idx].ability)
              if (abs.length > 0) {
                roster[idx] = { ...roster[idx], ability: abs[Math.floor(Math.random() * abs.length)] }
              }
            }
          }
          break

        case 'ev-boost':
          if (reward.targetSpecies && reward.stat) {
            const idx = roster.findIndex(p => p.species === reward.targetSpecies)
            if (idx >= 0) {
              const p = roster[idx]
              const evs = { ...p.evs }
              const currentTotal = Object.values(evs).reduce((a, b) => a + b, 0)
              const add = Math.min(80, 252 - evs[reward.stat], 510 - currentTotal)
              evs[reward.stat] = evs[reward.stat] + add
              roster[idx] = { ...p, evs }
            }
          }
          break

        case 'nature':
          if (reward.targetSpecies && reward.natureName) {
            const idx = roster.findIndex(p => p.species === reward.targetSpecies)
            if (idx >= 0) {
              roster[idx] = { ...roster[idx], nature: reward.natureName }
            }
          }
          break

        case 'new-pokemon':
          if (reward.pokemonSpecies) {
            // Keep the opponent's actual set (moves, EVs, nature, etc.) but strip held item
            const recruited = s.lastOpponentTeam.find(p => p.species === reward.pokemonSpecies)
            const newPoke = recruited
              ? { ...recruited, item: '', evs: { ...recruited.evs }, ivs: { ...recruited.ivs }, moves: [...recruited.moves] as [string, string, string, string] }
              : createStarterSet(reward.pokemonSpecies)
            // Seed initial moves into unlockedTMs so they can be re-learned if swapped out
            const recruitMoves = newPoke.moves.filter(Boolean)
            if (recruitMoves.length > 0) {
              const existing = inventory.unlockedTMs[reward.pokemonSpecies] || []
              const combined = new Set([...existing, ...recruitMoves])
              inventory.unlockedTMs[reward.pokemonSpecies] = [...combined]
            }
            if (roster.length < 6) {
              roster.push(newPoke)
            } else if (reward.replaceIndex != null && reward.replaceIndex >= 0 && reward.replaceIndex < roster.length) {
              roster[reward.replaceIndex] = newPoke
            }
          }
          break
      }

      return {
        roster,
        inventory,
        phase: 'prepare' as RoguelikePhase,
        round: s.round + 1,
        rewardOptions: [],
      }
    })
    get().saveRun()
  },

  setPhase: (phase) => {
    set({ phase })
    get().saveRun()
  },

  saveRun: () => {
    try {
      const s = get()
      const data = {
        phase: s.phase,
        round: s.round,
        roster: s.roster,
        inventory: s.inventory,
        aiDifficulty: s.aiDifficulty,
        starterChoices: s.starterChoices,
        draftChoices: s.draftChoices,
        draftPicked: s.draftPicked,
        rewardOptions: s.rewardOptions,
        lastOpponentTeam: s.lastOpponentTeam,
        roundsWon: s.roundsWon,
        pendingOpponentTeam: s.pendingOpponentTeam,
        preRewardSnapshot: s.preRewardSnapshot,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save roguelike run:', e)
    }
  },

  loadRun: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      if (data.phase === 'idle' || data.phase === 'game-over') return false
      set(data)
      return true
    } catch (e) {
      console.error('Failed to load roguelike run:', e)
      return false
    }
  },

  exportRun: () => {
    const s = get()
    const data = {
      phase: s.phase,
      round: s.round,
      roster: s.roster,
      inventory: s.inventory,
      aiDifficulty: s.aiDifficulty,
      starterChoices: s.starterChoices,
      draftChoices: s.draftChoices,
      draftPicked: s.draftPicked,
      rewardOptions: s.rewardOptions,
      lastOpponentTeam: s.lastOpponentTeam,
      roundsWon: s.roundsWon,
      pendingOpponentTeam: s.pendingOpponentTeam,
      preRewardSnapshot: s.preRewardSnapshot,
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roguelike-round${s.round}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  importRun: (json) => {
    try {
      const data = JSON.parse(json)
      if (!data.phase || !data.roster) return false
      set(data)
      get().saveRun()
      return true
    } catch (e) {
      console.error('Failed to import roguelike run:', e)
      return false
    }
  },

  abandonRun: () => {
    set({
      phase: 'idle',
      round: 1,
      roster: [],
      inventory: { items: [], unlockedTMs: {} },
      starterChoices: [],
      draftChoices: [],
      draftPicked: [],
      rewardOptions: [],
      lastOpponentTeam: [],
      roundsWon: 0,
      preRewardSnapshot: null,
      pendingOpponentTeam: null,
    })
    localStorage.removeItem(STORAGE_KEY)
  },
}))
