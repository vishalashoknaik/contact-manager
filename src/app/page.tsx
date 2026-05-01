'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useContacts } from '../hooks/useContacts'
import { useConfig } from '../hooks/useConfig'
import { useFiltering } from '@/hooks/useFiltering'
import { useAdmin } from '@/hooks/useAdmin'
import { useInputState } from '@/hooks/useInputState'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/components/LoginPage'
import { CenterSelector } from '@/components/CenterSelector'
import { FilterService } from '@/lib/services/FilterService'
import { ContactService } from '@/lib/services/contactService'
import { ContactForm } from '@/components/ContactForm'
import { CSVImport } from '@/components/CSVImport'
import { AdminPanel } from '../components/AdminPanel'
import { ActionBar } from '@/components/ActionBar'
import { ContactsTable } from '@/components/ContactsTable'

const VERSION = 'v2.0.0'

function HomeContent() {
  const router = useRouter()
  const contactsManager = useContacts()
  const configManager = useConfig()
  const filteringManager = useFiltering()
  const adminManager = useAdmin()
  const { canManageSelectedCenter } = useAuth()
  const actionSelectors = {
    activity: useInputState(),
    area: useInputState(),
    program: useInputState()
  }

  // Apply filters and sorting
  let filtered = FilterService.filterContacts(
    contactsManager.contacts,
    filteringManager.filters,
    configManager.activities,
    configManager.areas,
    configManager.programs
  )

  filtered = FilterService.sortContacts(
    filtered,
    filteringManager.sortState,
    configManager.activities,
    configManager.areas,
    configManager.programs
  )

  const filteredContactIds = filtered.map(contact => contact.id)
  const allSelected =
    filtered.length > 0 &&
    filtered.every(contact => contact.selected)

  useEffect(() => {
    if (!canManageSelectedCenter) {
      adminManager.setIsAdmin(false)
      adminManager.setActiveView('access')
    }
  }, [canManageSelectedCenter])

  const handleAddContact = (name: string, phone: string, gender: import('@/lib/types').Gender, ieDate?: string, areaOfStay?: string, remarks?: string) => {
    contactsManager.addOrUpdateContact(name, phone, gender, ieDate, areaOfStay, remarks)
  }

  const handleImport = (contacts: any[]) => {
    contactsManager.importContacts(contacts)
  }

  const handleIncrement = () => {
    contactsManager.incrementSelected(
      actionSelectors.activity.value,
      actionSelectors.area.value,
      actionSelectors.program.value
    )
  }

  const handleFilterChange = (filterName: string, value: string) => {
    if (filterName === 'name') filteringManager.setNameFilter(value)
    else if (filterName === 'phone') filteringManager.setPhoneFilter(value)
    else if (filterName === 'gender') filteringManager.setGenderFilter(value)
    else if (filterName === 'areaOfStay') filteringManager.setAreaOfStayFilter(value)
    else if (filterName === 'total') filteringManager.setTotalFilter(value)
    else if (filterName === 'date') filteringManager.setDateFilter(value)
  }

  const backendError = contactsManager.error || configManager.error

  return (
    <div style={{ 
      padding: 20, 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: 'var(--bg-primary, #ffffff)',
      color: 'var(--text-primary, #000000)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 20, 
        borderBottom: '1px solid var(--border-color, #ddd)', 
        paddingBottom: 20
      }}>
        <div>
          <h2>📋 Contact Manager</h2>
          <p style={{ color: 'var(--text-secondary, #666)', marginTop: 5 }}>Version {VERSION}</p>
        </div>
      </div>

      {backendError && (
        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '10px 12px',
            borderRadius: 4,
            marginBottom: 16
          }}
        >
          {backendError}
        </div>
      )}

      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/attendance')}
          style={{
            padding: '10px 16px',
            backgroundColor: '#198754',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📝 Take Attendance
        </button>

        {canManageSelectedCenter && (
          <>
            <button
              onClick={adminManager.toggleAdmin}
              style={{
                padding: '10px 16px',
                backgroundColor: adminManager.isAdmin ? '#dc3545' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {adminManager.isAdmin ? '👤 User Mode' : '⚙️ Admin Mode'}
            </button>

            {adminManager.isAdmin && (
              <>
                <button
                  onClick={adminManager.openSettingsView}
                  style={{
                    marginLeft: 10,
                    padding: '10px 16px',
                    backgroundColor: adminManager.activeView === 'settings' ? '#0d6efd' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Center Configuration
                </button>
                <button
                  onClick={adminManager.openAccessView}
                  style={{
                    marginLeft: 10,
                    padding: '10px 16px',
                    backgroundColor: adminManager.activeView === 'access' ? '#0d6efd' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Access Control
                </button>
              </>
            )}
          </>
        )}
      </div>

      {canManageSelectedCenter && (
        <>
          {adminManager.isAdmin && (
            <AdminPanel
              isVisible
              section={adminManager.activeView}
              activities={configManager.activities}
              areas={configManager.areas}
              programs={configManager.programs}
              contacts={contactsManager.contacts}
              onActivitiesChange={configManager.setActivities}
              onAreasChange={configManager.setAreas}
              onProgramsChange={configManager.setPrograms}
              onContactsChange={contactsManager.setContacts}
            />
          )}
        </>
      )}

      {!adminManager.isAdmin && (
        <>
          {/* Contact Form & CSV Import */}
          <div style={{ 
            marginBottom: 20, 
            display: 'flex', 
            gap: 20, 
            alignItems: 'flex-end', 
            flexWrap: 'wrap' 
          }}>
            <div style={{ flex: '1 1 250px', minWidth: 250 }}>
              <h4 style={{ margin: '0 0 10px 0' }}>Add Contact</h4>
              <ContactForm onAddContact={handleAddContact} />
            </div>
            <div style={{ flex: '0 1 auto' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>Import</h4>
              <CSVImport
                contacts={contactsManager.contacts}
                onImport={handleImport}
              />
            </div>
          </div>

          {/* Action Bar for Bulk Operations */}
          {contactsManager.contacts.length > 0 && (
            <>
              <h4>Bulk Actions</h4>
              <ActionBar
                activities={configManager.activities}
                areas={configManager.areas}
                programs={configManager.programs}
                selectedActivity={actionSelectors.activity.value}
                selectedArea={actionSelectors.area.value}
                selectedProgram={actionSelectors.program.value}
                onActivityChange={actionSelectors.activity.setValue}
                onAreaChange={actionSelectors.area.setValue}
                onProgramChange={actionSelectors.program.setValue}
                onIncrement={handleIncrement}
              />
            </>
          )}

          {/* Contacts Table */}
          <h4>Contacts ({filtered.length})</h4>
          {contactsManager.isLoaded ? (
            <ContactsTable
              contacts={filtered}
              activities={configManager.activities}
              areas={configManager.areas}
              programs={configManager.programs}
              filters={filteringManager.filters}
              sortState={filteringManager.sortState}
              allSelected={allSelected}
              onToggleSelect={contactsManager.toggleSelect}
              onToggleSelectAll={() => contactsManager.toggleSelectAll(filteredContactIds)}
              onClearSelections={contactsManager.clearAllSelections}
              onToggleSort={filteringManager.toggleSort}
              onFilterChange={handleFilterChange}
              onActivityFilterChange={filteringManager.setActivityFilter}
              onAreaFilterChange={filteringManager.setAreaFilter}
              onProgramFilterChange={filteringManager.setProgramFilter}
            />
          ) : (
            <p>Loading...</p>
          )}
        </>
      )}
    </div>
  )
}

export default function Home() {
  const { isLoggedIn, user, logout, selectedCenter, selectedCenterDetails } = useAuth()

  if (!isLoggedIn) {
    return <LoginPage />
  }

  return (
    <div>
      {/* Top Bar with User Info and Center Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd'
        }}
      >
        <div style={{ fontSize: '14px', color: '#666' }}>
          Logged in as: <strong>{user?.name}</strong> ({user?.phone})
          {selectedCenter && (
            <span style={{ marginLeft: '20px', color: '#333' }}>
              📍 Center: <strong>{selectedCenterDetails?.name}</strong>
            </span>
          )}
          {user?.canAccessAllCenters && (
            <span style={{ marginLeft: '12px', color: '#0d6efd' }}>Overall Admin</span>
          )}
          {!user?.canAccessAllCenters && selectedCenterDetails?.isAdmin && (
            <span style={{ marginLeft: '12px', color: '#0d6efd' }}>Center Admin</span>
          )}
        </div>
        <button
          onClick={() => {
            logout()
            window.location.href = '/'
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>
      <CenterSelector />
      <HomeContent />
    </div>
  )
}