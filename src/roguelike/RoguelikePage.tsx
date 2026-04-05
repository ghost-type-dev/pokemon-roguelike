import { useEffect, useState, useRef } from 'react'
import { useRoguelikeStore } from './useRoguelikeStore'
import { DraftPick } from './DraftPick'
import { PrepareStage } from './PrepareStage'
import { BattleStage } from './BattleStage'
import { RewardStage } from './RewardStage'
import { GameOverScreen } from './GameOverScreen'
import { Sprites } from '@pkmn/img'

export function RoguelikePage() {
  const phase = useRoguelikeStore((s) => s.phase)
  const round = useRoguelikeStore((s) => s.round)
  const roster = useRoguelikeStore((s) => s.roster)
  const inventory = useRoguelikeStore((s) => s.inventory)
  const startNewRun = useRoguelikeStore((s) => s.startNewRun)
  const abandonRun = useRoguelikeStore((s) => s.abandonRun)
  const loadRun = useRoguelikeStore((s) => s.loadRun)
  const exportRun = useRoguelikeStore((s) => s.exportRun)
  const importRun = useRoguelikeStore((s) => s.importRun)
  const [aiDifficulty, setAiDifficulty] = useState<'random' | 'smart'>('smart')
  const [hasSave, setHasSave] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loaded = loadRun()
    setHasSave(loaded)
  }, [])

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const success = importRun(reader.result as string)
      if (!success) alert('Invalid save file.')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Roguelike Mode</h2>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4 max-w-lg">
          <p className="text-gray-300">
            Battle through increasingly difficult opponents with a single starter Pokemon.
            Earn rewards between rounds to strengthen your team.
          </p>
          <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
            <li>Draft 3 Pokemon from 6 random candidates to begin</li>
            <li>Team size grows: 3 (R1-10), 4 (R11-20), 5 (R21-30), 6 (R31-40)</li>
            <li>All Pokemon are level 50 with perfect IVs</li>
            <li>Earn items, TMs, EVs, and new Pokemon as rewards</li>
            <li>Opponents get stronger each round across 40 rounds</li>
            <li>Lose a battle? Retry from the last reward screen</li>
            <li>Beat all 40 rounds to become Champion!</li>
          </ul>

          <div>
            <label className="block text-xs text-gray-400 mb-1">AI Difficulty</label>
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value as 'random' | 'smart')}
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm w-full"
            >
              <option value="random">Easy (Random AI)</option>
              <option value="smart">Hard (Heuristic AI)</option>
            </select>
          </div>

          <button
            onClick={() => startNewRun(aiDifficulty)}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start New Run
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Load from File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

          {hasSave && (
            <p className="text-xs text-gray-500 text-center">
              A saved run was loaded automatically.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Run header */}
      {phase !== 'game-over' && (
        <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-purple-400 font-bold">Round {round}/40</span>
            <div className="flex items-center gap-1">
              {roster.map((p, i) => {
                const sprite = p.species ? Sprites.getPokemon(p.species, { gen: 'gen5' }) : null
                return sprite ? (
                  <img
                    key={i}
                    src={sprite.url}
                    width={24}
                    height={24}
                    alt={p.species}
                    className="object-contain"
                    style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
                  />
                ) : null
              })}
            </div>
            <span className="text-gray-500 text-xs">
              {inventory.items.length} items
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportRun}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              Save to File
            </button>
            <button
              onClick={abandonRun}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Abandon Run
            </button>
          </div>
        </div>
      )}

      {phase === 'draft-pick' && <DraftPick />}
      {phase === 'prepare' && <PrepareStage />}
      {phase === 'battle' && <BattleStage />}
      {phase === 'reward' && <RewardStage />}
      {phase === 'game-over' && <GameOverScreen />}
    </div>
  )
}
