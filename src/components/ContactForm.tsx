'use client'

import { useInputState } from '@/hooks/useInputState'

interface ContactFormProps {
  onAddContact: (name: string, phone: string) => void
}

export function ContactForm({ onAddContact }: ContactFormProps) {
  const nameInput = useInputState()
  const phoneInput = useInputState()

  const handleAddContact = () => {
    if (!nameInput.value || !phoneInput.value) return
    onAddContact(nameInput.value, phoneInput.value)
    nameInput.clear()
    phoneInput.clear()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddContact()
    }
  }

  const inputStyle = {
    marginRight: 8,
    padding: 8,
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 3,
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    fontWeight: 'bold'
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Name"
        value={nameInput.value}
        onChange={e => nameInput.setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        style={inputStyle}
      />
      <input
        type="tel"
        placeholder="Phone"
        value={phoneInput.value}
        onChange={e => phoneInput.setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        style={inputStyle}
      />
      <button onClick={handleAddContact} style={buttonStyle}>
        Add
      </button>
    </div>
  )
}
