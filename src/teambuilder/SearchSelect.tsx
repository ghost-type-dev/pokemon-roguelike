import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n/strings'

interface SearchSelectProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  formatLabel?: (opt: string) => string
}

export function SearchSelect({ label, value, options, onChange, placeholder, disabled, formatLabel }: SearchSelectProps) {
  const t = useT()
  const fmt = formatLabel ?? ((o: string) => o)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()) || fmt(o).toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : options.slice(0, 50)

  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  // Scroll highlighted item into view
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
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[highlightIndex]) {
      e.preventDefault()
      handleSelect(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div
        className={`bg-gray-700 rounded px-2 py-1.5 text-sm cursor-pointer flex items-center justify-between ${disabled ? 'opacity-50' : 'hover:bg-gray-600'}`}
        onClick={() => {
          if (disabled) return
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {value ? fmt(value) : (placeholder || t.selectPlaceholder)}
        </span>
        {value && !disabled && (
          <button
            className="text-gray-400 hover:text-white ml-1 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded shadow-lg max-h-60 overflow-hidden flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            className="w-full bg-gray-700 text-white px-2 py-1.5 text-sm outline-none border-b border-gray-600"
            placeholder={t.searchGeneric}
          />
          <div ref={listRef} className="overflow-y-auto max-h-48">
            {filtered.map((opt, i) => (
              <div
                key={opt}
                className={`px-2 py-1 text-sm cursor-pointer ${
                  i === highlightIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(opt)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                {fmt(opt)}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-sm text-gray-500">{t.noResults}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
