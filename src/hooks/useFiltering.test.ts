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
    expect(result.current.sortState.key).toBe('name')
    expect(result.current.sortState.direction).toBe('asc')
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

    act(() => result.current.toggleSort('name'))
    expect(result.current.sortState.direction).toBe('desc')

    act(() => result.current.toggleSort('name'))
    expect(result.current.sortState.direction).toBe('asc')
  })

  it('toggleSort resets to asc when switching to a different key', () => {
    const { result } = renderHook(() => useFiltering())

    // Make current key desc
    act(() => result.current.toggleSort('name'))
    expect(result.current.sortState.direction).toBe('desc')

    // Switch to a different key
    act(() => result.current.toggleSort('phone'))
    expect(result.current.sortState.key).toBe('phone')
    expect(result.current.sortState.direction).toBe('asc')
  })
})
