import { useEffect, useState, useRef } from 'react'
import { useRoguelikeStore } from './useRoguelikeStore'
import { DraftPick } from './DraftPick'
import { PrepareStage } from './PrepareStage'
import { BattleStage } from './BattleStage'
import { RewardStage } from './RewardStage'
import { GameOverScreen } from './GameOverScreen'
import { Sprites } from '@pkmn/img'
import { useT } from '../i18n/strings'
import { useLanguageStore, useLanguage } from '../i18n/useLanguage'

function LanguageToggle() {
  const language = useLanguage()
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  return (
    <div className="inline-flex bg-gray-700 rounded overflow-hidden text-xs">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 transition-colors ${language === 'en' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('zh')}
        className={`px-2 py-1 transition-colors ${language === 'zh' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
      >
        中
      </button>
    </div>
  )
}

export function RoguelikePage() {
  const t = useT()
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{t.appTitle}</h2>
          <LanguageToggle />
        </div>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4 max-w-lg">
          <p className="text-gray-300">{t.introBlurb}</p>
          <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
            {t.introBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          <div>
            <label className="block text-xs text-gray-400 mb-1">{t.aiDifficulty}</label>
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value as 'random' | 'smart')}
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm w-full"
            >
              <option value="random">{t.aiDifficultyEasy}</option>
              <option value="smart">{t.aiDifficultyHard}</option>
            </select>
          </div>

          <button
            onClick={() => startNewRun(aiDifficulty)}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {t.startNewGame}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {t.loadFromFile}
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
              {t.autoLoadedHint}
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
            <span className="text-purple-400 font-bold">{t.roundCounter(round, 40)}</span>
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
              {t.itemsHeld(inventory.items.length)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={exportRun}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              {t.saveToFile}
            </button>
            <button
              onClick={abandonRun}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              {t.abandonRun}
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
