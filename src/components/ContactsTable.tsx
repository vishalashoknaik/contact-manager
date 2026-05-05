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
  onToggleSelect: (id: string | number) => void
  onToggleSelectAll: () => void
  onClearSelections: () => void
  onToggleSort: (key: string) => void
  onFilterChange: (filterName: string, value: string) => void
  onActivityFilterChange: (activity: string, value: string) => void
  onAreaFilterChange: (area: string, value: string) => void
  onProgramFilterChange: (program: string, value: string) => void
  onContactClick?: (contact: Contact) => void
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
  onClearSelections,
  onToggleSort,
  onFilterChange,
  onActivityFilterChange,
  onAreaFilterChange,
  onProgramFilterChange,
  onContactClick
}: ContactsTableProps) {
  const thCheckbox = { width: 56, minWidth: 56, border: '1px solid var(--border-color, #ddd)', padding: 6, backgroundColor: 'var(--th-bg, #f5f5f5)', color: 'var(--text-primary, #000)' }
  const tdCheckbox = { width: 56, minWidth: 56, border: '1px solid var(--border-color, #eee)', padding: 6 }
  const th = { border: '1px solid var(--border-color, #ddd)', padding: 6, cursor: 'pointer', userSelect: 'none' as const, backgroundColor: 'var(--th-bg, #f5f5f5)', color: 'var(--text-primary, #000)', whiteSpace: 'nowrap' as const }
  const td = { border: '1px solid var(--border-color, #eee)', padding: 6, color: 'var(--text-primary, #000)', whiteSpace: 'nowrap' as const, verticalAlign: 'top' as const, fontSize: 13 }
  const tdCenter = { border: '1px solid var(--border-color, #eee)', padding: 6, textAlign: 'center' as const, color: 'var(--text-primary, #000)', whiteSpace: 'nowrap' as const, verticalAlign: 'top' as const, fontSize: 13 }
  const inputStyle = { width: '100%', padding: '4px 6px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' as const, backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)', border: '1px solid var(--border-color, #ddd)' }
  const stickyHeader = { position: 'sticky' as const, top: 0, zIndex: 20, backgroundColor: 'var(--th-bg, #f5f5f5)' }
  const stickyFilter = { position: 'sticky' as const, top: 44, zIndex: 19, backgroundColor: 'var(--th-bg, #f5f5f5)' }
  const stickyFirstColumnHeader = { position: 'sticky' as const, left: 0, zIndex: 25, backgroundColor: 'var(--th-bg, #f5f5f5)' }
  const stickyFirstColumnCell = { position: 'sticky' as const, left: 0, zIndex: 10, backgroundColor: 'var(--bg-primary, #fff)' }

  const getSortIndicator = (key: string) => {
    if (sortState.key !== key) return ''
    return sortState.direction === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '72dvh',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: 6,
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x pan-y'
      }}
    >
    <table style={{ minWidth: 1200, width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', marginTop: 0 }}>
      <thead>
        {/* Header Row */}
        <tr>
          <th style={{ ...thCheckbox, ...stickyHeader, ...stickyFirstColumnHeader }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
            />
          </th>
          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('name')}>
            Name{getSortIndicator('name')}
          </th>
          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('phone')}>
            Phone{getSortIndicator('phone')}
          </th>
          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('gender')}>
            Gender{getSortIndicator('gender')}
          </th>
          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('ieDate')}>
            IE Date{getSortIndicator('ieDate')}
          </th>
          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('areaOfStay')}>
            Area of Stay{getSortIndicator('areaOfStay')}
          </th>
          <th style={{ ...th, ...stickyHeader }}>
            Remarks
          </th>

          {activities.map(a => (
            <th key={a} style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort(a)}>
              {a}
              {getSortIndicator(a)}
            </th>
          ))}
          {areas.map(a => (
            <th key={a} style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort(a)}>
              {a}
              {getSortIndicator(a)}
            </th>
          ))}
          {programs.map(p => (
            <th key={p} style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort(p)}>
              {p}
              {getSortIndicator(p)}
            </th>
          ))}

          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('total')}>
            Total{getSortIndicator('total')}
          </th>
          <th style={{ ...th, ...stickyHeader }} onClick={() => onToggleSort('lastUpdated')}>
            Updated{getSortIndicator('lastUpdated')}
          </th>
        </tr>

        {/* Filter Row */}
        <tr>
          <th style={{ ...thCheckbox, ...stickyFilter, ...stickyFirstColumnHeader }}>
            <button
              onClick={onClearSelections}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              title="Clear all selections"
            >
              Clear
            </button>
          </th>
          <th style={{ ...th, ...stickyFilter }}>
            <input
              type="text"
              placeholder="Filter..."
              value={filters.nameFilter}
              onChange={e => onFilterChange('name', e.target.value)}
              style={inputStyle}
            />
          </th>
          <th style={{ ...th, ...stickyFilter }}>
            <input
              type="text"
              placeholder="Filter..."
              value={filters.phoneFilter}
              onChange={e => onFilterChange('phone', e.target.value)}
              style={inputStyle}
            />
          </th>
          <th style={{ ...th, ...stickyFilter }}>
            <select
              value={filters.genderFilter}
              onChange={e => onFilterChange('gender', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </th>
          <th style={{ ...th, ...stickyFilter }}></th>
          <th style={{ ...th, ...stickyFilter }}>
            <input
              type="text"
              placeholder="Filter..."
              value={filters.areaOfStayFilter}
              onChange={e => onFilterChange('areaOfStay', e.target.value)}
              style={inputStyle}
            />
          </th>
          <th style={{ ...th, ...stickyFilter }}></th>

          {activities.map(a => (
            <th key={a} style={{ ...th, ...stickyFilter }}>
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
            <th key={a} style={{ ...th, ...stickyFilter }}>
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
            <th key={p} style={{ ...th, ...stickyFilter }}>
              <input
                type="text"
                placeholder="Min"
                value={filters.programFilters[p] || ''}
                onChange={e => onProgramFilterChange(p, e.target.value)}
                style={inputStyle}
              />
            </th>
          ))}

          <th style={{ ...th, ...stickyFilter }}>
            <input
              type="text"
              placeholder="Min"
              value={filters.totalFilter}
              onChange={e => onFilterChange('total', e.target.value)}
              style={inputStyle}
            />
          </th>
          <th style={{ ...th, ...stickyFilter }}>
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
            <td style={{ ...tdCheckbox, ...stickyFirstColumnCell }}>
              <input
                type="checkbox"
                checked={c.selected}
                onChange={() => onToggleSelect(c.id)}
              />
            </td>

            <td
              style={{ ...td, cursor: onContactClick ? 'pointer' : undefined }}
              onClick={() => onContactClick?.(c)}
              title={onContactClick ? 'Click to edit contact' : undefined}
            >{c.name}</td>
            <td
              style={{ ...td, cursor: onContactClick ? 'pointer' : undefined }}
              onClick={() => onContactClick?.(c)}
            >{c.phone}</td>
            <td style={tdCenter}>{c.gender}</td>
            <td style={td}>{c.ieDate || ''}</td>
            <td style={td}>{c.areaOfStay || ''}</td>
            <td style={td}>{c.remarks || ''}</td>

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
    </div>
  )
}
