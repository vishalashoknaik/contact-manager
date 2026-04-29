'use client'

import { useRef } from 'react'
import { Contact } from '@/lib/types'
import { CSVService } from '@/lib/services/CSVService'

interface CSVImportProps {
  contacts: Contact[]
  onImport: (contacts: Contact[]) => void
}

export function CSVImport({ contacts, onImport }: CSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
  )
}
