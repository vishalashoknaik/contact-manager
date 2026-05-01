'use client'

import { createContext, createElement, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '@/lib/api/client'
import type {
  AuthUser,
  CenterOption,
  LoginResponse,
  RegisterRequest,
  RegistrationRequiredResponse
} from '@/lib/types/auth'

interface LoginResult {
  requiresRegistration: boolean
  availableCenters?: CenterOption[]
}

interface AuthContextType {
  user: AuthUser | null
  isLoggedIn: boolean
  isLoading: boolean
  selectedCenter: string | null
  selectedCenterDetails: AuthUser['centerDetails'][number] | null
  canAccessSelectedCenterAdminMode: boolean
  canManageSelectedCenterAccess: boolean
  canManageSelectedCenterConfig: boolean
  canViewSelectedCenterContacts: boolean
  login: (phone: string, password: string) => Promise<LoginResult>
  register: (data: RegisterRequest) => Promise<string>
  logout: () => void
  selectCenter: (centerId: string) => void
  refreshUser: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function resolveCenterCapabilities(centerDetails: unknown) {
  const details = centerDetails as {
    capabilities?: {
      canManageAccess?: boolean
      canManageCenterConfig?: boolean
      canViewContacts?: boolean
      canTakeAttendance?: boolean
      grantableRoles?: Array<'ADMIN' | 'USER' | 'ATTENDANCE_TAKER'>
    }
    isAdmin?: boolean
  }

  if (details?.capabilities) {
    return {
      canManageAccess: details.capabilities.canManageAccess ?? true,
      canManageCenterConfig: details.capabilities.canManageCenterConfig ?? !!details.isAdmin,
      canViewContacts: details.capabilities.canViewContacts ?? true,
      canTakeAttendance: details.capabilities.canTakeAttendance ?? true,
      grantableRoles:
        details.capabilities.grantableRoles ||
        (details.isAdmin ? ['ADMIN', 'USER', 'ATTENDANCE_TAKER'] : ['USER', 'ATTENDANCE_TAKER'])
    }
  }

  return {
    canManageAccess: true,
    canManageCenterConfig: !!details?.isAdmin,
    canViewContacts: true,
    canTakeAttendance: true,
    grantableRoles: details?.isAdmin ? ['ADMIN', 'USER', 'ATTENDANCE_TAKER'] : ['USER', 'ATTENDANCE_TAKER']
  }
}

function syncPersistedUser(
  nextUser: AuthUser,
  setUser: (user: AuthUser | null) => void,
  setSelectedCenterState: (centerId: string | null) => void,
  preferredCenterId?: string | null
) {
  setUser(nextUser)
  localStorage.setItem('auth_user', JSON.stringify(nextUser))

  const nextCenter =
    preferredCenterId && nextUser.centers.includes(preferredCenterId)
      ? preferredCenterId
      : nextUser.centers[0] || null

  setSelectedCenterState(nextCenter)
  if (nextCenter) {
    localStorage.setItem('selected_center', nextCenter)
  } else {
    localStorage.removeItem('selected_center')
  }
}

function persistAuth(
  data: LoginResponse,
  setUser: (user: AuthUser | null) => void,
  setSelectedCenterState: (centerId: string | null) => void,
  preferredCenterId?: string | null
) {
  localStorage.setItem('auth_token', data.token)
  syncPersistedUser(data.user, setUser, setSelectedCenterState, preferredCenterId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [selectedCenter, setSelectedCenterState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user')
    const storedToken = localStorage.getItem('auth_token')
    const storedCenter = localStorage.getItem('selected_center')

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser
        setUser(parsedUser)
        if (storedCenter && parsedUser.centers.includes(storedCenter)) {
          setSelectedCenterState(storedCenter)
        } else if (parsedUser.centers.length > 0) {
          setSelectedCenterState(parsedUser.centers[0])
          localStorage.setItem('selected_center', parsedUser.centers[0])
        }
      } catch {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('selected_center')
      }
    }
  }, [])

  const login = async (phone: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await authApi.login(phone, password)
      persistAuth(data, setUser, setSelectedCenterState)
      return { requiresRegistration: false }
    } catch (err) {
      const registrationError = err as Error & Partial<RegistrationRequiredResponse>
      if (registrationError.registrationRequired) {
        return {
          requiresRegistration: true,
          availableCenters: registrationError.centers || []
        }
      }

      setError(registrationError.message || 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.register(data)
      return response.message
    } catch (err) {
      const registrationError = err as Error
      setError(registrationError.message || 'Registration failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setSelectedCenterState(null)
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('selected_center')
  }

  const selectCenter = (centerId: string) => {
    if (user?.canAccessAllCenters || user?.centers.includes(centerId)) {
      setSelectedCenterState(centerId)
      localStorage.setItem('selected_center', centerId)
    }
  }

  const refreshUser = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const nextUser = await authApi.getMe()
      syncPersistedUser(nextUser as AuthUser, setUser, setSelectedCenterState, selectedCenter)
    } catch (err) {
      const refreshError = err as Error
      setError(refreshError.message || 'Failed to refresh user')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCenterDetails = user?.centerDetails.find(center => center.id === selectedCenter) || null
  const selectedCenterCapabilities = resolveCenterCapabilities(selectedCenterDetails)

  const canAccessSelectedCenterAdminMode = !!user && !!selectedCenterDetails
  const canManageSelectedCenterAccess =
    !!user &&
    !!selectedCenterDetails &&
    (user.canAccessAllCenters || selectedCenterCapabilities.canManageAccess)
  const canManageSelectedCenterConfig =
    !!user &&
    !!selectedCenterDetails &&
    (user.canAccessAllCenters || selectedCenterCapabilities.canManageCenterConfig)
  const canViewSelectedCenterContacts =
    !!user &&
    !!selectedCenterDetails &&
    (user.canAccessAllCenters || selectedCenterCapabilities.canViewContacts)

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isLoggedIn: !!user,
        isLoading,
        selectedCenter,
        selectedCenterDetails,
        canAccessSelectedCenterAdminMode,
        canManageSelectedCenterAccess,
        canManageSelectedCenterConfig,
        canViewSelectedCenterContacts,
        login,
        register,
        logout,
        selectCenter,
        refreshUser,
        error
      }
    },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
