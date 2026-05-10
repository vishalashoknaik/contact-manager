'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useContacts } from '../hooks/useContacts'
import { useConfig } from '../hooks/useConfig'
import { useFiltering } from '@/hooks/useFiltering'
import { useAdmin } from '@/hooks/useAdmin'
import { useInputState } from '@/hooks/useInputState'
import { useAuth } from '@/hooks/useAuth'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { LoginPage } from '@/components/LoginPage'
import { CenterSelector } from '@/components/CenterSelector'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { FilterService } from '@/lib/services/FilterService'
import { ContactService } from '@/lib/services/contactService'
import { ContactForm } from '@/components/ContactForm'
import { CSVImport } from '@/components/CSVImport'
import { AdminPanel } from '../components/AdminPanel'
import { ActionBar } from '@/components/ActionBar'
import { ContactsTable } from '@/components/ContactsTable'
import { CampaignModal } from '@/components/CampaignModal'
import { contactsApi } from '@/lib/api/client'
import type { Contact } from '@/lib/types'

const VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION ?? '2.2.0'}`

function HomeContent() {
  const router = useRouter()
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', phone: '', gender: 'Male' as Contact['gender'], ieDate: '', areaOfStay: '', remarks: '' })
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [contactSaveError, setContactSaveError] = useState<string | null>(null)
  const contactsManager = useContacts()
  const configManager = useConfig()
  const filteringManager = useFiltering()
  const adminManager = useAdmin()
  const {
    selectedCenter,
    canAccessSelectedCenterAdminMode,
    canManageSelectedCenterConfig,
    canViewSelectedCenterContacts
  } = useAuth()
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
  const selectedContactIds = contactsManager.contacts
    .filter(contact => contact.selected)
    .map(contact => String(contact.id))
  const allSelected =
    filtered.length > 0 &&
    filtered.every(contact => contact.selected)

  useEffect(() => {
    if (!canAccessSelectedCenterAdminMode) {
      adminManager.setIsAdmin(false)
      adminManager.setActiveView('access')
      return
    }

    if (adminManager.activeView === 'settings' && !canManageSelectedCenterConfig) {
      adminManager.setActiveView('access')
    }
  }, [canAccessSelectedCenterAdminMode, canManageSelectedCenterConfig, adminManager])

  const handleAddContact = (name: string, phone: string, gender: import('@/lib/types').Gender, ieDate?: string, areaOfStay?: string, remarks?: string) => {
    contactsManager.addOrUpdateContact(name, phone, gender, ieDate, areaOfStay, remarks)
  }

  const handleImport = (contacts: any[]) => {
    contactsManager.importContacts(contacts)
  }

  const handleIncrement = async () => {
    setBulkActionFeedback(null)

    if (selectedContactIds.length === 0) {
      setBulkActionFeedback('Select at least one contact to update.')
      return
    }

    const updateSuccessful = await contactsManager.incrementSelected(
      actionSelectors.activity.value,
      actionSelectors.area.value,
      actionSelectors.program.value
    )

    if (!updateSuccessful) {
      setBulkActionFeedback('Update failed. Please try again.')
      return
    }

    const clearSuccessful = await contactsManager.clearAllSelections()
    if (!clearSuccessful) {
      setBulkActionFeedback('Updated successfully, but failed to clear selection.')
      return
    }

    setBulkActionFeedback('Update completed. Selection cleared.')
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
  const dataSyncing = !contactsManager.isLoaded || !configManager.isLoaded
  const { isOnline, showLongSyncNotice, showOfflineWarning } = useSyncStatus({
    isSyncing: dataSyncing
  })

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
          <h2>🌿 Volunteers Coordination</h2>
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

      <SyncStatusNotices
        isSyncing={dataSyncing}
        syncMessage={isOnline
          ? 'Sync has not happened yet. Fetching latest contacts and center configuration...'
          : 'Internet is disconnected. Contacts and configuration could not be refreshed yet, so the current view may be incomplete.'}
        showLongSyncNotice={showLongSyncNotice}
        showOfflineWarning={showOfflineWarning || (dataSyncing && !!backendError)}
        offlineMessage="Internet is disconnected or data is unavailable. Contacts and configuration may look incomplete until the latest sync succeeds."
        margin="0 0 16px"
      />

      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!adminManager.isAdmin && (
          <>
            <button
              onClick={() => router.push('/campaigns')}
              style={{
                padding: '12px 16px',
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                flex: '1 1 180px'
              }}
            >
              📣 Campaigns
            </button>

            <button
              onClick={() => router.push('/attendance')}
              style={{
                padding: '12px 16px',
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                flex: '1 1 180px'
              }}
            >
              📝 Take Attendance
            </button>
          </>
        )}

        {canAccessSelectedCenterAdminMode && (
          <>
            <button
              onClick={adminManager.toggleAdmin}
              style={{
                padding: '12px 16px',
                backgroundColor: adminManager.isAdmin ? '#dc3545' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                flex: '1 1 180px'
              }}
            >
              {adminManager.isAdmin ? '👤 User Mode' : '⚙️ Admin Mode'}
            </button>

            {adminManager.isAdmin && (
              <>
                {canManageSelectedCenterConfig && (
                  <button
                    onClick={adminManager.openSettingsView}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: adminManager.activeView === 'settings' ? '#0d6efd' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      flex: '1 1 180px'
                    }}
                  >
                    Center Configuration
                  </button>
                )}
                <button
                  onClick={adminManager.openAccessView}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: adminManager.activeView === 'access' ? '#0d6efd' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    flex: '1 1 180px'
                  }}
                >
                  Access Control
                </button>
              </>
            )}
          </>
        )}
      </div>

      {canAccessSelectedCenterAdminMode && (
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

      {!adminManager.isAdmin && canViewSelectedCenterContacts && (
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

              {bulkActionFeedback && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 4,
                    backgroundColor: 'var(--panel-bg, #f8f9fa)',
                    border: '1px solid var(--border-color, #ddd)',
                    color: 'var(--text-primary, #000)'
                  }}
                >
                  {bulkActionFeedback}
                </div>
              )}

              {selectedContactIds.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => setShowCampaignModal(true)}
                    style={{
                        padding: '12px 16px',
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%',
                        maxWidth: 320
                    }}
                  >
                    Create Campaign ({selectedContactIds.length} selected)
                  </button>
                </div>
              )}
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
              onContactClick={c => {
                setEditingContact(c)
                setEditDraft({
                  name: c.name,
                  phone: c.phone,
                  gender: c.gender,
                  ieDate: c.ieDate || '',
                  areaOfStay: c.areaOfStay || '',
                  remarks: c.remarks || ''
                })
                setContactSaveError(null)
              }}
            />
          ) : (
            <p>Loading...</p>
          )}
        </>
      )}

      {!adminManager.isAdmin && !canViewSelectedCenterContacts && (
        <div
          style={{
            padding: 12,
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: 4,
            backgroundColor: 'var(--panel-bg, #f8f9fa)'
          }}
        >
          Full contact view is restricted for your role. You can still use attendance mode.
        </div>
      )}

      <CampaignModal
        isOpen={showCampaignModal}
        selectedContactIds={selectedContactIds}
        centerId={selectedCenter || ''}
        onClose={() => setShowCampaignModal(false)}
        onCreated={() => {
          setShowCampaignModal(false)
          contactsManager.clearAllSelections()
          router.push('/campaigns')
        }}
      />

      {editingContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 480, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 20 }}>
            <h4 style={{ margin: '0 0 16px' }}>Edit Contact</h4>

            {(['name', 'phone', 'ieDate', 'areaOfStay', 'remarks'] as const).map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>
                  {field === 'ieDate' ? 'IE Date' : field === 'areaOfStay' ? 'Area of Stay' : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  value={editDraft[field]}
                  onChange={e => setEditDraft(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box', fontSize: 14 }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Gender</label>
              <select
                value={editDraft.gender}
                onChange={e => setEditDraft(prev => ({ ...prev, gender: e.target.value as Contact['gender'] }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', fontSize: 14 }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {contactSaveError && (
              <div style={{ color: '#dc3545', fontSize: 13, marginBottom: 10 }}>{contactSaveError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setEditingContact(null); setContactSaveError(null) }}
                disabled={isSavingContact}
                style={{ padding: '8px 14px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedCenter || !editingContact) return
                  if (!editDraft.name.trim() || !editDraft.phone.trim()) {
                    setContactSaveError('Name and phone are required.')
                    return
                  }
                  setIsSavingContact(true)
                  setContactSaveError(null)
                  try {
                    await contactsApi.update(
                      editingContact.id,
                      {
                        name: editDraft.name.trim(),
                        phone: editDraft.phone.trim(),
                        gender: editDraft.gender,
                        ieDate: editDraft.ieDate.trim() || undefined,
                        areaOfStay: editDraft.areaOfStay.trim() || undefined,
                        remarks: editDraft.remarks.trim() || undefined
                      },
                      selectedCenter
                    )
                    // Reflect change locally immediately
                    contactsManager.contacts.find(c => c.id === editingContact.id) &&
                      contactsManager.setContacts(
                        contactsManager.contacts.map(c =>
                          c.id === editingContact.id
                            ? { ...c, ...editDraft, ieDate: editDraft.ieDate.trim() || undefined, areaOfStay: editDraft.areaOfStay.trim() || undefined, remarks: editDraft.remarks.trim() || undefined }
                            : c
                        )
                      )
                    setEditingContact(null)
                  } catch (err) {
                    setContactSaveError(err instanceof Error ? err.message : 'Failed to save contact')
                  } finally {
                    setIsSavingContact(false)
                  }
                }}
                disabled={isSavingContact}
                style={{ padding: '8px 14px', borderRadius: 4, border: 'none', backgroundColor: '#0d6efd', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {isSavingContact ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { isLoggedIn, user, logout, selectedCenter, selectedCenterDetails } = useAuth()

  const roleLabelMap = {
    ADMIN: 'Center Admin',
    USER: 'Center User',
    ATTENDANCE_TAKER: 'Attendance Taker'
  } as const

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
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 20px',
          backgroundColor: 'var(--panel-bg, #f5f5f5)',
          borderBottom: '1px solid var(--border-color, #ddd)'
        }}
      >
        <div style={{ fontSize: '14px', color: 'var(--text-secondary, #666)', flex: '1 1 280px' }}>
          Logged in as: <strong style={{ color: 'var(--text-primary, #333)' }}>{user?.name}</strong> ({user?.phone})
          {selectedCenter && (
            <span style={{ marginLeft: '12px', color: 'var(--text-primary, #333)' }}>
              📍 Center: <strong>{selectedCenterDetails?.name}</strong>
            </span>
          )}
          {user?.canAccessAllCenters && (
            <span style={{ marginLeft: '12px', color: '#0d6efd' }}>Overall Admin</span>
          )}
          {!user?.canAccessAllCenters && selectedCenterDetails && (
            <span style={{ marginLeft: '12px', color: '#0d6efd' }}>
              {roleLabelMap[selectedCenterDetails.role]}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            logout()
            window.location.href = '/'
          }}
          style={{
            padding: '10px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: 120
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