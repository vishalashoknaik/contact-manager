'use client'

import { useState } from 'react'
import { useInputState } from '@/hooks/useInputState'
import { Button } from '@/components/ui/Button'
import type { Gender } from '@/lib/types'

interface ContactFormProps {
  onAddContact: (name: string, phone: string, gender: Gender, ieDate?: string, areaOfStay?: string, remarks?: string) => void
}

export function ContactForm({ onAddContact }: ContactFormProps) {
  const nameInput = useInputState()
  const phoneInput = useInputState()
  const [gender, setGender] = useState<Gender>('Male')
  const [showOptional, setShowOptional] = useState(false)
  const ieDateInput = useInputState()
  const areaOfStayInput = useInputState()
  const remarksInput = useInputState()

  const handleAddContact = () => {
    if (!nameInput.value || !phoneInput.value) return
    onAddContact(
      nameInput.value,
      phoneInput.value,
      gender,
      ieDateInput.value || undefined,
      areaOfStayInput.value || undefined,
      remarksInput.value || undefined
    )
    nameInput.clear()
    phoneInput.clear()
    ieDateInput.clear()
    areaOfStayInput.clear()
    remarksInput.clear()
    setGender('Male')
    setShowOptional(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddContact()
    }
  }

  const inputStyle = {
    padding: 8,
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 3,
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  const labelStyle = {
    fontSize: 12,
    color: 'var(--text-secondary, #666)',
    marginBottom: 2,
    display: 'block'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Required row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Name *</label>
          <input
            type="text"
            placeholder="Name"
            value={nameInput.value}
            onChange={e => nameInput.setValue(e.target.value)}
            onKeyPress={handleKeyPress}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Phone *</label>
          <input
            type="tel"
            placeholder="Phone"
            value={phoneInput.value}
            onChange={e => phoneInput.setValue(e.target.value)}
            onKeyPress={handleKeyPress}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Gender *</label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value as Gender)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <Button variant="success" size="sm" onClick={handleAddContact}>
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowOptional(v => !v)}
        >
          {showOptional ? '▲ Less' : '▼ More'}
        </Button>
      </div>

      {/* Optional fields */}
      {showOptional && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', paddingLeft: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>IE Date</label>
            <input
              type="text"
              placeholder="IE Date"
              value={ieDateInput.value}
              onChange={e => ieDateInput.setValue(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Area of Stay</label>
            <input
              type="text"
              placeholder="Area of stay"
              value={areaOfStayInput.value}
              onChange={e => areaOfStayInput.setValue(e.target.value)}
              onKeyPress={handleKeyPress}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Remarks</label>
            <input
              type="text"
              placeholder="Remarks"
              value={remarksInput.value}
              onChange={e => remarksInput.setValue(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ ...inputStyle, minWidth: 200 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
