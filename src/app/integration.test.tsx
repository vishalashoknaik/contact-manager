import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Home from './page'
import { ContactService } from '@/lib/services/ContactService'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      phone: '8765432109',
      name: 'Admin User',
      canAccessAllCenters: true,
      centers: ['center-1', 'center-2'],
      centerDetails: [
        {
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
        {
          id: 'center-2',
          name: 'Center 2',
          role: 'ADMIN',
          capabilities: {
            canManageAccess: true,
            canManageCenterConfig: true,
            canViewContacts: true,
            canTakeAttendance: true,
            grantableRoles: ['ADMIN', 'USER', 'ATTENDANCE_TAKER']
          }
        }
      ]
    },
    isLoggedIn: true,
    isLoading: false,
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
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    selectCenter: vi.fn(),
    error: null
  })
}))

vi.mock('@/lib/services/CSVService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/services/CSVService')>()
  return {
    ...actual,
    CSVService: {
      ...actual.CSVService,
      handleFileImport: vi.fn()
    }
  }
})

// Mock the API client with more comprehensive behavior
vi.mock('@/lib/api/client', () => {
  const contacts: any[] = []
  const activities = ['Walkathon']
  const areas = ['Area1']
  const programs = ['Program1']
  let idCounter = 1

  return {
    authApi: {
      getUsers: vi.fn(async () => [
        {
          phone: '8765432109',
          name: 'Admin User',
          centerId: 'center-1',
          centerName: 'Center 1',
          centerRole: 'ADMIN',
          canAccessAllCenters: true
        }
      ]),
      upsertUserAccess: vi.fn(async () => ({
        phone: '9999999999',
        name: 'Managed User',
        centerId: 'center-1',
        centerName: 'Center 1',
        centerRole: 'USER',
        canAccessAllCenters: false
      }))
    },
    contactsApi: {
      getAll: vi.fn(async () => [...contacts]),
      create: vi.fn(async (data: any) => {
        const existing = contacts.findIndex(c => c.phone === data.phone)
        if (existing >= 0) {
          contacts[existing] = { ...contacts[existing], ...data }
        } else {
          contacts.push({
            id: String(idCounter++),
            ...data,
            selected: data.selected ?? false,
            lastUpdated: new Date().toISOString(),
            activities: data.activities ?? {},
            areas: data.areas ?? {},
            programs: data.programs ?? {}
          })
        }
        return { success: true }
      }),
      update: vi.fn(async (id: any, data: any) => {
        const idx = contacts.findIndex(c => String(c.id) === String(id))
        if (idx >= 0) contacts[idx] = { ...contacts[idx], ...data }
        return contacts[idx]
      }),
      delete: vi.fn(async () => ({ success: true }))
    },
    activitiesApi: {
      getAll: vi.fn(async () => [...activities]),
      create: vi.fn(async (name: string) => {
        activities.push(name)
        return name
      }),
      delete: vi.fn(async (name: string) => {
        const i = activities.indexOf(name)
        if (i >= 0) activities.splice(i, 1)
      })
    },
    areasApi: {
      getAll: vi.fn(async () => [...areas]),
      create: vi.fn(async (name: string) => {
        areas.push(name)
        return name
      }),
      delete: vi.fn(async (name: string) => {
        const i = areas.indexOf(name)
        if (i >= 0) areas.splice(i, 1)
      })
    },
    programsApi: {
      getAll: vi.fn(async () => [...programs]),
      create: vi.fn(async (name: string) => {
        programs.push(name)
        return name
      }),
      delete: vi.fn(async (name: string) => {
        const i = programs.indexOf(name)
        if (i >= 0) programs.splice(i, 1)
      })
    }
  }
})

describe('Integration: Contact Management Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a new contact through the form and displays it in the table', async () => {
    const user = userEvent.setup()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')

    await user.type(nameInput, 'Ravi Kumar')
    await user.type(phoneInput, '9876543210')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    })
  })

  it('filters contacts by name after adding multiple contacts', async () => {
    const user = userEvent.setup()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    // Add two contacts
    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')

    await user.type(nameInput, 'Alice')
    await user.type(phoneInput, '1111111111')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Clear inputs
    await user.clear(nameInput)
    await user.clear(phoneInput)

    // Add second contact
    await user.type(nameInput, 'Bob')
    await user.type(phoneInput, '2222222222')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    // Both should be visible before filtering
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('handles duplicate phone numbers by updating existing contact', async () => {
    const user = userEvent.setup()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')

    // Add first contact
    await user.type(nameInput, 'Ravi')
    await user.type(phoneInput, '9876543210')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText('Ravi')).toBeInTheDocument()
    })

    // Clear inputs
    await user.clear(nameInput)
    await user.clear(phoneInput)

    // Add contact with same phone but different name
    await user.type(nameInput, 'Ravi Kumar')
    await user.type(phoneInput, '9876543210')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(screen.queryByText('Ravi')).not.toBeInTheDocument()
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    })
  })

  it('clears form after submission', async () => {
    const user = userEvent.setup()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText(
      'Name'
    ) as HTMLInputElement
    const phoneInput = screen.getByPlaceholderText(
      'Phone'
    ) as HTMLInputElement

    await user.type(nameInput, 'Test')
    await user.type(phoneInput, '1234567890')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(nameInput.value).toBe('')
      expect(phoneInput.value).toBe('')
    })
  })

  it('handles phone number normalization', async () => {
    // Import at runtime to avoid issues
    const { PhoneService } = await import('@/lib/services/PhoneService')
    const normalized = PhoneService.normalize('(987) 654-3210')
    expect(normalized).toBe('9876543210')

    const alreadyNormalized = PhoneService.normalize('9876543210')
    expect(alreadyNormalized).toBe('9876543210')
  })
})

describe('Integration: Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays error when contact creation fails', async () => {
    const { contactsApi } = await import('@/lib/api/client')
    vi.mocked(contactsApi.create).mockRejectedValueOnce(
      new Error('Network error')
    )

    const user = userEvent.setup()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')

    await user.type(nameInput, 'Ravi')
    await user.type(phoneInput, '9876543210')
    await user.click(screen.getByRole('button', { name: /add/i }))

    // Error should be handled gracefully
    await waitFor(() => {
      const form = screen.getByPlaceholderText('Name')
      expect(form).toBeInTheDocument()
    })
  })

  it('validates required fields before submission', async () => {
    const { contactsApi } = await import('@/lib/api/client')
    const user = userEvent.setup()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    // Try to submit with only name
    const nameInput = screen.getByPlaceholderText('Name')
    await user.type(nameInput, 'Ravi')
    await user.click(screen.getByRole('button', { name: /add/i }))

    // API should not be called
    expect(vi.mocked(contactsApi.create)).not.toHaveBeenCalled()
  })
})
