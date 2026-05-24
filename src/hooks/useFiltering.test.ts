import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFiltering } from './useFiltering'

describe('useFiltering', () => {
  it('initialises with empty filters and default sort', () => {
    const { result } = renderHook(() => useFiltering())

    expect(result.current.filters.nameFilter).toBe('')
    expect(result.current.filters.phoneFilter).toBe('')
    expect(result.current.filters.activityFilters).toEqual({})
    expect(result.current.filters.areaFilters).toEqual({})
    expect(result.current.filters.programFilters).toEqual({})
    expect(result.current.filters.totalFilter).toBe('')
    expect(result.current.filters.dateFilter).toBe('')
    expect(result.current.sortState.key).toBe('lastUpdated')
    expect(result.current.sortState.direction).toBe('desc')
  })

  it('setNameFilter updates nameFilter', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setNameFilter('Alice'))

    expect(result.current.filters.nameFilter).toBe('Alice')
  })

  it('setPhoneFilter updates phoneFilter', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setPhoneFilter('9876'))

    expect(result.current.filters.phoneFilter).toBe('9876')
  })

  it('setActivityFilter updates activityFilters keyed by activity', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setActivityFilter('Walkathon', '>2'))

    expect(result.current.filters.activityFilters['Walkathon']).toBe('>2')
  })

  it('setActivityFilter does not affect other activity filter keys', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => {
      result.current.setActivityFilter('Walkathon', '1')
      result.current.setActivityFilter('Prayer', '3')
    })

    expect(result.current.filters.activityFilters['Walkathon']).toBe('1')
    expect(result.current.filters.activityFilters['Prayer']).toBe('3')
  })

  it('setAreaFilter updates areaFilters keyed by area', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setAreaFilter('North', '>0'))

    expect(result.current.filters.areaFilters['North']).toBe('>0')
  })

  it('setProgramFilter updates programFilters keyed by program', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setProgramFilter('YouthCamp', '2'))

    expect(result.current.filters.programFilters['YouthCamp']).toBe('2')
  })

  it('setTotalFilter updates totalFilter', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setTotalFilter('>5'))

    expect(result.current.filters.totalFilter).toBe('>5')
  })

  it('setDateFilter updates dateFilter', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setDateFilter('2026-04-30'))

    expect(result.current.filters.dateFilter).toBe('2026-04-30')
  })

  it('toggleSort sets a new key with asc direction', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.toggleSort('phone'))

    expect(result.current.sortState.key).toBe('phone')
    expect(result.current.sortState.direction).toBe('asc')
  })

  it('toggleSort flips direction when same key is toggled again', () => {
    const { result } = renderHook(() => useFiltering())

    // Default is {key: 'lastUpdated', direction: 'desc'} — toggle same key
    act(() => result.current.toggleSort('lastUpdated'))
    expect(result.current.sortState.direction).toBe('asc')

    act(() => result.current.toggleSort('lastUpdated'))
    expect(result.current.sortState.direction).toBe('desc')
  })

  it('toggleSort resets to asc when switching to a different key', () => {
    const { result } = renderHook(() => useFiltering())

    // Default is already {key: 'lastUpdated', direction: 'desc'}
    // Switching to a different key must reset direction to asc
    act(() => result.current.toggleSort('name'))
    expect(result.current.sortState.key).toBe('name')
    expect(result.current.sortState.direction).toBe('asc')
  })

  it('initialises with empty interestFilters', () => {
    const { result } = renderHook(() => useFiltering())
    expect(result.current.filters.interestFilters).toEqual({})
  })

  it('setInterestFilter updates interestFilters keyed by interest', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setInterestFilter('Yoga', '2'))
    expect(result.current.filters.interestFilters['Yoga']).toBe('2')
  })

  it('setInterestFilter does not affect other filter keys', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => {
      result.current.setInterestFilter('Yoga', '1')
      result.current.setInterestFilter('Meditation', '3')
    })
    expect(result.current.filters.interestFilters['Yoga']).toBe('1')
    expect(result.current.filters.interestFilters['Meditation']).toBe('3')
    expect(result.current.filters.nameFilter).toBe('')
  })
})

