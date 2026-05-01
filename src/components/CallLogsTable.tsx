'use client'

import { CallLog } from '@/lib/api/client'

interface CallLogsTableProps {
  logs: CallLog[]
}

const feedbackLabel: Record<string, string> = {
  COMPLETED: 'Completed',
  NO_RESPONSE: 'No Response',
  CONNECT_LATER: 'Connect Later'
}

export function CallLogsTable({ logs }: CallLogsTableProps) {
  if (logs.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary, #888)', fontStyle: 'italic' }}>
        No calls logged yet.
      </p>
    )
  }

  const th: React.CSSProperties = {
    border: '1px solid var(--border-color, #ddd)', padding: '6px 8px',
    backgroundColor: 'var(--th-bg, #f5f5f5)', color: 'var(--text-primary, #000)',
    textAlign: 'left', whiteSpace: 'nowrap'
  }
  const td: React.CSSProperties = {
    border: '1px solid var(--border-color, #eee)', padding: '6px 8px',
    color: 'var(--text-primary, #000)', fontSize: 13
  }
  const badge = (ok: boolean) => ({
    display: 'inline-block', padding: '2px 6px', borderRadius: 10,
    fontSize: 11, fontWeight: 'bold',
    backgroundColor: ok ? '#d4edda' : '#f8d7da',
    color: ok ? '#155724' : '#721c24'
  })

  return (
    <div style={{ overflowX: 'auto' }}>
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
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
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
        </tbody>
      </table>
    </div>
  )
}
