import { useBattleStore } from './useBattleStore'
import { battleManager } from '../engine/BattleManager'
import { zhPokemon, zhMove, zhType, zhCategory, zhMoveDesc } from '../i18n/zh-helpers'
import { useT } from '../i18n/strings'
import { getMove } from '../teambuilder/dex-helpers'

const TYPE_TAG_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400 text-black', Grass: 'bg-green-500', Ice: 'bg-cyan-300 text-black',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-500',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400', Fairy: 'bg-pink-300',
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
  const active = request.active[0]
  const pokemon = request.side.pokemon
  const currentPokemon = pokemon[0]

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
      <div className="space-y-1.5">
        {active.moves.map((move: any, i: number) => {
          const disabled = move.disabled
          const pp = move.pp !== undefined ? `${move.pp}/${move.maxpp}` : ''
          const dexMove = getMove(move.move)
          const type = move.type || dexMove?.type || 'Normal'
          const basePower = dexMove?.basePower ?? 0
          const accuracy = dexMove?.accuracy
          const category = dexMove?.category ?? ''
          const desc = zhMoveDesc(move.move) || dexMove?.shortDesc || ''
          return (
            <button
              key={i}
              onClick={() => handleMove(i)}
              disabled={disabled}
              className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                disabled
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`${TYPE_TAG_COLORS[type] || 'bg-gray-500'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded w-14 text-center flex-shrink-0`}>
                  {zhType(type)}
                </span>
                <span className="font-bold text-sm flex-1 truncate">{zhMove(move.move)}</span>
                <span className="text-xs text-gray-300 w-10 text-right flex-shrink-0">
                  {basePower > 0 ? basePower : '—'}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right flex-shrink-0">
                  {accuracy === true || accuracy === undefined ? '—' : `${accuracy}%`}
                </span>
                <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">
                  {category ? zhCategory(category) : ''}
                </span>
                {pp && (
                  <span className="text-xs text-gray-500 w-14 text-right flex-shrink-0">
                    PP {pp}
                  </span>
                )}
              </div>
              {desc && (
                <div className="text-[11px] text-gray-400 mt-1 pl-[4rem] leading-snug">
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
