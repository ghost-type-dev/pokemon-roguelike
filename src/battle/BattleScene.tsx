import { useMemo } from 'react'
import { useBattleStore } from './useBattleStore'
import { PokemonSprite } from './PokemonSprite'
import { HPBar } from './HPBar'
import { formatLine } from './formatLine'

interface PokemonState {
  name: string
  species: string
  hp: number
  maxHp: number
  level: number
  status: string
  fainted: boolean
}

type TeamMemberStatus = 'alive' | 'fainted' | 'unknown'

interface TeamOverview {
  size: number
  members: Map<string, { name: string; fainted: boolean; hpPercent: number }>
  activeName: string | null
}

interface ParsedBattleState {
  p1: PokemonState | null
  p2: PokemonState | null
  p1Team: TeamOverview
  p2Team: TeamOverview
}

function parseActiveState(events: Array<{ data: string }>): ParsedBattleState {
  let p1: PokemonState | null = null
  let p2: PokemonState | null = null

  const p1Team: TeamOverview = { size: 6, members: new Map(), activeName: null }
  const p2Team: TeamOverview = { size: 6, members: new Map(), activeName: null }

  for (const event of events) {
    const line = event.data
    const parts = line.split('|').slice(1) // remove leading empty

    if (!parts.length) continue
    const type = parts[0]

    if (type === 'teamsize') {
      const player = parts[1]?.trim()
      const size = parseInt(parts[2]) || 6
      if (player === 'p1') p1Team.size = size
      else if (player === 'p2') p2Team.size = size
    }

    if (type === 'poke') {
      const player = parts[1]?.trim()
      const details = parts[2] || ''
      const species = details.split(',')[0].trim()
      const team = player === 'p1' ? p1Team : p2Team
      if (!team.members.has(species)) {
        team.members.set(species, { name: species, fainted: false, hpPercent: 100 })
      }
    }

    if (type === 'switch' || type === 'drag' || type === 'replace') {
      const ident = parts[1] || ''
      const details = parts[2] || ''
      const condition = parts[3] || ''
      const side = ident.startsWith('p1') ? 'p1' : 'p2'
      const species = details.split(',')[0].trim()
      const name = ident.split(': ')[1] || species
      const level = parseInt(details.match(/L(\d+)/)?.[1] || '100')
      const { hp, maxHp, status } = parseCondition(condition)

      const state: PokemonState = {
        name,
        species,
        hp,
        maxHp,
        level,
        status,
        fainted: false,
      }

      if (side === 'p1') { p1 = state; p1Team.activeName = name }
      else { p2 = state; p2Team.activeName = name }

      // Track in team roster
      const team = side === 'p1' ? p1Team : p2Team
      const hpPercent = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 100
      team.members.set(name, { name, fainted: false, hpPercent })
    }

    if (type === '-damage' || type === '-heal') {
      const ident = parts[1] || ''
      const condition = parts[2] || ''
      const side = ident.startsWith('p1') ? 'p1' : 'p2'
      const target = side === 'p1' ? p1 : p2

      if (target) {
        const { hp, maxHp, status } = parseCondition(condition)
        target.hp = hp
        target.maxHp = maxHp || target.maxHp
        if (status) target.status = status
        target.fainted = hp === 0

        // Update team roster
        const team = side === 'p1' ? p1Team : p2Team
        const effectiveMax = maxHp || target.maxHp
        const hpPercent = effectiveMax > 0 ? Math.round((hp / effectiveMax) * 100) : 0
        const member = team.members.get(target.name)
        if (member) {
          member.hpPercent = hpPercent
          member.fainted = hp === 0
        }
      }
    }

    if (type === 'faint') {
      const ident = parts[1] || ''
      const side = ident.startsWith('p1') ? 'p1' : 'p2'
      const target = side === 'p1' ? p1 : p2
      if (target) {
        target.hp = 0
        target.fainted = true

        const team = side === 'p1' ? p1Team : p2Team
        const member = team.members.get(target.name)
        if (member) {
          member.fainted = true
          member.hpPercent = 0
        }
      }
    }

    if (type === '-status') {
      const ident = parts[1] || ''
      const side = ident.startsWith('p1') ? 'p1' : 'p2'
      const target = side === 'p1' ? p1 : p2
      if (target) target.status = parts[2] || ''
    }

    if (type === '-curestatus') {
      const ident = parts[1] || ''
      const side = ident.startsWith('p1') ? 'p1' : 'p2'
      const target = side === 'p1' ? p1 : p2
      if (target) target.status = ''
    }
  }

  return { p1, p2, p1Team, p2Team }
}

function parseCondition(condition: string): { hp: number; maxHp: number; status: string } {
  if (condition === '0 fnt') return { hp: 0, maxHp: 0, status: '' }

  const statusMatch = condition.match(/\s+(brn|par|slp|frz|psn|tox)$/)
  const status = statusMatch?.[1] || ''
  const hpPart = condition.replace(/\s+(brn|par|slp|frz|psn|tox)$/, '')

  const [current, max] = hpPart.split('/')
  return {
    hp: parseInt(current) || 0,
    maxHp: parseInt(max) || 0,
    status,
  }
}

