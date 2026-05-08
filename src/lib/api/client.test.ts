import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activitiesApi, areasApi, programsApi, contactsApi, authApi, centersApi } from './client'

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

// ── handleResponse error behaviour ──────────────────────────────────────────
describe('api/client — handleResponse error handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('throws an error with parsed message when response is not ok (JSON body)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ error: 'Name and phone are required' })
    } as Response)

    await expect(contactsApi.getAll('center-1')).rejects.toThrow('Name and phone are required')
  })

  it('throws error with text body when JSON parse fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Plain text error'
    } as Response)

    await expect(contactsApi.getAll('center-1')).rejects.toThrow('Plain text error')
  })

  it('throws error with statusText when body is empty', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => ''
    } as Response)

    await expect(contactsApi.getAll('center-1')).rejects.toThrow('Not Found')
  })

  it('attaches registrationRequired flag to thrown error from login', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => JSON.stringify({
        error: 'User not found.',
        registrationRequired: true,
        phone: '9999999999',
        centers: [{ id: 'c1', name: 'Center 1' }]
      })
    } as Response)

    try {
      await authApi.login('9999999999', '9999999999')
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.registrationRequired).toBe(true)
      expect(err.phone).toBe('9999999999')
      expect(err.centers).toHaveLength(1)
    }
  })

  it('returns parsed JSON on successful response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'c-1', name: 'Alice' }]
    } as Response)

    const result = await contactsApi.getAll('center-1')
    expect(Array.isArray(result)).toBe(true)
  })
})

// ── contactsApi ──────────────────────────────────────────────────────────────
describe('api/client — contactsApi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('getAll sends X-Center-ID header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => []
    } as Response)

    await contactsApi.getAll('center-99')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/contacts'),
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Center-ID': 'center-99' }) })
    )
  })

  it('create sends POST with JSON body and center header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ success: true })
    } as Response)

    await contactsApi.create({ name: 'Alice', phone: '9876543210' }, 'center-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/contacts'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Center-ID': 'center-1' }),
        body: expect.stringContaining('Alice')
      })
    )
  })

  it('update sends PATCH to /contacts/:id with correct data', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ id: 'c-1', selected: true })
    } as Response)

    await contactsApi.update('c-1', { selected: true }, 'center-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/contacts/c-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"selected":true')
      })
    )
  })

  it('delete sends DELETE to /contacts/:id with center header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ success: true })
    } as Response)

    await contactsApi.delete('c-1', 'center-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/contacts/c-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('sends no X-Center-ID header when centerId not provided', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => []
    } as Response)

    await contactsApi.getAll()

    const calledHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(calledHeaders['X-Center-ID']).toBeUndefined()
  })
})

// ── authApi ──────────────────────────────────────────────────────────────────
describe('api/client — authApi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('login sends phone and password in POST body', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ token: 'abc', user: {} })
    } as Response)

    await authApi.login('9876543210', '9876543210')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"phone":"9876543210"')
      })
    )
  })

  it('getMe sends Authorization header from localStorage', async () => {
    localStorage.setItem('auth_token', 'mytoken')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ user: {} })
    } as Response)

    await authApi.getMe()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer mytoken' }) })
    )
  })

  it('getUsers sends GET with center header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => []
    } as Response)

    await authApi.getUsers('center-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/users'),
      expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ 'X-Center-ID': 'center-1' }) })
    )
  })

  it('upsertUserAccess sends PUT to /auth/users/:phone', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({})
    } as Response)

    await authApi.upsertUserAccess('9876543210', { centerRole: 'USER' }, 'center-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/users/9876543210'),
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('removeUserAccess sends DELETE to /auth/users/:phone', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ success: true })
    } as Response)

    await authApi.removeUserAccess('9876543210', 'center-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/users/9876543210'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('URL-encodes phone number with special characters in upsertUserAccess', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({})
    } as Response)

    await authApi.upsertUserAccess('+91 9876543210', { centerRole: 'USER' }, 'center-1')

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).not.toContain('+91 9876543210')
    expect(calledUrl).toContain(encodeURIComponent('+91 9876543210'))
  })
})

// ── centersApi ───────────────────────────────────────────────────────────────
describe('api/client — centersApi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('getAll sends GET to /auth/centers', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => []
    } as Response)

    await centersApi.getAll()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/centers'),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    )
  })

  it('create sends POST with center name', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ id: 'c-new', name: 'New Center' })
    } as Response)

    await centersApi.create('New Center')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/centers'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Center')
      })
    )
  })

  it('update sends PATCH to /auth/centers/:centerId', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ id: 'c-1', name: 'Updated Name' })
    } as Response)

    await centersApi.update('c-1', 'Updated Name')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/centers/c-1'),
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('Updated Name') })
    )
  })
})


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
