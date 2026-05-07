import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContacts } from './useContacts'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isLoggedIn: true,
    isLoading: false,
    selectedCenter: 'center-1'
  }))
}))

const mockContacts = [
  {
    id: 'uuid-1',
    name: 'Alice',
    phone: '1111111111',
    selected: false,
    activities: { Walkathon: 2 },
    areas: {},
    programs: {},
    lastUpdated: '2026-04-30T10:00:00.000Z'
  },
  {
    id: 'uuid-2',
    name: 'Bob',
    phone: '2222222222',
    selected: true,
    activities: {},
    areas: {},
    programs: {},
    lastUpdated: '2026-04-30T11:00:00.000Z'
  }
]

vi.mock('@/lib/api/client', () => {
  let store: any[] = []

  return {
    contactsApi: {
      getAll: vi.fn(async () => [...store]),
      create: vi.fn(async (data: any) => {
        const idx = store.findIndex(c => c.phone === data.phone)
        if (idx >= 0) {
          store[idx] = { ...store[idx], ...data }
        } else {
          store.push({ id: `id-${Date.now()}`, ...data, lastUpdated: new Date().toISOString() })
        }
        return { success: true }
      }),
      update: vi.fn(async (id: any, data: any) => {
        const idx = store.findIndex(c => String(c.id) === String(id))
        if (idx >= 0) store[idx] = { ...store[idx], ...data }
        return store[idx]
      }),
      delete: vi.fn(async (id: any) => {
        store = store.filter(c => String(c.id) !== String(id))
        return { success: true }
      }),
      _reset: (initial: any[] = []) => { store = [...initial] }
    }
  }
})

// Helper to access the internal reset function
import { contactsApi } from '@/lib/api/client'
import { useAuth } from '@/hooks/useAuth'
const resetStore = (initial: any[] = []) => (contactsApi as any)._reset(initial)

