import { calculate, Generations, Pokemon, Move } from '@smogon/calc'

const gen = Generations.get(9)

// ─── Interface ──────────────────────────────────────────────────────────────

export interface LocalAI {
  readonly id: string
  initialize(playerId: string): void
  chooseAction(request: any): string
  receiveUpdate(line: string): void
}

// ─── Random AI ──────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function range(start: number, end: number): number[] {
  const result: number[] = []
  for (let i = start; i <= end; i++) result.push(i)
  return result
}

function randomChoose(request: any): string {
  if (request.forceSwitch) return randomForceSwitch(request)
  if (request.teamPreview) return randomTeamPreview(request)
  if (request.active) return randomMove(request)
  return 'default'
}

function randomForceSwitch(request: any): string {
  const pokemon = request.side.pokemon
  const chosen: number[] = []
  const choices = request.forceSwitch.map((mustSwitch: boolean) => {
    if (!mustSwitch) return 'pass'
    const canSwitch = range(1, 6).filter(j => (
      pokemon[j - 1] && j > request.forceSwitch.length &&
      !chosen.includes(j) && !pokemon[j - 1].condition.endsWith(' fnt')
    ))
    if (!canSwitch.length) return 'pass'
    const target = randomItem(canSwitch)
    chosen.push(target)
    return `switch ${target}`
  })
  return choices.join(', ')
}

function randomTeamPreview(request: any): string {
  const pokemon = request.side.pokemon
  const order = range(1, pokemon.length)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]]
  }
  return `team ${order.join('')}`
}

function randomMove(request: any): string {
  const pokemon = request.side.pokemon
  const chosen: number[] = []
  const choices = request.active.map((active: any, i: number) => {
    if (pokemon[i].condition.endsWith(' fnt') || pokemon[i].commanding) return 'pass'
    const canMove = active.moves?.filter((m: any) => !m.disabled) || []
    const canSwitch = range(1, 6).filter(j => (
      pokemon[j - 1] && j > request.active.length &&
      !chosen.includes(j) && !pokemon[j - 1].condition.endsWith(' fnt')
    ))
    if (canMove.length && (Math.random() < 0.9 || !canSwitch.length)) {
      const move = randomItem(canMove)
      return `move ${active.moves.indexOf(move) + 1}`
    }
    if (canSwitch.length) {
      const target = randomItem(canSwitch)
      chosen.push(target)
      return `switch ${target}`
    }
    if (canMove.length) return `move ${active.moves.indexOf(canMove[0]) + 1}`
    return 'move 1'
  })
  return choices.join(', ')
}

export class RandomAI implements LocalAI {
  readonly id = 'random'
  initialize() {}
  chooseAction(request: any): string { return randomChoose(request) }
  receiveUpdate() {}
}

// ─── Heuristic AI ───────────────────────────────────────────────────────────

interface OpponentPokemon {
  species: string
  hpPercent: number
  status: string
  knownMoves: string[]
  knownItem: string | null
  knownAbility: string | null
  boosts: Record<string, number>
}

interface FieldState {
  weather: string | null
  terrain: string | null
  p1Hazards: Set<string>
  p2Hazards: Set<string>
  p1Screens: Set<string>
  p2Screens: Set<string>
}

function parseHP(condition: string): number {
  if (!condition || condition === '0 fnt' || condition.endsWith(' fnt')) return 0
  const hpPart = condition.replace(/\s+(brn|par|slp|frz|psn|tox)$/, '')
  const [current, max] = hpPart.split('/')
  if (!max) return 100
  return Math.round((parseInt(current) / parseInt(max)) * 100)
}

function parseStatus(condition: string): string {
  const match = condition.match(/\s+(brn|par|slp|frz|psn|tox)$/)
  return match ? match[1] : ''
}

export class HeuristicAI implements LocalAI {
  readonly id = 'heuristic'
  private playerId = ''
  private opponentId = ''
  private opponent = new Map<string, OpponentPokemon>()
  private opponentActive: string | null = null
  private field: FieldState = {
    weather: null, terrain: null,
    p1Hazards: new Set(), p2Hazards: new Set(),
    p1Screens: new Set(), p2Screens: new Set(),
  }

  initialize(playerId: string) {
    this.playerId = playerId
    this.opponentId = playerId === 'p1' ? 'p2' : 'p1'
    this.opponent.clear()
    this.opponentActive = null
    this.field = {
      weather: null, terrain: null,
      p1Hazards: new Set(), p2Hazards: new Set(),
      p1Screens: new Set(), p2Screens: new Set(),
    }
  }

  chooseAction(request: any): string {
    if (request.forceSwitch) return this.handleForceSwitch(request)
    if (request.teamPreview) return this.handleTeamPreview(request)
    if (request.active) return this.handleMove(request)
    return 'default'
  }

