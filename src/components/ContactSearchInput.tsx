'use client'

import { useEffect, useRef, useState } from 'react'
import { Contact } from '@/lib/types'

interface ContactSearchInputProps {
  contacts: Contact[]
  onSelect: (contact: Contact) => void
  placeholder?: string
  disabled?: boolean
}

export function ContactSearchInput({
  contacts,
  onSelect,
  placeholder = 'Search by name or phone',
  disabled = false
}: ContactSearchInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = query.trim().length > 0
    ? contacts
        .filter(c => {
          const q = query.toLowerCase()
          const qDigits = q.replace(/\D/g, '')
          const nameMatch = c.name.toLowerCase().includes(q)
          const phoneMatch = qDigits.length > 0 && c.phone.replace(/\D/g, '').includes(qDigits)
          return nameMatch || phoneMatch
        })
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        .slice(0, 10)
    : []

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setOpen(suggestions.length > 0)
    setActiveIndex(-1)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectContact(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function selectContact(contact: Contact) {
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
    onSelect(contact)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)',
    width: '100%',
    boxSizing: 'border-box'
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '1 1 220px' }}>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-label={placeholder}
        style={inputStyle}
      />
      {open && (
        <ul
          role="listbox"
          aria-label="Contact suggestions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            backgroundColor: 'var(--input-bg, #fff)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
            maxHeight: 240,
            overflowY: 'auto'
          }}
        >
          {suggestions.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectContact(c)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: i === activeIndex ? 'var(--accent-bg, #e8f0fe)' : 'transparent',
                fontSize: 14
              }}
            >
              {c.name?.trim() ? `${c.name} — ${c.phone}` : c.phone}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
