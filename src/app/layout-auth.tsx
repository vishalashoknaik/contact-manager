'use client'

import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/components/LoginPage'
import { CenterSelector } from '@/components/CenterSelector'
import { ReactNode } from 'react'

function AppContent({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAuth()

  if (!isLoggedIn) {
    return <LoginPage />
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd'
        }}
      >
        <div style={{ fontSize: '14px', color: '#666' }}>
          Logged in as: <strong>{user?.name}</strong> ({user?.phone})
        </div>
        <button
          onClick={() => {
            // Access useAuth inside a component
            const { logout } = useAuth()
            logout()
            window.location.href = '/login'
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>
      <CenterSelector />
      {children}
    </div>
  )
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  )
}
