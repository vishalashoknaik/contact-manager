'use client'

import { useState } from 'react'
import { CallLog } from '@/lib/api/client'

interface CallLogsTableProps {
  logs: CallLog[]
  onLogClick?: (log: CallLog) => void
}

const feedbackLabel: Record<string, string> = {
  COMPLETED: 'Completed',
  NO_RESPONSE: 'No Response',
  CONNECT_LATER: 'Connect Later'
}

export function CallLogsTable({ logs, onLogClick }: CallLogsTableProps) {
  const [calledAtFilter, setCalledAtFilter] = useState('')
  const [contactFilter, setContactFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [volunteerFilter, setVolunteerFilter] = useState('')
  const [feedbackFilter, setFeedbackFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [centerChangeFilter, setCenterChangeFilter] = useState('')
  const [dndFilter, setDndFilter] = useState('')
  const [notInterestedFilter, setNotInterestedFilter] = useState('')
  const [remarksFilter, setRemarksFilter] = useState('')

  if (logs.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary, #888)', fontStyle: 'italic' }}>
        No calls logged yet.
      </p>
    )
  }

  const filteredLogs = logs.filter(log => {
    const calledAt = new Date(log.calledAt).toLocaleString().toLowerCase()
    const feedbackText = (feedbackLabel[log.feedback] ?? log.feedback).toLowerCase()
    const statusText = log.status === 'COMPLETED' ? 'completed' : 'skipped'
    const centerChangeText = log.centerChange ? 'yes' : 'no'
    const dndText = log.doNotDisturb ? 'yes' : 'no'
    const notInterestedText = log.notInterestedToVolunteer ? 'yes' : 'no'
    const remarksText = (log.remarks || '').toLowerCase()

    if (calledAtFilter && !calledAt.includes(calledAtFilter.toLowerCase())) return false
    if (contactFilter && !log.contact.name.toLowerCase().includes(contactFilter.toLowerCase())) return false
    if (phoneFilter && !log.contact.phone.toLowerCase().includes(phoneFilter.toLowerCase())) return false
    if (volunteerFilter && !log.volunteerPhone.toLowerCase().includes(volunteerFilter.toLowerCase())) return false
    if (feedbackFilter && !feedbackText.includes(feedbackFilter.toLowerCase())) return false
    if (statusFilter && !statusText.includes(statusFilter.toLowerCase())) return false
    if (centerChangeFilter && !centerChangeText.includes(centerChangeFilter.toLowerCase())) return false
    if (dndFilter && !dndText.includes(dndFilter.toLowerCase())) return false
    if (notInterestedFilter && !notInterestedText.includes(notInterestedFilter.toLowerCase())) return false
    if (remarksFilter && !remarksText.includes(remarksFilter.toLowerCase())) return false

    return true
  })

  const th: React.CSSProperties = {
    border: '1px solid var(--border-color, #ddd)', padding: '6px 8px',
    backgroundColor: 'var(--th-bg, #f5f5f5)', color: 'var(--text-primary, #000)',
    textAlign: 'left', whiteSpace: 'nowrap'
  }
  const td: React.CSSProperties = {
    border: '1px solid var(--border-color, #eee)', padding: '6px 8px',
    color: 'var(--text-primary, #000)', fontSize: 13
  }
  const filterInput: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '4px 6px', borderRadius: 4, fontSize: 12,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)'
  }
  const badge = (ok: boolean) => ({
    display: 'inline-block', padding: '2px 6px', borderRadius: 10,
    fontSize: 11, fontWeight: 'bold',
    backgroundColor: ok ? '#d4edda' : '#f8d7da',
    color: ok ? '#155724' : '#721c24'
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary, #666)' }}>
        On phones, swipe horizontally to review the full call log table.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={th}>Called At</th>
            <th style={th}>Contact</th>
            <th style={th}>Phone</th>
            <th style={th}>Volunteer</th>
            <th style={th}>Feedback</th>
            <th style={th}>Status</th>
            <th style={th}>Center Change</th>
            <th style={th}>DND</th>
            <th style={th}>Not Interested</th>
            <th style={th}>Remarks</th>
          </tr>
          <tr>
            <th style={th}><input value={calledAtFilter} onChange={e => setCalledAtFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
            <th style={th}><input value={contactFilter} onChange={e => setContactFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
            <th style={th}><input value={phoneFilter} onChange={e => setPhoneFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
            <th style={th}><input value={volunteerFilter} onChange={e => setVolunteerFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
            <th style={th}><input value={feedbackFilter} onChange={e => setFeedbackFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
            <th style={th}><input value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
            <th style={th}><input value={centerChangeFilter} onChange={e => setCenterChangeFilter(e.target.value)} style={filterInput} placeholder="yes/no" /></th>
            <th style={th}><input value={dndFilter} onChange={e => setDndFilter(e.target.value)} style={filterInput} placeholder="yes/no" /></th>
            <th style={th}><input value={notInterestedFilter} onChange={e => setNotInterestedFilter(e.target.value)} style={filterInput} placeholder="yes/no" /></th>
            <th style={th}><input value={remarksFilter} onChange={e => setRemarksFilter(e.target.value)} style={filterInput} placeholder="Filter" /></th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr
              key={log.id}
              onClick={() => onLogClick?.(log)}
              style={onLogClick ? { cursor: 'pointer' } : undefined}
              title={onLogClick ? 'Click to edit feedback' : undefined}
            >
              <td style={td}>{new Date(log.calledAt).toLocaleString()}</td>
              <td style={td}>{log.contact.name}</td>
              <td style={td}>{log.contact.phone}</td>
              <td style={td}>{log.volunteerPhone}</td>
              <td style={td}>{feedbackLabel[log.feedback] ?? log.feedback}</td>
              <td style={td}>
                <span style={badge(log.status === 'COMPLETED')}>
                  {log.status === 'COMPLETED' ? 'Completed' : 'Skipped'}
                </span>
              </td>
              <td style={{ ...td, textAlign: 'center' }}>{log.centerChange ? '✓' : '–'}</td>
              <td style={{ ...td, textAlign: 'center' }}>{log.doNotDisturb ? '✓' : '–'}</td>
              <td style={{ ...td, textAlign: 'center' }}>{log.notInterestedToVolunteer ? '✓' : '–'}</td>
              <td style={td}>{log.remarks || '–'}</td>
            </tr>
          ))}
          {filteredLogs.length === 0 && (
            <tr>
              <td style={{ ...td, textAlign: 'center', fontStyle: 'italic' }} colSpan={10}>
                No call logs match the current column filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
