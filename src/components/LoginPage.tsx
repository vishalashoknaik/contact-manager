import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import type { CenterOption } from '@/lib/types/auth'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [centerId, setCenterId] = useState('')
  const [availableCenters, setAvailableCenters] = useState<CenterOption[]>([])
  const [registrationRequired, setRegistrationRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const { login, register, isLoading } = useAuth()

  const resetRegistrationState = () => {
    setRegistrationRequired(false)
    setAvailableCenters([])
    setName('')
    setCenterId('')
  }

  const resetMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    try {
      const result = await login(phone, password)
      if (result.requiresRegistration) {
        const centers = result.availableCenters || []
        setRegistrationRequired(true)
        setAvailableCenters(centers)
        setCenterId(currentCenterId => currentCenterId || centers[0]?.id || '')
        return
      }

      router.push('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    try {
      const message = await register({ phone, password, name, centerId })
      setSuccessMessage(message)
      setPhone('')
      setPassword('')
      resetRegistrationState()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box' as const,
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--background, #f5f5f5)'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #fff)',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '440px'
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--text-primary, #333)' }}>
          Contact Manager Login
        </h1>

        <form onSubmit={registrationRequired ? handleRegister : handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: 'var(--text-primary, #333)'
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value)
                resetMessages()
                resetRegistrationState()
              }}
              placeholder="Enter your phone number"
              disabled={isLoading}
              style={formStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: 'var(--text-primary, #333)'
              }}
            >
              Password (same as phone number)
            </label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                resetMessages()
                resetRegistrationState()
              }}
              placeholder="Enter your password"
              disabled={isLoading}
              style={formStyle}
              required
            />
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary, #666)' }}>
              Tip: Your password is the same as your phone number
            </p>
          </div>

          {registrationRequired && (
            <>
              <div
                style={{
                  backgroundColor: 'var(--panel-bg, #eef6ff)',
                  border: '1px solid var(--border-color, #cfe3ff)',
                  color: 'var(--text-primary, #1f4b7a)',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}
              >
                First-time login detected. Complete registration with your name and center.
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: 'var(--text-primary, #333)'
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isLoading}
                  style={formStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: 'var(--text-primary, #333)'
                  }}
                >
                  Center
                </label>
                <select
                  value={centerId}
                  onChange={e => setCenterId(e.target.value)}
                  disabled={isLoading}
                  style={formStyle}
                  required
                >
                  {availableCenters.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                backgroundColor: 'var(--panel-bg, #fee)',
                border: '1px solid var(--border-color, #fcc)',
                color: '#c33',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                backgroundColor: 'var(--panel-bg, #e9f7ef)',
                border: '1px solid var(--border-color, #badbcc)',
                color: '#146c43',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '20px'
              }}
            >
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: registrationRequired ? '#0d6efd' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Working...' : registrationRequired ? 'Complete Registration' : 'Login'}
          </button>
        </form>

        <div
          style={{
            marginTop: '30px',
            padding: '20px',
            backgroundColor: 'var(--panel-bg, #f9f9f9)',
            borderRadius: '4px',
            fontSize: '14px',
            color: 'var(--text-secondary, #666)'
          }}
        >
          <p>
            <strong>Demo Credentials:</strong>
          </p>
          <p>
            <strong>Manager Center 1:</strong> Phone: 9876543210, Password: 9876543210
          </p>
          <p>
            <strong>Admin (All Centers):</strong> Phone: 8765432109, Password: 8765432109
          </p>
        </div>
      </div>
    </div>
  )
}
