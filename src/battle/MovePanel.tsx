import { useBattleStore } from './useBattleStore'
import { battleManager } from '../engine/BattleManager'

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

export function MovePanel() {
  const humanRequest = useBattleStore((s) => s.humanRequest)

  if (!humanRequest) return null

  // Force switch (pokemon fainted)
  if (humanRequest.forceSwitch) {
    return <SwitchPanel request={humanRequest} forced />
  }

  // Team preview
  if (humanRequest.teamPreview) {
    return <TeamPreviewPanel request={humanRequest} />
  }

  // Normal move selection
  if (humanRequest.active) {
    return <MoveSelectionPanel request={humanRequest} />
  }

  return null
}

function MoveSelectionPanel({ request }: { request: any }) {
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
        What will <span className="text-white font-bold">{currentPokemon.ident.split(': ')[1]}</span> do?
      </div>

      {/* Moves */}
      <div className="grid grid-cols-2 gap-2">
        {active.moves.map((move: any, i: number) => {
          const disabled = move.disabled
          const pp = move.pp !== undefined ? `${move.pp}/${move.maxpp}` : ''
          return (
            <button
              key={i}
              onClick={() => handleMove(i)}
              disabled={disabled}
              className={`${disabled ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : getMoveColor(move.type || 'Normal')}
                text-white font-medium py-3 px-4 rounded-lg text-left transition-colors`}
            >
              <div className="font-bold text-sm">{move.move}</div>
              <div className="text-xs opacity-80 flex justify-between mt-0.5">
                <span>{move.type}</span>
                {pp && <span>PP {pp}</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Switch options */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Switch to:</div>
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
                <div className="font-medium">{poke.ident.split(': ')[1]}</div>
                <div className="text-xs text-gray-400">
                  {fainted ? 'Fainted' : `${hp}%`}
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
  const pokemon = request.side.pokemon

  const handleSwitch = (slot: number) => {
    battleManager.submitHumanChoice(`switch ${slot + 1}`)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="text-sm text-yellow-400 font-medium">
        {forced ? 'Choose a Pokemon to send out!' : 'Switch to which Pokemon?'}
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
              <div className="font-medium text-sm">{poke.ident.split(': ')[1]}</div>
              <div className="text-xs mt-0.5">
                {isActive ? (
                  <span className="text-blue-400">Active</span>
                ) : fainted ? (
                  <span className="text-red-400">Fainted</span>
                ) : (
                  <span className="text-gray-400">{hp}% HP</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TeamPreviewPanel({ request }: { request: any }) {
  const pokemon = request.side.pokemon

  const handleTeamOrder = () => {
    // Just use default order for now
    const order = pokemon.map((_: any, i: number) => i + 1).join('')
    battleManager.submitHumanChoice(`team ${order}`)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="text-sm text-gray-400">Team Preview - Your team:</div>

      <div className="grid grid-cols-3 gap-2">
        {pokemon.map((poke: any, i: number) => (
          <div key={i} className="bg-gray-700 rounded-lg p-2">
            <div className="font-medium text-sm text-white">{poke.ident.split(': ')[1]}</div>
            <div className="text-xs text-gray-400">{poke.details.split(', ')[0]}</div>
          </div>
        ))}
      </div>

      <button
        onClick={handleTeamOrder}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors w-full"
      >
        Start Battle!
      </button>
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
