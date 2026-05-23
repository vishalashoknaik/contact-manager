'use client'

import { useState } from 'react'

type AdminView = 'access' | 'settings'

/**
 * useAdmin Hook
 * Manages admin mode state and the child lock.
 *
 * Child lock is ON by default and resets to ON on every page reload.
 * When the lock is OFF, admin users can perform destructive bulk
 * operations such as deleting selected contacts.
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeView, setActiveView] = useState<AdminView>('access')
  /** true = locked (delete blocked). Resets to true on every reload. */
  const [childLock, setChildLock] = useState(true)

  const toggleAdmin = () => {
    setIsAdmin(prev => !prev)
  }

  const toggleChildLock = () => {
    setChildLock(prev => !prev)
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
    openSettingsView,
    childLock,
    toggleChildLock
  }
}
