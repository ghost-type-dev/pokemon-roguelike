import { useEffect, useRef, useState } from 'react'
import { Teams } from '@pkmn/sim'
import { BattleScene } from '../battle/BattleScene'
import { MovePanel } from '../battle/MovePanel'
import { TeamPanel } from '../battle/TeamPanel'
import { BattleLog } from '../battle/BattleLog'
import { useBattleStore } from '../battle/useBattleStore'
import { battleManager } from '../engine/BattleManager'
import { useRoguelikeStore } from './useRoguelikeStore'
import { generateAITeam, fillAIMoves, getMaxTeamSize } from './roguelike-helpers'
import { useT } from '../i18n/strings'
import type { PokemonSet } from '../teambuilder/useTeamBuilder'

function packPokemonSets(sets: PokemonSet[]): string {
  const showdownSets = sets.filter(p => p.species).map(p => ({
    name: p.name || p.species,
    species: p.species,
    item: p.item || '',
    ability: p.ability || '',
    moves: p.moves.filter(Boolean),
    nature: p.nature || 'Hardy',
    evs: { ...p.evs },
    ivs: { ...p.ivs },
    level: p.level || 50,
    gender: p.gender || '',
  }))
  return Teams.pack(showdownSets as any)
}

export function BattleStage() {
  const t = useT()
  const roster = useRoguelikeStore((s) => s.roster)
  const round = useRoguelikeStore((s) => s.round)
  const aiDifficulty = useRoguelikeStore((s) => s.aiDifficulty)
  const onBattleFinished = useRoguelikeStore((s) => s.onBattleFinished)
  const pendingOpponentTeam = useRoguelikeStore((s) => s.pendingOpponentTeam)

  const battleStatus = useBattleStore((s) => s.status)
  const winner = useBattleStore((s) => s.winner)
  const humanRequest = useBattleStore((s) => s.humanRequest)
  const currentTurn = useBattleStore((s) => s.currentTurn)

  const [battleStarted, setBattleStarted] = useState(false)
  const [opponentTeam, setOpponentTeam] = useState<PokemonSet[]>([])
  const finishedHandled = useRef(false)

  // Start battle on mount
  useEffect(() => {
    let cancelled = false

    async function startBattle() {
      // Reuse the pending opponent team on retry, otherwise generate a new one
      let aiTeamWithMoves: PokemonSet[]
      if (pendingOpponentTeam && pendingOpponentTeam.length > 0) {
        aiTeamWithMoves = pendingOpponentTeam
      } else {
        const aiTeam = generateAITeam(round)
        aiTeamWithMoves = await fillAIMoves(aiTeam, round)
      }
      if (cancelled) return

      setOpponentTeam(aiTeamWithMoves)

      // Only bring the allowed number of Pokemon for this round bracket
      const maxSize = getMaxTeamSize(round)
      const p1Packed = packPokemonSets(roster.slice(0, maxSize))
      const p2Packed = packPokemonSets(aiTeamWithMoves)

      battleManager.connect()
      // Sync names to the battle store so BattleScene displays them correctly
      // (translatePlayerLabel pattern-matches these to render localized labels)
      useBattleStore.getState().setConfig({
        p1Name: 'Player',
        p2Name: `Round ${round} Boss`,
      })
      await battleManager.startBattleWithTeams({
        formatId: 'gen9anythinggoes',
        p1AI: 'human',
        p2AI: aiDifficulty === 'smart' ? 'heuristic' : 'random',
        p1Name: 'Player',
        p2Name: `Round ${round} Boss`,
        p1PackedTeam: p1Packed,
        p2PackedTeam: p2Packed,
      })

      if (!cancelled) setBattleStarted(true)
    }

    startBattle()
    return () => { cancelled = true }
  }, [])

  // Watch for battle end
  useEffect(() => {
    if (battleStarted && battleStatus === 'finished' && !finishedHandled.current) {
      finishedHandled.current = true
      const won = winner === 'Player'
      // Small delay to let user see the result
      setTimeout(() => {
        onBattleFinished(won, opponentTeam)
      }, 2000)
    }
  }, [battleStatus, battleStarted, winner])

  if (!battleStarted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 animate-pulse">{t.generatingOpponent}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t.roundBattleFmt(round)}</h2>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          {currentTurn > 0 && <span>{t.turnFmt(currentTurn)}</span>}
          {humanRequest && battleStatus === 'running' && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {t.yourTurnLabel}
            </span>
          )}
          {battleStatus === 'finished' && (
            <span className={winner === 'Player' ? 'text-green-400' : 'text-red-400'}>
              {winner === 'Player' ? t.victoryLabel : t.defeatedLabel}
            </span>
          )}
        </div>
      </div>

      <BattleScene />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <MovePanel />
        </div>
        <div>
          <TeamPanel />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">{t.battleLogHeading}</h3>
        <BattleLog />
      </div>
    </div>
  )
}
