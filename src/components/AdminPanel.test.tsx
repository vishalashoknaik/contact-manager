import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminPanel } from './AdminPanel'
import { makeContact } from '@/lib/services/__tests__/fixtures'
import { within } from '@testing-library/react'

const { authApiMock } = vi.hoisted(() => ({
  authApiMock: {
    getUsers: vi.fn(async () => []),
    upsertUserAccess: vi.fn(async () => ({
      phone: '9999999999',
      name: 'Managed User',
      centerId: 'center-1',
      centerName: 'Center 1',
      centerRole: 'USER',
      canAccessAllCenters: false,
      isApproved: true,
      accessStatus: 'approved'
    })),
    removeUserAccess: vi.fn(async () => ({ success: true }))
  }
}))

vi.mock('@/lib/api/client', () => ({
  authApi: authApiMock,
  centersApi: {
    getAll: vi.fn(async () => [{ id: 'center-1', name: 'Center 1' }]),
    create: vi.fn(async (name: string) => ({ id: 'center-2', name })),
    update: vi.fn(async (id: string, name: string) => ({ id, name }))
  },
  contactsApi: {
    create: vi.fn(async () => ({ contact: null })),
    getAll: vi.fn(async () => [])
  }
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      phone: '8765432109',
      name: 'Admin User',
      canAccessAllCenters: true,
      centers: ['center-1'],
      centerDetails: [{
        id: 'center-1',
        name: 'Center 1',
        role: 'ADMIN',
        capabilities: {
          canManageAccess: true,
          canManageCenterConfig: true,
          canViewContacts: true,
          canTakeAttendance: true,
          grantableRoles: ['ADMIN', 'USER', 'ATTENDANCE_TAKER']
        }
      }]
    },
    selectedCenter: 'center-1',
    selectedCenterDetails: {
      id: 'center-1',
      name: 'Center 1',
      role: 'ADMIN',
      capabilities: {
        canManageAccess: true,
        canManageCenterConfig: true,
        canViewContacts: true,
        canTakeAttendance: true,
        grantableRoles: ['ADMIN', 'USER', 'ATTENDANCE_TAKER']
      }
    },
    canAccessSelectedCenterAdminMode: true,
    canManageSelectedCenterAccess: true,
    canManageSelectedCenterConfig: true,
    canViewSelectedCenterContacts: true,
    refreshUser: vi.fn()
  })
}))

