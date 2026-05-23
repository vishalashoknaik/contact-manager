/**
 * API Client
 * Handles all communication with the backend server
 */

import type {
  CenterRole,
  LoginResponse,
  ManagedUser,
  PendingApprovalResponse,
  RegisterRequest,
  RegistrationSubmittedResponse,
  RegistrationRequiredResponse,
  CenterOption
} from '@/lib/types/auth'

const PROD_API_BASE_URL = 'https://isha-contacts-manager.onrender.com/api'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? PROD_API_BASE_URL
    : 'http://localhost:3001/api')

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
    const bodyText = await response.text().catch(() => '')

    let parsedError: { error?: string } & Partial<RegistrationRequiredResponse & PendingApprovalResponse> = {
      error: response.statusText
    }

    if (bodyText) {
      try {
        const body = JSON.parse(bodyText) as { error?: string } &
          Partial<RegistrationRequiredResponse & PendingApprovalResponse>
        parsedError = body
      } catch {
        parsedError = { error: bodyText.slice(0, 300) }
      }
    }

    const enrichedError = new Error(parsedError.error || `HTTP ${response.status}`) as Error &
      Partial<RegistrationRequiredResponse & PendingApprovalResponse>
    Object.assign(enrichedError, parsedError)
    throw enrichedError
  }
  return response.json()
}

/**
 * Auth API
 */
export const authApi = {
  /**
   * Ping the backend health endpoint.
   * Resolves (any HTTP status) when the server is up.
   * Rejects only on a network-level failure (server not yet awake).
   */
  ping: async () => {
    await fetch(`${API_BASE_URL}/health`, { method: 'GET' })
    // Any HTTP response — even 4xx/5xx — means the server is running.
    // Only a network error (fetch rejects) means the server is not up yet.
  },

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
      centerRole?: CenterRole
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
      interests?: Record<string, number>
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
    data: Partial<{
      selected: boolean
      importOrder?: number
      name: string
      phone: string
      gender: 'Male' | 'Female' | 'Other'
      ieDate: string
      areaOfStay: string
      remarks: string
    }>,
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
 * Interests API
 */
export const interestsApi = {
  getAll: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/interests`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  },

  create: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/interests`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ name })
    })
    return handleResponse(response)
  },

  delete: async (name: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/interests/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse(response)
  }
}

/**
 * Attendance API
 */
