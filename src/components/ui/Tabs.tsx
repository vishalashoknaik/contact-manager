'use client'

import { ReactNode, CSSProperties } from 'react'

interface Tab {
  id: string
  label: string
  badge?: number | string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  style?: CSSProperties
}

export function Tabs({ tabs, activeTab, onTabChange, style }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid var(--border-color, #e0e0e0)',
        overflowX: 'auto',
        ...style,
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--color-primary, #0d6efd)' : 'var(--text-secondary, #666)',
              borderBottom: isActive ? '2px solid var(--color-primary, #0d6efd)' : '2px solid transparent',
              marginBottom: -2,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span style={{
                backgroundColor: isActive ? 'var(--color-primary, #0d6efd)' : 'var(--border-color, #ccc)',
                color: isActive ? '#fff' : 'var(--text-secondary, #666)',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                minWidth: 18,
                textAlign: 'center',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
