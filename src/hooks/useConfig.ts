'use client'

import { useState, useEffect } from 'react'
import { StorageService } from '@/lib/services/StorageService'

/**
 * useConfig Hook
 * Manages configuration state (activities, areas, programs)
 */
export function useConfig() {
  const [activities, setActivities] = useState<string[]>(['Walkathon'])
  const [areas, setAreas] = useState<string[]>(['Area1'])
  const [programs, setPrograms] = useState<string[]>(['Program1'])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from storage on mount
  useEffect(() => {
    const a = StorageService.getActivities()
    const ar = StorageService.getAreas()
    const p = StorageService.getPrograms()

    if (a) setActivities(a)
    if (ar) setAreas(ar)
    if (p) setPrograms(p)

    setIsLoaded(true)
  }, [])

  // Persist to storage
  useEffect(() => {
    if (isLoaded) {
      StorageService.saveActivities(activities)
    }
  }, [activities, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      StorageService.saveAreas(areas)
    }
  }, [areas, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      StorageService.savePrograms(programs)
    }
  }, [programs, isLoaded])

  return {
    activities,
    setActivities,
    areas,
    setAreas,
    programs,
    setPrograms,
    isLoaded
  }
}
