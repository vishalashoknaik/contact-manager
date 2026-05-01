import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activitiesApi, areasApi, programsApi } from './client'

describe('api/client center-aware headers', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sends selected center and token for activities create', async () => {
    localStorage.setItem('selected_center', 'center-1')
    localStorage.setItem('auth_token', 'token-123')

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    await activitiesApi.create('Walkathon')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/activities'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Center-ID': 'center-1',
          Authorization: 'Bearer token-123'
        })
      })
    )
  })

  it('sends selected center for areas delete', async () => {
    localStorage.setItem('selected_center', 'center-2')

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    await areasApi.delete('Area1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/areas/Area1'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'X-Center-ID': 'center-2'
        })
      })
    )
  })

  it('sends selected center for programs list', async () => {
    localStorage.setItem('selected_center', 'center-3')

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => []
    } as Response)

    await programsApi.getAll()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/programs'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Center-ID': 'center-3'
        })
      })
    )
  })
})
