'use client'

import { useState, useEffect, useRef } from 'react'
import initialData from '@/data/contacts.json'

export default function Home() {

  const VERSION = "v1.4.8"
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ADMIN
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // CONFIG
  const [activities, setActivities] = useState<string[]>(['Walkathon'])
  const [areas, setAreas] = useState<string[]>(['Area1'])
  const [programs, setPrograms] = useState<string[]>(['Program1'])

  const [newActivity, setNewActivity] = useState('')
  const [newArea, setNewArea] = useState('')
  const [newProgram, setNewProgram] = useState('')

  // DATA
  const [contacts, setContacts] = useState<any[]>([])

  // ACTION SELECTORS
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // FILTERS
  const [nameFilter, setNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [activityFilters, setActivityFilters] = useState<any>({})
  const [areaFilters, setAreaFilters] = useState<any>({})
  const [programFilters, setProgramFilters] = useState<any>({})
  const [totalFilter, setTotalFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // SORT
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // LOAD
  useEffect(() => {
    const c = localStorage.getItem('contacts')
    const a = localStorage.getItem('activities')
    const ar = localStorage.getItem('areas')
    const p = localStorage.getItem('programs')

    if (a) setActivities(JSON.parse(a))
    if (ar) setAreas(JSON.parse(ar))
    if (p) setPrograms(JSON.parse(p))

    if (c) setContacts(JSON.parse(c))
    else {
      setContacts(
        initialData.map(c => ({
          ...c,
          selected: false,
          activities: {},
          areas: {},
          programs: {},
          lastUpdated: new Date().toISOString()
        }))
      )
    }
  }, [])

  // SAVE
  useEffect(() => localStorage.setItem('contacts', JSON.stringify(contacts)), [contacts])
  useEffect(() => localStorage.setItem('activities', JSON.stringify(activities)), [activities])
  useEffect(() => localStorage.setItem('areas', JSON.stringify(areas)), [areas])
  useEffect(() => localStorage.setItem('programs', JSON.stringify(programs)), [programs])

  function normalizePhone(phone: string) {
    return phone.replace(/\D/g, '')
  }

  function toggleSelect(id: number) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c))
  }

  function toggleSelectAll() {
    const allSelected = contacts.length > 0 && contacts.every(c => c.selected)
    setContacts(prev => prev.map(c => ({ ...c, selected: !allSelected })))
  }

  function incrementAll() {
    const now = new Date().toISOString()

    setContacts(prev =>
      prev.map(c => {
        if (!c.selected) return c

        let updated = { ...c }

        if (selectedActivity) {
          updated.activities = {
            ...c.activities,
            [selectedActivity]: (c.activities?.[selectedActivity] || 0) + 1
          }
        }

        if (selectedArea) {
          updated.areas = {
            ...c.areas,
            [selectedArea]: (c.areas?.[selectedArea] || 0) + 1
          }
        }

        if (selectedProgram) {
          updated.programs = {
            ...c.programs,
            [selectedProgram]: (c.programs?.[selectedProgram] || 0) + 1
          }
        }

        updated.lastUpdated = now
        return updated
      })
    )
  }

  function addContact() {
    if (!newName || !newPhone) return
    const norm = normalizePhone(newPhone)

    setContacts(prev => {
      const exists = prev.find(c => normalizePhone(c.phone) === norm)

      if (exists) {
        return prev.map(c => c.id === exists.id ? { ...c, name: newName, selected: true } : c)
      }

      const newItem = {
        id: Date.now(),
        name: newName,
        phone: newPhone,
        activities: {},
        areas: {},
        programs: {},
        selected: true,
        lastUpdated: new Date().toISOString()
      }

      return [newItem, ...prev]
    })
  }

  // CSV
  function openFileDialog() {
    fileInputRef.current?.click()
  }

  function handleImport(e: any) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (ev: any) => {
      const rows = ev.target.result.split('\n').slice(1)
      const now = new Date().toISOString()

      setContacts(prev => {
        const updated = [...prev]
        const newItems: any[] = []

        rows.forEach((row: string) => {
          if (!row.trim()) return

          const [name, phone] = row.split(',')
          if (!name || !phone) return

          const norm = normalizePhone(phone)

          const exists = updated.find(c => normalizePhone(c.phone) === norm)

          if (exists) {
            exists.name = name
            exists.selected = true
            exists.lastUpdated = now
          } else {
            newItems.push({
              id: Date.now() + Math.random(),
              name,
              phone,
              activities: {},
              areas: {},
              programs: {},
              selected: true,
              lastUpdated: now
            })
          }
        })

        return [...newItems, ...updated]
      })
    }

    reader.readAsText(file)
    e.target.value = ''
  }

  // ADMIN
  function addItem(list: string[], setter: any, value: string, clear: any) {
    if (!value || list.includes(value)) return
    setter([...list, value])
    clear('')
  }

  function removeItem(type: 'activity' | 'area' | 'program', value: string) {
    if (type === 'activity') setActivities(prev => prev.filter(x => x !== value))
    if (type === 'area') setAreas(prev => prev.filter(x => x !== value))
    if (type === 'program') setPrograms(prev => prev.filter(x => x !== value))

    setContacts(prev =>
      prev.map(c => {
        const updated = { ...c }
        if (type === 'activity') { const o = { ...c.activities }; delete o[value]; updated.activities = o }
        if (type === 'area') { const o = { ...c.areas }; delete o[value]; updated.areas = o }
        if (type === 'program') { const o = { ...c.programs }; delete o[value]; updated.programs = o }
        return updated
      })
    )
  }

  function getTotal(c: any) {
    return Object.values(c.activities || {}).reduce((a: number, b: any) => a + b, 0)
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  let filtered = contacts.filter(c => {
    if (nameFilter && !c.name.toLowerCase().includes(nameFilter.toLowerCase())) return false
    if (phoneFilter && !c.phone.includes(phoneFilter)) return false
    if (totalFilter && getTotal(c) < Number(totalFilter)) return false
    if (dateFilter && new Date(c.lastUpdated) < new Date(dateFilter)) return false

    for (const a of activities) if (activityFilters[a] && (c.activities?.[a] || 0) < Number(activityFilters[a])) return false
    for (const a of areas) if (areaFilters[a] && (c.areas?.[a] || 0) < Number(areaFilters[a])) return false
    for (const p of programs) if (programFilters[p] && (c.programs?.[p] || 0) < Number(programFilters[p])) return false

    return true
  })

  filtered.sort((a, b) => {
    let va:any, vb:any

    if (activities.includes(sortKey)) {
      va = a.activities?.[sortKey] || 0
      vb = b.activities?.[sortKey] || 0
    } else if (sortKey === 'total') {
      va = getTotal(a)
      vb = getTotal(b)
    } else if (sortKey === 'lastUpdated') {
      va = new Date(a.lastUpdated).getTime()
      vb = new Date(b.lastUpdated).getTime()
    } else {
      va = a[sortKey]
      vb = b[sortKey]
    }

    return sortDir === 'asc' ? va - vb : vb - va
  })

  return (
    <div style={{ padding: 20 }}>
      <h3>Contact Manager ({VERSION})</h3>

      <button onClick={() => setIsAdmin(!isAdmin)}>
        {isAdmin ? 'User Mode' : 'Admin Mode'}
      </button>

      {isAdmin && (
        <button onClick={() => setShowSettings(!showSettings)} style={{ marginLeft: 10 }}>
          Settings
        </button>
      )}

      {isAdmin && showSettings && (
        <div style={{ border:'1px solid #ccc', padding:10, marginTop:10 }}>
          <h4>Activities</h4>
          <input value={newActivity} onChange={e=>setNewActivity(e.target.value)} />
          <button onClick={()=>addItem(activities, setActivities, newActivity, setNewActivity)}>Add</button>
          {activities.map(a => <div key={a}>{a} <button onClick={()=>removeItem('activity',a)}>Delete</button></div>)}

          <h4>Areas</h4>
          <input value={newArea} onChange={e=>setNewArea(e.target.value)} />
          <button onClick={()=>addItem(areas, setAreas, newArea, setNewArea)}>Add</button>
          {areas.map(a => <div key={a}>{a} <button onClick={()=>removeItem('area',a)}>Delete</button></div>)}

          <h4>Programs</h4>
          <input value={newProgram} onChange={e=>setNewProgram(e.target.value)} />
          <button onClick={()=>addItem(programs, setPrograms, newProgram, setNewProgram)}>Add</button>
          {programs.map(p => <div key={p}>{p} <button onClick={()=>removeItem('program',p)}>Delete</button></div>)}
        </div>
      )}

      <div>
        <input placeholder="Name" value={newName} onChange={e=>setNewName(e.target.value)} />
        <input placeholder="Phone" value={newPhone} onChange={e=>setNewPhone(e.target.value)} />
        <button onClick={addContact}>Add</button>

        <button onClick={openFileDialog}>Import CSV</button>
        <input type="file" ref={fileInputRef} style={{ display:'none' }} onChange={handleImport} />
      </div>

      <div>
        <select onChange={e=>setSelectedActivity(e.target.value)}>
          <option value="">Activity</option>
          {activities.map(a => <option key={a}>{a}</option>)}
        </select>

        <select onChange={e=>setSelectedArea(e.target.value)}>
          <option value="">Area</option>
          {areas.map(a => <option key={a}>{a}</option>)}
        </select>

        <select onChange={e=>setSelectedProgram(e.target.value)}>
          <option value="">Program</option>
          {programs.map(p => <option key={p}>{p}</option>)}
        </select>

        <button onClick={incrementAll}>+1</button>
      </div>

      <table style={{ width:'100%', tableLayout:'fixed', borderCollapse:'collapse', marginTop:10 }}>
        <thead>
          <tr>
            <th style={thCheckbox}>
              <input
                type="checkbox"
                onChange={toggleSelectAll}
                checked={contacts.length>0 && contacts.every(c=>c.selected)}
              />
            </th>
            <th style={th} onClick={()=>toggleSort('name')}>Name</th>
            <th style={th} onClick={()=>toggleSort('phone')}>Phone</th>

            {activities.map(a => <th key={a} style={th} onClick={()=>toggleSort(a)}>{a}</th>)}
            {areas.map(a => <th key={a} style={th}>{a}</th>)}
            {programs.map(p => <th key={p} style={th}>{p}</th>)}

            <th style={th} onClick={()=>toggleSort('total')}>Total</th>
            <th style={th} onClick={()=>toggleSort('lastUpdated')}>Updated</th>
          </tr>

          <tr>
            <th style={thCheckbox}></th>
            <th style={th}><input onChange={e=>setNameFilter(e.target.value)} /></th>
            <th style={th}><input onChange={e=>setPhoneFilter(e.target.value)} /></th>

            {activities.map(a => <th key={a} style={th}><input onChange={e=>setActivityFilters((prev: any)=>({...prev,[a]:e.target.value}))}/></th>)}
            {areas.map(a => <th key={a} style={th}><input onChange={e=>setAreaFilters((prev: any)=>({...prev,[a]:e.target.value}))}/></th>)}
            {programs.map(p => <th key={p} style={th}><input onChange={e=>setProgramFilters((prev: any)=>({...prev,[p]:e.target.value}))}/></th>)}

            <th style={th}><input onChange={e=>setTotalFilter(e.target.value)} /></th>
            <th style={th}><input type="date" onChange={e=>setDateFilter(e.target.value)} /></th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(c => (
            <tr key={c.id}>
              <td style={tdCheckbox}>
                <input type="checkbox" checked={c.selected} onChange={()=>toggleSelect(c.id)} />
              </td>

              <td style={td}>{c.name}</td>
              <td style={td}>{c.phone}</td>

              {activities.map(a => <td key={`act-${c.id}-${a}`} style={tdCenter}>{c.activities?.[a]||0}</td>)}
              {areas.map(a => <td key={`area-${c.id}-${a}`} style={tdCenter}>{c.areas?.[a]||0}</td>)}
              {programs.map(p => <td key={`prog-${c.id}-${p}`} style={tdCenter}>{c.programs?.[p]||0}</td>)}

              <td style={tdCenter}>{getTotal(c)}</td>
              <td style={td}>{new Date(c.lastUpdated).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thCheckbox = { width:40, border:'1px solid #ddd', padding:6 }
const tdCheckbox = { width:40, border:'1px solid #eee', padding:6 }
const th = { border:'1px solid #ddd', padding:6 }
const td = { border:'1px solid #eee', padding:6 }
const tdCenter = { border:'1px solid #eee', padding:6, textAlign:'center' as const }