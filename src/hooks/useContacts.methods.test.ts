/**
 * useContacts — missing method tests
 * Covers the public API not exercised in useContacts.test.ts:
 *   - toggleSelect (optimistic update + API call + rollback on error)
 *   - toggleSelectAll (select all / deselect all)
 *   - clearAllSelections
 *   - incrementSelected
 *   - importContacts
 */
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

const apiMock = vi.hoisted(() => ({
  getAll: vi.fn<any, any>(),
  create: vi.fn<any, any>(),
  update: vi.fn<any, any>(),
  delete: vi.fn<any, any>()
}))

vi.mock('@/lib/api/client', () => ({
  contactsApi: apiMock
}))

import { useAuth } from '@/hooks/useAuth'

const ALICE = {
  id: 'uuid-1', name: 'Alice', phone: '1111111111', selected: false,
  gender: 'Female', activities: {}, areas: {}, programs: {},
  lastUpdated: '2026-04-30T10:00:00.000Z'
}
const BOB = {
  id: 'uuid-2', name: 'Bob', phone: '2222222222', selected: true,
  gender: 'Male', activities: { Walkathon: 1 }, areas: {}, programs: {},
  lastUpdated: '2026-04-30T11:00:00.000Z'
}

function setupHookWithContacts(initial = [ALICE, BOB]) {
  apiMock.getAll.mockResolvedValueOnce([...initial])
  apiMock.update.mockResolvedValue({})
  apiMock.create.mockResolvedValue({ success: true })
  return renderHook(() => useContacts())
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({
    isLoggedIn: true,
    isLoading: false,
    selectedCenter: 'center-1'
  } as any)
})

// ── toggleSelect ──────────────────────────────────────────────────────────────
describe('useContacts — toggleSelect', () => {
  it('flips selected state optimistically and calls API update', async () => {
    const { result } = setupHookWithContacts()
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelect('uuid-1')
    })

    expect(apiMock.update).toHaveBeenCalledWith(
      'uuid-1',
      { selected: true },
      'center-1'
    )
    const alice = result.current.contacts.find(c => c.id === 'uuid-1')
    expect(alice?.selected).toBe(true)
  })

  it('rolls back optimistic update when API call fails', async () => {
    const { result } = setupHookWithContacts()
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    apiMock.update.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      await result.current.toggleSelect('uuid-1')
    })

    // Should roll back to original (selected: false)
    const alice = result.current.contacts.find(c => c.id === 'uuid-1')
    expect(alice?.selected).toBe(false)
    expect(result.current.error).toMatch(/Failed to update selection/)
  })

  it('does nothing when id does not match any contact', async () => {
    const { result } = setupHookWithContacts()
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelect('nonexistent-id')
    })

    // update should still be called (contact lookup happens inside), just no visible change
    expect(result.current.contacts).toHaveLength(2)
  })
})

// ── toggleSelectAll ───────────────────────────────────────────────────────────
describe('useContacts — toggleSelectAll', () => {
  it('selects all when not all are selected', async () => {
    const { result } = setupHookWithContacts([
      { ...ALICE, selected: false },
      { ...BOB, selected: false }
    ])
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelectAll()
    })

    // Both contacts should be updated to selected: true
    expect(apiMock.update).toHaveBeenCalledWith('uuid-1', { selected: true }, 'center-1')
    expect(apiMock.update).toHaveBeenCalledWith('uuid-2', { selected: true }, 'center-1')
  })

  it('deselects all when all are currently selected', async () => {
    const { result } = setupHookWithContacts([
      { ...ALICE, selected: true },
      { ...BOB, selected: true }
    ])
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.toggleSelectAll()
    })

    expect(apiMock.update).toHaveBeenCalledWith('uuid-1', { selected: false }, 'center-1')
    expect(apiMock.update).toHaveBeenCalledWith('uuid-2', { selected: false }, 'center-1')
  })

  it('rolls back when API call fails during toggle-all', async () => {
    const { result } = setupHookWithContacts([
      { ...ALICE, selected: false },
      { ...BOB, selected: false }
    ])
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    apiMock.update.mockRejectedValue(new Error('Bulk failure'))

    await act(async () => {
      await result.current.toggleSelectAll()
    })

    // Should revert to original state
    expect(result.current.contacts.every(c => c.selected === false)).toBe(true)
    expect(result.current.error).toMatch(/Failed to update bulk selection/)
  })

  it('scopes toggle to provided contactIds when supplied', async () => {
    const { result } = setupHookWithContacts([
      { ...ALICE, selected: false },
      { ...BOB, selected: false }
    ])
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      // Only toggle Alice
      await result.current.toggleSelectAll(['uuid-1'])
    })

    // Only Alice should be updated
    expect(apiMock.update).toHaveBeenCalledWith('uuid-1', { selected: true }, 'center-1')
    expect(apiMock.update).not.toHaveBeenCalledWith('uuid-2', expect.anything(), expect.anything())
  })
})

