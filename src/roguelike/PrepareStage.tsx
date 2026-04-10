import { useState, useMemo } from 'react'
import { Sprites } from '@pkmn/img'
import { getSpecies, getMove, allNatures, calcStat } from '../teambuilder/dex-helpers'
import { getGen } from '../teambuilder/dex-helpers'
import { SearchSelect } from '../teambuilder/SearchSelect'
import { MoveSelect } from './MoveSelect'
import { useRoguelikeStore } from './useRoguelikeStore'
import { getMaxTeamSize, getEvolutionProgress } from './roguelike-helpers'
import { zhPokemon, zhMove, zhItem, zhAbility, zhItemDesc, zhAbilityDesc, zhMoveDesc } from '../i18n/zh-helpers'
import { useT, type Strings } from '../i18n/strings'
import type { StatID } from '@pkmn/data'

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400', Grass: 'bg-green-500', Ice: 'bg-cyan-300',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-500',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400', Fairy: 'bg-pink-300',
}

export function PrepareStage() {
  const t = useT()
  const roster = useRoguelikeStore((s) => s.roster)
  const inventory = useRoguelikeStore((s) => s.inventory)
  const updateRosterMove = useRoguelikeStore((s) => s.updateRosterMove)
  const updateRosterPokemon = useRoguelikeStore((s) => s.updateRosterPokemon)
  const swapRoster = useRoguelikeStore((s) => s.swapRoster)
  const evolvePokemon = useRoguelikeStore((s) => s.evolvePokemon)
  const finishPrepare = useRoguelikeStore((s) => s.finishPrepare)
  const round = useRoguelikeStore((s) => s.round)

  const [activeSlot, setActiveSlot] = useState(0)
  const activePokemon = roster[activeSlot]

  // Items held by other roster Pokemon are unavailable
  const availableItems = useMemo(() => {
    const heldByOthers = new Set(
      roster.filter((_, i) => i !== activeSlot).map(p => p.item).filter(Boolean)
    )
    return inventory.items.filter(item => !heldByOthers.has(item) || item === activePokemon?.item)
  }, [roster, activeSlot, inventory.items, activePokemon?.item])

  // Allowed moves = current moves + reward-unlocked moves only
  const allowedMoves = useMemo(() => {
    if (!activePokemon?.species) return []
    const currentMoves = activePokemon.moves.filter(Boolean)
    const unlocked = inventory.unlockedTMs[activePokemon.species] || []
    const combined = new Set([...currentMoves, ...unlocked])
    return [...combined].sort()
  }, [activePokemon?.species, activePokemon?.moves, inventory.unlockedTMs])

  // Local EV edits — only committed when starting battle
  const [evEdits, setEvEdits] = useState<Record<number, Record<StatID, number>>>({})

  const getEditedEvs = (slotIdx: number): Record<StatID, number> => {
    return evEdits[slotIdx] ?? roster[slotIdx]?.evs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }

  const handleEvChange = (slotIdx: number, stat: StatID, delta: number) => {
    const current = getEditedEvs(slotIdx)
    const earned = roster[slotIdx]?.evs[stat] ?? 0
    const currentTotal = Object.values(current).reduce((a, b) => a + b, 0)
    const newVal = Math.max(0, Math.min(earned, Math.min(252, current[stat] + delta)))
    const newTotal = currentTotal - current[stat] + newVal
    if (newTotal > 510) return
    setEvEdits(prev => ({
      ...prev,
      [slotIdx]: { ...current, [stat]: newVal },
    }))
  }

  const handleStartBattle = () => {
    finishPrepare()
  }

  const canStart = roster.some(p => p.species && p.moves.some(m => m !== ''))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t.prepareTitle(round)}</h2>
        <button
          onClick={handleStartBattle}
          disabled={!canStart}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${
            canStart
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t.readyForBattle}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Roster slots */}
        <div className="space-y-2">
          <h3 className="text-sm text-gray-400 font-medium">
            {t.yourTeam} <span className="text-gray-600">{t.topNBattle(getMaxTeamSize(round))}</span>
          </h3>
          {roster.map((p, i) => {
            const sprite = p.species ? Sprites.getPokemon(p.species, { gen: 'gen5' }) : null
            const maxSize = getMaxTeamSize(round)
            const isBenched = i >= maxSize
            return (
              <div key={i} className={`flex items-center gap-1 ${isBenched ? 'opacity-50' : ''}`}>
                {/* Up/Down reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => { swapRoster(i, i - 1); if (activeSlot === i) setActiveSlot(i - 1); else if (activeSlot === i - 1) setActiveSlot(i) }}
                    disabled={i === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-20 disabled:hover:text-gray-500 text-xs px-0.5"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => { swapRoster(i, i + 1); if (activeSlot === i) setActiveSlot(i + 1); else if (activeSlot === i + 1) setActiveSlot(i) }}
                    disabled={i === roster.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-20 disabled:hover:text-gray-500 text-xs px-0.5"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => setActiveSlot(i)}
                  className={`flex-1 rounded-lg p-2 text-left transition-colors border ${
                    activeSlot === i
                      ? 'border-purple-500 bg-gray-700'
                      : 'border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 h-12">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {sprite && (
                        <img
                          src={sprite.url}
                          width={40}
                          height={40}
                          alt={p.species}
                          className="object-contain"
                          style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-medium truncate">
                        {zhPokemon(p.species)}
                        {p.gender === 'M' && <span className="text-blue-400 ml-1">♂</span>}
                        {p.gender === 'F' && <span className="text-pink-400 ml-1">♀</span>}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        {p.moves.filter(Boolean).map(m => zhMove(m)).join(', ') || t.noMoves}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}

          {/* Inventory */}
          {inventory.items.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm text-gray-400 font-medium mb-1">{t.inventory}</h3>
              <div className="space-y-1">
                {inventory.items.map((item, i) => {
                  const holder = roster.find(p => p.item === item)
                  const gen = getGen(9)
                  const itemData = gen.items.get(item)
                  const desc = zhItemDesc(item) || itemData?.shortDesc || itemData?.desc || ''
                  return (
                    <div key={i} className={`text-xs px-2 py-1 rounded ${holder ? 'bg-gray-800 text-gray-500' : 'bg-gray-700 text-gray-300'}`}>
                      <span className={holder ? 'line-through' : ''}>{zhItem(item)}</span>
                      {holder && <span className="ml-1 text-gray-600">({zhPokemon(holder.species)})</span>}
                      {desc && <div className={`mt-0.5 ${holder ? 'text-gray-600' : 'text-gray-500'}`}>{desc}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pokemon editor */}
        <div className="md:col-span-2">
          {activePokemon?.species ? (
            <PokemonPrepareEditor
              t={t}
              pokemon={activePokemon}
              slotIndex={activeSlot}
              allowedMoves={allowedMoves}
              ownedItems={availableItems}
              round={round}
              editedEvs={getEditedEvs(activeSlot)}
              evDirty={!!evEdits[activeSlot]}
              onEvChange={(stat, delta) => handleEvChange(activeSlot, stat, delta)}
              onEvSave={() => {
                const evs = evEdits[activeSlot]
                if (evs) {
                  updateRosterPokemon(activeSlot, { evs })
                  setEvEdits(prev => { const next = { ...prev }; delete next[activeSlot]; return next })
                }
              }}
              onMoveChange={updateRosterMove}
              onItemChange={(idx, item) => updateRosterPokemon(idx, { item })}
              onEvolve={evolvePokemon}
            />
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
              {t.selectPokemonHint}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PokemonPrepareEditor({
  t,
  pokemon,
  slotIndex,
  allowedMoves,
  ownedItems,
  round,
  editedEvs,
  evDirty,
  onEvChange,
  onEvSave,
  onMoveChange,
  onItemChange,
  onEvolve,
}: {
  t: Strings
  pokemon: { species: string; ability: string; item: string; moves: string[]; evs: Record<StatID, number>; ivs: Record<StatID, number>; nature: string; level: number; gender: string }
  slotIndex: number
  allowedMoves: string[]
  ownedItems: string[]
  round: number
  editedEvs: Record<StatID, number>
  evDirty: boolean
  onEvChange: (stat: StatID, delta: number) => void
  onEvSave: () => void
  onMoveChange: (slotIdx: number, moveIdx: number, move: string) => void
  onItemChange: (slotIdx: number, item: string) => void
  onEvolve: (slotIdx: number, evoSpecies: string) => void
}) {
  const species = getSpecies(pokemon.species)
  if (!species) return null

  const sprite = Sprites.getPokemon(species.name, { gen: 'gen5ani' })
  const bs = species.baseStats as Record<StatID, number>

  // Evolution progress
  const evoProgress = useMemo(() => {
    return getEvolutionProgress(pokemon.species, round)
  }, [pokemon.species, round])

  // Look up ability description
  const abilityData = useMemo(() => {
    if (!pokemon.ability) return null
    const gen = getGen(9)
    return gen.abilities.get(pokemon.ability)
  }, [pokemon.ability])

  // Look up nature effect
  const natureData = useMemo(() => {
    return allNatures().find(n => n.name === pokemon.nature)
  }, [pokemon.nature])

  // Look up move descriptions
  const moveDescriptions = useMemo(() => {
    return pokemon.moves.map(m => m ? getMove(m) : null)
  }, [pokemon.moves])

  const STATS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
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
        <div className="flex-1">
          <div className="text-white font-bold text-lg">
            {zhPokemon(species.name)}
            {pokemon.gender === 'M' && <span className="text-blue-400 ml-1">♂</span>}
            {pokemon.gender === 'F' && <span className="text-pink-400 ml-1">♀</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {species.types.map((tp: string) => (
              <span
                key={tp}
                className={`${TYPE_COLORS[tp] || 'bg-gray-500'} text-white text-xs font-bold px-2 py-0.5 rounded`}
              >
                {tp}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution progress */}
      {evoProgress.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t.evolutionLabel}</label>
          <div className="space-y-2">
            {evoProgress.map((evo) => {
              const evoSprite = Sprites.getPokemon(evo.evoName, { gen: 'gen5' })
              const canEvolve = evo.progress >= 100
              return (
                <div key={evo.evoName} className="bg-gray-700 rounded px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    {evoSprite && (
                      <img
                        src={evoSprite.url}
                        width={24}
                        height={24}
                        alt={evo.evoName}
                        className="object-contain"
                        style={{ imageRendering: evoSprite.pixelated ? 'pixelated' : 'auto' }}
                      />
                    )}
                    <span className="text-white text-sm font-medium">{zhPokemon(evo.evoName)}</span>
                    <span className="text-gray-500 text-xs ml-auto">{t.bstShort(evo.evoBst)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-600 rounded-full h-2">
                      <div
                        className={`rounded-full h-2 transition-all ${canEvolve ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${evo.progress}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${canEvolve ? 'text-green-400' : 'text-gray-400'}`}>
                      {evo.progress}%
                    </span>
                  </div>
                  {canEvolve && (
                    <button
                      onClick={() => onEvolve(slotIndex, evo.evoName)}
                      className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-1.5 rounded transition-colors"
                    >
                      {t.evolveToFmt(zhPokemon(evo.evoName))}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ability with description */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t.abilityField}</label>
        <div className="bg-gray-700 rounded px-3 py-2">
          <div className="text-white text-sm font-medium">{zhAbility(pokemon.ability)}</div>
          {(zhAbilityDesc(pokemon.ability) || abilityData?.shortDesc) && (
            <div className="text-gray-400 text-xs mt-0.5">{zhAbilityDesc(pokemon.ability) || abilityData!.shortDesc}</div>
          )}
        </div>
      </div>

      {/* Nature with description */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t.natureField}</label>
        <div className="bg-gray-700 rounded px-3 py-2">
          <div className="text-white text-sm font-medium">
            {t.nature[pokemon.nature] ?? pokemon.nature}
            {natureData && natureData.plus && natureData.minus && (
              <span className="text-xs font-normal ml-2">
                <span className="text-green-400">+{t.statShort[natureData.plus]}</span>
                {' / '}
                <span className="text-red-400">-{t.statShort[natureData.minus]}</span>
              </span>
            )}
            {natureData && !natureData.plus && (
              <span className="text-xs font-normal text-gray-500 ml-2">{t.neutralNature}</span>
            )}
          </div>
        </div>
      </div>

      {/* Item */}
      <SearchSelect
        label={t.heldItemField}
        value={pokemon.item}
        options={ownedItems}
        onChange={(item) => onItemChange(slotIndex, item)}
        placeholder={t.noItemPlaceholder}
        formatLabel={zhItem}
      />

      {/* Moves with descriptions */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t.movesField}</label>
        <div className="space-y-2">
          {pokemon.moves.map((move, i) => {
            const md = moveDescriptions[i]
            // Exclude moves already selected in other slots
            const usedElsewhere = new Set(pokemon.moves.filter((m, j) => j !== i && m))
            const availableMoves = allowedMoves.filter(m => !usedElsewhere.has(m))
            return (
              <div key={i}>
                <MoveSelect
                  value={move}
                  options={availableMoves}
                  onChange={(m) => onMoveChange(slotIndex, i, m)}
                  placeholder={t.movePlaceholder(i + 1)}
                />
                {md && (
                  <div className="mt-0.5 px-2 text-xs text-gray-500">
                    {zhMoveDesc(move) || md.shortDesc}
                    <span className="ml-2 text-gray-600">
                      {md.category === 'Physical' ? t.catPhysicalIcon : md.category === 'Special' ? t.catSpecialIcon : t.catStatusIcon}
                      {md.accuracy === true ? '' : ` · ${t.accSuffix(md.accuracy as number)}`}
                      {md.pp ? ` · ${t.ppSuffix(md.pp)}` : ''}
                      {md.priority !== 0 ? ` · ${t.prioritySuffix(md.priority)}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats table: Base / IV / EV / Total */}
      <div>
        {(() => {
          const evTotal = Object.values(editedEvs).reduce((a, b) => a + b, 0)
          return (
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">{t.statsHeader}</label>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${evTotal >= 510 ? 'text-red-400' : 'text-gray-400'}`}>
                  {t.evTotalLabel(evTotal, 510)}
                </span>
                {evDirty && (
                  <button
                    onClick={onEvSave}
                    className="text-xs px-2 py-0.5 rounded bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
                  >
                    {t.saveBtn}
                  </button>
                )}
              </div>
            </div>
          )
        })()}
        <div className="bg-gray-700 rounded overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[3rem_1fr_2.5rem_2rem_5.5rem_3rem] gap-1 px-2 py-1 text-[10px] text-gray-500 border-b border-gray-600">
            <span>{t.colStat}</span>
            <span></span>
            <span className="text-right">{t.colBase}</span>
            <span className="text-right">{t.colIv}</span>
            <span className="text-center">{t.colEv}</span>
            <span className="text-right">{t.colTotal}</span>
          </div>
          {STATS.map((stat) => {
            const ev = editedEvs[stat]
            const evTotal = Object.values(editedEvs).reduce((a, b) => a + b, 0)
            const total = calcStat(stat, bs[stat], pokemon.ivs[stat], ev, pokemon.level, natureData || undefined)
            const isPlus = natureData?.plus === stat
            const isMinus = natureData?.minus === stat
            const maxForStat = pokemon.evs[stat] // can't exceed what was earned
            const canIncrease = ev < maxForStat && ev < 252 && evTotal < 510
            const canDecrease = ev > 0
            return (
              <div key={stat} className="grid grid-cols-[3rem_1fr_2.5rem_2rem_5.5rem_3rem] gap-1 items-center px-2 py-0.5 text-xs">
                <span className={`font-medium ${isPlus ? 'text-green-400' : isMinus ? 'text-red-400' : 'text-gray-400'}`}>
                  {t.statShort[stat]}
                  {isPlus && '+'}
                  {isMinus && '-'}
                </span>
                <div className="bg-gray-600 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 rounded-full h-1.5"
                    style={{ width: `${Math.min(100, (bs[stat] / 150) * 100)}%` }}
                  />
                </div>
                <span className="text-gray-300 text-right">{bs[stat]}</span>
                <span className="text-blue-400 text-right">{pokemon.ivs[stat]}</span>
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => onEvChange(stat, -4)}
                    disabled={!canDecrease}
                    className="w-4 h-4 flex items-center justify-center rounded bg-gray-600 hover:bg-red-700 text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-600 text-[10px] leading-none"
                  >
                    −
                  </button>
                  <span className={`w-8 text-center ${ev > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {ev}
                  </span>
                  <button
                    onClick={() => onEvChange(stat, 4)}
                    disabled={!canIncrease}
                    className="w-4 h-4 flex items-center justify-center rounded bg-gray-600 hover:bg-green-700 text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-600 text-[10px] leading-none"
                  >
                    +
                  </button>
                </div>
                <span className="text-white font-bold text-right">{total}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
