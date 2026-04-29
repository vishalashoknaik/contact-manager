'use client'

import { useState, useEffect } from 'react'
import { Contact } from '@/lib/types'
import { ContactService } from '@/lib/services/contactService'
import { StorageService } from '@/lib/services/StorageService'
import initialData from '@/data/contacts.json'

/**
 * useContacts Hook
 * Manages contact state and operations
 */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from storage on mount
  useEffect(() => {
    const stored = StorageService.getContacts()
    if (stored) {
      setContacts(stored)
    } else {
      const initialized = ContactService.initializeFromData(initialData as any[])
      setContacts(initialized)
    }
    setIsLoaded(true)
  }, [])

  // Persist to storage whenever contacts change
  useEffect(() => {
    if (isLoaded) {
      StorageService.saveContacts(contacts)
    }
  }, [contacts, isLoaded])

  const addOrUpdateContact = (name: string, phone: string) => {
    const { contacts: updated } = ContactService.addOrUpdateContact(contacts, name, phone)
    setContacts(updated)
  }

  const toggleSelect = (id: number) => {
    setContacts(ContactService.toggleSelect(contacts, id))
  }

  const toggleSelectAll = () => {
    setContacts(ContactService.toggleSelectAll(contacts))
  }

  const incrementSelected = (
    selectedActivity: string,
    selectedArea: string,
    selectedProgram: string
  ) => {
    setContacts(
      ContactService.incrementSelected(
        contacts,
        selectedActivity,
        selectedArea,
        selectedProgram
      )
    )
  }

  const importContacts = (newContacts: Contact[]) => {
    setContacts(newContacts)
  }

  return {
    contacts,
    setContacts,
    addOrUpdateContact,
    toggleSelect,
    toggleSelectAll,
    incrementSelected,
    importContacts,
    isLoaded
  }
}
