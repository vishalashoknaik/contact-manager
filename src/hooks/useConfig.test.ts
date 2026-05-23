import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConfig } from './useConfig'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isLoggedIn: true,
    isLoading: false,
    selectedCenter: 'center-1'
  }))
}))

vi.mock('@/lib/api/client', () => ({
  activitiesApi: {
    getAll: vi.fn(async () => ['Walkathon']),
    create: vi.fn(async () => {}),
    delete: vi.fn(async () => {})
  },
  areasApi: {
    getAll: vi.fn(async () => ['Area1']),
    create: vi.fn(async () => {}),
    delete: vi.fn(async () => {})
  },
  programsApi: {
    getAll: vi.fn(async () => ['Program1']),
    create: vi.fn(async () => {}),
    delete: vi.fn(async () => {})
  },
  interestsApi: {
    getAll: vi.fn(async () => []),
    create: vi.fn(async () => {}),
    delete: vi.fn(async () => {})
  }
}))

import { activitiesApi, areasApi, programsApi, interestsApi } from '@/lib/api/client'
import { useAuth } from '@/hooks/useAuth'

describe('useConfig', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
      selectedCenter: 'center-1'
    } as any)
    vi.mocked(activitiesApi.getAll).mockResolvedValue(['Walkathon'] as never)
    vi.mocked(areasApi.getAll).mockResolvedValue(['Area1'] as never)
    vi.mocked(programsApi.getAll).mockResolvedValue(['Program1'] as never)
    vi.mocked(interestsApi.getAll).mockResolvedValue([] as never)
  })

  it('loads activities, areas, programs from backend on mount', async () => {
    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.activities).toEqual(['Walkathon'])
    expect(result.current.areas).toEqual(['Area1'])
    expect(result.current.programs).toEqual(['Program1'])
    expect(result.current.useBackend).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('sets error and disables backend when load fails', async () => {
    vi.mocked(activitiesApi.getAll).mockRejectedValueOnce(new Error('Connection refused'))

    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.useBackend).toBe(false)
    expect(result.current.error).toMatch(/Backend unavailable/)
    // Returns empty arrays on failure so the UI shows "not configured" rather than fake defaults
    expect(result.current.activities).toEqual([])
    expect(result.current.areas).toEqual([])
    expect(result.current.programs).toEqual([])
  })

  it('setActivities calls create for newly added items', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setActivities(['Walkathon', 'Prayer'])
    })

    expect(activitiesApi.create).toHaveBeenCalledWith('Prayer', 'center-1')
    expect(activitiesApi.delete).not.toHaveBeenCalled()
    expect(result.current.activities).toEqual(['Walkathon', 'Prayer'])
  })

  it('setActivities calls delete for removed items', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setActivities([])
    })

    expect(activitiesApi.delete).toHaveBeenCalledWith('Walkathon', 'center-1')
    expect(activitiesApi.create).not.toHaveBeenCalled()
    expect(result.current.activities).toEqual([])
  })

  it('setActivities handles add and remove simultaneously', async () => {
    vi.mocked(activitiesApi.getAll).mockResolvedValue(['Walkathon', 'OldEvent'] as never)
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setActivities(['Walkathon', 'NewEvent'])
    })

    expect(activitiesApi.create).toHaveBeenCalledWith('NewEvent', 'center-1')
    expect(activitiesApi.delete).toHaveBeenCalledWith('OldEvent', 'center-1')
    expect(result.current.activities).toEqual(['Walkathon', 'NewEvent'])
  })

  it('setAreas calls create for newly added areas', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setAreas(['Area1', 'Area2'])
    })

    expect(areasApi.create).toHaveBeenCalledWith('Area2', 'center-1')
    expect(areasApi.delete).not.toHaveBeenCalled()
  })

  it('setAreas calls delete for removed areas', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setAreas([])
    })

    expect(areasApi.delete).toHaveBeenCalledWith('Area1', 'center-1')
  })

  it('setPrograms calls create for newly added programs', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setPrograms(['Program1', 'Program2'])
    })

    expect(programsApi.create).toHaveBeenCalledWith('Program2', 'center-1')
    expect(programsApi.delete).not.toHaveBeenCalled()
  })

  it('setPrograms calls delete for removed programs', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setPrograms([])
    })

    expect(programsApi.delete).toHaveBeenCalledWith('Program1', 'center-1')
  })

  it('setActivities sets error when backend sync fails', async () => {
    vi.mocked(activitiesApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setActivities(['Walkathon', 'NewEvent'])
    })

    expect(result.current.error).toMatch(/Failed to save activities/)
  })

  it('setActivities does not call API when backend is unavailable', async () => {
    vi.mocked(activitiesApi.getAll).mockRejectedValueOnce(new Error('down'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.useBackend).toBe(false)

    await act(async () => {
      await result.current.setActivities(['Walkathon', 'Prayer'])
    })

    expect(activitiesApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/Backend unavailable/)
  })

  it('does not load config when no center is selected', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
      selectedCenter: null
    } as any)

    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(activitiesApi.getAll).not.toHaveBeenCalled()
    expect(areasApi.getAll).not.toHaveBeenCalled()
    expect(programsApi.getAll).not.toHaveBeenCalled()
    expect(result.current.useBackend).toBe(false)
    expect(result.current.error).toMatch(/No center selected/)
  })

  it('setAreas sets error when no center is selected', async () => {
    vi.mocked(useAuth).mockReturnValue({ isLoggedIn: true, isLoading: false, selectedCenter: null } as any)

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setAreas(['NewArea'])
    })

    expect(areasApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/No center selected/)
  })

  it('setAreas sets error when backend is unavailable', async () => {
    vi.mocked(activitiesApi.getAll).mockRejectedValueOnce(new Error('down'))
    vi.mocked(areasApi.getAll).mockRejectedValueOnce(new Error('down'))
    vi.mocked(programsApi.getAll).mockRejectedValueOnce(new Error('down'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.useBackend).toBe(false)

    await act(async () => {
      await result.current.setAreas(['NewArea'])
    })

    expect(areasApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/Backend unavailable/)
  })

  it('setAreas sets error when backend sync throws', async () => {
    vi.mocked(areasApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setAreas(['Area1', 'NewArea'])
    })

    expect(result.current.error).toMatch(/Failed to save areas/)
  })

  it('setPrograms sets error when no center is selected', async () => {
    vi.mocked(useAuth).mockReturnValue({ isLoggedIn: true, isLoading: false, selectedCenter: null } as any)

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setPrograms(['NewProgram'])
    })

    expect(programsApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/No center selected/)
  })

  it('setPrograms sets error when backend is unavailable', async () => {
    vi.mocked(activitiesApi.getAll).mockRejectedValueOnce(new Error('down'))
    vi.mocked(areasApi.getAll).mockRejectedValueOnce(new Error('down'))
    vi.mocked(programsApi.getAll).mockRejectedValueOnce(new Error('down'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.useBackend).toBe(false)

    await act(async () => {
      await result.current.setPrograms(['NewProgram'])
    })

    expect(programsApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/Backend unavailable/)
  })

  it('setPrograms sets error when backend sync throws', async () => {
    vi.mocked(programsApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setPrograms(['Program1', 'NewProgram'])
    })

    expect(result.current.error).toMatch(/Failed to save programs/)
  })

  it('setActivities sets error when no center is selected', async () => {
    vi.mocked(useAuth).mockReturnValue({ isLoggedIn: true, isLoading: false, selectedCenter: null } as any)

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setActivities(['NewActivity'])
    })

    expect(activitiesApi.create).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/No center selected/)
  })

  it('reloads config when selectedCenter changes', async () => {
    vi.mocked(activitiesApi.getAll)
      .mockResolvedValueOnce(['Walkathon'] as never)
      .mockResolvedValueOnce(['Prayer'] as never)
    vi.mocked(areasApi.getAll)
      .mockResolvedValueOnce(['Area1'] as never)
      .mockResolvedValueOnce(['Area2'] as never)
    vi.mocked(programsApi.getAll)
      .mockResolvedValueOnce(['Program1'] as never)
      .mockResolvedValueOnce(['Program2'] as never)

    const { result, rerender } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.activities).toEqual(['Walkathon'])

    vi.mocked(useAuth).mockReturnValue({ isLoggedIn: true, isLoading: false, selectedCenter: 'center-2' } as any)
    rerender()

    await waitFor(() => expect(result.current.activities).toEqual(['Prayer']))
    expect(result.current.areas).toEqual(['Area2'])
    expect(result.current.programs).toEqual(['Program2'])
  })

  // ─── Data integrity: no optimistic updates ─────────────────────────────────

  it('setActivities does NOT update local state when backend save fails', async () => {
    vi.mocked(activitiesApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.activities).toEqual(['Walkathon'])

    await act(async () => {
      await result.current.setActivities(['Walkathon', 'NewEvent'])
    })

    // State must NOT change — backend failed, changes not persisted
    expect(result.current.activities).toEqual(['Walkathon'])
    expect(result.current.error).toMatch(/Failed to save activities/)
  })

  it('setAreas does NOT update local state when backend save fails', async () => {
    vi.mocked(areasApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.areas).toEqual(['Area1'])

    await act(async () => {
      await result.current.setAreas(['Area1', 'NewArea'])
    })

    expect(result.current.areas).toEqual(['Area1'])
    expect(result.current.error).toMatch(/Failed to save areas/)
  })

  it('setPrograms does NOT update local state when backend save fails', async () => {
    vi.mocked(programsApi.create).mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.programs).toEqual(['Program1'])

    await act(async () => {
      await result.current.setPrograms(['Program1', 'NewProgram'])
    })

    expect(result.current.programs).toEqual(['Program1'])
    expect(result.current.error).toMatch(/Failed to save programs/)
  })

  it('setActivities does NOT update local state when backend is unavailable', async () => {
    vi.mocked(activitiesApi.getAll).mockRejectedValueOnce(new Error('down'))

    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    // State starts empty because load failed
    expect(result.current.activities).toEqual([])
    expect(result.current.useBackend).toBe(false)

    await act(async () => {
      await result.current.setActivities(['Walkathon'])
    })

    // Still empty — backend unavailable, nothing written
    expect(result.current.activities).toEqual([])
    expect(result.current.error).toMatch(/Backend unavailable/)
  })

  it('setActivities updates local state only after backend confirms', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setActivities(['Walkathon', 'Prayer'])
    })

    // Backend succeeded → state IS updated
    expect(result.current.activities).toEqual(['Walkathon', 'Prayer'])
    expect(result.current.error).toBeNull()
  })

  it('loads interests from backend on mount', async () => {
    vi.mocked(interestsApi.getAll).mockResolvedValue(['Yoga', 'Meditation'] as never)
    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.interests).toEqual(['Yoga', 'Meditation'])
  })

  it('interests defaults to empty array when interestsApi fails', async () => {
    vi.mocked(interestsApi.getAll).mockRejectedValue(new Error('not implemented') as never)
    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    // Activities/areas/programs still load fine
    expect(result.current.activities).toEqual(['Walkathon'])
    expect(result.current.areas).toEqual(['Area1'])
    expect(result.current.programs).toEqual(['Program1'])
    // Interests silently fallback to []
    expect(result.current.interests).toEqual([])
  })

  it('setInterests calls interestsApi.create for new items and delete for removed', async () => {
    vi.mocked(interestsApi.getAll).mockResolvedValue(['Yoga'] as never)
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      await result.current.setInterests(['Yoga', 'Meditation'])
    })

    expect(vi.mocked(interestsApi.create)).toHaveBeenCalledWith('Meditation', 'center-1')
    expect(result.current.interests).toEqual(['Yoga', 'Meditation'])
  })
})

