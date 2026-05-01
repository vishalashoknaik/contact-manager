/**
 * Authentication Types
 */

export interface CenterOption {
  id: string
  name: string
}

export type CenterRole = 'ATTENDANCE_TAKER' | 'USER' | 'ADMIN'

export interface CenterCapabilities {
  canManageAccess: boolean
  canManageCenterConfig: boolean
  canViewContacts: boolean
  canTakeAttendance: boolean
  grantableRoles: CenterRole[]
}

export interface CenterDetail extends CenterOption {
  role: CenterRole
  capabilities: CenterCapabilities
}

export interface AuthUser {
  phone: string
  name: string
  canAccessAllCenters: boolean
  centers: string[]
  centerDetails: CenterDetail[]
}

export interface LoginRequest {
  phone: string
  password: string
}

export interface LoginResponse {
  user: AuthUser
  token: string
}

export interface RegistrationSubmittedResponse {
  message: string
  pendingApproval: true
}

export interface PendingApprovalResponse {
  error: string
  pendingApproval: true
  centers?: CenterOption[]
}

export interface RegistrationRequiredResponse {
  error: string
  registrationRequired: true
  phone: string
  centers: CenterOption[]
}

export interface RegisterRequest {
  phone: string
  password: string
  name: string
  centerId: string
}

export interface ManagedUser {
  phone: string
  name: string
  centerId: string
  centerName: string
  centerRole: CenterRole
  canAccessAllCenters: boolean
  isApproved: boolean
  accessStatus: 'approved' | 'pending'
}

export interface CenterSelection {
  centerId: string
}
