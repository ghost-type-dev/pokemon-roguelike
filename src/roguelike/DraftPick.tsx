import { useMemo } from 'react'
import { Sprites } from '@pkmn/img'
import { getSpecies, getMove, getGen, allNatures, calcStat } from '../teambuilder/dex-helpers'
import { useRoguelikeStore } from './useRoguelikeStore'
import { STAT_LABELS } from './constants'
import type { StatID } from '@pkmn/data'
import type { PokemonSet } from '../teambuilder/useTeamBuilder'

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400', Grass: 'bg-green-500', Ice: 'bg-cyan-300',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-500',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400', Fairy: 'bg-pink-300',
}

const MOVE_TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400 text-gray-900', Grass: 'bg-green-500', Ice: 'bg-cyan-300 text-gray-900',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300 text-gray-900', Psychic: 'bg-pink-500', Bug: 'bg-lime-500 text-gray-900',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400 text-gray-900', Fairy: 'bg-pink-300 text-gray-900',
}

const STATS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

export function DraftPick() {
  const draftChoices = useRoguelikeStore((s) => s.draftChoices)
  const draftPicked = useRoguelikeStore((s) => s.draftPicked)
  const pickDraft = useRoguelikeStore((s) => s.pickDraft)

  const remaining = 3 - draftPicked.length

  if (draftChoices.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 animate-pulse">Generating draft candidates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Draft Your Team</h2>
      <p className="text-gray-400 text-sm">
        Pick {remaining} more Pokemon to start your run.
        <span className="text-gray-600 ml-1">(BST &lt; 330)</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {draftChoices.map((poke) => (
          <DraftCard
            key={poke.species}
            pokemon={poke}
            picked={draftPicked.includes(poke.species)}
            onPick={() => pickDraft(poke.species)}
          />
        ))}
      </div>
    </div>
  )
}

function DraftCard({ pokemon, picked, onPick }: {
  pokemon: PokemonSet
  picked: boolean
  onPick: () => void
}) {
  const species = getSpecies(pokemon.species)
  if (!species) return null

  const sprite = Sprites.getPokemon(species.name, { gen: 'gen5ani' })
  const bs = species.baseStats as Record<StatID, number>
  const bst = Object.values(bs).reduce((a: number, b: number) => a + b, 0)

  const abilityData = useMemo(() => {
    if (!pokemon.ability) return null
    const gen = getGen(9)
    return gen.abilities.get(pokemon.ability)
  }, [pokemon.ability])

  const natureData = useMemo(() => {
    return allNatures().find(n => n.name === pokemon.nature)
  }, [pokemon.nature])

  const moveDetails = useMemo(() => {
    return pokemon.moves.filter(Boolean).map(m => getMove(m)).filter(Boolean)
  }, [pokemon.moves])

  return (
    <button
      onClick={onPick}
      className={`rounded-lg p-4 transition-colors text-left border w-full ${
        picked
          ? 'border-green-500 bg-green-900/20 hover:bg-green-900/10 hover:border-green-400'
          : 'border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-purple-500'
      }`}
    >
      {/* Header: sprite + name + types */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
          {sprite && (
            <img
              src={sprite.url}
              width={sprite.w}
              height={sprite.h}
              alt={species.name}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{species.name}</span>
            {picked && <span className="text-green-400 text-xs font-bold">Picked!</span>}
          </div>
          <div className="flex gap-1 mt-1">
            {species.types.map((t: string) => (
              <span
                key={t}
                className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white text-[10px] font-bold px-1.5 py-0 rounded`}
              >
                {t}
              </span>
            ))}
          </div>
          {/* Ability */}
          <div className="mt-1">
            <span className="text-gray-400 text-[10px]">Ability: </span>
            <span className="text-white text-[10px] font-medium">{pokemon.ability}</span>
            {abilityData?.shortDesc && (
              <div className="text-gray-500 text-[10px]">{abilityData.shortDesc}</div>
            )}
          </div>
          {/* Nature */}
          <div className="text-[10px]">
            <span className="text-gray-400">Nature: </span>
            <span className="text-white font-medium">{pokemon.nature}</span>
            {natureData && natureData.plus && natureData.minus && (
              <span className="ml-1">
                <span className="text-green-400">+{STAT_LABELS[natureData.plus]}</span>
                {' / '}
                <span className="text-red-400">-{STAT_LABELS[natureData.minus]}</span>
              </span>
            )}
            {natureData && !natureData.plus && (
              <span className="text-gray-500 ml-1">Neutral</span>
            )}
          </div>
        </div>
      </div>

      {/* Moves */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-500 mb-1">Moves</div>
        <div className="space-y-1">
          {moveDetails.length > 0 ? moveDetails.map((md) => (
            <div key={md!.name} className="text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={`${MOVE_TYPE_COLORS[md!.type] || 'bg-gray-500'} text-[9px] font-bold px-1 rounded w-12 text-center truncate`}>
                  {md!.type}
                </span>
                <span className="text-white truncate flex-1">{md!.name}</span>
                {md!.basePower > 0 && (
                  <span className="text-gray-400 flex-shrink-0">{md!.basePower}</span>
                )}
                <span className="text-gray-500 flex-shrink-0">
                  {md!.accuracy === true ? '—' : `${md!.accuracy}%`}
                </span>
                <span className="text-gray-600 flex-shrink-0 w-8 text-right">
                  {md!.category === 'Physical' ? 'Phys' : md!.category === 'Special' ? 'Spec' : 'Stat'}
                </span>
              </div>
              {md!.shortDesc && (
                <div className="text-gray-500 pl-[3.375rem] mt-0.5">{md!.shortDesc}</div>
              )}
            </div>
          )) : (
            <div className="text-gray-600 text-[10px] animate-pulse">Loading moves...</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div>
        <div className="text-[10px] text-gray-500 mb-0.5">Stats <span className="text-gray-600">(BST: {bst})</span></div>
        {STATS.map((stat) => {
          const total = calcStat(stat, bs[stat], pokemon.ivs[stat], pokemon.evs[stat], pokemon.level, natureData || undefined)
          const isPlus = natureData?.plus === stat
          const isMinus = natureData?.minus === stat
          return (
            <div key={stat} className="flex items-center gap-1 text-[10px]">
              <span className={`w-7 font-medium ${isPlus ? 'text-green-400' : isMinus ? 'text-red-400' : 'text-gray-400'}`}>
                {STAT_LABELS[stat]}{isPlus && '+'}{isMinus && '-'}
              </span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-purple-500 rounded-full h-1.5"
                  style={{ width: `${Math.min(100, (bs[stat] / 120) * 100)}%` }}
                />
              </div>
              <span className="text-gray-300 w-5 text-right">{bs[stat]}</span>
              <span className="text-white font-bold w-6 text-right">{total}</span>
            </div>
          )
        })}
      </div>
    </button>
  )
}
