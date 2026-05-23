'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useContacts } from '@/hooks/useContacts'
import { useConfig } from '@/hooks/useConfig'
import { useFiltering } from '@/hooks/useFiltering'
import { useAdmin } from '@/hooks/useAdmin'
import { useInputState } from '@/hooks/useInputState'
import { useAuth } from '@/hooks/useAuth'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { LoginPage } from '@/components/LoginPage'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { FilterService } from '@/lib/services/FilterService'
import { ContactForm } from '@/components/ContactForm'
import { CSVImport } from '@/components/CSVImport'
import { ActionBar } from '@/components/ActionBar'
import { ContactsTable } from '@/components/ContactsTable'
import { CampaignModal } from '@/components/CampaignModal'
import { contactsApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import type { Contact } from '@/lib/types'

function ContactsContent() {
  const router = useRouter()
  const { showToast } = useToast()
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeletingContacts, setIsDeletingContacts] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
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
    canViewSelectedCenterContacts
  } = useAuth()
  const actionSelectors = {
    activity: useInputState(),
    area: useInputState(),
    program: useInputState(),
    interest: useInputState()
  }

  // Apply filters and sorting
  let filtered = FilterService.filterContacts(
    contactsManager.contacts,
    filteringManager.filters,
    configManager.activities,
    configManager.areas,
    configManager.programs,
    configManager.interests
  )

  filtered = FilterService.sortContacts(
    filtered,
    filteringManager.sortState,
    configManager.activities,
    configManager.areas,
    configManager.programs,
    configManager.interests
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
    }
  }, [canAccessSelectedCenterAdminMode, adminManager])

  const handleAddContact = (name: string, phone: string, gender: import('@/lib/types').Gender, ieDate?: string, areaOfStay?: string, remarks?: string) => {
    contactsManager.addOrUpdateContact(name, phone, gender, ieDate, areaOfStay, remarks)
  }

  const handleImport = (contacts: any[]) => {
    contactsManager.importContacts(contacts)
  }

  const handleIncrement = async () => {
    if (selectedContactIds.length === 0) {
      showToast('Select at least one contact to update.', 'warning')
      return
    }

    setIsUpdating(true)
    try {
      const updateSuccessful = await contactsManager.incrementSelected(
        actionSelectors.activity.value,
        actionSelectors.area.value,
        actionSelectors.program.value,
        actionSelectors.interest.value
      )

      if (!updateSuccessful) {
        showToast('Update failed. Please try again.', 'error')
        return
      }

      const clearSuccessful = await contactsManager.clearAllSelections()
      if (!clearSuccessful) {
        showToast('Updated successfully, but failed to clear selection.', 'warning')
        return
      }

      // Reset dropdown selectors so user starts fresh for the next round
      actionSelectors.activity.clear()
      actionSelectors.area.clear()
      actionSelectors.program.clear()
      actionSelectors.interest.clear()

      showToast('Update completed. Selection cleared.', 'success')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteSelected = () => {
    if (selectedContactIds.length === 0) {
      showToast('Select at least one contact to delete.', 'warning')
      return
    }
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    const count = selectedContactIds.length
    setIsDeletingContacts(true)
    try {
      const success = await contactsManager.deleteSelectedContacts()
      if (!success) {
        showToast('Delete failed. Please try again.', 'error')
        return
      }
      showToast(`${count} contact${count === 1 ? '' : 's'} deleted.`, 'success')
    } finally {
      setIsDeletingContacts(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleFilterChange = (filterName: string, value: string) => {
    if (filterName === 'name') filteringManager.setNameFilter(value)
    else if (filterName === 'phone') filteringManager.setPhoneFilter(value)
    else if (filterName === 'gender') filteringManager.setGenderFilter(value)
    else if (filterName === 'areaOfStay') filteringManager.setAreaOfStayFilter(value)
    else if (filterName === 'total') filteringManager.setTotalFilter(value)
    else if (filterName === 'date') filteringManager.setDateFilter(value)
    else if (filterName === 'notInterested') filteringManager.setNotInterestedFilter(value)
    else if (filterName === 'centerChange') filteringManager.setCenterChangeFilter(value)
    else if (filterName === 'doNotDisturb') filteringManager.setDoNotDisturbFilter(value)
  }

  const backendError = contactsManager.error || configManager.error
  const dataSyncing = !contactsManager.isLoaded || !configManager.isLoaded
  const { isOnline, showLongSyncNotice, showOfflineWarning } = useSyncStatus({
    isSyncing: dataSyncing
  })

  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'var(--bg-primary, #ffffff)',
      color: 'var(--text-primary, #000000)',
      minHeight: '100vh'
    }}>
      {/* Full-page overlay while bulk update is in progress */}
      {isUpdating && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, userSelect: 'none', overscrollBehavior: 'contain'
          }}
          onWheel={e => e.preventDefault()}
          onTouchMove={e => e.preventDefault()}
        >
          <div style={{
            width: 56, height: 56, border: '6px solid rgba(255,255,255,0.3)',
            borderTop: '6px solid #fff', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Updating…</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
            Please wait while contacts are being saved
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{
        marginBottom: 20,
        borderBottom: '1px solid var(--border-color, #ddd)',
        paddingBottom: 16
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Contacts</h1>
      </div>

      {backendError && (
        <div
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-fg)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
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

      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {canAccessSelectedCenterAdminMode && (
          <a
            href="/settings"
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid var(--border-color, #ddd)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary, #000)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ⚙ Settings
          </a>
        )}
      </div>

      {canViewSelectedCenterContacts && (
        <>
          {/* Contact Form & CSV Import */}
          <Card style={{ marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700 }}>Add Contact</h2>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 250px', minWidth: 250 }}>
                <ContactForm onAddContact={handleAddContact} />
              </div>
              <div style={{ flex: '0 1 auto' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Import</p>
                <CSVImport
                  contacts={contactsManager.contacts}
                  onImport={handleImport}
                />
              </div>
            </div>
          </Card>

          {/* Action Bar for Bulk Operations */}
          {contactsManager.contacts.length > 0 && (
            <>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Bulk Actions</p>
              <ActionBar
                activities={configManager.activities}
                areas={configManager.areas}
                programs={configManager.programs}
                interests={configManager.interests}
                selectedActivity={actionSelectors.activity.value}
                selectedArea={actionSelectors.area.value}
                selectedProgram={actionSelectors.program.value}
                selectedInterest={actionSelectors.interest.value}
                onActivityChange={actionSelectors.activity.setValue}
                onAreaChange={actionSelectors.area.setValue}
                onProgramChange={actionSelectors.program.setValue}
                onInterestChange={actionSelectors.interest.setValue}
                onIncrement={handleIncrement}
                isUpdating={isUpdating}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <Button
                  variant={adminManager.childLock ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={adminManager.toggleChildLock}
                  title={adminManager.childLock ? 'Child lock ON — click to unlock bulk delete' : 'Child lock OFF — click to re-enable lock'}
                  style={!adminManager.childLock ? { color: 'var(--color-warning)', borderColor: 'var(--color-warning)' } : {}}
                >
                  {adminManager.childLock ? '🔒 Locked' : '🔓 Unlocked'}
                </Button>

                {!adminManager.childLock && selectedContactIds.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    🗑 Delete Selected ({selectedContactIds.length})
                  </Button>
                )}
              </div>

              {selectedContactIds.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCampaignModal(true)}
                  >
                    ✦ Create Campaign ({selectedContactIds.length} selected)
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Contacts Table */}
          <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>Contacts</h2>
          {contactsManager.isLoaded ? (
            <ContactsTable
              contacts={filtered}
              totalCount={contactsManager.contacts.length}
              activities={configManager.activities}
              areas={configManager.areas}
              programs={configManager.programs}
              interests={configManager.interests}
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
              onInterestFilterChange={filteringManager.setInterestFilter}
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

      {!canViewSelectedCenterContacts && (
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setEditingContact(null); setContactSaveError(null) }}
                disabled={isSavingContact}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSavingContact}
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
              >
                {isSavingContact ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Contacts"
        message={`Permanently delete ${selectedContactIds.length} selected contact${selectedContactIds.length === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeletingContacts}
      />
    </div>
  )
}

export default function ContactsPage() {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn) {
    return <LoginPage />
  }

  return <ContactsContent />
}
