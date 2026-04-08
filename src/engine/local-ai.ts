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
  private currentTurn = 0
  private mySwitchInTurn = 0  // turn when AI's active Pokemon switched in
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
    this.currentTurn = 0
    this.mySwitchInTurn = 0
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
      case 'turn': {
        this.currentTurn = parseInt(parts[2] || '0')
        break
      }
      case 'switch':
      case 'drag': {
        const ident = parts[2] || ''
        // Track our own switch-in turn
        if (ident.startsWith(this.playerId)) {
          this.mySwitchInTurn = this.currentTurn
          break
        }
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
        const effect = (parts[3] || '').replace('move: ', '')
        const sideId = side.startsWith('p1') ? 'p1' : 'p2'
        if (['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'].some(h => effect.includes(h))) {
          (sideId === 'p1' ? this.field.p1Hazards : this.field.p2Hazards).add(effect)
        }
        if (['Reflect', 'Light Screen', 'Aurora Veil', 'Tailwind', 'Safeguard', 'Mist'].some(s => effect.includes(s))) {
          (sideId === 'p1' ? this.field.p1Screens : this.field.p2Screens).add(effect)
        }
        break
      }
      case '-sideend': {
        const side = parts[2] || ''
        const effect = (parts[3] || '').replace('move: ', '')
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
      const moveData = gen.moves.get(move.id)
      // Fake Out / First Impression: only work on the first turn after switching in
      if ((move.id === 'fakeout' || move.id === 'firstimpression') && this.currentTurn !== this.mySwitchInTurn) return 0
      // Focus Punch fails if hit before executing — almost never works
      if (move.id === 'focuspunch') return 5
      // Dream Eater / Nightmare: only work on sleeping targets
      if ((move.id === 'dreameater' || move.id === 'nightmare') && oppData.status !== 'slp') return 0
      // Snore / Sleep Talk: only work when the user is asleep
      if ((move.id === 'snore' || move.id === 'sleeptalk') && !myPoke.condition.includes('slp')) return 0
      // Last Resort: only works after all other moves used — unreliable
      if (move.id === 'lastresort') return 5
      // Belch: only works after consuming a berry — unreliable
      if (move.id === 'belch') return 5
      // Poltergeist: fails if target has no item
      if (move.id === 'poltergeist' && oppData.knownItem === '(consumed)') return 0
      // Moves that need a charge turn (Solar Beam, Meteor Beam, etc.) are risky without the right item/weather
      if ((moveData?.flags as any)?.charge) return (moveData?.basePower || 0) * 0.3
      const result = calculate(gen, attacker, defender, calcMove)
      const dmgRange = result.range()
      const avgDmg = (dmgRange[0] + dmgRange[1]) / 2
      const defenderHP = defender.maxHP()
      const dmgPercent = defenderHP > 0 ? (avgDmg / defenderHP) * 100 : 0
      let score = dmgPercent
      const minDmgPercent = defenderHP > 0 ? (dmgRange[0] / defenderHP) * 100 : 0
      if (minDmgPercent >= oppData.hpPercent) score += 50
      else if (dmgPercent >= oppData.hpPercent) score += 25
      if (moveData && (moveData.priority ?? 0) > 0 && oppData.hpPercent < 30) score += 20
      // Penalize low-accuracy moves proportionally
      const acc = (moveData as any)?.accuracy
      if (typeof acc === 'number' && acc < 100) {
        score *= acc / 100
      }
      return score
    } catch {
      const moveData = gen.moves.get(move.id)
      return moveData?.basePower || 0
    }
  }

  private scoreStatusMove(moveId: string, myPoke: any, oppData: OpponentPokemon): number {
    const moveName = moveId.toLowerCase()
    // Get opponent types for immunity checks
    const oppSpecies = gen.species.get(oppData.species as any)
    const oppTypes = oppSpecies ? [...oppSpecies.types] : []

    const myHazards = this.playerId === 'p1' ? this.field.p2Hazards : this.field.p1Hazards
    if (moveName === 'stealthrock') return myHazards.has('Stealth Rock') ? 0 : 60
    if (moveName === 'spikes') return 40
    if (moveName === 'toxicspikes') return 35
    if (moveName === 'stickyweb') return myHazards.has('Sticky Web') ? 0 : 45

    // Powder moves: Grass types are immune (Gen 6+)
    const POWDER_MOVES = ['sleeppowder', 'stunspore', 'poisonpowder', 'spore', 'ragepowder', 'cottonspore']
    if (POWDER_MOVES.includes(moveName) && oppTypes.includes('Grass')) return 0

    // Thunder Wave: Electric types are immune
    if (moveName === 'thunderwave' && oppTypes.includes('Electric')) return 0
    // Will-O-Wisp: Fire types are immune to burn
    if (moveName === 'willowisp' && oppTypes.includes('Fire')) return 0
    // Toxic / Poison moves: Poison and Steel types are immune
    if (['toxic', 'poisonpowder', 'toxicthread'].includes(moveName) && (oppTypes.includes('Poison') || oppTypes.includes('Steel'))) return 0
    // Yawn: doesn't work on already-statused Pokemon (handled below) but also not on Grass for powder? No, Yawn is not powder.

    const STATUS_MOVES = ['thunderwave', 'glare', 'stunspore', 'toxic', 'willowisp', 'spore', 'sleeppowder', 'darkvoid', 'yawn', 'poisonpowder', 'toxicthread', 'nuzzle', 'hypnosis', 'sing', 'grasswhistle', 'lovelykiss']
    if (STATUS_MOVES.includes(moveName)) {
      if (oppData.status) return 0
      if (['thunderwave', 'glare', 'stunspore'].includes(moveName)) return 35
      if (moveName === 'toxic') return 40
      if (moveName === 'willowisp') return 38
      if (['spore', 'sleeppowder', 'darkvoid', 'hypnosis', 'sing', 'grasswhistle', 'lovelykiss'].includes(moveName)) return 55
      if (moveName === 'yawn') return 30
      return 25
    }
    const myScreens = this.playerId === 'p1' ? this.field.p1Screens : this.field.p2Screens
    if (moveName === 'reflect') return myScreens.has('Reflect') ? 0 : 35
    if (moveName === 'lightscreen') return myScreens.has('Light Screen') ? 0 : 35
    if (moveName === 'auroraveil') return myScreens.has('Aurora Veil') ? 0 : (this.field.weather === 'Hail' ? 50 : 0)
    if (moveName === 'tailwind') return myScreens.has('Tailwind') ? 0 : 40
    if (moveName === 'safeguard') return myScreens.has('Safeguard') ? 0 : 25
    if (moveName === 'mist') return myScreens.has('Mist') ? 0 : 20
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
