'use client'

import { useContacts } from '@/hooks/useContacts'
import { useConfig } from '@/hooks/useConfig'
import { useFiltering } from '@/hooks/useFiltering'
import { useAdmin } from '@/hooks/useAdmin'
import { useInputState } from '@/hooks/useInputState'
import { FilterService } from '@/lib/services/FilterService'
import { ContactService } from '@/lib/services/contactService'
import { ContactForm } from '@/components/ContactForm'
import { CSVImport } from '@/components/CSVImport'
import { AdminPanel } from '@/components/AdminPanel'
import { ActionBar } from '@/components/ActionBar'
import { ContactsTable } from '@/components/ContactsTable'

const VERSION = 'v2.0.0'

export default function Home() {
  // Hooks for state management
  const contactsManager = useContacts()
  const configManager = useConfig()
  const filteringManager = useFiltering()
  const adminManager = useAdmin()
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
    configManager.activities
  )

  const allSelected =
    contactsManager.contacts.length > 0 &&
    contactsManager.contacts.every(c => c.selected)

  // Event handlers
  const handleAddContact = (name: string, phone: string) => {
    contactsManager.addOrUpdateContact(name, phone)
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
    else if (filterName === 'total') filteringManager.setTotalFilter(value)
    else if (filterName === 'date') filteringManager.setDateFilter(value)
  }

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
        <h2>📋 Contact Manager</h2>
        <p style={{ color: 'var(--text-secondary, #666)', marginTop: 5 }}>Version {VERSION}</p>
      </div>

      {/* Admin Controls */}
      <div style={{ marginBottom: 20 }}>
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
          <button
            onClick={adminManager.toggleSettings}
            style={{
              marginLeft: 10,
              padding: '10px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {adminManager.showSettings ? '▲ Hide Settings' : '▼ Show Settings'}
          </button>
        )}
      </div>

      {/* Admin Panel */}
      {adminManager.isAdmin && (
        <AdminPanel
          isVisible={adminManager.showSettings}
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
          onToggleSelectAll={contactsManager.toggleSelectAll}
          onToggleSort={filteringManager.toggleSort}
          onFilterChange={handleFilterChange}
          onActivityFilterChange={filteringManager.setActivityFilter}
          onAreaFilterChange={filteringManager.setAreaFilter}
          onProgramFilterChange={filteringManager.setProgramFilter}
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  )
}