export const attendanceApi = {
  listSessions: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<AttendanceSession[]>(response)
  },

  getActiveSession: async (centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/active`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<{ active: false } | { active: true; session: AttendanceSession }>(response)
  },

  startSession: async (
    data: { name: string; activities?: string[]; areas?: string[]; programs?: string[] },
    centerId?: string
  ) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/start`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify(data)
    })
    return handleResponse<AttendanceSession>(response)
  },

  addSessionVolunteer: async (sessionId: string, volunteerPhone: string, centerId?: string, volunteerName?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/${encodeURIComponent(sessionId)}/volunteers`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ volunteerPhone, volunteerName })
    })
    return handleResponse<AttendanceSession>(response)
  },

  endSession: async (sessionId: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/${encodeURIComponent(sessionId)}/end`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<{ success: true }>(response)
  },

  reopenSession: async (sessionId: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/${encodeURIComponent(sessionId)}/reopen`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<AttendanceSession>(response)
  },

  deleteSession: async (sessionId: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<{ success: true }>(response)
  },

  listSessionAttendees: async (sessionId: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/sessions/${encodeURIComponent(sessionId)}/attendees`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<AttendanceSessionAttendee[]>(response)
  },

  lookup: async (phone: string, centerId?: string) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(
      `${API_BASE_URL}/attendance/lookup?phone=${encodeURIComponent(phone)}`,
      { headers: getHeaders(resolvedCenterId) }
    )
    return handleResponse<
      | { found: false }
      | { found: true; contact: { id: string; name: string; phone: string; gender: string; ieDate: string; areaOfStay: string } }
    >(response)
  },

  submit: async (
    data: {
      name: string
      phone: string
      gender?: string
      ieDate?: string
      areaOfStay?: string
      activities?: string[]
      areas?: string[]
      programs?: string[]
      sessionId?: string
    },
    centerId?: string
  ) => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/attendance/submit`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify(data)
    })
    return handleResponse<{ success: true; contactId: string }>(response)
  }
}

export interface AttendanceSession {
  id: string
  name: string
  centerId: string
  activities: string[]
  areas: string[]
  programs: string[]
  createdAt: string
  endedAt: string | null
  attendanceTakerCount?: number
  attendeeCount?: number
  volunteers: Array<{ phone: string; name: string }>
}

export interface AttendanceSessionAttendee {
  id: string
  name: string
  phone: string
  submittedAt: string
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

// ---- Campaign types ----

export interface CampaignContact {
  campaignContactId: string
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED'
  contact: { id: string; name: string; phone: string }
}

export interface CampaignVolunteer {
  phone: string
  name: string
}

export interface Campaign {
  id: string
  name: string
  centerId: string
  createdAt: string
  messageTemplates: Array<{ name: string; smsContent: string; whatsappContent: string }> | null
  totalContacts: number
  pendingContacts: number
  completedContacts: number
  skippedContacts: number
  contacts: CampaignContact[]
  volunteers: CampaignVolunteer[]
}

export interface CallLog {
  id: string
  campaignContactId: string
  calledAt: string
  volunteerPhone: string
  contact: { id: string; name: string; phone: string }
  status: 'COMPLETED' | 'SKIPPED'
  feedback: 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'
  centerChange: boolean
  doNotDisturb: boolean
  notInterestedToVolunteer: boolean
  remarks: string | null
}

export type NextContactResult =
  | { done: true }
  | {
      done: false
      campaignContactId: string
      contact: { id: string; name: string; phone: string }
    }

export interface CallLogSubmit {
  campaignContactId: string
  feedback: 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'
  centerChange?: boolean
  doNotDisturb?: boolean
  notInterestedToVolunteer?: boolean
  remarks?: string
  action: 'submit' | 'skip'
  mode?: 'pending' | 'skipped'
}

/**
 * Campaigns API
 */
export const campaignsApi = {
  create: async (name: string, contactIds: string[], centerId?: string): Promise<Campaign> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ name, contactIds })
    })
    return handleResponse<Campaign>(response)
  },

  getAll: async (centerId?: string): Promise<Campaign[]> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<Campaign[]>(response)
  },

  getById: async (id: string, centerId?: string): Promise<Campaign> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<Campaign>(response)
  },

  addContacts: async (id: string, contactIds: string[], centerId?: string): Promise<Campaign> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/contacts`, {
      method: 'PUT',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ contactIds })
    })
    return handleResponse<Campaign>(response)
  },

  setVolunteers: async (id: string, volunteerPhones: string[], centerId?: string, newVolunteerDetails?: { phone: string; name: string }[]): Promise<Campaign> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/volunteers`, {
      method: 'PUT',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ volunteerPhones, newVolunteerDetails })
    })
    return handleResponse<Campaign>(response)
  },

  getNextContact: async (id: string, centerId?: string, mode?: 'pending' | 'skipped'): Promise<NextContactResult> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const url = `${API_BASE_URL}/campaigns/${id}/next-contact${mode ? `?mode=${mode}` : ''}`
    const response = await fetch(url, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<NextContactResult>(response)
  },

  submitCallLog: async (
    id: string,
    data: CallLogSubmit,
    centerId?: string
  ): Promise<{ success: boolean; next: NextContactResult }> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/call-log`, {
      method: 'POST',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  getCallLogs: async (id: string, centerId?: string): Promise<CallLog[]> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/call-logs`, {
      headers: getHeaders(resolvedCenterId)
    })
    return handleResponse<CallLog[]>(response)
  },

  updateTemplates: async (
    id: string,
    messageTemplates: Array<{ name: string; smsContent: string; whatsappContent: string }>,
    centerId?: string
  ): Promise<Campaign> => {
    const resolvedCenterId = resolveCenterId(centerId)
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/templates`, {
      method: 'PATCH',
      headers: getHeaders(resolvedCenterId),
      body: JSON.stringify({ messageTemplates })
    })
    return handleResponse<Campaign>(response)
  }
}
