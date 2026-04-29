'use client'

import { useState } from 'react'

/**
 * useAdmin Hook
 * Manages admin mode state
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const toggleAdmin = () => {
    setIsAdmin(prev => !prev)
  }

  const toggleSettings = () => {
    setShowSettings(prev => !prev)
  }

  return {
    isAdmin,
    setIsAdmin,
    toggleAdmin,
    showSettings,
    setShowSettings,
    toggleSettings
  }
}
