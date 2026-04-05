interface HPBarProps {
  current: number
  max: number
  name: string
  level?: number
  status?: string
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

export function HPBar({ current, max, name, level, status }: HPBarProps) {
  const percent = max > 0 ? Math.max(0, (current / max) * 100) : 0
  const statusBadge = getStatusBadge(status)

  return (
    <div className="w-56">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-bold text-sm truncate">
          {name}
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
      <div className="text-gray-400 text-xs text-right mt-0.5">
        {current}/{max}
      </div>
    </div>
  )
}
