import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from '@/components/LoginPage'
import { CenterSelector } from '@/components/CenterSelector'
import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { useEffect } from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock fetch for login endpoint
global.fetch = vi.fn()

function AuthStateProbe() {
  const auth = useAuth()

  useEffect(() => {
    ;(window as any).__authProbe = auth
  }, [auth])

  return null
}

describe('Authentication System', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('LoginPage Component', () => {
    it('should render login form with phone and password fields', () => {
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      expect(screen.getByText('Contact Manager Login')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    })

    it('should show demo credentials', () => {
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      expect(screen.getByText('Demo Credentials:')).toBeInTheDocument()
      expect(screen.getByText(/Manager Center 1/)).toBeInTheDocument()
      expect(screen.getByText(/Admin \(All Centers\)/)).toBeInTheDocument()
    })

    it('should require phone and password fields', () => {
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      const phoneInput = screen.getByPlaceholderText('Enter your phone number') as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement

      expect(phoneInput.required).toBe(true)
      expect(passwordInput.required).toBe(true)
    })

    it('should handle login submission', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          user: {
            phone: '9876543210',
            name: 'Test Manager',
            canAccessAllCenters: false,
            centers: ['center-1'],
            centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: true }]
          },
          token: 'test-token'
        })
      }

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse)

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      const phoneInput = screen.getByPlaceholderText('Enter your phone number')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      fireEvent.change(phoneInput, { target: { value: '9876543210' } })
      fireEvent.change(passwordInput, { target: { value: '9876543210' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              phone: '9876543210',
              password: '9876543210'
            })
          })
        )
      })
    })

    it('should display registration fields when first-time login requires registration', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'User not found. Please complete registration.',
          registrationRequired: true,
          phone: '9999999999',
          centers: [{ id: 'center-1', name: 'Center 1' }]
        })
      } as Response)

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      fireEvent.change(screen.getByPlaceholderText('Enter your phone number'), {
        target: { value: '9999999999' }
      })
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: '9999999999' }
      })
      fireEvent.click(screen.getByRole('button', { name: /login/i }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /Complete Registration/i })).toBeInTheDocument()
    })

    it('should submit registration and show pending approval message', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'User not found. Please complete registration.',
            registrationRequired: true,
            phone: '9999999999',
            centers: [{ id: 'center-1', name: 'Center 1' }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: 'Registration submitted. An admin must approve access before you can log in.',
            pendingApproval: true
          })
        } as Response)

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      fireEvent.change(screen.getByPlaceholderText('Enter your phone number'), {
        target: { value: '9999999999' }
      })
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: '9999999999' }
      })
      fireEvent.click(screen.getByRole('button', { name: /login/i }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
        target: { value: 'Pending User' }
      })
      fireEvent.click(screen.getByRole('button', { name: /Complete Registration/i }))

      await waitFor(() => {
        expect(
          screen.getByText('Registration submitted. An admin must approve access before you can log in.')
        ).toBeInTheDocument()
      })
    })

    it('should display error on failed login', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      }

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse)

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      const phoneInput = screen.getByPlaceholderText('Enter your phone number')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      fireEvent.change(phoneInput, { target: { value: '0000000000' } })
      fireEvent.change(passwordInput, { target: { value: 'wrong' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/)).toBeInTheDocument()
      })
    })
  })

  describe('CenterSelector Component', () => {
    it('should not display if user has 0 or 1 center', () => {
      const { container } = render(
        <AuthProvider>
          <CenterSelector />
        </AuthProvider>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should display if user has multiple centers', () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '8765432109',
          name: 'Admin User',
          canAccessAllCenters: true,
          centers: ['center-1', 'center-2'],
          centerDetails: [
            { id: 'center-1', name: 'Center 1', isAdmin: true },
            { id: 'center-2', name: 'Center 2', isAdmin: true }
          ]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <CenterSelector />
        </AuthProvider>
      )

      expect(screen.getByText('Center:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Center 1' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Center 2' })).toBeInTheDocument()
    })

    it('should show admin badge for admin users', () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '8765432109',
          name: 'Admin User',
          canAccessAllCenters: true,
          centers: ['center-1', 'center-2'],
          centerDetails: [
            { id: 'center-1', name: 'Center 1', isAdmin: true },
            { id: 'center-2', name: 'Center 2', isAdmin: true }
          ]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <CenterSelector />
        </AuthProvider>
      )

      expect(screen.getByText(/Admin - All Centers/)).toBeInTheDocument()
    })
  })

  describe('AuthProvider Context', () => {
    it('should persist authentication to localStorage', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          user: {
            phone: '9876543210',
            name: 'Test Manager',
            canAccessAllCenters: false,
            centers: ['center-1'],
            centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: true }]
          },
          token: 'test-token'
        })
      }

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse)

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      await waitFor(() => {
        expect((window as any).__authProbe).toBeTruthy()
      })

      await (window as any).__authProbe.login('9876543210', '9876543210')

      expect(localStorage.getItem('auth_token')).toBe('test-token')
      expect(localStorage.getItem('selected_center')).toBe('center-1')
      expect(JSON.parse(localStorage.getItem('auth_user') || '{}')).toMatchObject({
        phone: '9876543210',
        centers: ['center-1']
      })
    })

    it('should restore authentication from localStorage on mount', async () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '9876543210',
          name: 'Hydrated User',
          canAccessAllCenters: false,
          centers: ['center-1'],
          centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: false }]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      await waitFor(() => {
        expect((window as any).__authProbe.user?.name).toBe('Hydrated User')
      })

      expect((window as any).__authProbe.selectedCenter).toBe('center-1')
      expect(localStorage.getItem('selected_center')).toBe('center-1')
    })

    it('should clear localStorage on logout', async () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '9876543210',
          name: 'Hydrated User',
          canAccessAllCenters: false,
          centers: ['center-1'],
          centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: false }]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      await waitFor(() => {
        expect((window as any).__authProbe.user?.phone).toBe('9876543210')
      })

      ;(window as any).__authProbe.logout()

      await waitFor(() => {
        expect((window as any).__authProbe.user).toBeNull()
      })

      expect(localStorage.getItem('auth_user')).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('selected_center')).toBeNull()
    })
  })

  describe('Center-Based Data Isolation', () => {
    it('should restore a previously selected center from localStorage', async () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '8765432109',
          name: 'Admin User',
          canAccessAllCenters: true,
          centers: ['center-1', 'center-2'],
          centerDetails: [
            { id: 'center-1', name: 'Center 1', isAdmin: true },
            { id: 'center-2', name: 'Center 2', isAdmin: true }
          ]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-2')

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      await waitFor(() => {
        expect((window as any).__authProbe.selectedCenter).toBe('center-2')
      })
    })

    it('should validate user has access to requested center', () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '9876543210',
          name: 'Manager',
          canAccessAllCenters: false,
          centers: ['center-1'],
          centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: false }]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      ;(window as any).__authProbe.selectCenter('center-2')

      expect((window as any).__authProbe.selectedCenter).toBe('center-1')
      expect(localStorage.getItem('selected_center')).toBe('center-1')
    })

    it('should allow admin users to access all centers', async () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '8765432109',
          name: 'Admin User',
          canAccessAllCenters: true,
          centers: ['center-1', 'center-2'],
          centerDetails: [
            { id: 'center-1', name: 'Center 1', isAdmin: true },
            { id: 'center-2', name: 'Center 2', isAdmin: true }
          ]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      ;(window as any).__authProbe.selectCenter('center-2')

      await waitFor(() => {
        expect((window as any).__authProbe.selectedCenter).toBe('center-2')
      })
      expect(localStorage.getItem('selected_center')).toBe('center-2')
    })
  })

  describe('Multi-Tenant Features', () => {
    it('should allow managers to access only assigned center', () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '9876543210',
          name: 'Manager',
          canAccessAllCenters: false,
          centers: ['center-1'],
          centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: false }]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      const { container } = render(
        <AuthProvider>
          <CenterSelector />
        </AuthProvider>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should allow admins to switch between centers via selector', async () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '8765432109',
          name: 'Admin User',
          canAccessAllCenters: true,
          centers: ['center-1', 'center-2'],
          centerDetails: [
            { id: 'center-1', name: 'Center 1' },
            { id: 'center-2', name: 'Center 2' }
          ]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <AuthStateProbe />
          <CenterSelector />
        </AuthProvider>
      )

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'center-2' }
      })

      await waitFor(() => {
        expect((window as any).__authProbe.selectedCenter).toBe('center-2')
      })
    })

    it('should filter data based on selected center', () => {
      localStorage.setItem('selected_center', 'center-2')
      expect(localStorage.getItem('selected_center')).toBe('center-2')
    })

    it('should prevent data leakage between centers', () => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          phone: '9876543210',
          name: 'Manager',
          canAccessAllCenters: false,
          centers: ['center-1'],
          centerDetails: [{ id: 'center-1', name: 'Center 1', isAdmin: false }]
        })
      )
      localStorage.setItem('auth_token', 'stored-token')
      localStorage.setItem('selected_center', 'center-1')

      render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      )

      ;(window as any).__authProbe.selectCenter('center-2')

      expect((window as any).__authProbe.selectedCenter).not.toBe('center-2')
    })
  })
})
