import { useState, useRef, useEffect, useMemo } from 'react'
import { getMove } from '../teambuilder/dex-helpers'

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-gray-400', Fire: 'bg-red-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400 text-black', Grass: 'bg-green-500', Ice: 'bg-cyan-300 text-black',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-600',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-500',
  Rock: 'bg-yellow-700', Ghost: 'bg-purple-700', Dragon: 'bg-indigo-600',
  Dark: 'bg-gray-700', Steel: 'bg-gray-400', Fairy: 'bg-pink-300',
}

interface MoveSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}

interface MoveInfo {
  name: string
  type: string
  basePower: number
  category: string
}

export function MoveSelect({ value, options, onChange, placeholder }: MoveSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Cache move data for all options
  const moveInfoMap = useMemo(() => {
    const map = new Map<string, MoveInfo>()
    for (const name of options) {
      const m = getMove(name)
      if (m) {
        map.set(name, { name: m.name, type: m.type, basePower: m.basePower, category: m.category })
      }
    }
    return map
  }, [options])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return (q
      ? options.filter(o => o.toLowerCase().includes(q))
      : options
    ).slice(0, 80)
  }, [query, options])

  useEffect(() => { setHighlightIndex(0) }, [query])
  useEffect(() => { if (!isOpen) setQuery('') }, [isOpen])
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex, isOpen])

  const handleSelect = (opt: string) => {
    onChange(opt)
    setIsOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[highlightIndex]) {
      e.preventDefault()
      handleSelect(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const selectedInfo = value ? moveInfoMap.get(value) : null

  return (
    <div className="relative">
      <div
        className="bg-gray-700 rounded px-2 py-1.5 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-600"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        {selectedInfo ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`${TYPE_COLORS[selectedInfo.type] || 'bg-gray-500'} text-white text-[10px] font-bold px-1 py-0 rounded flex-shrink-0`}>
              {selectedInfo.type}
            </span>
            <span className="text-white truncate">{value}</span>
            <span className="text-gray-400 text-xs flex-shrink-0">
              {selectedInfo.basePower > 0 ? `${selectedInfo.basePower}bp` : selectedInfo.category}
            </span>
          </span>
        ) : (
          <span className="text-gray-500">{placeholder || 'Select...'}</span>
        )}
        {value && (
          <button
            className="text-gray-400 hover:text-white ml-1 text-xs flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded shadow-lg max-h-72 overflow-hidden flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            className="w-full bg-gray-700 text-white px-2 py-1.5 text-sm outline-none border-b border-gray-600"
            placeholder="Search moves..."
          />
          <div ref={listRef} className="overflow-y-auto max-h-60">
            {filtered.map((opt, i) => {
              const info = moveInfoMap.get(opt)
              return (
                <div
                  key={opt}
                  className={`px-2 py-1 text-sm cursor-pointer flex items-center gap-1.5 ${
                    i === highlightIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  {info && (
                    <span className={`${TYPE_COLORS[info.type] || 'bg-gray-500'} text-white text-[10px] font-bold px-1 py-0 rounded flex-shrink-0`}>
                      {info.type}
                    </span>
                  )}
                  <span className="truncate">{opt}</span>
                  {info && (
                    <span className={`text-xs ml-auto flex-shrink-0 ${i === highlightIndex ? 'text-blue-200' : 'text-gray-500'}`}>
                      {info.category === 'Status' ? 'Status' : `${info.basePower > 0 ? info.basePower + 'bp' : '—'} ${info.category}`}
                    </span>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-sm text-gray-500">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
