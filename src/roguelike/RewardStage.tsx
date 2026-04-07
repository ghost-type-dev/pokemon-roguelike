import { useState, useMemo } from 'react'
import { Sprites } from '@pkmn/img'
import { useRoguelikeStore } from './useRoguelikeStore'
import { getAllLearnableMoves } from './roguelike-helpers'
import { getGen, getSpecies, getMove, allNatures, calcStat } from '../teambuilder/dex-helpers'
import type { RewardOption } from './constants'
import { STAT_LABELS } from './constants'
import type { StatID } from '@pkmn/data'
import type { PokemonSet } from '../teambuilder/useTeamBuilder'

function getItemDescription(itemName: string): string {
  const gen = getGen(9)
  const item = gen.items.get(itemName)
  return item?.shortDesc || item?.desc || ''
}

function getAbilityDescription(abilityName: string): string {
  const gen = getGen(9)
  const ability = gen.abilities.get(abilityName)
  return ability?.shortDesc || ability?.desc || ''
}

/** Extract ability name from reward label like "Ability: Solar Power" */
function extractAbilityName(reward: RewardOption): string | null {
  if (reward.type !== 'ability') return null
  const match = reward.label.match(/^Ability: (.+)$/)
  return match?.[1] || null
}

export function RewardStage() {
  const rewardOptions = useRoguelikeStore((s) => s.rewardOptions)
  const roster = useRoguelikeStore((s) => s.roster)
  const applyReward = useRoguelikeStore((s) => s.applyReward)
  const roundsWon = useRoguelikeStore((s) => s.roundsWon)
  const round = useRoguelikeStore((s) => s.round)

  const [selectedReward, setSelectedReward] = useState<RewardOption | null>(null)
  const [tmMove, setTmMove] = useState<string | null>(null)
  const [tmMoveChoices, setTmMoveChoices] = useState<string[]>([])
  const [tmTargetSpecies, setTmTargetSpecies] = useState<string | null>(null)
  const [loadingTMs, setLoadingTMs] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null)

  // Compute descriptions for all reward cards
  const rewardDescriptions = useMemo(() => {
    return rewardOptions.map(r => {
      if (r.type === 'item' && r.itemName) return getItemDescription(r.itemName)
      const abilityName = extractAbilityName(r)
      if (abilityName) return getAbilityDescription(abilityName)
      return null
    })
  }, [rewardOptions])

  const handleSelectReward = async (reward: RewardOption) => {
    // EV boost and nature change are fixed — apply directly
    if (reward.type === 'ev-boost' || reward.type === 'nature') {
      applyReward(reward)
      return
    }

    // New move — let player pick Pokemon first, then move selection
    if (reward.type === 'tm') {
      setSelectedReward(reward)
      setTmMove(null)
      setTmMoveChoices([])
      setTmTargetSpecies(null)
      return
    }

    // New pokemon when roster is full — need to pick who to replace
    if (reward.type === 'new-pokemon' && roster.length >= 6) {
      setSelectedReward(reward)
      setReplaceIndex(null)
      return
    }

    // Item, ability, new-pokemon (roster not full) — show confirmation
    setSelectedReward(reward)
  }

  const handlePickTMTarget = async (species: string) => {
    setTmTargetSpecies(species)
    setLoadingTMs(true)
    const state = useRoguelikeStore.getState()
    const alreadyUnlocked = state.inventory.unlockedTMs[species] || []
    const pokemon = state.roster.find(p => p.species === species)
    const knownMoves = pokemon ? pokemon.moves.filter(Boolean) : []
    const allMoves = await getAllLearnableMoves(species)
    const alreadyKnown = new Set([...knownMoves, ...alreadyUnlocked])
    // Cap move power: next round's opponent cap + 15
    const maxPower = 50 + 3 * (round + 1) + 15
    const unlearned = allMoves.filter(m => {
      if (alreadyKnown.has(m)) return false
      const md = getMove(m)
      if (md && md.category !== 'Status' && md.basePower > maxPower) return false
      return true
    })
    // Pick up to 4 random moves
    const shuffled = [...unlearned].sort(() => Math.random() - 0.5)
    const choices = shuffled.slice(0, 4)
    setTmMoveChoices(choices)
    setTmMove(choices[0] || null)
    setLoadingTMs(false)
  }

  const handleConfirm = () => {
    if (!selectedReward) return
    if (selectedReward.type === 'tm' && tmMove && tmTargetSpecies) {
      applyReward({ ...selectedReward, moveName: tmMove, targetSpecies: tmTargetSpecies })
    } else if (selectedReward.type === 'new-pokemon' && roster.length >= 6) {
      if (replaceIndex == null) return
      applyReward({ ...selectedReward, replaceIndex })
    } else {
      applyReward(selectedReward)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-green-400">
          {roundsWon === 0 ? 'Team Drafted!' : `Victory! Round ${roundsWon} cleared!`}
        </h2>
        <p className="text-gray-400 text-sm mt-1">Choose a reward.</p>
        <button
          onClick={() => setShowTeam(t => !t)}
          className="text-purple-400 hover:text-purple-300 text-xs mt-1"
        >
          {showTeam ? 'Hide Team' : 'Review Team'}
        </button>
      </div>

      {/* Team review panel */}
      {showTeam && (
        <div className="max-w-2xl mx-auto space-y-2">
          {roster.map((p, i) => p.species ? (
            <TeamReviewCard key={i} pokemon={p} />
          ) : null)}
        </div>
      )}

      {/* Reward cards */}
      {!selectedReward && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {rewardOptions.map((reward, i) => {
            const extraDesc = rewardDescriptions[i]
            return (
              <button
                key={i}
                onClick={() => handleSelectReward(reward)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <RewardIcon type={reward.type} />
                  <span className="text-white font-bold text-sm">{reward.label}</span>
                </div>
                <p className="text-gray-400 text-xs">{reward.description}</p>
                {extraDesc && (
                  <p className="text-gray-500 text-xs mt-1 italic">{extraDesc}</p>
                )}
                {(reward.type === 'ev-boost' || reward.type === 'nature') && reward.targetSpecies && (
                  <div className="flex items-center gap-2 mt-2">
                    {(() => {
                      const sprite = Sprites.getPokemon(reward.targetSpecies, { gen: 'gen5' })
                      return sprite ? (
                        <img src={sprite.url} width={20} height={20} alt={reward.targetSpecies}
                          className="object-contain"
                          style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }} />
                      ) : null
                    })()}
                    <span className="text-gray-500 text-xs">
                      {reward.targetSpecies}
                      {reward.type === 'ev-boost' && reward.stat && ` · ${STAT_LABELS[reward.stat]}`}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* New move: pick Pokemon first, then pick move */}
      {selectedReward?.type === 'tm' && !tmTargetSpecies && (
        <div className="bg-gray-800 rounded-lg p-4 max-w-lg mx-auto space-y-4">
          <h3 className="text-white font-bold">Pick a Pokemon to learn a new move</h3>
          <div className="space-y-1">
            {roster.filter(p => p.species).map((p) => {
              const sprite = Sprites.getPokemon(p.species, { gen: 'gen5' })
              return (
                <button
                  key={p.species}
                  onClick={() => handlePickTMTarget(p.species)}
                  className="w-full flex items-center gap-2 p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  {sprite && (
                    <img
                      src={sprite.url}
                      width={32}
                      height={32}
                      alt={p.species}
                      className="object-contain"
                      style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
                    />
                  )}
                  <span className="text-white text-sm font-medium">{p.species}</span>
                  <span className="text-gray-500 text-xs ml-auto">{p.moves.filter(Boolean).join(', ')}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {selectedReward?.type === 'tm' && tmTargetSpecies && (
        <div className="bg-gray-800 rounded-lg p-4 max-w-lg mx-auto space-y-4">
          <h3 className="text-white font-bold">New Move for {tmTargetSpecies}</h3>

          {loadingTMs ? (
            <div className="text-gray-400 animate-pulse">Loading moves...</div>
          ) : tmMoveChoices.length === 0 ? (
            <div className="text-gray-500">
              No unlearned moves available for {tmTargetSpecies}. Reward skipped.
              <button
                onClick={handleConfirm}
                className="mt-2 w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <label className="block text-xs text-gray-400">Pick a move to learn</label>
              <div className="space-y-1">
                {tmMoveChoices.map((m) => {
                  const md = getMove(m)
                  return (
                    <button
                      key={m}
                      onClick={() => setTmMove(m)}
                      className={`w-full text-left p-2 rounded transition-colors border ${
                        tmMove === m
                          ? 'bg-purple-600/30 border-purple-500'
                          : 'bg-gray-700 hover:bg-gray-600 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {md && (
                          <span className={`${TYPE_COLORS[md.type] || 'bg-gray-500'} text-white text-[10px] font-bold px-1 py-0 rounded`}>
                            {md.type}
                          </span>
                        )}
                        <span className="text-white text-sm">{m}</span>
                        {md && (
                          <span className="text-gray-500 text-xs ml-auto">
                            {md.category === 'Status' ? 'Status' : `${md.basePower > 0 ? md.basePower + 'bp' : '—'} ${md.category}`}
                          </span>
                        )}
                      </div>
                      {md?.shortDesc && (
                        <div className="text-gray-500 text-xs mt-0.5">{md.shortDesc}</div>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleConfirm}
                disabled={!tmMove}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
              >
                Learn Move
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirmation for item, ability, new-pokemon */}
      {selectedReward && selectedReward.type !== 'tm' && (
        <div className="bg-gray-800 rounded-lg p-4 max-w-lg mx-auto space-y-4">
          <h3 className="text-white font-bold">{selectedReward.label}</h3>
          <p className="text-gray-400 text-sm">{selectedReward.description}</p>

          {/* Show item description */}
          {selectedReward.type === 'item' && selectedReward.itemName && (
            <p className="text-gray-500 text-sm italic">{getItemDescription(selectedReward.itemName)}</p>
          )}

          {/* Show ability description */}
          {selectedReward.type === 'ability' && (() => {
            const name = extractAbilityName(selectedReward)
            return name ? (
              <p className="text-gray-500 text-sm italic">{getAbilityDescription(name)}</p>
            ) : null
          })()}

          {/* Show new pokemon sprite */}
          {selectedReward.type === 'new-pokemon' && selectedReward.pokemonSpecies && (
            <div className="flex justify-center">
              {(() => {
                const sprite = Sprites.getPokemon(selectedReward.pokemonSpecies, { gen: 'gen5ani' })
                return sprite ? (
                  <img src={sprite.url} width={sprite.w} height={sprite.h} alt={selectedReward.pokemonSpecies}
                    className="object-contain"
                    style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }} />
                ) : null
              })()}
            </div>
          )}

          {/* Pick who to replace when roster is full */}
          {selectedReward.type === 'new-pokemon' && roster.length >= 6 && (
            <div className="space-y-2">
              <p className="text-yellow-400 text-sm font-medium">Team is full — choose a Pokemon to replace:</p>
              <div className="space-y-1">
                {roster.map((p, i) => {
                  if (!p.species) return null
                  const sprite = Sprites.getPokemon(p.species, { gen: 'gen5' })
                  const bs = getSpecies(p.species)?.baseStats as Record<string, number> | undefined
                  const bst = bs ? Object.values(bs).reduce((a, b) => a + b, 0) : 0
                  return (
                    <button
                      key={i}
                      onClick={() => setReplaceIndex(i)}
                      className={`w-full flex items-center gap-3 p-2 rounded transition-colors border ${
                        replaceIndex === i
                          ? 'bg-red-600/20 border-red-500'
                          : 'bg-gray-700 hover:bg-gray-600 border-transparent'
                      }`}
                    >
                      {sprite && (
                        <img src={sprite.url} width={24} height={24} alt={p.species}
                          className="object-contain"
                          style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }} />
                      )}
                      <span className="text-white text-sm font-medium">{p.species}</span>
                      <span className="text-gray-500 text-xs">BST {bst}</span>
                      <span className="text-gray-600 text-xs ml-auto">
                        {p.moves.filter(Boolean).join(', ')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setSelectedReward(null); setReplaceIndex(null) }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedReward.type === 'new-pokemon' && roster.length >= 6 && replaceIndex == null}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedReward.type === 'new-pokemon' && roster.length >= 6 ? 'Replace & Recruit' : 'Claim Reward'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RewardIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    item: '🎒',
    tm: '💿',
    ability: '✨',
    'ev-boost': '💪',
    nature: '🌿',
    'new-pokemon': '🔴',
  }
  return <span className="text-lg">{icons[type] || '🎁'}</span>
}

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400', Grass: 'bg-green-500', Ice: 'bg-cyan-300',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-500',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400', Fairy: 'bg-pink-300',
}

function TeamReviewCard({ pokemon }: { pokemon: PokemonSet }) {
  const species = getSpecies(pokemon.species)
  if (!species) return null

  const sprite = Sprites.getPokemon(species.name, { gen: 'gen5' })
  const bs = species.baseStats as Record<StatID, number>
  const gen = getGen(9)
  const abilityData = gen.abilities.get(pokemon.ability)
  const natureData = allNatures().find(n => n.name === pokemon.nature)
  const STATS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-3 mb-2">
        {sprite && (
          <img src={sprite.url} width={32} height={32} alt={species.name}
            className="object-contain"
            style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{species.name}</span>
            {species.types.map((t: string) => (
              <span key={t} className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white text-[10px] font-bold px-1.5 py-0 rounded`}>
                {t}
              </span>
            ))}
          </div>
          <div className="text-gray-500 text-xs">
            {pokemon.ability && <span>{pokemon.ability}</span>}
            {abilityData?.shortDesc && <span className="text-gray-600"> — {abilityData.shortDesc}</span>}
          </div>
          <div className="text-gray-500 text-xs">
            {pokemon.nature}
            {natureData?.plus && natureData?.minus && (
              <span> (<span className="text-green-400">+{STAT_LABELS[natureData.plus]}</span> / <span className="text-red-400">-{STAT_LABELS[natureData.minus]}</span>)</span>
            )}
            {pokemon.item && <span> · {pokemon.item}</span>}
          </div>
        </div>
      </div>

      {/* Moves */}
      <div className="flex flex-wrap gap-1 mb-2">
        {pokemon.moves.filter(Boolean).map((move, i) => {
          const md = getMove(move)
          return (
            <span key={i} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">
              {md && <span className={`${TYPE_COLORS[md.type] || 'bg-gray-500'} text-white text-[9px] font-bold px-1 py-0 rounded mr-1`}>{md.type}</span>}
              {move}
              {md && md.basePower > 0 && <span className="text-gray-500 ml-1">{md.basePower}bp</span>}
            </span>
          )
        })}
        {pokemon.moves.every(m => !m) && <span className="text-gray-600 text-xs">No moves</span>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-6 gap-1 text-[10px]">
        {STATS.map(stat => {
          const total = calcStat(stat, bs[stat], pokemon.ivs[stat], pokemon.evs[stat], pokemon.level, natureData || undefined)
          const isPlus = natureData?.plus === stat
          const isMinus = natureData?.minus === stat
          return (
            <div key={stat} className="text-center">
              <div className={`font-bold ${isPlus ? 'text-green-400' : isMinus ? 'text-red-400' : 'text-gray-500'}`}>
                {STAT_LABELS[stat]}
              </div>
              <div className="text-white font-bold">{total}</div>
              {pokemon.evs[stat] > 0 && (
                <div className="text-green-500">{pokemon.evs[stat]}ev</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
