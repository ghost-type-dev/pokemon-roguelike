import { useBattleStore } from './useBattleStore'
import { battleManager } from '../engine/BattleManager'
import { zhPokemon, zhMove, zhType, zhCategory, zhMoveDesc } from '../i18n/zh-helpers'
import { useT } from '../i18n/strings'
import { Dex } from '@pkmn/dex'
import { getMove } from '../teambuilder/dex-helpers'

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-500 hover:bg-gray-400',
  Fire: 'bg-red-600 hover:bg-red-500',
  Water: 'bg-blue-600 hover:bg-blue-500',
  Electric: 'bg-yellow-500 hover:bg-yellow-400 text-black',
  Grass: 'bg-green-600 hover:bg-green-500',
  Ice: 'bg-cyan-400 hover:bg-cyan-300 text-black',
  Fighting: 'bg-red-800 hover:bg-red-700',
  Poison: 'bg-purple-600 hover:bg-purple-500',
  Ground: 'bg-yellow-700 hover:bg-yellow-600',
  Flying: 'bg-indigo-400 hover:bg-indigo-300',
  Psychic: 'bg-pink-600 hover:bg-pink-500',
  Bug: 'bg-lime-600 hover:bg-lime-500',
  Rock: 'bg-yellow-800 hover:bg-yellow-700',
  Ghost: 'bg-purple-800 hover:bg-purple-700',
  Dragon: 'bg-indigo-700 hover:bg-indigo-600',
  Dark: 'bg-gray-800 hover:bg-gray-700 border border-gray-600',
  Steel: 'bg-gray-500 hover:bg-gray-400',
  Fairy: 'bg-pink-400 hover:bg-pink-300 text-black',
}

function getMoveColor(type: string): string {
  return TYPE_COLORS[type] || 'bg-gray-600 hover:bg-gray-500'
}

const TYPE_TAG_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400 text-black', Grass: 'bg-green-500', Ice: 'bg-cyan-300 text-black',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-500',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400', Fairy: 'bg-pink-300',
}

// Abilities that grant full immunity to a move type
const ABILITY_IMMUNITIES: Record<string, string> = {
  'Water Absorb': 'Water',
  'Storm Drain': 'Water',
  'Dry Skin': 'Water',
  'Volt Absorb': 'Electric',
  'Lightning Rod': 'Electric',
  'Motor Drive': 'Electric',
  'Flash Fire': 'Fire',
  'Well-Baked Body': 'Fire',
  'Levitate': 'Ground',
  'Earth Eater': 'Ground',
  'Sap Sipper': 'Grass',
  'Wind Rider': 'Flying',
}

// Abilities that halve damage from a move type
const ABILITY_HALF_DAMAGE: Record<string, string[]> = {
  'Thick Fat': ['Fire', 'Ice'],
  'Heatproof': ['Fire'],
  'Purifying Salt': ['Ghost'],
}

function extractAbilityFromClause(clause: string | undefined): string | null {
  if (!clause) return null
  const match = clause.match(/^\[from\] ability: (.+)/)
  return match ? match[1] : null
}

interface OpponentInfo {
  species: string | null
  ability: string | null
}

function getOpponentInfo(events: Array<{ data: string }>): OpponentInfo {
  let species: string | null = null
  let ability: string | null = null
  let currentSpecies: string | null = null

  for (const e of events) {
    const parts = e.data.split('|').slice(1)
    const type = parts[0]

    // Track switches — reset known ability when opponent sends out a different mon
    if ((type === 'switch' || type === 'drag' || type === 'replace') && parts[1]?.startsWith('p2')) {
      const newSpecies = parts[2]?.split(',')[0].trim() ?? null
      if (newSpecies !== currentSpecies) {
        currentSpecies = newSpecies
        ability = null
      }
      species = currentSpecies
    }

    if (!parts[1]?.startsWith('p2')) continue

    // |-ability|p2a: ...|AbilityName  (explicit reveal)
    if (type === '-ability') {
      // parts[2] is the ability name; ignore if it's a "[from]" clause
      if (parts[2] && !parts[2].startsWith('[')) ability = parts[2]
    }

    // |-immune|p2a: ...|[from] ability: Water Absorb
    if (type === '-immune') {
      const ab = extractAbilityFromClause(parts[2])
      if (ab) ability = ab
    }

    // |-heal|p2a: ...|HP/MAXHP|[from] ability: Water Absorb  (absorb abilities)
    if (type === '-heal') {
      const ab = extractAbilityFromClause(parts[3])
      if (ab) ability = ab
    }

    // |-damage|p2a: ...|HP/MAXHP|[from] ability: X  (abilities that cause damage)
    if (type === '-damage') {
      const ab = extractAbilityFromClause(parts[3])
      if (ab) ability = ab
    }
  }

  return { species, ability }
}

