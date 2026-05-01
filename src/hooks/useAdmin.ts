'use client'

import { useState } from 'react'

type AdminView = 'access' | 'settings'

/**
 * useAdmin Hook
 * Manages admin mode state
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeView, setActiveView] = useState<AdminView>('access')

  const toggleAdmin = () => {
    setIsAdmin(prev => !prev)
  }

  const openAccessView = () => {
    setActiveView('access')
  }

  const openSettingsView = () => {
    setActiveView('settings')
  }

  return {
    isAdmin,
    setIsAdmin,
    toggleAdmin,
    activeView,
    setActiveView,
    openAccessView,
    openSettingsView
  }
}
