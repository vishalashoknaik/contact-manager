'use client'

import { Button } from '@/components/ui/Button'

interface ActionBarProps {
  activities: string[]
  areas: string[]
  programs: string[]
  interests?: string[]
  selectedActivity: string
  selectedArea: string
  selectedProgram: string
  selectedInterest?: string
  onActivityChange: (activity: string) => void
  onAreaChange: (area: string) => void
  onProgramChange: (program: string) => void
  onInterestChange?: (interest: string) => void
  onIncrement: () => void | Promise<void>
  isUpdating?: boolean
}

export function ActionBar({
  activities,
  areas,
  programs,
  interests = [],
  selectedActivity,
  selectedArea,
  selectedProgram,
  selectedInterest = '',
  onActivityChange,
  onAreaChange,
  onProgramChange,
  onInterestChange,
  onIncrement,
  isUpdating = false
}: ActionBarProps) {
  const selectStyle = {
    padding: '6px 8px',
    marginRight: 6,
    border: '1.5px solid var(--border-color, #ddd)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)',
    fontSize: 13,
    opacity: isUpdating ? 0.5 : 1,
    cursor: isUpdating ? 'not-allowed' : 'default'
  }

  return (
    <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={selectedActivity}
        onChange={e => onActivityChange(e.target.value)}
        disabled={isUpdating}
        style={selectStyle}
      >
        <option value="">Activity</option>
        {activities.map(a => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={selectedArea}
        onChange={e => onAreaChange(e.target.value)}
        disabled={isUpdating}
        style={selectStyle}
      >
        <option value="">Area</option>
        {areas.map(a => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={selectedProgram}
        onChange={e => onProgramChange(e.target.value)}
        disabled={isUpdating}
        style={selectStyle}
      >
        <option value="">Program</option>
        {programs.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {interests.length > 0 && (
        <select
          value={selectedInterest}
          onChange={e => onInterestChange?.(e.target.value)}
          disabled={isUpdating}
          style={selectStyle}
        >
          <option value="">Interest</option>
          {interests.map(i => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      )}

      <Button
        variant="success"
        size="sm"
        loading={isUpdating}
        disabled={isUpdating}
        onClick={onIncrement}
      >
        {isUpdating ? 'Updating…' : 'Update'}
      </Button>
    </div>
  )
}
