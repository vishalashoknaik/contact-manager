'use client'

import { AdminService } from '@/lib/services/AdminService'
import { Contact } from '@/lib/types'
import { useInputState } from '@/hooks/useInputState'

interface AdminPanelProps {
  isVisible: boolean
  activities: string[]
  areas: string[]
  programs: string[]
  contacts: Contact[]
  onActivitiesChange: (activities: string[]) => void
  onAreasChange: (areas: string[]) => void
  onProgramsChange: (programs: string[]) => void
  onContactsChange: (contacts: Contact[]) => void
}

export function AdminPanel({
  isVisible,
  activities,
  areas,
  programs,
  contacts,
  onActivitiesChange,
  onAreasChange,
  onProgramsChange,
  onContactsChange
}: AdminPanelProps) {
  if (!isVisible) return null

  const adminService = new AdminService()
  const newActivityInput = useInputState()
  const newAreaInput = useInputState()
  const newProgramInput = useInputState()

  const handleAddActivity = () => {
    const updated = adminService.addActivity(activities, newActivityInput.value)
    onActivitiesChange(updated)
    newActivityInput.clear()
  }

  const handleRemoveActivity = (value: string) => {
    const { activities: updated, contacts: updatedContacts } =
      adminService.removeActivity(activities, contacts, value)
    onActivitiesChange(updated)
    onContactsChange(updatedContacts)
  }

  const handleAddArea = () => {
    const updated = adminService.addArea(areas, newAreaInput.value)
    onAreasChange(updated)
    newAreaInput.clear()
  }

  const handleRemoveArea = (value: string) => {
    const { areas: updated, contacts: updatedContacts } = adminService.removeArea(
      areas,
      contacts,
      value
    )
    onAreasChange(updated)
    onContactsChange(updatedContacts)
  }

  const handleAddProgram = () => {
    const updated = adminService.addProgram(programs, newProgramInput.value)
    onProgramsChange(updated)
    newProgramInput.clear()
  }

  const handleRemoveProgram = (value: string) => {
    const { programs: updated, contacts: updatedContacts } = adminService.removeProgram(
      programs,
      contacts,
      value
    )
    onProgramsChange(updated)
    onContactsChange(updatedContacts)
  }

  const panelStyle = {
    border: '1px solid var(--border-color, #ccc)',
    padding: 15,
    marginTop: 15,
    backgroundColor: 'var(--panel-bg, #f9f9f9)',
    borderRadius: 4
  }

  const sectionStyle = {
    marginBottom: 20
  }

  const inputStyle = {
    padding: '6px 8px',
    marginRight: 8,
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 3,
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-color, #eee)',
    color: 'var(--text-primary, #000)'
  }

  const buttonStyle = {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer'
  }

  return (
    <div style={panelStyle}>
      <h4>⚙️ Admin Settings</h4>

      {/* Activities */}
      <div style={sectionStyle}>
        <h5>Activities</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New activity"
            value={newActivityInput.value}
            onChange={e => newActivityInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleAddActivity} style={buttonStyle}>
            Add
          </button>
        </div>
        {activities.map(a => (
          <div key={a} style={itemStyle}>
            <span>{a}</span>
            <button onClick={() => handleRemoveActivity(a)} style={buttonStyle}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Areas */}
      <div style={sectionStyle}>
        <h5>Areas</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New area"
            value={newAreaInput.value}
            onChange={e => newAreaInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleAddArea} style={buttonStyle}>
            Add
          </button>
        </div>
        {areas.map(a => (
          <div key={a} style={itemStyle}>
            <span>{a}</span>
            <button onClick={() => handleRemoveArea(a)} style={buttonStyle}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Programs */}
      <div style={sectionStyle}>
        <h5>Programs</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New program"
            value={newProgramInput.value}
            onChange={e => newProgramInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleAddProgram} style={buttonStyle}>
            Add
          </button>
        </div>
        {programs.map(p => (
          <div key={p} style={itemStyle}>
            <span>{p}</span>
            <button onClick={() => handleRemoveProgram(p)} style={buttonStyle}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