function getMoveEffectiveness(moveType: string, defSpecies: string, defAbility: string | null): number {
  const species = Dex.species.get(defSpecies)
  if (!species?.exists) return 1

  // Ability full immunity overrides type chart
  if (defAbility && ABILITY_IMMUNITIES[defAbility] === moveType) return 0

  let mult = 1
  for (const defType of species.types) {
    const val = Dex.types.get(defType)?.damageTaken?.[moveType] ?? 0
    if (val === 1) mult *= 2
    else if (val === 2) mult *= 0.5
    else if (val === 3) mult = 0
  }

  if (mult === 0) return 0

  // Wonder Guard: only super-effective moves land
  if (defAbility === 'Wonder Guard' && mult <= 1) return 0

  // Ability half-damage modifiers
  if (defAbility) {
    const halfTypes = ABILITY_HALF_DAMAGE[defAbility]
    if (halfTypes?.includes(moveType)) mult *= 0.5
  }

  return mult
}

export function MovePanel() {
  const humanRequest = useBattleStore((s) => s.humanRequest)

  if (!humanRequest) return null

  // Force switch (pokemon fainted)
  if (humanRequest.forceSwitch) {
    return <SwitchPanel request={humanRequest} forced />
  }

  // Team preview — auto-submit default order (team is already ordered in prepare screen)
  if (humanRequest.teamPreview) {
    const order = humanRequest.side.pokemon.map((_: any, i: number) => i + 1).join('')
    battleManager.submitHumanChoice(`team ${order}`)
    return null
  }

  // Normal move selection
  if (humanRequest.active) {
    return <MoveSelectionPanel request={humanRequest} />
  }

  return null
}

