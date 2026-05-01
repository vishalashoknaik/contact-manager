import { useAuth } from '@/hooks/useAuth'

export function CenterSelector() {
  const { user, selectedCenter, selectedCenterDetails, selectCenter } = useAuth()

  const roleLabelMap = {
    ADMIN: 'Admin',
    USER: 'User',
    ATTENDANCE_TAKER: 'Attendance Taker'
  } as const

  if (!user || user.centers.length <= 1) {
    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #ddd'
      }}
    >
      <label
        style={{
          fontWeight: 'bold',
          color: '#333'
        }}
      >
        Center:
      </label>
      <select
        value={selectedCenter || ''}
        onChange={e => selectCenter(e.target.value)}
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}
      >
        {user.centerDetails?.map(center => (
          <option key={center.id} value={center.id}>
            {center.name}
          </option>
        ))}
      </select>
      {user.canAccessAllCenters && (
        <span
          style={{
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}
        >
          (Admin - All Centers)
        </span>
      )}
      {!user.canAccessAllCenters && selectedCenterDetails && (
        <span
          style={{
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}
        >
          ({roleLabelMap[selectedCenterDetails.role]} - This Center)
        </span>
      )}
    </div>
  )
}
