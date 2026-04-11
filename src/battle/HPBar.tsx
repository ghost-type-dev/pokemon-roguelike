const TYPE_BADGE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-500',
  Fire: 'bg-red-600',
  Water: 'bg-blue-600',
  Electric: 'bg-yellow-500 text-black',
  Grass: 'bg-green-600',
  Ice: 'bg-cyan-400 text-black',
  Fighting: 'bg-red-800',
  Poison: 'bg-purple-600',
  Ground: 'bg-yellow-700',
  Flying: 'bg-indigo-400',
  Psychic: 'bg-pink-600',
  Bug: 'bg-lime-600',
  Rock: 'bg-yellow-800',
  Ghost: 'bg-purple-800',
  Dragon: 'bg-indigo-700',
  Dark: 'bg-gray-800',
  Steel: 'bg-gray-500',
  Fairy: 'bg-pink-400 text-black',
}

interface HPBarProps {
  current: number
  max: number
  name: string
  level?: number
  status?: string
  gender?: string
  types?: string[]
}

function getHPColor(percent: number): string {
  if (percent > 50) return 'bg-green-500'
  if (percent > 20) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getStatusBadge(status: string | undefined): { text: string; color: string } | null {
  if (!status) return null
  const badges: Record<string, { text: string; color: string }> = {
    brn: { text: 'BRN', color: 'bg-orange-600' },
    par: { text: 'PAR', color: 'bg-yellow-600' },
    slp: { text: 'SLP', color: 'bg-gray-500' },
    frz: { text: 'FRZ', color: 'bg-cyan-500' },
    psn: { text: 'PSN', color: 'bg-purple-600' },
    tox: { text: 'TOX', color: 'bg-purple-800' },
  }
  return badges[status] || null
}

export function HPBar({ current, max, name, level, status, gender, types }: HPBarProps) {
  const percent = max > 0 ? Math.max(0, (current / max) * 100) : 0
  const statusBadge = getStatusBadge(status)

  return (
    <div className="w-56">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-bold text-sm truncate">
          {name}
          {gender === 'M' && <span className="text-blue-400 ml-1">♂</span>}
          {gender === 'F' && <span className="text-pink-400 ml-1">♀</span>}
          {level && <span className="text-gray-400 font-normal ml-1">Lv{level}</span>}
        </span>
        {statusBadge && (
          <span className={`${statusBadge.color} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>
            {statusBadge.text}
          </span>
        )}
      </div>
      <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getHPColor(percent)} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        {types && types.length > 0 ? (
          <div className="flex gap-1">
            {types.map((t) => (
              <span
                key={t}
                className={`${TYPE_BADGE_COLORS[t] ?? 'bg-gray-500'} text-white text-xs font-semibold px-1.5 py-0.5 rounded`}
              >
                {t}
              </span>
            ))}
          </div>
        ) : <span />}
        <span className="text-gray-400 text-xs">{current}/{max}</span>
      </div>
    </div>
  )
}