// ── clearAllSelections ────────────────────────────────────────────────────────
describe('useContacts — clearAllSelections', () => {
  it('sets all contacts to selected:false without calling API', async () => {
    const { result } = setupHookWithContacts([
      { ...ALICE, selected: true },
      { ...BOB, selected: true }
    ])
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.clearAllSelections()
    })

    expect(apiMock.update).not.toHaveBeenCalled()
    expect(result.current.contacts.every(c => c.selected === false)).toBe(true)
  })

  it('always returns true even when contacts are already unselected', async () => {
    const { result } = setupHookWithContacts([
      { ...ALICE, selected: false },
      { ...BOB, selected: false }
    ])
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result.current.clearAllSelections()
    })

    expect(returnValue).toBe(true)
    expect(apiMock.update).not.toHaveBeenCalled()
  })
})

// ── incrementSelected ─────────────────────────────────────────────────────────
describe('useContacts — incrementSelected', () => {
  it('increments activity count for selected contacts and syncs to backend', async () => {
    apiMock.getAll
      .mockResolvedValueOnce([{ ...ALICE, selected: true }, { ...BOB, selected: false }])

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.incrementSelected('Walkathon', '', '')
    })

    expect(success).toBe(true)
    expect(apiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice', phone: '1111111111' }),
      'center-1'
    )
    // Bob is not selected — should not be in the sync call
    const createCalls = apiMock.create.mock.calls.map((c: any) => c[0].name)
    expect(createCalls).not.toContain('Bob')
  })

  it('returns false and sets error when backend sync fails', async () => {
    apiMock.getAll.mockResolvedValueOnce([{ ...ALICE, selected: true }])
    apiMock.create.mockRejectedValueOnce(new Error('Sync failed'))

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.incrementSelected('Walkathon', '', '')
    })

    expect(success).toBe(false)
    expect(result.current.error).toMatch(/Failed to persist increments/)
  })
})

// ── importContacts ────────────────────────────────────────────────────────────
describe('useContacts — importContacts', () => {
  it('calls create for each imported contact and refreshes from backend', async () => {
    const imported = [
      { ...ALICE, name: 'Alice Imported' }
    ]
    apiMock.getAll
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce(imported) // after import refresh

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.importContacts(imported as any)
    })

    expect(apiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice Imported' }),
      'center-1'
    )
    expect(result.current.contacts[0].name).toBe('Alice Imported')
  })

  it('sets error when import sync fails', async () => {
    apiMock.getAll.mockResolvedValueOnce([])
    apiMock.create.mockRejectedValueOnce(new Error('Import failed'))

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.importContacts([ALICE] as any)
    })

    expect(result.current.error).toMatch(/Failed to import contacts/)
  })
})

// ── deleteSelectedContacts ────────────────────────────────────────────────────
describe('useContacts — deleteSelectedContacts', () => {
  it('calls API delete for each selected contact and removes them from state', async () => {
    const selected = { ...BOB, selected: true }
    apiMock.getAll.mockResolvedValueOnce([ALICE, selected])
    apiMock.delete.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteSelectedContacts()
    })

    expect(success).toBe(true)
    expect(apiMock.delete).toHaveBeenCalledWith('uuid-2')
    expect(result.current.contacts.find(c => c.id === 'uuid-2')).toBeUndefined()
  })

  it('removes only the selected contacts, leaving unselected ones intact', async () => {
    const bobSelected = { ...BOB, selected: true }
    apiMock.getAll.mockResolvedValueOnce([ALICE, bobSelected])
    apiMock.delete.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.deleteSelectedContacts()
    })

    expect(result.current.contacts).toHaveLength(1)
    expect(result.current.contacts[0].id).toBe('uuid-1') // Alice is untouched
  })

  it('returns true and no API call when no contacts are selected', async () => {
    apiMock.getAll.mockResolvedValueOnce([ALICE, { ...BOB, selected: false }])

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteSelectedContacts()
    })

    expect(success).toBe(true)
    expect(apiMock.delete).not.toHaveBeenCalled()
    expect(result.current.contacts).toHaveLength(2)
  })

  it('calls delete for every selected contact (multiple)', async () => {
    const aliceSelected = { ...ALICE, selected: true }
    const bobSelected = { ...BOB, selected: true }
    apiMock.getAll.mockResolvedValueOnce([aliceSelected, bobSelected])
    apiMock.delete.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.deleteSelectedContacts()
    })

    expect(apiMock.delete).toHaveBeenCalledWith('uuid-1')
    expect(apiMock.delete).toHaveBeenCalledWith('uuid-2')
    expect(result.current.contacts).toHaveLength(0)
  })

  it('rolls back and returns false when API delete fails', async () => {
    const bobSelected = { ...BOB, selected: true }
    apiMock.getAll.mockResolvedValueOnce([ALICE, bobSelected])
    apiMock.delete.mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteSelectedContacts()
    })

    expect(success).toBe(false)
    // State rolled back — Bob is still there
    expect(result.current.contacts).toHaveLength(2)
    expect(result.current.error).toMatch(/Failed to delete contacts/)
  })

  it('returns false and sets error when no center is selected', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
      selectedCenter: null
    } as any)

    apiMock.getAll.mockResolvedValue([])
    const { result } = renderHook(() => useContacts())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteSelectedContacts()
    })

    expect(success).toBe(false)
    expect(result.current.error).toMatch(/No center selected/)
  })
})
