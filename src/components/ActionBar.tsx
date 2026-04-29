'use client'

interface ActionBarProps {
  activities: string[]
  areas: string[]
  programs: string[]
  selectedActivity: string
  selectedArea: string
  selectedProgram: string
  onActivityChange: (activity: string) => void
  onAreaChange: (area: string) => void
  onProgramChange: (program: string) => void
  onIncrement: () => void
}

export function ActionBar({
  activities,
  areas,
  programs,
  selectedActivity,
  selectedArea,
  selectedProgram,
  onActivityChange,
  onAreaChange,
  onProgramChange,
  onIncrement
}: ActionBarProps) {
  const selectStyle = {
    padding: '8px 8px',
    marginRight: 10,
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 3,
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer'
  }

  return (
    <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={selectedActivity}
        onChange={e => onActivityChange(e.target.value)}
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
        style={selectStyle}
      >
        <option value="">Program</option>
        {programs.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <button
        onClick={onIncrement}
        style={buttonStyle}
      >
        +1 (Selected)
      </button>
    </div>
  )
}
