export interface BattleConfig {
  formatId: string
  p1: PlayerConfig
  p2: PlayerConfig
  seed?: number[]
}

export interface PlayerConfig {
  name: string
  team: string // packed team string
}

export interface BattleEvent {
  type: 'protocol' | 'turn' | 'win' | 'error'
  data: string
  turn?: number
}

export type BattleStatus = 'idle' | 'running' | 'paused' | 'finished'
