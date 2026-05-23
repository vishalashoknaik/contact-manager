import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api/client'
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
  const [serverWakingUp, setServerWakingUp] = useState(false)
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)
  const router = useRouter()
  const { login, register, isLoading } = useAuth()

  // Pre-warm the backend and track whether it's actually reachable.
  // Shows a "starting up" notice only while the server is cold, clears it
  // the moment any HTTP response is received (even 4xx = server is running).
  useEffect(() => {
    cancelledRef.current = false

    const checkServer = async () => {
      try {
        await authApi.ping()
        // Server responded — clear any warning immediately
        if (!cancelledRef.current) {
          setServerWakingUp(false)
          if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
        }
      } catch {
        if (cancelledRef.current) return
        // Network-level failure: server not yet up. Show notice after 3s.
        if (!wakeTimerRef.current) {
          wakeTimerRef.current = setTimeout(() => {
            if (!cancelledRef.current) setServerWakingUp(true)
          }, 3000)
        }
        // Retry in 5s
        retryTimerRef.current = setTimeout(() => {
          if (!cancelledRef.current) checkServer()
        }, 5000)
      }
    }

    checkServer()

    return () => {
      cancelledRef.current = true
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

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
    setServerWakingUp(false)
    cancelledRef.current = true
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)

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
    padding: '10px 12px',
    border: '1.5px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box' as const,
    backgroundColor: '#ffffff',
    color: '#212529',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    outline: 'none'
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #111827 0%, #1a2438 45%, #1e3554 100%)',
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: 'clamp(28px, 5vw, 48px)',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '420px'
        }}
      >
        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: '#1a2438',
            fontSize: 28,
            marginBottom: 14,
            boxShadow: '0 4px 16px rgba(26,36,56,0.4)'
          }}>
            🌿
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a2438', letterSpacing: '-0.02em' }}>
            Volunteers Coordination
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6c757d' }}>Sign in to your account</p>
        </div>

        <form onSubmit={registrationRequired ? handleRegister : handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: 13,
                color: '#495057',
                letterSpacing: '0.01em'
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
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: 13,
                color: '#495057',
                letterSpacing: '0.01em'
              }}
            >
              Password
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
            <p style={{ marginTop: '6px', fontSize: '12px', color: '#adb5bd' }}>
              Demo: phone 9876543210, password 9876543210
            </p>
          </div>

          {registrationRequired && (
            <>
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '18px',
                  fontSize: '13px'
                }}
              >
                First-time login detected. Complete registration with your name and center.
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#495057',
                    letterSpacing: '0.01em'
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

              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#495057',
                    letterSpacing: '0.01em'
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

          {serverWakingUp && !error && (
            <div
              style={{
                backgroundColor: '#fefce8',
                border: '1px solid #fde68a',
                color: '#92400e',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px'
              }}
            >
              ⏳ Server is starting up after a period of inactivity. This can take up to 30 seconds.
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px'
              }}
            >
              {error}
              {(error.toLowerCase().includes('login failed') || error.toLowerCase().includes('server') || error.toLowerCase().includes('cannot reach')) && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#7f1d1d' }}>
                  Wait 20–30 seconds and try again — the server may still be starting up.
                </p>
              )}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px'
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
              padding: '13px 16px',
              backgroundColor: registrationRequired ? '#0d6efd' : '#1a2438',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              letterSpacing: '0.01em',
              transition: 'opacity 0.15s'
            }}
          >
            {isLoading ? 'Working...' : registrationRequired ? 'Complete Registration' : 'Login'}
          </button>
        </form>

        <div
          style={{
            marginTop: '28px',
            padding: '14px 16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            fontSize: '12px',
            color: '#6c757d'
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#495057', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Credentials:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px' }}>
            <span style={{ color: '#495057', fontWeight: 500 }}>Manager Center 1:</span>
            <span style={{ fontFamily: 'monospace' }}>9876543210</span>
            <span style={{ color: '#495057', fontWeight: 500 }}>Admin (All Centers):</span>
            <span style={{ fontFamily: 'monospace' }}>8765432109</span>
          </div>
        </div>
      </div>
    </div>
  )
}
