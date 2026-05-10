'use client'

import { useState, useEffect } from 'react'
import { activitiesApi, areasApi, programsApi } from '@/lib/api/client'
import { useAuth } from '@/hooks/useAuth'

/**
 * useConfig Hook
 * DB-first configuration state for activities, areas, and programs.
 */
export function useConfig() {
  const { isLoggedIn, isLoading: authLoading, selectedCenter } = useAuth()
  const [activities, setActivitiesState] = useState<string[]>([])
  const [areas, setAreasState] = useState<string[]>([])
  const [programs, setProgramsState] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [useBackend, setUseBackend] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      return
    }

    if (!selectedCenter) {
      setUseBackend(false)
      setError('No center selected. Config changes will not be persisted.')
      setIsLoaded(true)
      return
    }

    const loadConfig = async () => {
      try {
        const [apiActivities, apiAreas, apiPrograms] = await Promise.all([
          activitiesApi.getAll(selectedCenter),
          areasApi.getAll(selectedCenter),
          programsApi.getAll(selectedCenter)
        ])

        setActivitiesState(Array.isArray(apiActivities) ? apiActivities : [])
        setAreasState(Array.isArray(apiAreas) ? apiAreas : [])
        setProgramsState(Array.isArray(apiPrograms) ? apiPrograms : [])
        setUseBackend(true)
        setError(null)
      } catch (err) {
        console.warn('Backend unavailable for config:', err)
        setUseBackend(false)
        setError('Backend unavailable. Config changes will not be persisted.')
      } finally {
        setIsLoaded(true)
      }
    }

    setIsLoaded(false)
    loadConfig()
  }, [authLoading, isLoggedIn, selectedCenter])

  const setActivities = async (updated: string[]) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot update activities.')
      return
    }
    if (!useBackend) {
      setError('Backend unavailable. Configuration changes cannot be saved. Please check your connection and try again.')
      return
    }

    const previous = activities
    const added = updated.filter(item => !previous.includes(item))
    const removed = previous.filter(item => !updated.includes(item))

    try {
      await Promise.all([
        ...added.map(item => activitiesApi.create(item, selectedCenter)),
        ...removed.map(item => activitiesApi.delete(item, selectedCenter))
      ])
      setActivitiesState(updated)
      setError(null)
    } catch (err) {
      console.error('Failed to sync activities:', err)
      setError('Failed to save activities. Changes were not applied.')
    }
  }

  const setAreas = async (updated: string[]) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot update areas.')
      return
    }
    if (!useBackend) {
      setError('Backend unavailable. Configuration changes cannot be saved. Please check your connection and try again.')
      return
    }

    const previous = areas
    const added = updated.filter(item => !previous.includes(item))
    const removed = previous.filter(item => !updated.includes(item))

    try {
      await Promise.all([
        ...added.map(item => areasApi.create(item, selectedCenter)),
        ...removed.map(item => areasApi.delete(item, selectedCenter))
      ])
      setAreasState(updated)
      setError(null)
    } catch (err) {
      console.error('Failed to sync areas:', err)
      setError('Failed to save areas. Changes were not applied.')
    }
  }

  const setPrograms = async (updated: string[]) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot update programs.')
      return
    }
    if (!useBackend) {
      setError('Backend unavailable. Configuration changes cannot be saved. Please check your connection and try again.')
      return
    }

    const previous = programs
    const added = updated.filter(item => !previous.includes(item))
    const removed = previous.filter(item => !updated.includes(item))

    try {
      await Promise.all([
        ...added.map(item => programsApi.create(item, selectedCenter)),
        ...removed.map(item => programsApi.delete(item, selectedCenter))
      ])
      setProgramsState(updated)
      setError(null)
    } catch (err) {
      console.error('Failed to sync programs:', err)
      setError('Failed to save programs. Changes were not applied.')
    }
  }

  return {
    activities,
    setActivities,
    areas,
    setAreas,
    programs,
    setPrograms,
    useBackend,
    error,
    isLoaded
  }
}
