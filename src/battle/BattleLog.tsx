import { useEffect, useRef } from 'react'
import { useBattleStore } from './useBattleStore'
import { formatLine } from './formatLine'

export function BattleLog() {
  const visibleEvents = useBattleStore((s) => s.visibleEvents)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visibleEvents])

  const lines = visibleEvents
    .map((e) => formatLine(e.data))
    .filter((l): l is NonNullable<typeof l> => l !== null)

  return (
    <div
      ref={scrollRef}
      className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-0.5"
    >
      {lines.length === 0 && (
        <div className="text-gray-600 text-center mt-8">
          Battle log will appear here...
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className={line.className}>
          {line.text}
        </div>
      ))}
    </div>
  )
}
