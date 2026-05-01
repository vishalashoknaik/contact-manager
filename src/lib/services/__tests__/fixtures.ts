import { Contact, FilterState } from '../../types'

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Alice',
    phone: overrides.phone ?? '111-222-3333',
    gender: overrides.gender ?? 'Male',
    ieDate: overrides.ieDate,
    areaOfStay: overrides.areaOfStay,
    remarks: overrides.remarks,
    activities: overrides.activities ?? {},
    areas: overrides.areas ?? {},
    programs: overrides.programs ?? {},
    selected: overrides.selected ?? false,
    lastUpdated: overrides.lastUpdated ?? '2026-04-30T10:00:00.000Z',
    importOrder: overrides.importOrder
  }
}

export function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    nameFilter: '',
    phoneFilter: '',
    genderFilter: '',
    areaOfStayFilter: '',
    activityFilters: {},
    areaFilters: {},
    programFilters: {},
    totalFilter: '',
    dateFilter: '',
    ...overrides
  }
}