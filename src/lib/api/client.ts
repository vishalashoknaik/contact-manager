/**
 * API Client
 * Handles all communication with the backend server
 */

import type {
  LoginResponse,
  ManagedUser,
  PendingApprovalResponse,
  RegisterRequest,
  RegistrationSubmittedResponse,
  RegistrationRequiredResponse,
  CenterOption
} from '@/lib/types/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface ApiResponse<T> {
  data?: T
  error?: string
}

function getHeaders(centerId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (centerId) {
    headers['X-Center-ID'] = centerId
  }
  return headers
}

function resolveCenterId(centerId?: string) {
  if (centerId) return centerId
  if (typeof window === 'undefined') return undefined
  return localStorage.getItem('selected_center') || undefined
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    const enrichedError = new Error(error.error || `HTTP ${response.status}`) as Error &
      Partial<RegistrationRequiredResponse & PendingApprovalResponse>
    Object.assign(enrichedError, error)
    throw enrichedError
  }
  return response.json()
}

/**
 * Auth API
 */
export const authApi = {
  login: async (phone: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    })
    return handleResponse<LoginResponse>(response)
  },

  register: async (data: RegisterRequest) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse<RegistrationSubmittedResponse>(response)
  },

  getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders()
    })
    return handleResponse(response)
  },

  getUsers: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<ManagedUser[]>(response)
  },

  upsertUserAccess: async (
    phone: string,
    data: {
      name?: string
      centerId?: string
      isCenterAdmin?: boolean
      canAccessAllCenters?: boolean
    },
    centerId?: string
  ) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/auth/users/${encodeURIComponent(phone)}`, {
      method: 'PUT',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ ...data, centerId: resolvedCenterId })
    })
    return handleResponse<ManagedUser>(response)
  },

  removeUserAccess: async (phone: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/auth/users/${encodeURIComponent(phone)}`, {
      method: 'DELETE',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<{ success: true }>(response)
  }
}

/**
 * Centers API
 */
export const centersApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/centers`, {
      headers: getHeaders()
    })
    return handleResponse<CenterOption[]>(response)
  },

  create: async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/centers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    })
    return handleResponse<CenterOption>(response)
  },

  update: async (centerId: string, name: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/centers/${encodeURIComponent(centerId)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    })
    return handleResponse<CenterOption>(response)
  }
}

/**
 * Contacts API
 */
export const contactsApi = {
  getAll: async (centerId?: string) => {
    const response = await fetch(`${API_BASE_URL}/contacts`, {
      headers: getHeaders(centerId)
    })
    return handleResponse(response)
  },

  create: async (
    data: {
      name: string
      phone: string
      gender?: string
      ieDate?: string
      areaOfStay?: string
      remarks?: string
      activities?: Record<string, number>
      areas?: Record<string, number>
      programs?: Record<string, number>
      selected?: boolean
      importOrder?: number
    },
    centerId?: string
  ) => {
    const response = await fetch(`${API_BASE_URL}/contacts`, {
      method: 'POST',
      headers: getHeaders(centerId),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  update: async (
    id: string | number,
    data: Partial<{ selected: boolean; importOrder?: number }>,
    centerId?: string
  ) => {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'PATCH',
      headers: getHeaders(centerId),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  delete: async (id: string | number) => {
    const centerId = resolveCenterId()
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(centerId)
    })
    return handleResponse(response)
  }
}

/**
 * Activities API
 */
export const activitiesApi = {
  getAll: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/activities`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  },

  create: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/activities`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ name })
    })
    return handleResponse(response)
  },

  delete: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/activities/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  }
}

/**
 * Areas API
 */
export const areasApi = {
  getAll: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/areas`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  },

  create: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/areas`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ name })
    })
    return handleResponse(response)
  },

  delete: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/areas/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  }
}

/**
 * Programs API
 */
export const programsApi = {
  getAll: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/programs`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  },

  create: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/programs`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ name })
    })
    return handleResponse(response)
  },

  delete: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/programs/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  }
}

/**
 * Health check
 */
export const healthApi = {
  check: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      return response.ok
    } catch {
      return false
    }
  }
}
