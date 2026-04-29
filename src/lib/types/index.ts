export interface Contact {
  id: number
  name: string
  phone: string
  activities: Record<string, number>
  areas: Record<string, number>
  programs: Record<string, number>
  selected: boolean
  lastUpdated: string
  importOrder?: number
}

export interface Config {
  activities: string[]
  areas: string[]
  programs: string[]
}

export interface FilterState {
  nameFilter: string
  phoneFilter: string
  activityFilters: Record<string, string>
  areaFilters: Record<string, string>
  programFilters: Record<string, string>
  totalFilter: string
  dateFilter: string
}

export interface SortState {
  key: string
  direction: 'asc' | 'desc'
}
