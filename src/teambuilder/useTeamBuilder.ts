import { create } from 'zustand'
import { Teams } from '@pkmn/sim'
import { TeamGenerators } from '@pkmn/randoms'
import type { StatID } from '@pkmn/data'

Teams.setGeneratorFactory(TeamGenerators)

export interface PokemonSet {
  species: string
  name: string
  item: string
  ability: string
  moves: [string, string, string, string]
  nature: string
  evs: Record<StatID, number>
  ivs: Record<StatID, number>
  level: number
  gender: '' | 'M' | 'F'
}

export function createEmptySet(): PokemonSet {
  return {
    species: '',
    name: '',
    item: '',
    ability: '',
    moves: ['', '', '', ''],
    nature: 'Adamant',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level: 50,
    gender: '',
  }
}

export interface Team {
  id: string
  name: string
  pokemon: PokemonSet[]
}

interface TeamBuilderState {
  teams: Team[]
  activeTeamId: string | null
  activeSlot: number

  addTeam: () => void
  removeTeam: (id: string) => void
  renameTeam: (id: string, name: string) => void
  setActiveTeam: (id: string) => void
  setActiveSlot: (slot: number) => void
  updatePokemon: (teamId: string, slot: number, update: Partial<PokemonSet>) => void
  updatePokemonMove: (teamId: string, slot: number, moveIndex: number, move: string) => void
  updatePokemonEV: (teamId: string, slot: number, stat: StatID, value: number) => void
  updatePokemonIV: (teamId: string, slot: number, stat: StatID, value: number) => void
  removePokemonFromSlot: (teamId: string, slot: number) => void
  randomizeTeam: (teamId: string, formatId?: string) => void
  loadTeams: () => void
  saveTeams: () => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export const useTeamBuilder = create<TeamBuilderState>((set, get) => ({
  teams: [],
  activeTeamId: null,
  activeSlot: 0,

  addTeam: () => {
    const team: Team = {
      id: generateId(),
      name: `Team ${get().teams.length + 1}`,
      pokemon: Array.from({ length: 6 }, () => createEmptySet()),
    }
    set((s) => ({ teams: [...s.teams, team], activeTeamId: team.id }))
    get().saveTeams()
  },

  removeTeam: (id) => {
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      activeTeamId: s.activeTeamId === id ? null : s.activeTeamId,
    }))
    get().saveTeams()
  },

  renameTeam: (id, name) => {
    set((s) => ({
      teams: s.teams.map((t) => (t.id === id ? { ...t, name } : t)),
    }))
    get().saveTeams()
  },

  setActiveTeam: (id) => set({ activeTeamId: id, activeSlot: 0 }),
  setActiveSlot: (slot) => set({ activeSlot: slot }),

  updatePokemon: (teamId, slot, update) => {
    set((s) => ({
      teams: s.teams.map((t) => {
        if (t.id !== teamId) return t
        const pokemon = [...t.pokemon]
        pokemon[slot] = { ...pokemon[slot], ...update }
        return { ...t, pokemon }
      }),
    }))
    get().saveTeams()
  },

  updatePokemonMove: (teamId, slot, moveIndex, move) => {
    set((s) => ({
      teams: s.teams.map((t) => {
        if (t.id !== teamId) return t
        const pokemon = [...t.pokemon]
        const moves = [...pokemon[slot].moves] as [string, string, string, string]
        moves[moveIndex] = move
        pokemon[slot] = { ...pokemon[slot], moves }
        return { ...t, pokemon }
      }),
    }))
    get().saveTeams()
  },

  updatePokemonEV: (teamId, slot, stat, value) => {
    set((s) => ({
      teams: s.teams.map((t) => {
        if (t.id !== teamId) return t
        const pokemon = [...t.pokemon]
        const evs = { ...pokemon[slot].evs, [stat]: Math.min(252, Math.max(0, value)) }
        // Enforce 510 total EV cap
        const total = Object.values(evs).reduce((a, b) => a + b, 0)
        if (total > 510) {
          evs[stat] = Math.max(0, evs[stat] - (total - 510))
        }
        pokemon[slot] = { ...pokemon[slot], evs }
        return { ...t, pokemon }
      }),
    }))
    get().saveTeams()
  },

  updatePokemonIV: (teamId, slot, stat, value) => {
    set((s) => ({
      teams: s.teams.map((t) => {
        if (t.id !== teamId) return t
        const pokemon = [...t.pokemon]
        const ivs = { ...pokemon[slot].ivs, [stat]: Math.min(31, Math.max(0, value)) }
        pokemon[slot] = { ...pokemon[slot], ivs }
        return { ...t, pokemon }
      }),
    }))
    get().saveTeams()
  },

  removePokemonFromSlot: (teamId, slot) => {
    set((s) => ({
      teams: s.teams.map((t) => {
        if (t.id !== teamId) return t
        const pokemon = [...t.pokemon]
        pokemon[slot] = createEmptySet()
        return { ...t, pokemon }
      }),
    }))
    get().saveTeams()
  },

  randomizeTeam: (teamId, formatId = 'gen9randombattle') => {
    const gen = TeamGenerators.getTeamGenerator(formatId)
    const randomSets = gen.getTeam()
    const pokemon: PokemonSet[] = randomSets.map((s: any) => {
      const moves = [...(s.moves || [])] as [string, string, string, string]
      while (moves.length < 4) moves.push('')
      return {
        species: s.species || s.name,
        name: s.name || s.species,
        item: s.item || '',
        ability: s.ability || '',
        moves: moves.slice(0, 4) as [string, string, string, string],
        nature: s.nature || 'Adamant',
        evs: { hp: s.evs?.hp ?? 0, atk: s.evs?.atk ?? 0, def: s.evs?.def ?? 0, spa: s.evs?.spa ?? 0, spd: s.evs?.spd ?? 0, spe: s.evs?.spe ?? 0 },
        ivs: { hp: s.ivs?.hp ?? 31, atk: s.ivs?.atk ?? 31, def: s.ivs?.def ?? 31, spa: s.ivs?.spa ?? 31, spd: s.ivs?.spd ?? 31, spe: s.ivs?.spe ?? 31 },
        level: 50,
        gender: (s.gender as '' | 'M' | 'F') || '',
      }
    })
    while (pokemon.length < 6) pokemon.push(createEmptySet())

    set((s) => ({
      teams: s.teams.map((t) => (t.id === teamId ? { ...t, pokemon: pokemon.slice(0, 6) } : t)),
    }))
    get().saveTeams()
  },

  loadTeams: () => {
    try {
      const raw = localStorage.getItem('pokemon-battle-tower-teams')
      if (raw) {
        const teams = JSON.parse(raw) as Team[]
        set({ teams, activeTeamId: teams[0]?.id || null })
      }
    } catch (e) {
      console.error('Failed to load teams:', e)
    }
  },

  saveTeams: () => {
    try {
      localStorage.setItem('pokemon-battle-tower-teams', JSON.stringify(get().teams))
    } catch (e) {
      console.error('Failed to save teams:', e)
    }
  },
}))