function TeamIndicator({ team }: { team: TeamOverview }) {
  const indicators: { status: TeamMemberStatus; name?: string }[] = []

  // Add known members
  for (const [, member] of team.members) {
    indicators.push({
      status: member.fainted ? 'fainted' : 'alive',
      name: member.name,
    })
  }

  // Fill remaining slots as unknown
  for (let i = indicators.length; i < team.size; i++) {
    indicators.push({ status: 'unknown' })
  }

  return (
    <div className="flex gap-1">
      {indicators.map((ind, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full border ${
            ind.status === 'alive'
              ? 'bg-green-500 border-green-400'
              : ind.status === 'fainted'
              ? 'bg-red-800 border-red-700'
              : 'bg-gray-600 border-gray-500'
          }`}
          title={ind.name || (ind.status === 'unknown' ? '?' : ind.status)}
        />
      ))}
    </div>
  )
}

function TurnNarration({ events }: { events: Array<{ data: string }> }) {
  const lines = useMemo(() => {
    // Find the last two |turn| markers to get the most recent completed turn's events
    // Events go: ...actions... |turn|N ...actions... |turn|N+1
    // When waiting for input, the interesting events are between the two most recent |turn| markers
    // If events exist after the last |turn|, show those instead (mid-turn playback)
    const turnIndices: number[] = []
    for (let i = 0; i < events.length; i++) {
      const type = events[i].data.split('|')[1]
      if (type === 'turn') turnIndices.push(i)
    }

    let turnEvents: Array<{ data: string }>
    const lastTurnIdx = turnIndices[turnIndices.length - 1] ?? -1

    // Check if there are meaningful events after the last |turn|
    const eventsAfterTurn = lastTurnIdx >= 0 ? events.slice(lastTurnIdx + 1) : []
    const hasEventsAfterTurn = eventsAfterTurn.some((e) => {
      const t = e.data.split('|')[1]
      return t === 'move' || t === 'switch' || t === 'faint' || t === '-damage' || t === 'drag'
    })

    if (hasEventsAfterTurn) {
      // Mid-turn: show events after the last |turn|
      turnEvents = eventsAfterTurn
    } else if (turnIndices.length >= 2) {
      // Waiting for input: show events from the previous completed turn
      const prevTurnIdx = turnIndices[turnIndices.length - 2]
      turnEvents = events.slice(prevTurnIdx + 1, lastTurnIdx)
    } else if (lastTurnIdx >= 0) {
      // Only one turn marker: show events before it
      turnEvents = events.slice(0, lastTurnIdx)
    } else {
      turnEvents = events
    }

    return turnEvents
      .map((e) => formatLine(e.data))
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .filter((l) => !l.className.includes('text-xs')) // skip dim meta lines
  }, [events])

  if (!lines.length) return null

  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 rounded px-3 py-1.5 max-w-96 max-h-40 overflow-y-auto pointer-events-auto">
      {lines.map((line, i) => (
        <div key={i} className={`${line.className} text-xs leading-tight`}>
          {line.text}
        </div>
      ))}
    </div>
  )
}

export function BattleScene() {
  const visibleEvents = useBattleStore((s) => s.visibleEvents)
  const p1Name = useBattleStore((s) => s.p1Name)
  const p2Name = useBattleStore((s) => s.p2Name)
  const status = useBattleStore((s) => s.status)

  const { p1, p2, p1Team, p2Team } = useMemo(() => parseActiveState(visibleEvents), [visibleEvents])

  if (status === 'idle') {
    return (
      <div className="bg-gray-800 rounded-lg h-72 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Configure and start a battle below</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-sky-900 via-sky-800 to-green-900 rounded-lg h-72 relative overflow-hidden">
      {/* Grass/ground area */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-green-800 to-transparent" />

      {/* Player 2 (opponent) - top right */}
      <div className="absolute top-4 right-8">
        <div className="flex justify-end mb-1">
          <TeamIndicator team={p2Team} />
        </div>
        {p2 && (
          <HPBar
            name={p2.name}
            current={p2.hp}
            max={p2.maxHp}
            level={p2.level}
            status={p2.status}
          />
        )}
      </div>
      <div className="absolute top-20 right-16">
        {p2 && <PokemonSprite species={p2.species} side="p2" fainted={p2.fainted} />}
      </div>

      {/* Player 2 label */}
      <div className="absolute top-2 right-4 text-xs text-gray-400">{p2Name}</div>

      {/* Player 1 (us) - bottom left */}
      <div className="absolute bottom-24 left-8">
        <div className="mb-1">
          <TeamIndicator team={p1Team} />
        </div>
        {p1 && (
          <HPBar
            name={p1.name}
            current={p1.hp}
            max={p1.maxHp}
            level={p1.level}
            status={p1.status}
          />
        )}
      </div>
      <div className="absolute bottom-4 left-16">
        {p1 && <PokemonSprite species={p1.species} side="p1" fainted={p1.fainted} />}
      </div>

      {/* Player 1 label */}
      <div className="absolute bottom-2 left-4 text-xs text-gray-400">{p1Name}</div>

      {/* Turn narration overlay */}
      <TurnNarration events={visibleEvents} />
    </div>
  )
}
