'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useContacts } from '@/hooks/useContacts'
import { AdminPanel } from '@/components/AdminPanel'

export default function SettingsPage() {
  const { isLoggedIn, canManageSelectedCenterConfig, canManageSelectedCenterAccess } = useAuth()
  const router = useRouter()
  const configManager = useConfig()
  const contactsManager = useContacts()

  // Gate access: must be logged in and have at least config or access management rights
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/')
      return
    }
    if (!canManageSelectedCenterConfig && !canManageSelectedCenterAccess) {
      router.push('/')
    }
  }, [isLoggedIn, canManageSelectedCenterConfig, canManageSelectedCenterAccess, router])

  if (!isLoggedIn) return null
  if (!canManageSelectedCenterConfig && !canManageSelectedCenterAccess) return null

  const container: React.CSSProperties = {
    padding: 'clamp(16px, 3vw, 32px)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    minHeight: '100dvh',
    maxWidth: 860,
  }

  return (
    <div style={container}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>⚙️ Settings</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
          Manage categories, user access, and center configuration.
        </p>
      </div>

      <AdminPanel
        isVisible={true}
        section="all"
        activities={configManager.activities}
        areas={configManager.areas}
        programs={configManager.programs}
        interests={configManager.interests}
        contacts={contactsManager.contacts}
        onActivitiesChange={configManager.setActivities}
        onAreasChange={configManager.setAreas}
        onProgramsChange={configManager.setPrograms}
        onInterestsChange={configManager.setInterests}
        onContactsChange={contactsManager.setContacts}
      />
    </div>
  )
}