describe('useContacts', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
      selectedCenter: 'center-1'
    } as any)
    resetStore([])
    vi.clearAllMocks()
    // Re-register mocks after clearAllMocks
    const api = contactsApi as any
    const store: any[] = []
    ;(contactsApi.getAll as any).mockImplementation(async () => [...store])
    ;(contactsApi.create as any).mockImplementation(async (data: any) => {
      const idx = store.findIndex(c => c.phone === data.phone)
      if (idx >= 0) {
        store[idx] = { ...store[idx], ...data }
      } else {
        store.push({ id: `id-${Date.now()}`, ...data, lastUpdated: new Date().toISOString() })
      }
      return { success: true }
    })
    ;(contactsApi.update as any).mockImplementation(async (id: any, data: any) => {
      const idx = store.findIndex(c => String(c.id) === String(id))
      if (idx >= 0) store[idx] = { ...store[idx], ...data }
      return store[idx]
    })
    ;(contactsApi.delete as any).mockImplementation(async () => ({ success: true }))
  })

  it('loads contacts from backend on mount', async () => {
    vi.mocked(contactsApi.getAll).mockResolvedValueOnce([...mockContacts] as never)

    const { result } = renderHook(() => useContacts())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.contacts).toHaveLength(2)
    expect(result.current.contacts[0].name).toBe('Alice')
    expect(result.current.useBackend).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('sets error and disables backend when load fails', async () => {
    vi.mocked(contactsApi.getAll).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useContacts())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.contacts).toHaveLength(0)
    expect(result.current.useBackend).toBe(false)
    expect(result.current.error).toMatch(/Backend unavailable/)
  })

  it('addOrUpdateContact creates a new contact via API', async () => {
    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce([] as never)       // initial load
      .mockResolvedValueOnce([{                 // after create refresh
        id: 'new-id', name: 'Carol', phone: '3333333333',
        selected: true, activities: {}, areas: {}, programs: {},
        lastUpdated: new Date().toISOString()
      }] as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.addOrUpdateContact('Carol', '3333333333', 'Male')
    })

    expect(contactsApi.create).toHaveBeenCalledWith(
      { name: 'Carol', phone: '3333333333', gender: 'Male', ieDate: undefined, areaOfStay: undefined, remarks: undefined, selected: true },
      'center-1'
    )
    expect(result.current.contacts[0].name).toBe('Carol')
  })

  it('addOrUpdateContact sets error when API call fails', async () => {
    vi.mocked(contactsApi.getAll).mockResolvedValueOnce([] as never)
    vi.mocked(contactsApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.addOrUpdateContact('Dave', '4444444444')
    })

    expect(result.current.error).toMatch(/Failed to save/)
  })

  it('toggleSelect flips the selected state of a contact', async () => {
    const initialContacts = [{ ...mockContacts[0], selected: false }]

    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce(initialContacts as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelect('uuid-1')
    })

    expect(contactsApi.update).toHaveBeenCalledWith('uuid-1', { selected: true }, 'center-1')
    expect(result.current.contacts[0].selected).toBe(true)
  })

  it('toggleSelect updates UI immediately before the backend call resolves', async () => {
    vi.mocked(contactsApi.getAll).mockResolvedValueOnce([{ ...mockContacts[0], selected: false }] as never)

    let resolveUpdate: (() => void) | null = null
    vi.mocked(contactsApi.update).mockImplementationOnce(() => new Promise(resolve => {
      resolveUpdate = () => resolve({ ...mockContacts[0], selected: true })
    }) as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      void result.current.toggleSelect('uuid-1')
    })

    expect(result.current.contacts[0].selected).toBe(true)

    await act(async () => {
      resolveUpdate?.()
    })
  })

  it('toggleSelect rolls back the UI when the backend update fails', async () => {
    vi.mocked(contactsApi.getAll).mockResolvedValueOnce([{ ...mockContacts[0], selected: false }] as never)
    vi.mocked(contactsApi.update).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelect('uuid-1')
    })

    expect(result.current.contacts[0].selected).toBe(false)
    expect(result.current.error).toMatch(/Failed to update selection/)
  })

  it('toggleSelectAll selects all when none are selected', async () => {
    const allUnselected = mockContacts.map(c => ({ ...c, selected: false }))

    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce(allUnselected as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelectAll()
    })

    expect(contactsApi.update).toHaveBeenCalledTimes(2)
    expect(contactsApi.update).toHaveBeenCalledWith('uuid-1', { selected: true }, 'center-1')
    expect(contactsApi.update).toHaveBeenCalledWith('uuid-2', { selected: true }, 'center-1')
  })

  it('toggleSelectAll deselects all when all are selected', async () => {
    const allSelected = mockContacts.map(c => ({ ...c, selected: true }))

    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce(allSelected as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelectAll()
    })

    expect(contactsApi.update).toHaveBeenCalledWith('uuid-1', { selected: false }, 'center-1')
    expect(contactsApi.update).toHaveBeenCalledWith('uuid-2', { selected: false }, 'center-1')
  })

  it('toggleSelectAll only updates provided contact ids', async () => {
    const mixedSelection = [
      { ...mockContacts[0], selected: false },
      { ...mockContacts[1], selected: true }
    ]

    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce(mixedSelection as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelectAll(['uuid-1'])
    })

    expect(contactsApi.update).toHaveBeenCalledTimes(1)
    expect(contactsApi.update).toHaveBeenCalledWith('uuid-1', { selected: true }, 'center-1')
    expect(result.current.contacts[0].selected).toBe(true)
    expect(result.current.contacts[1].selected).toBe(true)
  })

  it('toggleSelectAll updates targeted contacts immediately before backend calls resolve', async () => {
    const allUnselected = mockContacts.map(c => ({ ...c, selected: false }))

    vi.mocked(contactsApi.getAll).mockResolvedValueOnce(allUnselected as never)

    let releaseUpdates: (() => void) | null = null
    vi.mocked(contactsApi.update).mockImplementation(() => new Promise(resolve => {
      releaseUpdates = () => resolve({ success: true })
    }) as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      void result.current.toggleSelectAll(['uuid-1'])
    })

    expect(result.current.contacts[0].selected).toBe(true)
    expect(result.current.contacts[1].selected).toBe(false)

    await act(async () => {
      releaseUpdates?.()
    })
  })

  it('clearAllSelections clears all selections', async () => {
    const allSelected = mockContacts.map(c => ({ ...c, selected: true }))
    const allUnselected = mockContacts.map(c => ({ ...c, selected: false }))

    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce(allSelected as never)
      .mockResolvedValueOnce(allUnselected as never)

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.clearAllSelections()
    })

    expect(contactsApi.update).toHaveBeenCalledTimes(2)
    expect(contactsApi.update).toHaveBeenCalledWith('uuid-1', { selected: false }, 'center-1')
    expect(contactsApi.update).toHaveBeenCalledWith('uuid-2', { selected: false }, 'center-1')
  })

  it('incrementSelected syncs updated contacts to backend', async () => {
    const selected = [{ ...mockContacts[0], selected: true }]

    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce(selected as never)
      .mockResolvedValueOnce(selected as never) // after sync refresh

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.incrementSelected('Walkathon', 'Area1', 'Program1')
    })

    // create is used for upsert-sync; should be called for changed contacts
    expect(contactsApi.create).toHaveBeenCalled()
  })

  it('importContacts upserts all contacts to backend then refreshes', async () => {
    vi.mocked(contactsApi.getAll)
      .mockResolvedValueOnce([] as never)  // initial
      .mockResolvedValueOnce([mockContacts[0]] as never) // after import

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.importContacts([mockContacts[0]] as any)
    })

    expect(contactsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice', phone: '1111111111' }),
      'center-1'
    )
    expect(result.current.contacts[0].name).toBe('Alice')
  })

  it('blocks load when no center is selected', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
      selectedCenter: null
    } as any)

    const { result } = renderHook(() => useContacts())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(contactsApi.getAll).not.toHaveBeenCalled()
    expect(result.current.useBackend).toBe(false)
    expect(result.current.error).toMatch(/No center selected/)
  })

  it('blocks operations when backend is unavailable', async () => {
    vi.mocked(contactsApi.getAll).mockRejectedValueOnce(new Error('down'))

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.useBackend).toBe(false)

    await act(async () => {
      await result.current.addOrUpdateContact('Ghost', '9999999999')
    })

    expect(contactsApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/Backend unavailable/)
  })
})