  receiveUpdate(line: string) {
    this.parseLine(line)
  }

  private parseLine(line: string) {
    if (!line.startsWith('|')) return
    const parts = line.split('|')
    const cmd = parts[1]

    switch (cmd) {
      case 'switch':
      case 'drag': {
        const ident = parts[2] || ''
        if (!ident.startsWith(this.opponentId)) break
        const details = parts[3] || ''
        const species = details.split(',')[0].trim()
        const condition = parts[4] || ''
        this.opponentActive = species
        if (!this.opponent.has(species)) {
          this.opponent.set(species, {
            species, hpPercent: parseHP(condition), status: parseStatus(condition),
            knownMoves: [], knownItem: null, knownAbility: null, boosts: {},
          })
        } else {
          const opp = this.opponent.get(species)!
          opp.hpPercent = parseHP(condition)
          opp.status = parseStatus(condition)
          opp.boosts = {}
        }
        break
      }
      case 'move': {
        const ident = parts[2] || ''
        if (!ident.startsWith(this.opponentId)) break
        const moveName = parts[3] || ''
        if (this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp && !opp.knownMoves.includes(moveName)) opp.knownMoves.push(moveName)
        }
        break
      }
      case '-damage':
      case '-heal': {
        const ident = parts[2] || ''
        if (!ident.startsWith(this.opponentId)) break
        if (this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) { opp.hpPercent = parseHP(parts[3] || ''); opp.status = parseStatus(parts[3] || '') }
        }
        break
      }
      case '-status': {
        if (!(parts[2] || '').startsWith(this.opponentId)) break
        if (this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.status = parts[3] || ''
        }
        break
      }
      case '-item': {
        if (!(parts[2] || '').startsWith(this.opponentId)) break
        if (this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.knownItem = parts[3] || null
        }
        break
      }
      case '-enditem': {
        if (!(parts[2] || '').startsWith(this.opponentId)) break
        if (this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.knownItem = '(consumed)'
        }
        break
      }
      case '-ability': {
        if (!(parts[2] || '').startsWith(this.opponentId)) break
        if (this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.knownAbility = parts[3] || null
        }
        break
      }
      case '-boost': {
        const ident = parts[2] || ''
        if (ident.startsWith(this.opponentId) && this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.boosts[parts[3] || ''] = (opp.boosts[parts[3] || ''] || 0) + parseInt(parts[4] || '1')
        }
        break
      }
      case '-unboost': {
        const ident = parts[2] || ''
        if (ident.startsWith(this.opponentId) && this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.boosts[parts[3] || ''] = (opp.boosts[parts[3] || ''] || 0) - parseInt(parts[4] || '1')
        }
        break
      }
      case '-weather': {
        const w = parts[2] || ''
        this.field.weather = w === 'none' ? null : w
        break
      }
      case '-fieldstart': {
        const f = parts[2] || ''
        if (f.includes('Terrain')) this.field.terrain = f.replace('move: ', '')
        break
      }
      case '-fieldend': {
        if ((parts[2] || '').includes('Terrain')) this.field.terrain = null
        break
      }
      case '-sidestart': {
        const side = parts[2] || ''
        const effect = parts[3] || ''
        const sideId = side.startsWith('p1') ? 'p1' : 'p2'
        if (effect.includes('Stealth Rock') || effect.includes('Spikes') || effect.includes('Toxic Spikes') || effect.includes('Sticky Web')) {
          (sideId === 'p1' ? this.field.p1Hazards : this.field.p2Hazards).add(effect)
        }
        if (effect.includes('Reflect') || effect.includes('Light Screen') || effect.includes('Aurora Veil')) {
          (sideId === 'p1' ? this.field.p1Screens : this.field.p2Screens).add(effect)
        }
        break
      }
      case '-sideend': {
        const side = parts[2] || ''
        const effect = parts[3] || ''
        const sideId = side.startsWith('p1') ? 'p1' : 'p2'
        ;(sideId === 'p1' ? this.field.p1Hazards : this.field.p2Hazards).delete(effect)
        ;(sideId === 'p1' ? this.field.p1Screens : this.field.p2Screens).delete(effect)
        break
      }
      case 'faint': {
        if ((parts[2] || '').startsWith(this.opponentId) && this.opponentActive) {
          const opp = this.opponent.get(this.opponentActive)
          if (opp) opp.hpPercent = 0
        }
        break
      }
    }
  }

  private handleTeamPreview(request: any): string {
    return `team 123456`.slice(0, 5 + request.side.pokemon.length)
  }

  private handleForceSwitch(request: any): string {
    const pokemon = request.side.pokemon
    const chosen: number[] = []
    const choices = request.forceSwitch.map((mustSwitch: boolean) => {
      if (!mustSwitch) return 'pass'
      const canSwitch = range(1, 6).filter(j => (
        pokemon[j - 1] && j > request.forceSwitch.length &&
        !chosen.includes(j) && !pokemon[j - 1].condition.endsWith(' fnt')
      ))
      if (!canSwitch.length) return 'pass'
      const best = this.scoreSwitchCandidates(canSwitch, pokemon)
      chosen.push(best)
      return `switch ${best}`
    })
    return choices.join(', ')
  }

  private handleMove(request: any): string {
    const pokemon = request.side.pokemon
    const choices = request.active.map((active: any, i: number) => {
      if (pokemon[i].condition.endsWith(' fnt') || pokemon[i].commanding) return 'pass'
      const myPoke = pokemon[i]
      const availableMoves = active.moves?.filter((m: any) => !m.disabled) || []
      if (!availableMoves.length) return 'move 1'

      const oppData = this.opponentActive ? this.opponent.get(this.opponentActive) ?? null : null
      const moveScores: Array<{ index: number; score: number }> = []
      for (const move of availableMoves) {
        const moveIndex = active.moves.indexOf(move) + 1
        const score = this.scoreMove(myPoke, move, oppData)
        moveScores.push({ index: moveIndex, score })
      }

      const canSwitch = range(1, 6).filter(j => (
        pokemon[j - 1] && j > request.active.length &&
        !pokemon[j - 1].condition.endsWith(' fnt')
      ))
      if (canSwitch.length && oppData) {
        const switchScore = this.scoreSwitchDesirability(myPoke, oppData, canSwitch, pokemon)
        if (switchScore.score > Math.max(...moveScores.map(m => m.score))) {
          return `switch ${switchScore.slot}`
        }
      }

      moveScores.sort((a, b) => b.score - a.score)
      return `move ${moveScores[0].index}`
    })
    return choices.join(', ')
  }

  private scoreMove(myPoke: any, move: any, oppData: OpponentPokemon | null): number {
    const species = myPoke.details.split(',')[0].trim()
    try {
      const attacker = new Pokemon(gen, species, {
        level: 50,
        item: myPoke.item || undefined,
        ability: myPoke.ability || myPoke.baseAbility || undefined,
        curHP: this.calcCurrentHP(myPoke),
      })
      if (!oppData) {
        const moveData = gen.moves.get(move.id)
        return moveData?.basePower || 0
      }
      const defender = new Pokemon(gen, oppData.species, {
        level: 50,
        item: oppData.knownItem && oppData.knownItem !== '(consumed)' ? oppData.knownItem : undefined,
        ability: oppData.knownAbility || undefined,
        boosts: oppData.boosts as any,
        curHP: Math.max(1, Math.round(oppData.hpPercent * 1.5)),
      })
      const calcMove = new Move(gen, move.id)
      if (calcMove.category === 'Status') return this.scoreStatusMove(move.id, myPoke, oppData)
      const result = calculate(gen, attacker, defender, calcMove)
      const dmgRange = result.range()
      const avgDmg = (dmgRange[0] + dmgRange[1]) / 2
      const defenderHP = defender.maxHP()
      const dmgPercent = defenderHP > 0 ? (avgDmg / defenderHP) * 100 : 0
      let score = dmgPercent
      const minDmgPercent = defenderHP > 0 ? (dmgRange[0] / defenderHP) * 100 : 0
      if (minDmgPercent >= oppData.hpPercent) score += 50
      else if (dmgPercent >= oppData.hpPercent) score += 25
      const moveData = gen.moves.get(move.id)
      if (moveData && (moveData.priority ?? 0) > 0 && oppData.hpPercent < 30) score += 20
      return score
    } catch {
      const moveData = gen.moves.get(move.id)
      return moveData?.basePower || 0
    }
  }

  private scoreStatusMove(moveId: string, myPoke: any, oppData: OpponentPokemon): number {
    const moveName = moveId.toLowerCase()
    const myHazards = this.playerId === 'p1' ? this.field.p2Hazards : this.field.p1Hazards
    if (moveName === 'stealthrock' && !myHazards.has('Stealth Rock')) return 60
    if (moveName === 'spikes') return 40
    if (moveName === 'toxicspikes') return 35
    if (moveName === 'stickyweb' && !myHazards.has('Sticky Web')) return 45
    if (!oppData.status) {
      if (['thunderwave', 'glare', 'stunspore'].includes(moveName)) return 35
      if (moveName === 'toxic') return 40
      if (moveName === 'willowisp') return 38
      if (['spore', 'sleeppowder', 'darkvoid'].includes(moveName)) return 55
      if (moveName === 'yawn') return 30
    }
    const myScreens = this.playerId === 'p1' ? this.field.p1Screens : this.field.p2Screens
    if (moveName === 'reflect' && !myScreens.has('Reflect')) return 35
    if (moveName === 'lightscreen' && !myScreens.has('Light Screen')) return 35
    if (moveName === 'auroraveil' && !myScreens.has('Aurora Veil') && this.field.weather === 'Hail') return 50
    if (['swordsdance', 'nastyplot', 'dragondance', 'quiverdance', 'shellsmash', 'calmmind', 'bulkup'].includes(moveName)) {
      const myHP = parseHP(myPoke.condition)
      if (myHP > 70) return 35
      if (myHP > 40) return 15
    }
    if (['recover', 'roost', 'softboiled', 'moonlight', 'morningsun', 'synthesis', 'slackoff', 'shoreup'].includes(moveName)) {
      const myHP = parseHP(myPoke.condition)
      if (myHP < 40) return 50
      if (myHP < 60) return 30
      return 5
    }
    const theirHazards = this.playerId === 'p1' ? this.field.p1Hazards : this.field.p2Hazards
    if ((moveName === 'defog' || moveName === 'rapidspin') && theirHazards.size > 0) return 40
    return 5
  }

  private scoreSwitchCandidates(canSwitch: number[], pokemon: any[]): number {
    if (!this.opponentActive) return canSwitch[0]
    const oppData = this.opponent.get(this.opponentActive)
    let bestSlot = canSwitch[0]
    let bestScore = -Infinity
    for (const slot of canSwitch) {
      const poke = pokemon[slot - 1]
      const species = poke.details.split(',')[0].trim()
      const hp = parseHP(poke.condition)
      let score = hp / 2
      try {
        const switchIn = new Pokemon(gen, species, { level: 50 })
        if (oppData) {
          for (const moveName of oppData.knownMoves) {
            try {
              const oppAttacker = new Pokemon(gen, oppData.species, { level: 50 })
              const result = calculate(gen, oppAttacker, switchIn, new Move(gen, moveName))
              const dmgRange = result.range()
              const avgDmg = (dmgRange[0] + dmgRange[1]) / 2
              const dmgPercent = switchIn.maxHP() > 0 ? (avgDmg / switchIn.maxHP()) * 100 : 50
              score -= dmgPercent * 0.3
            } catch { /* skip */ }
          }
          for (const moveId of poke.moves || []) {
            try {
              const moveData = gen.moves.get(moveId)
              if (!moveData || moveData.category === 'Status') continue
              const oppDefender = new Pokemon(gen, oppData.species, { level: 50 })
              const result = calculate(gen, switchIn, oppDefender, new Move(gen, moveId))
              const dmgRange = result.range()
              const avgDmg = (dmgRange[0] + dmgRange[1]) / 2
              const dmgPercent = oppDefender.maxHP() > 0 ? (avgDmg / oppDefender.maxHP()) * 100 : 0
              score += dmgPercent * 0.2
            } catch { /* skip */ }
          }
        }
        const myHazards = this.playerId === 'p1' ? this.field.p1Hazards : this.field.p2Hazards
        if (myHazards.has('Stealth Rock')) {
          const types = switchIn.types
          if (types.some((t: string) => ['Fire', 'Ice', 'Flying', 'Bug'].includes(t))) score -= 15
          if (types.some((t: string) => ['Fighting', 'Ground', 'Steel'].includes(t))) score += 5
        }
      } catch { /* skip */ }
      if (score > bestScore) { bestScore = score; bestSlot = slot }
    }
    return bestSlot
  }

  private scoreSwitchDesirability(myPoke: any, oppData: OpponentPokemon, canSwitch: number[], pokemon: any[]): { slot: number; score: number } {
    const mySpecies = myPoke.details.split(',')[0].trim()
    let incomingThreat = 0
    try {
      const defender = new Pokemon(gen, mySpecies, { level: 50, curHP: this.calcCurrentHP(myPoke) })
      for (const moveName of oppData.knownMoves) {
        try {
          const oppAttacker = new Pokemon(gen, oppData.species, { level: 50 })
          const result = calculate(gen, oppAttacker, defender, new Move(gen, moveName))
          const maxDmg = result.range()[1]
          const dmgPercent = defender.maxHP() > 0 ? (maxDmg / defender.maxHP()) * 100 : 50
          incomingThreat = Math.max(incomingThreat, dmgPercent)
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    const shouldSwitch = incomingThreat > 50 && parseHP(myPoke.condition) < 80
    const bestSlot = this.scoreSwitchCandidates(canSwitch, pokemon)
    const switchScore = shouldSwitch ? incomingThreat * 0.6 : 0
    return { slot: bestSlot, score: switchScore }
  }

  private calcCurrentHP(poke: any): number {
    const condition = poke.condition || ''
    if (condition === '0 fnt' || condition.endsWith(' fnt')) return 0
    const hpPart = condition.replace(/\s+(brn|par|slp|frz|psn|tox)$/, '')
    const parts = hpPart.split('/')
    if (parts.length < 2) return 100
    return parseInt(parts[0])
  }
}
