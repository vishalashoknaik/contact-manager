'use client'

import { useState, useEffect } from 'react'
import { Contact } from '@/lib/types'
import { ContactService } from '@/lib/services/contactService'
import { contactsApi } from '@/lib/api/client'
import { useAuth } from '@/hooks/useAuth'

/**
 * useContacts Hook
 * DB-first contact state management. Falls back to in-memory operations
 * if backend is unavailable in current session.
 */
export function useContacts() {
  const { isLoggedIn, isLoading: authLoading, selectedCenter } = useAuth()
  const [contacts, setContactsState] = useState<Contact[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [useBackend, setUseBackend] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshFromBackend = async () => {
    if (!selectedCenter) {
      throw new Error('Center ID is required')
    }

    const backendContacts = await contactsApi.getAll(selectedCenter)
    if (!Array.isArray(backendContacts)) {
      throw new Error('Backend returned invalid payload')
    }
    setContactsState(backendContacts)
  }

  const syncContactsToBackend = async (updatedContacts: Contact[]) => {
    if (!selectedCenter) {
      throw new Error('Center ID is required')
    }

    const validContacts = updatedContacts.filter(c => c.name?.trim() && c.phone?.trim())

    for (const c of validContacts) {
      await contactsApi.create({
        name: c.name,
        phone: c.phone,
        gender: c.gender,
        ieDate: c.ieDate,
        areaOfStay: c.areaOfStay,
        remarks: c.remarks,
        activities: c.activities,
        areas: c.areas,
        programs: c.programs,
        interests: c.interests,
        selected: c.selected,
        importOrder: c.importOrder
      }, selectedCenter)
    }
  }

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      return
    }

    if (!selectedCenter) {
      setUseBackend(false)
      setContactsState([])
      setError('No center selected. Data cannot be loaded.')
      setIsLoaded(true)
      return
    }

    const loadContacts = async () => {
      try {
        await refreshFromBackend()
        setUseBackend(true)
        setError(null)
      } catch (err) {
        console.warn('Backend unavailable:', err)
        setUseBackend(false)
        setContactsState([])
        setError('Backend unavailable. Data will not be persisted.')
      } finally {
        setIsLoaded(true)
      }
    }

    setIsLoaded(false)
    setContactsState([])
    loadContacts()
  }, [authLoading, isLoggedIn, selectedCenter])

  const setContacts = async (updatedContacts: Contact[]) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot update contacts.')
      return
    }

    if (!useBackend) {
      setError('Backend unavailable. Cannot update contacts.')
      return
    }

    setContactsState(updatedContacts)

    try {
      await syncContactsToBackend(updatedContacts)
      await refreshFromBackend()
      setError(null)
    } catch (err) {
      console.error('Failed to sync contacts to backend:', err)
      setError('Failed to sync contacts to backend.')
    }
  }

  const addOrUpdateContact = async (name: string, phone: string, gender: import('@/lib/types').Gender = 'Male', ieDate?: string, areaOfStay?: string, remarks?: string) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot save contact.')
      return
    }

    if (useBackend) {
      try {
        await contactsApi.create({ name, phone, gender, ieDate, areaOfStay, remarks, selected: true }, selectedCenter)
        await refreshFromBackend()
        setError(null)
        return
      } catch (err) {
        console.error('Backend add failed:', err)
        setError('Failed to save contact to backend.')
        return
      }
    }

    setError('Backend unavailable. Cannot save contact.')
  }

  const toggleSelect = async (id: string | number) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot update selection.')
      return
    }

    if (useBackend) {
      const previousContacts = contacts
      const nextContacts = contacts.map(contact => (
          String(contact.id) === String(id)
            ? { ...contact, selected: !contact.selected }
            : contact
      ))
      setContactsState(nextContacts)

      const updatedContact = nextContacts.find(contact => String(contact.id) === String(id))
      if (!updatedContact) {
        return
      }

      try {
        await contactsApi.update(id, { selected: updatedContact.selected }, selectedCenter)
        setError(null)
        return
      } catch (err) {
        setContactsState(previousContacts)
        console.error('Backend toggle failed:', err)
        setError('Failed to update selection in backend.')
        return
      }
    }

    setError('Backend unavailable. Cannot update selection.')
  }

  const toggleSelectAll = async (contactIds?: Array<string | number>) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot update bulk selection.')
      return
    }

    const targetContacts = Array.isArray(contactIds)
      ? contacts.filter(c => contactIds.some(id => String(id) === String(c.id)))
      : contacts

    if (targetContacts.length === 0) {
      return
    }

    if (useBackend) {
      const allSelected = targetContacts.length > 0 && targetContacts.every(c => c.selected)
      const targetIds = new Set(targetContacts.map(contact => String(contact.id)))
      const previousContacts = contacts
      const nextContacts = contacts.map(contact => (
          targetIds.has(String(contact.id))
            ? { ...contact, selected: !allSelected }
            : contact
      ))
      setContactsState(nextContacts)

      try {
        await Promise.all(
          targetContacts.map(c => contactsApi.update(c.id, { selected: !allSelected }, selectedCenter))
        )
        setError(null)
        return
      } catch (err) {
        setContactsState(previousContacts)
        console.error('Backend toggle-all failed:', err)
        setError('Failed to update bulk selection in backend.')
        return
      }
    }

    setError('Backend unavailable. Cannot update bulk selection.')
  }

  const incrementSelected = async (
    selectedActivity: string,
    selectedArea: string,
    selectedProgram: string,
    selectedInterest: string = ''
  ) => {
    if (!selectedCenter) {
      setError('No center selected. Increments are not persisted.')
      return false
    }

    if (!useBackend) {
      setError('Backend unavailable. Increments are not persisted.')
      return false
    }

    const updated = ContactService.incrementSelected(
      contacts,
      selectedActivity,
      selectedArea,
      selectedProgram,
      selectedInterest
    )
    setContactsState(updated)

    try {
      const changedContacts = updated.filter((c, idx) => {
        const prev = contacts[idx]
        return JSON.stringify(c) !== JSON.stringify(prev)
      })

      await syncContactsToBackend(changedContacts)
      await refreshFromBackend()
      setError(null)
      return true
    } catch (err) {
      console.error('Backend increment sync failed:', err)
      setError('Failed to persist increments to backend.')
      return false
    }
  }

  const deleteSelectedContacts = async (): Promise<boolean> => {
    if (!selectedCenter) {
      setError('No center selected. Cannot delete contacts.')
      return false
    }

    if (!useBackend) {
      setError('Backend unavailable. Cannot delete contacts.')
      return false
    }

    const toDelete = contacts.filter(c => c.selected)
    if (toDelete.length === 0) return true

    const previousContacts = contacts
    setContactsState(prev => prev.filter(c => !c.selected))

    try {
      await Promise.all(toDelete.map(c => contactsApi.delete(c.id)))
      setError(null)
      return true
    } catch (err) {
      setContactsState(previousContacts)
      console.error('Backend delete failed:', err)
      setError('Failed to delete contacts from backend.')
      return false
    }
  }

  const importContacts = async (newContacts: Contact[]) => {
    if (!selectedCenter) {
      setError('No center selected. Cannot import contacts.')
      return
    }

    if (useBackend) {
      try {
        await syncContactsToBackend(newContacts)
        await refreshFromBackend()
        setError(null)
        return
      } catch (err) {
        console.error('Backend import failed:', err)
        setError('Failed to import contacts to backend.')
        return
      }
    }

    setError('Backend unavailable. Cannot import contacts.')
  }

  const clearAllSelections = async () => {
    if (!selectedCenter) {
      setError('No center selected. Cannot clear selections.')
      return false
    }

    if (useBackend) {
      const previousContacts = contacts
      setContactsState(currentContacts => currentContacts.map(contact => ({ ...contact, selected: false })))

      try {
        await Promise.all(
          contacts.map(c => contactsApi.update(c.id, { selected: false }, selectedCenter))
        )
        setError(null)
        return true
      } catch (err) {
        setContactsState(previousContacts)
        console.error('Backend clear failed:', err)
        setError('Failed to clear selections in backend.')
        return false
      }
    }

    setError('Backend unavailable. Cannot clear selections.')
    return false
  }

  return {
    contacts,
    setContacts,
    addOrUpdateContact,
    toggleSelect,
    toggleSelectAll,
    clearAllSelections,
    incrementSelected,
    importContacts,
    deleteSelectedContacts,
    useBackend,
    error,
    isLoaded
  }
}
