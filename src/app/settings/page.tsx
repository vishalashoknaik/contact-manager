'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useContacts } from '@/hooks/useContacts'
import { AdminPanel } from '@/components/AdminPanel'
import { Tabs } from '@/components/ui/Tabs'

type SettingsTab = 'categories' | 'access' | 'center'

export default function SettingsPage() {
  const { isLoggedIn, canManageSelectedCenterConfig, canManageSelectedCenterAccess } = useAuth()
  const router = useRouter()
  const configManager = useConfig()
  const contactsManager = useContacts()
  const [activeTab, setActiveTab] = useState<SettingsTab>('categories')

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

  const tabs = [
    ...(canManageSelectedCenterConfig ? [{ id: 'categories', label: '⚙ Categories' }] : []),
    ...(canManageSelectedCenterAccess ? [
      { id: 'access', label: '👥 Users & Access' },
      { id: 'center', label: '🏢 Center' },
    ] : []),
  ]

  // If current tab is no longer available (e.g. role changed), fall back to first available tab
  const currentTab = tabs.find(t => t.id === activeTab) ? activeTab : (tabs[0]?.id as SettingsTab ?? 'categories')

  const container: React.CSSProperties = {
    padding: 'clamp(16px, 3vw, 32px)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: 'var(--bg-primary, #fff)',
    color: 'var(--text-primary, #000)',
    minHeight: '100dvh',
    maxWidth: 900,
  }

  return (
    <div style={container}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>Settings</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary, #666)', fontSize: 14 }}>
          Manage categories, user access, and center configuration.
        </p>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={currentTab}
        onTabChange={id => setActiveTab(id as SettingsTab)}
        style={{ marginBottom: 28 }}
      />

      {/* AdminPanel renders the correct section based on `section` prop */}
      <AdminPanel
        isVisible={true}
        section={currentTab === 'access' || currentTab === 'center' ? 'access' : 'settings'}
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
