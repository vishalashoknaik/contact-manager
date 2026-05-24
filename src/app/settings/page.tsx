'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useContacts } from '@/hooks/useContacts'
import { AdminPanel } from '@/components/AdminPanel'
import { authApi } from '@/lib/api/client'

export default function SettingsPage() {
  const {
    isLoggedIn,
    canManageSelectedCenterConfig,
    canManageSelectedCenterAccess,
    selectedCenter,
  } = useAuth()
  const router = useRouter()
  const configManager = useConfig()
  const contactsManager = useContacts()

  const [activeTab, setActiveTab] = useState<'access' | 'config'>('access')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/')
      return
    }
    if (!canManageSelectedCenterConfig && !canManageSelectedCenterAccess) {
      router.push('/')
    }
  }, [isLoggedIn, canManageSelectedCenterConfig, canManageSelectedCenterAccess, router])

  // Set the default active tab once permissions are known
  useEffect(() => {
    if (canManageSelectedCenterAccess) setActiveTab('access')
    else if (canManageSelectedCenterConfig) setActiveTab('config')
  }, [canManageSelectedCenterAccess, canManageSelectedCenterConfig])

  // Fetch pending access count for the tab badge
  useEffect(() => {
    if (!canManageSelectedCenterAccess || !selectedCenter) return
    authApi.getUsers(selectedCenter)
      .then(users => setPendingCount(users.filter(u => !u.isApproved).length))
      .catch(() => {})
  }, [canManageSelectedCenterAccess, selectedCenter])

  if (!isLoggedIn) return null
  if (!canManageSelectedCenterConfig && !canManageSelectedCenterAccess) return null

  const showBothTabs = canManageSelectedCenterAccess && canManageSelectedCenterConfig

  const tabBtn = (id: 'access' | 'config', label: React.ReactNode): React.CSSProperties => ({
    padding: '9px 20px 10px',
    border: 'none',
    borderBottom: activeTab === id ? '2px solid var(--color-primary, #4a9eff)' : '2px solid transparent',
    background: 'none',
    color: activeTab === id ? 'var(--color-primary, #4a9eff)' : 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: activeTab === id ? 600 : 400,
    cursor: 'pointer',
    marginBottom: -1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  })

  const adminPanelProps = {
    isVisible: true as const,
    startCollapsed: true,
    activities: configManager.activities,
    areas: configManager.areas,
    programs: configManager.programs,
    interests: configManager.interests,
    contacts: contactsManager.contacts,
    onActivitiesChange: configManager.setActivities,
    onAreasChange: configManager.setAreas,
    onProgramsChange: configManager.setPrograms,
    onInterestsChange: configManager.setInterests,
    onContactsChange: contactsManager.setContacts,
  }

  return (
    <div style={{
      padding: 'clamp(16px, 3vw, 32px)',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      minHeight: '100dvh',
      maxWidth: 860,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>⚙️ Settings</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
          Manage user access and center configuration.
        </p>
      </div>

      {/* Tabs (only when user has both permissions) */}
      {showBothTabs && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
          <button style={tabBtn('access', null)} onClick={() => setActiveTab('access')}>
            🔐 Access
            {pendingCount > 0 && (
              <span style={{
                background: 'var(--color-danger, #e53e3e)',
                color: '#fff',
                borderRadius: 99,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button style={tabBtn('config', null)} onClick={() => setActiveTab('config')}>
            🏗 Center Config
          </button>
        </div>
      )}

      {/* Access panel */}
      {canManageSelectedCenterAccess && (!showBothTabs || activeTab === 'access') && (
        <AdminPanel {...adminPanelProps} section="access" />
      )}

      {/* Config panel */}
      {canManageSelectedCenterConfig && (!showBothTabs || activeTab === 'config') && (
        <AdminPanel {...adminPanelProps} section="settings" />
      )}
    </div>
  )
}

