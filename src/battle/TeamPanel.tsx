import { useState } from 'react'
import { Sprites } from '@pkmn/img'
import { useBattleStore } from './useBattleStore'
import { getGen } from '../teambuilder/dex-helpers'

const STAT_LABELS: Record<string, string> = {
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}

function formatItemName(id: string): string {
  return id.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase())
    .replace(/([a-z])([a-z]*)/g, (_, first, rest) => first.toUpperCase() + rest)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

function formatMoveName(id: string): string {
  return id.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase())
}

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400',
  Fire: 'bg-orange-500',
  Water: 'bg-blue-500',
  Electric: 'bg-yellow-400 text-gray-900',
  Grass: 'bg-green-500',
  Ice: 'bg-cyan-300 text-gray-900',
  Fighting: 'bg-red-700',
  Poison: 'bg-purple-500',
  Ground: 'bg-amber-600',
  Flying: 'bg-indigo-300 text-gray-900',
  Psychic: 'bg-pink-500',
  Bug: 'bg-lime-600',
  Rock: 'bg-yellow-700',
  Ghost: 'bg-purple-800',
  Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700',
  Steel: 'bg-gray-400',
  Fairy: 'bg-pink-300 text-gray-900',
}

const gen = getGen(9)

function lookupMove(id: string) {
  return gen.moves.get(id)
}

function lookupItem(id: string) {
  return gen.items.get(id)
}

function lookupAbility(id: string) {
  return gen.abilities.get(id)
}

function lookupTypes(species: string): string[] {
  const data = gen.species.get(species)
  return data?.types || []
}

export function TeamPanel() {
  const teamInfo = useBattleStore((s) => s.teamInfo)
  const status = useBattleStore((s) => s.status)
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null)

  if ((status !== 'running' && status !== 'finished') || !teamInfo?.pokemon) return null

  const pokemon = teamInfo.pokemon

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">Your Team</h3>
      <div className="space-y-1">
        {pokemon.map((poke: any, i: number) => {
          const name = poke.ident.split(': ')[1]
          const species = poke.details.split(',')[0]
          const fainted = poke.condition === '0 fnt' || poke.condition.endsWith(' fnt')
          const hp = parseHP(poke.condition)
          const hpText = fainted ? 'Fainted' : poke.condition.split(' ')[0]
          const isExpanded = expandedSlot === i
          const sprite = Sprites.getPokemon(species, { gen: 'gen5' })

          return (
            <div key={i}>
              <button
                onClick={() => setExpandedSlot(isExpanded ? null : i)}
                className={`w-full text-left rounded px-2 py-1.5 transition-colors ${
                  fainted
                    ? 'bg-gray-900 opacity-60'
                    : isExpanded
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={sprite.url}
                    width={28}
                    height={28}
                    alt={species}
                    className="object-contain flex-shrink-0"
                    style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-white text-sm font-medium truncate">{name}</span>
                        {lookupTypes(species).map((t: string) => (
                          <span
                            key={t}
                            className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white text-[10px] font-bold px-1 rounded leading-tight`}
                          >
                            {t.slice(0, 3).toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <span className={`text-xs flex-shrink-0 ml-1 ${fainted ? 'text-red-400' : 'text-gray-400'}`}>
                        {hpText}
                      </span>
                    </div>
                    {/* HP bar */}
                    <div className="h-1 bg-gray-600 rounded-full mt-0.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          hp > 50 ? 'bg-green-500' : hp > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${hp}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && !fainted && (
                <div className="bg-gray-750 rounded px-3 py-2 mt-1 ml-2 mr-1 space-y-2 text-xs">
                  {/* Item */}
                  <div>
                    <div>
                      <span className="text-gray-500">Item: </span>
                      <span className="text-amber-300">
                        {poke.item ? formatItemName(poke.item) : 'None'}
                      </span>
                    </div>
                    {poke.item && (() => {
                      const itemData = lookupItem(poke.item)
                      return itemData?.shortDesc ? (
                        <div className="text-gray-500 ml-2 mt-0.5 italic">{itemData.shortDesc}</div>
                      ) : null
                    })()}
                  </div>

                  {/* Ability */}
                  <div>
                    <div>
                      <span className="text-gray-500">Ability: </span>
                      <span className="text-indigo-300">
                        {formatItemName(poke.ability)}
                      </span>
                    </div>
                    {(() => {
                      const abilityData = lookupAbility(poke.ability)
                      return abilityData?.shortDesc ? (
                        <div className="text-gray-500 ml-2 mt-0.5 italic">{abilityData.shortDesc}</div>
                      ) : null
                    })()}
                  </div>

                  {/* Stats */}
                  <div>
                    <span className="text-gray-500">Stats: </span>
                    <span className="text-gray-300">
                      {Object.entries(poke.stats)
                        .map(([key, val]) => `${STAT_LABELS[key] || key} ${val}`)
                        .join(' / ')}
                    </span>
                  </div>

                  {/* Moves */}
                  <div>
                    <span className="text-gray-500">Moves:</span>
                    <div className="space-y-1 mt-1">
                      {poke.moves.map((move: string, j: number) => {
                        const moveData = lookupMove(move)
                        return (
                          <div key={j} className="bg-gray-700 rounded px-2 py-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-200">{moveData?.name || formatMoveName(move)}</span>
                              {moveData && (
                                <span className="text-gray-500">
                                  {moveData.category !== 'Status' ? `${moveData.basePower} BP` : 'Status'}
                                  {' · '}
                                  {moveData.type}
                                </span>
                              )}
                            </div>
                            {moveData?.shortDesc && (
                              <div className="text-gray-500 mt-0.5 italic">{moveData.shortDesc}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
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
