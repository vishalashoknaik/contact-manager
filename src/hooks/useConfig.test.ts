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
  }
}))

import { activitiesApi, areasApi, programsApi } from '@/lib/api/client'
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
    // Falls back to hard-coded defaults
    expect(result.current.activities).toEqual(['Walkathon'])
    expect(result.current.areas).toEqual(['Area1'])
    expect(result.current.programs).toEqual(['Program1'])
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

    expect(result.current.error).toMatch(/Failed to sync activities/)
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
})