describe('useFiltering — setGenderFilter and setAreaOfStayFilter', () => {
  it('setGenderFilter updates genderFilter', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setGenderFilter('Female'))

    expect(result.current.filters.genderFilter).toBe('Female')
  })

  it('setGenderFilter can be cleared back to empty string', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setGenderFilter('Male'))
    act(() => result.current.setGenderFilter(''))

    expect(result.current.filters.genderFilter).toBe('')
  })

  it('setAreaOfStayFilter updates areaOfStayFilter', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => result.current.setAreaOfStayFilter('Koramangala'))

    expect(result.current.filters.areaOfStayFilter).toBe('Koramangala')
  })

  it('setAreaOfStayFilter does not affect other filters', () => {
    const { result } = renderHook(() => useFiltering())

    act(() => {
      result.current.setNameFilter('Alice')
      result.current.setAreaOfStayFilter('HSR')
    })

    expect(result.current.filters.nameFilter).toBe('Alice')
    expect(result.current.filters.areaOfStayFilter).toBe('HSR')
  })

  it('initialises with empty interestFilters', () => {
    const { result } = renderHook(() => useFiltering())
    expect(result.current.filters.interestFilters).toEqual({})
  })

  it('setInterestFilter updates interestFilters keyed by interest', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setInterestFilter('Yoga', '2'))
    expect(result.current.filters.interestFilters['Yoga']).toBe('2')
  })

  it('setInterestFilter does not affect other filter keys', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => {
      result.current.setInterestFilter('Yoga', '1')
      result.current.setInterestFilter('Meditation', '3')
    })
    expect(result.current.filters.interestFilters['Yoga']).toBe('1')
    expect(result.current.filters.interestFilters['Meditation']).toBe('3')
    expect(result.current.filters.nameFilter).toBe('')
  })
})

describe('useFiltering � campaign boolean flag filters', () => {
  it('initialises notInterestedFilter, centerChangeFilter, doNotDisturbFilter as empty strings', () => {
    const { result } = renderHook(() => useFiltering())
    expect(result.current.filters.notInterestedFilter).toBe('')
    expect(result.current.filters.centerChangeFilter).toBe('')
    expect(result.current.filters.doNotDisturbFilter).toBe('')
  })

  it('setNotInterestedFilter updates notInterestedFilter', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setNotInterestedFilter('true'))
    expect(result.current.filters.notInterestedFilter).toBe('true')
  })

  it('setNotInterestedFilter can be set to false', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setNotInterestedFilter('false'))
    expect(result.current.filters.notInterestedFilter).toBe('false')
  })

  it('setNotInterestedFilter can be cleared', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setNotInterestedFilter('true'))
    act(() => result.current.setNotInterestedFilter(''))
    expect(result.current.filters.notInterestedFilter).toBe('')
  })

  it('setCenterChangeFilter updates centerChangeFilter', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setCenterChangeFilter('true'))
    expect(result.current.filters.centerChangeFilter).toBe('true')
  })

  it('setDoNotDisturbFilter updates doNotDisturbFilter', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => result.current.setDoNotDisturbFilter('true'))
    expect(result.current.filters.doNotDisturbFilter).toBe('true')
  })

  it('boolean flag setters do not affect other filters', () => {
    const { result } = renderHook(() => useFiltering())
    act(() => {
      result.current.setNotInterestedFilter('true')
      result.current.setCenterChangeFilter('false')
      result.current.setDoNotDisturbFilter('true')
    })
    expect(result.current.filters.nameFilter).toBe('')
    expect(result.current.filters.phoneFilter).toBe('')
    expect(result.current.filters.totalFilter).toBe('')
    expect(result.current.filters.notInterestedFilter).toBe('true')
    expect(result.current.filters.centerChangeFilter).toBe('false')
    expect(result.current.filters.doNotDisturbFilter).toBe('true')
  })
})