function MoveSelectionPanel({ request }: { request: any }) {
  const t = useT()
  const visibleEvents = useBattleStore((s) => s.visibleEvents)
  const active = request.active[0]
  const pokemon = request.side.pokemon
  const currentPokemon = pokemon[0]
  const { species: opponentSpecies, ability: opponentAbility } = getOpponentInfo(visibleEvents)

  const handleMove = (moveIndex: number) => {
    battleManager.submitHumanChoice(`move ${moveIndex + 1}`)
  }

  const handleSwitch = (slot: number) => {
    battleManager.submitHumanChoice(`switch ${slot + 1}`)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="text-sm text-gray-400">
        {t.whatWillDoFmt(zhPokemon(currentPokemon.ident.split(': ')[1]))}
      </div>

      {/* Moves */}
      <div className="space-y-2">
        {active.moves.map((move: any, i: number) => {
          const disabled = move.disabled
          const pp = move.pp !== undefined ? `${move.pp}/${move.maxpp}` : ''
          const moveData = Dex.moves.get(move.move)
          const moveType = moveData?.type ?? move.type ?? 'Normal'
          const isStatus = moveData?.category === 'Status'
          const eff = (!isStatus && opponentSpecies)
            ? getMoveEffectiveness(moveType, opponentSpecies, opponentAbility)
            : 1
          const effLabel = eff > 1 ? t.moveEffSuper
            : eff === 0 ? t.moveEffNone
            : eff < 1 ? t.moveEffWeak
            : null
          const effColor = eff > 1 ? 'text-yellow-300'
            : eff === 0 ? 'text-gray-500'
            : 'text-gray-400'
          const dexMove = getMove(move.move)
          const typeTag = dexMove?.type || moveData?.type || 'Normal'
          const basePower = dexMove?.basePower ?? 0
          const accuracy = dexMove?.accuracy ?? moveData?.accuracy
          const category = dexMove?.category ?? moveData?.category ?? ''
          const desc = zhMoveDesc(move.move) || dexMove?.shortDesc || ''

          return (
            <button
              key={i}
              onClick={() => handleMove(i)}
              disabled={disabled}
              className={`${disabled ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : getMoveColor(moveType)} text-white text-sm font-medium py-2 px-3 rounded-lg text-left transition-colors w-full`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm truncate">{zhMove(move.move)}</div>
                <div className={`text-xs font-semibold ${effLabel ? effColor : 'invisible'}`}>{effLabel ?? '\u00A0'}</div>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                <span className={`${TYPE_TAG_COLORS[typeTag] || 'bg-gray-500'} text-white text-[10px] font-bold px-1 py-0.5 rounded text-center flex-shrink-0`}>
                  {zhType(typeTag)}
                </span>
                <span className="text-gray-300 w-10 text-right flex-shrink-0">{basePower > 0 ? basePower : '—'}</span>
                <span className="text-gray-400 w-12 text-right flex-shrink-0">{accuracy === true || accuracy === undefined ? '—' : `${accuracy}%`}</span>
                <span className="text-gray-500 w-10 text-right flex-shrink-0">{category ? zhCategory(category) : ''}</span>
                <div className="ml-auto text-xs text-gray-500">{pp && `PP ${pp}`}</div>
              </div>

              {desc && (
                <div className="text-[11px] text-gray-400 mt-1 pl-[3.25rem] leading-snug">
                  {desc}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Switch options */}
      <div>
        <div className="text-xs text-gray-500 mb-1">{t.switchTo}</div>
        <div className="flex gap-2 flex-wrap">
          {pokemon.slice(1).map((poke: any, i: number) => {
            const slot = i + 1
            const fainted = poke.condition.endsWith(' fnt') || poke.condition === '0 fnt'
            const hp = parseHP(poke.condition)

            return (
              <button
                key={slot}
                onClick={() => handleSwitch(slot)}
                disabled={fainted || poke.active}
                className={`py-1.5 px-3 rounded text-sm transition-colors ${
                  fainted || poke.active
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                <div className="font-medium">{zhPokemon(poke.ident.split(': ')[1])}</div>
                <div className="text-xs text-gray-400">
                  {fainted ? t.fainted : `${hp}%`}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SwitchPanel({ request, forced }: { request: any; forced?: boolean }) {
  const t = useT()
  const pokemon = request.side.pokemon

  const handleSwitch = (slot: number) => {
    battleManager.submitHumanChoice(`switch ${slot + 1}`)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="text-sm text-yellow-400 font-medium">
        {forced ? t.forceSwitchPrompt : t.switchPrompt}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {pokemon.map((poke: any, i: number) => {
          const fainted = poke.condition.endsWith(' fnt') || poke.condition === '0 fnt'
          const hp = parseHP(poke.condition)
          const isActive = poke.active

          return (
            <button
              key={i}
              onClick={() => handleSwitch(i)}
              disabled={fainted || isActive}
              className={`py-2 px-3 rounded-lg text-left transition-colors ${
                fainted || isActive
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-blue-700 text-white'
              }`}
            >
              <div className="font-medium text-sm">{zhPokemon(poke.ident.split(': ')[1])}</div>
              <div className="text-xs mt-0.5">
                {isActive ? (
                  <span className="text-blue-400">{t.active}</span>
                ) : fainted ? (
                  <span className="text-red-400">{t.fainted}</span>
                ) : (
                  <span className="text-gray-400">{t.hpPctFmt(hp)}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


function parseHP(condition: string): number {
  if (condition === '0 fnt' || condition.endsWith(' fnt')) return 0
  const hpPart = condition.replace(/\s+(brn|par|slp|frz|psn|tox)$/, '')
  const [current, max] = hpPart.split('/')
  if (!max) return 100
  return Math.round((parseInt(current) / parseInt(max)) * 100)
}