vi.mock('@/lib/services/ConfigService', () => ({
  ConfigService: {
    addItem: vi.fn((items, value) => {
      if (!items.includes(value) && value) return [...items, value]
      return items
    }),
    removeItem: vi.fn((items, contacts, removeValue, type) => {
      const updated = items.filter(item => item !== removeValue)
      const updatedContacts = contacts.map(contact => {
        const updated = { ...contact }
        if (type === 'activity') {
          updated.activities = { ...contact.activities }
          delete updated.activities[removeValue]
        } else if (type === 'area') {
          updated.areas = { ...contact.areas }
          delete updated.areas[removeValue]
        } else if (type === 'program') {
          updated.programs = { ...contact.programs }
          delete updated.programs[removeValue]
        }
        return updated
      })
      return { items: updated, contacts: updatedContacts }
    }),
    renameItem: vi.fn((items, contacts, oldValue, newValue, type) => {
      const updated = items.map(item => (item === oldValue ? newValue : item))
      const updatedContacts = contacts.map(contact => {
        const updated = { ...contact }
        if (type === 'activity') {
          updated.activities = { ...contact.activities }
          if (contact.activities[oldValue] !== undefined) {
            updated.activities[newValue] = contact.activities[oldValue]
            delete updated.activities[oldValue]
          }
        } else if (type === 'area') {
          updated.areas = { ...contact.areas }
          if (contact.areas[oldValue] !== undefined) {
            updated.areas[newValue] = contact.areas[oldValue]
            delete updated.areas[oldValue]
          }
        } else if (type === 'program') {
          updated.programs = { ...contact.programs }
          if (contact.programs[oldValue] !== undefined) {
            updated.programs[newValue] = contact.programs[oldValue]
            delete updated.programs[oldValue]
          }
        }
        return updated
      })
      return { items: updated, contacts: updatedContacts }
    }),
    mergeItem: vi.fn((items, contacts, removeValue, mergeIntoValue, type) => {
      const updated = items.filter(item => item !== removeValue)
      const updatedContacts = contacts.map(contact => {
        const updated = { ...contact }
        if (type === 'activity') {
          updated.activities = { ...contact.activities }
          if (contact.activities[removeValue] !== undefined) {
            updated.activities[mergeIntoValue] = (updated.activities[mergeIntoValue] || 0) + contact.activities[removeValue]
            delete updated.activities[removeValue]
          }
        } else if (type === 'area') {
          updated.areas = { ...contact.areas }
          if (contact.areas[removeValue] !== undefined) {
            updated.areas[mergeIntoValue] = (updated.areas[mergeIntoValue] || 0) + contact.areas[removeValue]
            delete updated.areas[removeValue]
          }
        } else if (type === 'program') {
          updated.programs = { ...contact.programs }
          if (contact.programs[removeValue] !== undefined) {
            updated.programs[mergeIntoValue] = (updated.programs[mergeIntoValue] || 0) + contact.programs[removeValue]
            delete updated.programs[removeValue]
          }
        }
        return updated
      })
      return { items: updated, contacts: updatedContacts }
    })
  }
}))

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when hidden', () => {
    const { container } = render(
      <AdminPanel
        isVisible={false}
        section="access"
        activities={[]}
        areas={[]}
        programs={[]}
        contacts={[]}
        onActivitiesChange={vi.fn()}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('adds and removes configuration items through callbacks', async () => {
    const user = userEvent.setup()
    let activities = ['Walkathon']
    const onActivitiesChange = vi.fn((newActivities: string[]) => {
      activities = newActivities
    })
    const onAreasChange = vi.fn()
    const onProgramsChange = vi.fn()
    const onContactsChange = vi.fn()
    const contacts = [makeContact({ activities: { Walkathon: 1 }, areas: { Area1: 1 }, programs: { Program1: 1 } })]

    const { rerender } = render(
      <AdminPanel
        isVisible
        section="settings"
        activities={activities}
        areas={['Area1']}
        programs={['Program1']}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={onAreasChange}
        onProgramsChange={onProgramsChange}
        onContactsChange={onContactsChange}
      />
    )

    await user.type(screen.getByPlaceholderText('New activity'), 'Prayer')

    const activitiesSection = screen.getByText('Activities').closest('div') as HTMLElement
    await user.click(within(activitiesSection).getByRole('button', { name: 'Add' }))

    expect(onActivitiesChange).toHaveBeenCalledWith(['Walkathon', 'Prayer'])

    // Re-render with updated activities before clicking Delete
    rerender(
      <AdminPanel
        isVisible
        section="settings"
        activities={['Walkathon', 'Prayer']}
        areas={['Area1']}
        programs={['Program1']}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={onAreasChange}
        onProgramsChange={onProgramsChange}
        onContactsChange={onContactsChange}
      />
    )

    // Delete Walkathon - since Prayer exists, should show merge dialog
    const walkathonItem = within(activitiesSection).getByText('Walkathon').closest('div') as HTMLElement
    await user.click(within(walkathonItem).getByRole('button', { name: 'Delete' }))

    // Should show merge dialog - Prayer should appear as radio option in the merge dialog
    await waitFor(() => {
      const prayerRadios = screen.getAllByRole('radio', { name: 'Prayer' })
      expect(prayerRadios.length).toBeGreaterThan(0)
    })

    // Select Prayer as merge target (the one in the merge dialog)
    const prayerRadio = screen.getByRole('radio', { name: 'Prayer' })
    await user.click(prayerRadio)

    // Confirm merge
    const mergeButton = screen.getByRole('button', { name: 'Merge' })
    await user.click(mergeButton)

    expect(onActivitiesChange).toHaveBeenLastCalledWith(['Prayer'])
    expect(onContactsChange).toHaveBeenCalled()
  })

  it('manages user access by phone number', async () => {
    const user = userEvent.setup()
    authApiMock.getUsers.mockResolvedValueOnce([
      {
        phone: '9999999999',
        name: 'Existing User',
        centerId: 'center-1',
        centerName: 'Center 1',
        centerRole: 'USER',
        canAccessAllCenters: false,
        isApproved: true,
        accessStatus: 'approved'
      }
    ])

    render(
      <AdminPanel
        isVisible
        section="access"
        activities={[]}
        areas={[]}
        programs={[]}
        contacts={[]}
        onActivitiesChange={vi.fn()}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Existing User')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('User phone number'), '8888888888')
    await user.type(screen.getByPlaceholderText('User name (required for new user)'), 'New User')
    await user.click(screen.getByRole('button', { name: 'Grant Access' }))

    await waitFor(() => {
      expect(authApiMock.upsertUserAccess).toHaveBeenCalledWith(
        '8888888888',
        expect.objectContaining({
          name: 'New User',
          centerRole: expect.stringMatching(/ADMIN|USER|ATTENDANCE_TAKER/)
        }),
        'center-1'
      )
    })
  })

  it('approves pending requests and removes access in access view', async () => {
    const user = userEvent.setup()
    authApiMock.getUsers.mockResolvedValue([
      {
        phone: '7777777777',
        name: 'Pending User',
        centerId: 'center-1',
        centerName: 'Center 1',
        centerRole: 'USER',
        canAccessAllCenters: false,
        isApproved: false,
        accessStatus: 'pending'
      },
      {
        phone: '6666666666',
        name: 'Approved User',
        centerId: 'center-1',
        centerName: 'Center 1',
        centerRole: 'USER',
        canAccessAllCenters: false,
        isApproved: true,
        accessStatus: 'approved'
      }
    ])

    render(
      <AdminPanel
        isVisible
        section="access"
        activities={[]}
        areas={[]}
        programs={[]}
        contacts={[]}
        onActivitiesChange={vi.fn()}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Pending User')).toBeInTheDocument()
      expect(screen.getByText('Approved User')).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByRole('button', { name: 'Approve Access' })
    await user.click(approveButtons[0])

    await waitFor(() => {
      expect(authApiMock.upsertUserAccess).toHaveBeenCalledWith(
        '7777777777',
        expect.objectContaining({ name: 'Pending User', centerRole: 'USER' }),
        'center-1'
      )
    })

    const removeButtons = screen.getAllByRole('button', { name: 'Remove Access' })
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(authApiMock.removeUserAccess).toHaveBeenCalledWith('6666666666', 'center-1')
    })
  })

  it('warns when access control data is still syncing while offline', async () => {
    try {
      vi.useFakeTimers()
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: false
      })
      authApiMock.getUsers.mockImplementationOnce(() => new Promise(() => {}))

      render(
        <AdminPanel
          isVisible
          section="access"
          activities={[]}
          areas={[]}
          programs={[]}
          contacts={[]}
          onActivitiesChange={vi.fn()}
          onAreasChange={vi.fn()}
          onProgramsChange={vi.fn()}
          onContactsChange={vi.fn()}
        />
      )

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByText('Internet is disconnected. Access control details could not be refreshed yet and may be incomplete.')).toBeInTheDocument()
      expect(screen.queryByText('Internet is disconnected or access control data is still loading. Users and centers may appear incomplete until sync finishes.')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(screen.getByText('Internet is disconnected or access control data is still loading. Users and centers may appear incomplete until sync finishes.')).toBeInTheDocument()
    } finally {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true
      })
      vi.useRealTimers()
    }
  })

  it('updates an approved user role optimistically before the backend request resolves', async () => {
    const user = userEvent.setup()
    authApiMock.getUsers.mockResolvedValueOnce([
      {
        phone: '6666666666',
        name: 'Approved User',
        centerId: 'center-1',
        centerName: 'Center 1',
        centerRole: 'USER',
        canAccessAllCenters: false,
        isApproved: true,
        accessStatus: 'approved'
      }
    ])
    authApiMock.upsertUserAccess.mockImplementationOnce(() => new Promise(() => {}))

    render(
      <AdminPanel
        isVisible
        section="access"
        activities={[]}
        areas={[]}
        programs={[]}
        contacts={[]}
        onActivitiesChange={vi.fn()}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Approved User')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByDisplayValue('Center User'), 'ATTENDANCE_TAKER')
    await user.click(screen.getByRole('button', { name: 'Update Role' }))

    const approvedUserRow = screen.getByText('Approved User').closest('div') as HTMLElement
    expect(within(approvedUserRow).getByText('Attendance Taker')).toBeInTheDocument()
  })

  it('removes an approved user optimistically before the backend request resolves', async () => {
    const user = userEvent.setup()
    authApiMock.getUsers.mockResolvedValueOnce([
      {
        phone: '6666666666',
        name: 'Approved User',
        centerId: 'center-1',
        centerName: 'Center 1',
        centerRole: 'USER',
        canAccessAllCenters: false,
        isApproved: true,
        accessStatus: 'approved'
      }
    ])
    authApiMock.removeUserAccess.mockImplementationOnce(() => new Promise(() => {}))

    render(
      <AdminPanel
        isVisible
        section="access"
        activities={[]}
        areas={[]}
        programs={[]}
        contacts={[]}
        onActivitiesChange={vi.fn()}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Approved User')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Remove Access' }))

    expect(screen.queryByText('Approved User')).not.toBeInTheDocument()
  })

  it('allows renaming configuration items', async () => {
    const user = userEvent.setup()
    const onActivitiesChange = vi.fn()
    const contacts = [makeContact({ activities: { Walkathon: 2 } })]

    render(
      <AdminPanel
        isVisible
        section="settings"
        activities={['Walkathon']}
        areas={[]}
        programs={[]}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    const activitiesSection = screen.getByText('Activities').closest('div') as HTMLElement
    const renameButton = within(activitiesSection).getByRole('button', { name: 'Rename' })
    await user.click(renameButton)

    const input = within(activitiesSection).getByDisplayValue('Walkathon')
    await user.clear(input)
    await user.type(input, 'Walking')

    const saveButton = within(activitiesSection).getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    expect(onActivitiesChange).toHaveBeenCalledWith(['Walking'])
  })

  it('shows merge dialog when deleting item with multiple options', async () => {
    const user = userEvent.setup()
    const onActivitiesChange = vi.fn()
    const onContactsChange = vi.fn()
    const contacts = [
      makeContact({ id: 1, activities: { Walkathon: 2, Running: 1 } })
    ]

    render(
      <AdminPanel
        isVisible
        section="settings"
        activities={['Walkathon', 'Running']}
        areas={[]}
        programs={[]}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={onContactsChange}
      />
    )

    const activitiesSection = screen.getByText('Activities').closest('div') as HTMLElement
    const walkathonItem = within(activitiesSection).getByText('Walkathon').closest('div') as HTMLElement
    const deleteButton = within(walkathonItem).getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    // Merge dialog should appear - Running should appear as radio option in the merge dialog
    await waitFor(() => {
      const runningRadios = screen.getAllByRole('radio', { name: 'Running' })
      expect(runningRadios.length).toBeGreaterThan(0)
    })

    // Select merge target
    const runningRadio = screen.getByRole('radio', { name: 'Running' })
    await user.click(runningRadio)

    // Click merge button
    const mergeButton = screen.getByRole('button', { name: 'Merge' })
    await user.click(mergeButton)

    expect(onActivitiesChange).toHaveBeenCalledWith(['Running'])
  })

  it('allows deleting item without merging', async () => {
    const user = userEvent.setup()
    const onActivitiesChange = vi.fn()
    const onContactsChange = vi.fn()
    const contacts = [
      makeContact({ id: 1, activities: { Walkathon: 2, Running: 1 } })
    ]

    render(
      <AdminPanel
        isVisible
        section="settings"
        activities={['Walkathon', 'Running']}
        areas={[]}
        programs={[]}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={onContactsChange}
      />
    )

    const activitiesSection = screen.getByText('Activities').closest('div') as HTMLElement
    const walkathonItem = within(activitiesSection).getByText('Walkathon').closest('div') as HTMLElement
    const deleteButton = within(walkathonItem).getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    // Merge dialog should appear
    await waitFor(() => {
      const runningRadios = screen.getAllByRole('radio', { name: 'Running' })
      expect(runningRadios.length).toBeGreaterThan(0)
    })

    // Click delete button in dialog without selecting merge target
    // There are 2 Delete buttons (one in the item and one in dialog), so we find the one in the dialog
    const allDeleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    const dialogDeleteButton = allDeleteButtons[allDeleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    expect(onActivitiesChange).toHaveBeenCalledWith(['Running'])
    expect(onContactsChange).toHaveBeenCalled()
  })

  it('deletes item directly when it is the only one', async () => {
    const user = userEvent.setup()
    const onActivitiesChange = vi.fn()
    const onContactsChange = vi.fn()
    const contacts = [
      makeContact({ id: 1, activities: { Walkathon: 2 } })
    ]

    render(
      <AdminPanel
        isVisible
        section="settings"
        activities={['Walkathon']}
        areas={[]}
        programs={[]}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={onContactsChange}
      />
    )

    const activitiesSection = screen.getByText('Activities').closest('div') as HTMLElement
    const deleteButton = within(activitiesSection).getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    // Should not show merge dialog
    expect(screen.queryByText(/Merge activity:/i)).not.toBeInTheDocument()
    expect(onActivitiesChange).toHaveBeenCalledWith([])
  })
})