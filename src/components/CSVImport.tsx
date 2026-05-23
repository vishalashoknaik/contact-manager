'use client'

import { useRef, useState } from 'react'
import { Contact } from '@/lib/types'
import { CSVService } from '@/lib/services/CSVService'

interface CSVImportProps {
  contacts: Contact[]
  onImport: (contacts: Contact[]) => void
}

export function CSVImport({ contacts, onImport }: CSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [phoneText, setPhoneText] = useState('')

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await CSVService.handleFileImport(file, contacts)
      onImport(result)
    } catch (error) {
      console.error('CSV import failed:', error)
      alert('Failed to import CSV file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePhoneImport = () => {
    if (!phoneText.trim()) return
    const result = CSVService.importPhoneList(phoneText, contacts)
    onImport(result)
    setPhoneText('')
  }

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    fontWeight: 'bold'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handleOpenFileDialog} style={buttonStyle}>
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontWeight: 'bold', fontSize: 13 }}>
          Import Raw Phone Numbers
        </label>
        <textarea
          aria-label="Paste phone numbers"
          placeholder="Paste phone numbers separated by commas, spaces, or new lines&#10;e.g. 9876543210, 98765-43211&#10;     1234567890"
          value={phoneText}
          onChange={e => setPhoneText(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '6px 8px',
            borderRadius: 3,
            border: '1px solid #ccc',
            fontFamily: 'monospace',
            fontSize: 13,
            resize: 'vertical'
          }}
        />
        <button
          onClick={handlePhoneImport}
          disabled={!phoneText.trim()}
          style={{
            ...buttonStyle,
            backgroundColor: phoneText.trim() ? '#28a745' : '#aaa',
            cursor: phoneText.trim() ? 'pointer' : 'not-allowed',
            alignSelf: 'flex-start'
          }}
        >
          Import Phones
        </button>
      </div>
    </div>
  )
}
