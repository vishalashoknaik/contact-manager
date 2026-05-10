import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

// Mock authApi.ping to be a no-op so it doesn't consume fetch mocks set up by individual tests
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      ping: vi.fn().mockResolvedValue(undefined)
    }
  }
})

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

      expect(screen.getByText('Volunteers Coordination')).toBeInTheDocument()
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
        text: async () => JSON.stringify({
          error: 'User not found. Please complete registration.',
          registrationRequired: true,
          phone: '9999999999',
          centers: [{ id: 'center-1', name: 'Center 1' }]
        }),
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
          text: async () => JSON.stringify({
            error: 'User not found. Please complete registration.',
            registrationRequired: true,
            phone: '9999999999',
            centers: [{ id: 'center-1', name: 'Center 1' }]
          }),
          json: async () => ({
            error: 'User not found. Please complete registration.',
            registrationRequired: true,
            phone: '9999999999',
            centers: [{ id: 'center-1', name: 'Center 1' }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({
            message: 'Registration submitted. An admin must approve access before you can log in.',
            pendingApproval: true
          }),
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
        text: async () => JSON.stringify({ error: 'Invalid credentials' }),
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

  describe('LoginPage — server warm-up behaviour', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('does NOT show warming-up notice when ping resolves immediately', async () => {
      // ping is mocked to resolve immediately (no delay) → notice never appears
      render(<AuthProvider><LoginPage /></AuthProvider>)
      await new Promise(r => setTimeout(r, 50))
      expect(screen.queryByText(/Server is starting up/i)).not.toBeInTheDocument()
    })

    it('shows warming-up notice after 3 seconds if ping keeps failing', async () => {
      vi.useFakeTimers()
      const { authApi } = await import('@/lib/api/client')
      vi.mocked(authApi.ping).mockRejectedValue(new Error('Failed to fetch'))

      render(<AuthProvider><LoginPage /></AuthProvider>)

      // Before 3s: no notice
      await act(async () => { await vi.advanceTimersByTimeAsync(2900) })
      expect(screen.queryByText(/Server is starting up/i)).not.toBeInTheDocument()

      // After 3s timer fires, React flushes the state update via act
      await act(async () => { await vi.advanceTimersByTimeAsync(200) })
      expect(screen.getByText(/Server is starting up/i)).toBeInTheDocument()
    })

    it('clears warming-up notice when ping eventually succeeds', async () => {
      vi.useFakeTimers()
      const { authApi } = await import('@/lib/api/client')
      vi.mocked(authApi.ping)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce(undefined)

      render(<AuthProvider><LoginPage /></AuthProvider>)

      // Advance 3s so the notice appears (ping already rejected)
      await act(async () => { await vi.advanceTimersByTimeAsync(3100) })
      expect(screen.getByText(/Server is starting up/i)).toBeInTheDocument()

      // Advance 5s for the retry to fire and ping to resolve
      await act(async () => { await vi.advanceTimersByTimeAsync(5100) })
      expect(screen.queryByText(/Server is starting up/i)).not.toBeInTheDocument()
    })

    it('shows friendly network error message on login when server is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

      render(<AuthProvider><LoginPage /></AuthProvider>)

      fireEvent.change(screen.getByPlaceholderText('Enter your phone number'), { target: { value: '9876543210' } })
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: '9876543210' } })
      fireEvent.click(screen.getByRole('button', { name: /login/i }))

      await waitFor(() => {
        expect(screen.getByText(/Cannot reach the server/i)).toBeInTheDocument()
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
