import { useEffect, useRef } from 'react'
import { useBattleStore } from './useBattleStore'
import { formatLine } from './formatLine'
import { useLanguage } from '../i18n/useLanguage'

export function BattleLog() {
  const visibleEvents = useBattleStore((s) => s.visibleEvents)
  const language = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visibleEvents])

  const lines = visibleEvents
    .map((e) => formatLine(e.data, language))
    .filter((l): l is NonNullable<typeof l> => l !== null)

  return (
    <div
      ref={scrollRef}
      className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-0.5"
    >
      {lines.length === 0 && (
        <div className="text-gray-600 text-center mt-8">
          {language === 'en' ? 'Battle log will appear here...' : '战斗日志将显示在这里……'}
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
