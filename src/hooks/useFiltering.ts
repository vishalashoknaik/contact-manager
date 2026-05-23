'use client'

import { useState } from 'react'
import { FilterState, SortState } from '@/lib/types'

/**
 * useFiltering Hook
 * Manages filter and sort state
 */
export function useFiltering() {
  const [filters, setFilters] = useState<FilterState>({
    nameFilter: '',
    phoneFilter: '',
    genderFilter: '',
    areaOfStayFilter: '',
    activityFilters: {},
    areaFilters: {},
    programFilters: {},
    interestFilters: {},
    totalFilter: '',
    dateFilter: '',
    notInterestedFilter: '',
    centerChangeFilter: '',
    doNotDisturbFilter: ''
  })

  const [sortState, setSortState] = useState<SortState>({
    key: 'name',
    direction: 'asc'
  })

  const setNameFilter = (value: string) => {
    setFilters(prev => ({ ...prev, nameFilter: value }))
  }

  const setPhoneFilter = (value: string) => {
    setFilters(prev => ({ ...prev, phoneFilter: value }))
  }

  const setActivityFilter = (activity: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      activityFilters: { ...prev.activityFilters, [activity]: value }
    }))
  }

  const setAreaFilter = (area: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      areaFilters: { ...prev.areaFilters, [area]: value }
    }))
  }

  const setProgramFilter = (program: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      programFilters: { ...prev.programFilters, [program]: value }
    }))
  }

  const setInterestFilter = (interest: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      interestFilters: { ...prev.interestFilters, [interest]: value }
    }))
  }

  const setTotalFilter = (value: string) => {
    setFilters(prev => ({ ...prev, totalFilter: value }))
  }

  const setDateFilter = (value: string) => {
    setFilters(prev => ({ ...prev, dateFilter: value }))
  }

  const setGenderFilter = (value: string) => {
    setFilters(prev => ({ ...prev, genderFilter: value }))
  }

  const setAreaOfStayFilter = (value: string) => {
    setFilters(prev => ({ ...prev, areaOfStayFilter: value }))
  }

  const setNotInterestedFilter = (value: string) => {
    setFilters(prev => ({ ...prev, notInterestedFilter: value }))
  }

  const setCenterChangeFilter = (value: string) => {
    setFilters(prev => ({ ...prev, centerChangeFilter: value }))
  }

  const setDoNotDisturbFilter = (value: string) => {
    setFilters(prev => ({ ...prev, doNotDisturbFilter: value }))
  }

  const toggleSort = (key: string) => {
    setSortState(prev => {
      if (prev.key === key) {
        return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  return {
    filters,
    setNameFilter,
    setPhoneFilter,
    setGenderFilter,
    setAreaOfStayFilter,
    setActivityFilter,
    setAreaFilter,
    setProgramFilter,
    setInterestFilter,
    setTotalFilter,
    setDateFilter,
    setNotInterestedFilter,
    setCenterChangeFilter,
    setDoNotDisturbFilter,
    sortState,
    toggleSort
  }
}
