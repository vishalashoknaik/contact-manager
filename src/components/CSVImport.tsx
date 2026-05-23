'use client'

import { useRef, useState } from 'react'
import { Contact } from '@/lib/types'
import { CSVService } from '@/lib/services/CSVService'
import { PhoneService } from '@/lib/services/PhoneService'
import { Button } from '@/components/ui/Button'

interface CSVImportProps {
  contacts: Contact[]
  onImport: (contacts: Contact[]) => void
}

type PhoneImportPhase = 'idle' | 'entering' | 'preview'

export function CSVImport({ contacts, onImport }: CSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [phoneText, setPhoneText] = useState('')
  const [phase, setPhase] = useState<PhoneImportPhase>('idle')
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([])

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

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePreview = () => {
    if (!phoneText.trim()) return
    const result = CSVService.importPhoneList(phoneText, contacts)
    setPreviewContacts(result)
    setPhase('preview')
  }

  const handleConfirmImport = () => {
    onImport(previewContacts)
    setPhoneText('')
    setPreviewContacts([])
    setPhase('idle')
  }

  const handleCancel = () => {
    setPhoneText('')
    setPreviewContacts([])
    setPhase('idle')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button variant="ghost" size="sm" onClick={handleOpenFileDialog}>
          Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
      </div>

      {phase === 'idle' && (
        <Button variant="success" size="sm" onClick={() => setPhase('entering')}>
          Import Phones
        </Button>
      )}

      {phase === 'entering' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontWeight: 'bold', fontSize: 13 }}>
            Enter phone numbers
          </label>
          <textarea
            aria-label="Paste phone numbers"
            placeholder="Paste phone numbers separated by commas, spaces, or new lines&#10;e.g. 9876543210, 98765-43211&#10;     1234567890"
            value={phoneText}
            onChange={e => setPhoneText(e.target.value)}
            rows={4}
            autoFocus
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="success" size="sm" onClick={handlePreview} disabled={!phoneText.trim()}>
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>
            {previewContacts.length === 0
              ? 'No valid phones found.'
              : `${previewContacts.length} phone(s) to import:`}
          </div>
          {previewContacts.length > 0 && (
            <table style={{ borderCollapse: 'collapse', fontSize: 13, maxWidth: 480 }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f1f1' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewContacts.map((c, idx) => {
                  const isExisting = contacts.some(
                    e => PhoneService.normalize(e.phone) === PhoneService.normalize(c.phone)
                  )
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{c.phone}</td>
                      <td style={tdStyle}>{c.name || '—'}</td>
                      <td style={{ ...tdStyle, color: isExisting ? '#0d6efd' : '#28a745' }}>
                        {isExisting ? 'Existing' : 'New'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="success" size="sm" onClick={handleConfirmImport} disabled={previewContacts.length === 0}>
              Import
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase('entering')}>
              Back
            </Button>
            <Button variant="danger" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '4px 10px',
  textAlign: 'left',
  borderBottom: '2px solid #ccc',
  fontWeight: 'bold'
}

const tdStyle: React.CSSProperties = {
  padding: '4px 10px'
}
