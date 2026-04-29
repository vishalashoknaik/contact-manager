'use client'

import { Contact } from '@/lib/types'
import { ContactService } from '@/lib/services/contactService'
import { FilterState, SortState } from '@/lib/types'

interface ContactsTableProps {
  contacts: Contact[]
  activities: string[]
  areas: string[]
  programs: string[]
  filters: FilterState
  sortState: SortState
  allSelected: boolean
  onToggleSelect: (id: number) => void
  onToggleSelectAll: () => void
  onToggleSort: (key: string) => void
  onFilterChange: (filterName: string, value: string) => void
  onActivityFilterChange: (activity: string, value: string) => void
  onAreaFilterChange: (area: string, value: string) => void
  onProgramFilterChange: (program: string, value: string) => void
}

export function ContactsTable({
  contacts,
  activities,
  areas,
  programs,
  filters,
  sortState,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  onToggleSort,
  onFilterChange,
  onActivityFilterChange,
  onAreaFilterChange,
  onProgramFilterChange
}: ContactsTableProps) {
  const thCheckbox = { width: 40, border: '1px solid var(--border-color, #ddd)', padding: 6, backgroundColor: 'var(--th-bg, #f5f5f5)', color: 'var(--text-primary, #000)' }
  const tdCheckbox = { width: 40, border: '1px solid var(--border-color, #eee)', padding: 6 }
  const th = { border: '1px solid var(--border-color, #ddd)', padding: 6, cursor: 'pointer', userSelect: 'none' as const, backgroundColor: 'var(--th-bg, #f5f5f5)', color: 'var(--text-primary, #000)' }
  const td = { border: '1px solid var(--border-color, #eee)', padding: 6, color: 'var(--text-primary, #000)' }
  const tdCenter = { border: '1px solid var(--border-color, #eee)', padding: 6, textAlign: 'center' as const, color: 'var(--text-primary, #000)' }
  const inputStyle = { width: '100%', padding: 4, boxSizing: 'border-box' as const, backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)', border: '1px solid var(--border-color, #ddd)' }

  const getSortIndicator = (key: string) => {
    if (sortState.key !== key) return ''
    return sortState.direction === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginTop: 10 }}>
      <thead>
        {/* Header Row */}
        <tr>
          <th style={thCheckbox}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
            />
          </th>
          <th style={th} onClick={() => onToggleSort('name')}>
            Name{getSortIndicator('name')}
          </th>
          <th style={th} onClick={() => onToggleSort('phone')}>
            Phone{getSortIndicator('phone')}
          </th>

          {activities.map(a => (
            <th key={a} style={th} onClick={() => onToggleSort(a)}>
              {a}
              {getSortIndicator(a)}
            </th>
          ))}
          {areas.map(a => (
            <th key={a} style={th}>
              {a}
            </th>
          ))}
          {programs.map(p => (
            <th key={p} style={th}>
              {p}
            </th>
          ))}

          <th style={th} onClick={() => onToggleSort('total')}>
            Total{getSortIndicator('total')}
          </th>
          <th style={th} onClick={() => onToggleSort('lastUpdated')}>
            Updated{getSortIndicator('lastUpdated')}
          </th>
        </tr>

        {/* Filter Row */}
        <tr>
          <th style={thCheckbox}></th>
          <th style={th}>
            <input
              type="text"
              placeholder="Filter..."
              value={filters.nameFilter}
              onChange={e => onFilterChange('name', e.target.value)}
              style={inputStyle}
            />
          </th>
          <th style={th}>
            <input
              type="text"
              placeholder="Filter..."
              value={filters.phoneFilter}
              onChange={e => onFilterChange('phone', e.target.value)}
              style={inputStyle}
            />
          </th>

          {activities.map(a => (
            <th key={a} style={th}>
              <input
                type="text"
                placeholder="Min"
                value={filters.activityFilters[a] || ''}
                onChange={e => onActivityFilterChange(a, e.target.value)}
                style={inputStyle}
              />
            </th>
          ))}
          {areas.map(a => (
            <th key={a} style={th}>
              <input
                type="text"
                placeholder="Min"
                value={filters.areaFilters[a] || ''}
                onChange={e => onAreaFilterChange(a, e.target.value)}
                style={inputStyle}
              />
            </th>
          ))}
          {programs.map(p => (
            <th key={p} style={th}>
              <input
                type="text"
                placeholder="Min"
                value={filters.programFilters[p] || ''}
                onChange={e => onProgramFilterChange(p, e.target.value)}
                style={inputStyle}
              />
            </th>
          ))}

          <th style={th}>
            <input
              type="text"
              placeholder="Min"
              value={filters.totalFilter}
              onChange={e => onFilterChange('total', e.target.value)}
              style={inputStyle}
            />
          </th>
          <th style={th}>
            <input
              type="date"
              value={filters.dateFilter}
              onChange={e => onFilterChange('date', e.target.value)}
              style={inputStyle}
            />
          </th>
        </tr>
      </thead>

      <tbody>
        {contacts.map(c => (
          <tr key={c.id}>
            <td style={tdCheckbox}>
              <input
                type="checkbox"
                checked={c.selected}
                onChange={() => onToggleSelect(c.id)}
              />
            </td>

            <td style={td}>{c.name}</td>
            <td style={td}>{c.phone}</td>

            {activities.map(a => (
              <td key={`act-${c.id}-${a}`} style={tdCenter}>
                {c.activities?.[a] || 0}
              </td>
            ))}
            {areas.map(a => (
              <td key={`area-${c.id}-${a}`} style={tdCenter}>
                {c.areas?.[a] || 0}
              </td>
            ))}
            {programs.map(p => (
              <td key={`prog-${c.id}-${p}`} style={tdCenter}>
                {c.programs?.[p] || 0}
              </td>
            ))}

            <td style={tdCenter}>{ContactService.getTotal(c)}</td>
            <td style={td}>{new Date(c.lastUpdated).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
