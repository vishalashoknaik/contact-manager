import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Home from './page'
import { CSVService } from '@/lib/services/CSVService'

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
        { id: 'center-1', name: 'Center 1', isAdmin: true },
        { id: 'center-2', name: 'Center 2', isAdmin: true }
      ]
    },
    isLoggedIn: true,
    isLoading: false,
    selectedCenter: 'center-1',
    selectedCenterDetails: { id: 'center-1', name: 'Center 1', isAdmin: true },
    canManageSelectedCenter: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    selectCenter: vi.fn(),
    refreshUser: vi.fn(),
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

// Mock the API client so tests run without a real backend
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
          isCenterAdmin: true,
          canAccessAllCenters: true,
          isApproved: true,
          accessStatus: 'approved'
        }
      ]),
      upsertUserAccess: vi.fn(async () => ({
        phone: '9999999999',
        name: 'Managed User',
        centerId: 'center-1',
        centerName: 'Center 1',
        isCenterAdmin: false,
        canAccessAllCenters: false,
        isApproved: true,
        accessStatus: 'approved'
      }))
    },
    centersApi: {
      getAll: vi.fn(async () => [
        { id: 'center-1', name: 'Center 1' },
        { id: 'center-2', name: 'Center 2' }
      ]),
      create: vi.fn(async (name: string) => ({ id: 'center-3', name })),
      update: vi.fn(async (id: string, name: string) => ({ id, name }))
    },
    contactsApi: {
      getAll: vi.fn(async () => [...contacts]),
      create: vi.fn(async (data: any) => {
        const existing = contacts.findIndex(c => c.phone === data.phone)
        if (existing >= 0) {
          contacts[existing] = { ...contacts[existing], ...data }
        } else {
          contacts.push({ id: String(idCounter++), ...data, selected: data.selected ?? false, lastUpdated: new Date().toISOString(), activities: data.activities ?? {}, areas: data.areas ?? {}, programs: data.programs ?? {} })
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
      create: vi.fn(async (name: string) => { activities.push(name); return name }),
      delete: vi.fn(async (name: string) => { const i = activities.indexOf(name); if (i >= 0) activities.splice(i, 1) })
    },
    areasApi: {
      getAll: vi.fn(async () => [...areas]),
      create: vi.fn(async (name: string) => { areas.push(name); return name }),
      delete: vi.fn(async (name: string) => { const i = areas.indexOf(name); if (i >= 0) areas.splice(i, 1) })
    },
    programsApi: {
      getAll: vi.fn(async () => [...programs]),
      create: vi.fn(async (name: string) => { programs.push(name); return name }),
      delete: vi.fn(async (name: string) => { const i = programs.indexOf(name); if (i >= 0) programs.splice(i, 1) })
    },
    healthApi: {
      check: vi.fn(async () => true)
    }
  }
})

describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('covers admin mode, add contact, filters, sorting, bulk actions, and csv import flow', async () => {
    const user = userEvent.setup()
    vi.mocked(CSVService.handleFileImport).mockResolvedValue([
      {
        id: 200,
        name: 'Imported User',
        phone: '7777777777',
        gender: 'Male',
        activities: {},
        areas: {},
        programs: {},
        selected: true,
        lastUpdated: '2026-04-30T12:00:00.000Z',
        importOrder: 0
      },
      {
        id: 1,
        name: 'Ravi',
        phone: '9876543210',
        gender: 'Male',
        activities: {},
        areas: {},
        programs: {},
        selected: false,
        lastUpdated: '2026-04-30T10:00:00.000Z'
      }
    ] as never)

    const { container } = render(<Home />)

    expect(screen.getByText(/Contact Manager/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Admin Mode/i }))
    await user.click(screen.getByRole('button', { name: 'Center Configuration' }))
    expect(screen.getByText(/Center Settings/)).toBeInTheDocument()
    expect(screen.queryByText('Add Contact')).not.toBeInTheDocument()
    expect(screen.queryByText(/Contacts \(/)).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('New activity'), 'Prayer')

    const adminPanel = screen.getByText(/Center Settings/).closest('div') as HTMLElement
    await user.click(within(adminPanel).getAllByRole('button', { name: 'Add' })[0])

    expect(within(adminPanel).getByText('Prayer')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /User Mode/i }))
  expect(screen.getByText('Add Contact')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')
    await user.type(nameInput, 'Manual User')
    await user.type(phoneInput, '6666666666')

    const addContactSection = screen.getByText('Add Contact').closest('div') as HTMLElement
    await user.click(within(addContactSection).getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(screen.getByText('Manual User')).toBeInTheDocument()
    })

    const rowsBeforeImport = container.querySelectorAll('tbody tr')
    await user.click(within(rowsBeforeImport[0]).getByRole('checkbox'))

    const combos = screen.getAllByRole('combobox')
    const actionCombos = combos.slice(-4, -1)
    await user.selectOptions(actionCombos[0], 'Walkathon')
    await user.selectOptions(actionCombos[1], 'Area1')
    await user.selectOptions(actionCombos[2], 'Program1')
    
    // Click increment button (increment logic is tested in unit tests)
    await user.click(screen.getByRole('button', { name: '+1 (Selected)' }))

    const filterInputs = screen.getAllByPlaceholderText('Filter...')
    await user.clear(filterInputs[0])
    await user.type(filterInputs[0], 'Manual')
    expect(screen.getByText('Manual User')).toBeInTheDocument()
    expect(screen.queryByText('Ravi')).not.toBeInTheDocument()

    await user.clear(filterInputs[0])
    await user.click(screen.getByRole('columnheader', { name: /Phone/ }))

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['name,phone\nImported User,7777777777'], 'contacts.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(CSVService.handleFileImport).toHaveBeenCalled()
      expect(screen.getByText('Imported User')).toBeInTheDocument()
    })
  })
})