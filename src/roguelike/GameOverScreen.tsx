import { Sprites } from '@pkmn/img'
import { useRoguelikeStore } from './useRoguelikeStore'

export function GameOverScreen() {
  const roundsWon = useRoguelikeStore((s) => s.roundsWon)
  const roster = useRoguelikeStore((s) => s.roster)
  const inventory = useRoguelikeStore((s) => s.inventory)
  const abandonRun = useRoguelikeStore((s) => s.abandonRun)

  const isVictory = roundsWon >= 40

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="text-center">
        {isVictory ? (
          <>
            <h2 className="text-3xl font-bold text-yellow-400">Champion!</h2>
            <p className="text-gray-300 mt-2">
              You conquered all 40 rounds!
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-red-400">Game Over</h2>
            <p className="text-gray-400 mt-2">
              You made it through {roundsWon} round{roundsWon !== 1 ? 's' : ''} of 40.
            </p>
          </>
        )}
      </div>

      {/* Final roster */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm text-gray-400 font-medium mb-3">Final Team</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {roster.map((p, i) => {
            if (!p.species) return null
            const sprite = Sprites.getPokemon(p.species, { gen: 'gen5ani' })
            return (
              <div key={i} className="flex flex-col items-center bg-gray-700 rounded-lg p-3">
                {sprite && (
                  <img
                    src={sprite.url}
                    width={sprite.w}
                    height={sprite.h}
                    alt={p.species}
                    className="object-contain mb-1"
                    style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
                  />
                )}
                <span className="text-white text-sm font-medium">{p.species}</span>
                <span className="text-gray-400 text-xs">{p.item || 'No item'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm text-gray-400 font-medium mb-2">Run Stats</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">Rounds Won</div>
          <div className="text-white font-bold">{roundsWon}</div>
          <div className="text-gray-400">Final Team Size</div>
          <div className="text-white font-bold">{roster.filter(p => p.species).length}</div>
          <div className="text-gray-400">Items Collected</div>
          <div className="text-white font-bold">{inventory.items.length}</div>
          <div className="text-gray-400">TMs Unlocked</div>
          <div className="text-white font-bold">
            {Object.values(inventory.unlockedTMs).reduce((a, b) => a + b.length, 0)}
          </div>
        </div>
      </div>

      <button
        onClick={abandonRun}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        Start New Run
      </button>
    </div>
  )
}
