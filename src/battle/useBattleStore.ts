import { create } from 'zustand'
import type { BattleEvent, BattleStatus } from '../engine/types'

interface AIInfo {
  id: string
  name: string
  description: string
  configurable?: boolean
}

interface BattleState {
  status: BattleStatus
  events: BattleEvent[]
  visibleEvents: BattleEvent[]
  currentTurn: number
  winner: string | null
  p1Name: string
  p2Name: string
  p1AI: string
  p2AI: string
  p1Team: string
  p2Team: string
  formatId: string
  playbackSpeed: number
  isReplaying: boolean
  humanRequest: any | null
  teamInfo: any | null
  availableAIs: AIInfo[]
  warnings: string[]

  setStatus: (status: BattleStatus) => void
  addEvent: (event: BattleEvent) => void
  setEvents: (events: BattleEvent[]) => void
  addVisibleEvent: (event: BattleEvent) => void
  setVisibleEvents: (events: BattleEvent[]) => void
  setWinner: (winner: string | null) => void
  setConfig: (config: Partial<Pick<BattleState, 'p1Name' | 'p2Name' | 'p1AI' | 'p2AI' | 'p1Team' | 'p2Team' | 'formatId'>>) => void
  setPlaybackSpeed: (speed: number) => void
  setIsReplaying: (replaying: boolean) => void
  setHumanRequest: (request: any | null) => void
  setTeamInfo: (info: any | null) => void
  setAvailableAIs: (ais: AIInfo[]) => void
  addWarning: (warning: string) => void
  reset: () => void
}

export const useBattleStore = create<BattleState>((set) => ({
  status: 'idle',
  events: [],
  visibleEvents: [],
  currentTurn: 0,
  winner: null,
  p1Name: 'Player 1',
  p2Name: 'Player 2',
  p1AI: 'human',
  p2AI: 'random',
  p1Team: '',
  p2Team: '',
  formatId: 'gen9randombattle',
  playbackSpeed: 1,
  isReplaying: false,
  humanRequest: null,
  teamInfo: null,
  availableAIs: [],
  warnings: [],

  setStatus: (status) => set({ status }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  setEvents: (events) => set({ events }),
  addVisibleEvent: (event) => set((s) => ({
    visibleEvents: [...s.visibleEvents, event],
    currentTurn: event.turn ?? s.currentTurn,
  })),
  setVisibleEvents: (events) => set({ visibleEvents: events }),
  setWinner: (winner) => set({ winner }),
  setConfig: (config) => set(config),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setIsReplaying: (isReplaying) => set({ isReplaying }),
  setHumanRequest: (humanRequest) => set((s) => ({
    humanRequest,
    teamInfo: humanRequest?.side ?? s.teamInfo,
  })),
  setTeamInfo: (teamInfo) => set({ teamInfo }),
  setAvailableAIs: (availableAIs) => set({ availableAIs }),
  addWarning: (warning) => set((s) => ({ warnings: [...s.warnings, warning] })),
  reset: () => set({
    status: 'idle',
    events: [],
    visibleEvents: [],
    currentTurn: 0,
    winner: null,
    isReplaying: false,
    humanRequest: null,
    teamInfo: null,
    warnings: [],
  }),
}))
