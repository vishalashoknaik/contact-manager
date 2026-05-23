'use client'

import { useEffect, useState } from 'react'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { authApi, centersApi, contactsApi } from '@/lib/api/client'
import { useAuth } from '@/hooks/useAuth'
import { AdminService } from '@/lib/services/AdminService'
import { ConfigService } from '@/lib/services/ConfigService'
import { Contact } from '@/lib/types'
import { useInputState } from '@/hooks/useInputState'
import { Button } from '@/components/ui/Button'
import type { CenterOption, CenterRole, ManagedUser } from '@/lib/types/auth'

interface AdminPanelProps {
  isVisible: boolean
  section: 'access' | 'settings'
  activities: string[]
  areas: string[]
  programs: string[]
  interests?: string[]
  contacts: Contact[]
  onActivitiesChange: (activities: string[]) => void
  onAreasChange: (areas: string[]) => void
  onProgramsChange: (programs: string[]) => void
  onInterestsChange?: (interests: string[]) => void
  onContactsChange: (contacts: Contact[]) => void
}

export function AdminPanel({
  isVisible,
  section,
  activities,
  areas,
  programs,
  interests = [],
  contacts,
  onActivitiesChange,
  onAreasChange,
  onProgramsChange,
  onInterestsChange,
  onContactsChange
}: AdminPanelProps) {
  const adminService = new AdminService()
  const newActivityInput = useInputState()
  const newAreaInput = useInputState()
  const newProgramInput = useInputState()
  const newInterestInput = useInputState()
  const {
    user,
    selectedCenter,
    selectedCenterDetails,
    canManageSelectedCenterAccess,
    canManageSelectedCenterConfig,
    refreshUser
  } = useAuth()
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [userPhone, setUserPhone] = useState('')
  const [userName, setUserName] = useState('')
  const [selectedCenterRole, setSelectedCenterRole] = useState<CenterRole>('USER')
  const [isOverallAdmin, setIsOverallAdmin] = useState(false)
  const [managedRoleDrafts, setManagedRoleDrafts] = useState<Record<string, CenterRole>>({})
  const [userError, setUserError] = useState<string | null>(null)
  const [isManagingUsers, setIsManagingUsers] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [hasLoadedUsersOnce, setHasLoadedUsersOnce] = useState(false)
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [newCenterName, setNewCenterName] = useState('')
  const [renameCenterName, setRenameCenterName] = useState('')
  const [centerError, setCenterError] = useState<string | null>(null)
  const [isSavingCenter, setIsSavingCenter] = useState(false)
  const [isLoadingCenters, setIsLoadingCenters] = useState(false)
  const [hasLoadedCentersOnce, setHasLoadedCentersOnce] = useState(false)
  const [mergeDialog, setMergeDialog] = useState<{
    type: 'activity' | 'area' | 'program' | 'interest'
    itemToDelete: string
    options: string[]
  } | null>(null)
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<string | null>(null)
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({})
  const [editingItem, setEditingItem] = useState<{ type: 'activity' | 'area' | 'program' | 'interest'; value: string } | null>(null)

  const roleLabelMap: Record<CenterRole, string> = {
    ADMIN: 'Center Admin',
    USER: 'Center User',
    ATTENDANCE_TAKER: 'Attendance Taker'
  }

  const getManagedUserRole = (managedUser: ManagedUser | (ManagedUser & { isCenterAdmin?: boolean })) =>
    managedUser.centerRole || ('isCenterAdmin' in managedUser && managedUser.isCenterAdmin ? 'ADMIN' : 'USER')

  const grantableRoles =
    selectedCenterDetails?.capabilities?.grantableRoles ||
    ((selectedCenterDetails as { isAdmin?: boolean } | null)?.isAdmin
      ? (['ADMIN', 'USER', 'ATTENDANCE_TAKER'] as CenterRole[])
      : (['USER', 'ATTENDANCE_TAKER'] as CenterRole[]))

  const toManagedKey = (managedUser: ManagedUser) => `${managedUser.phone}-${managedUser.centerId}`

  const toExistingContactByPhone = (phone: string) =>
    contacts.find(contact => contact.phone.trim() === phone.trim())
  const shouldLoadCenters = !!user?.canAccessAllCenters && isVisible && section === 'access'
  const isAccessSyncing = (isLoadingUsers && !hasLoadedUsersOnce) || (shouldLoadCenters && isLoadingCenters && !hasLoadedCentersOnce)
  const {
    isOnline,
    showLongSyncNotice: showAccessLongSyncNotice,
    showOfflineWarning: showAccessOfflineWarning
  } = useSyncStatus({ isSyncing: isAccessSyncing })

  useEffect(() => {
    if (!isVisible || !selectedCenter || !canManageSelectedCenterAccess || section !== 'access') {
      return
    }

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const users = await authApi.getUsers(selectedCenter)
        setManagedUsers(users)
        setHasLoadedUsersOnce(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load users'
        setUserError(message)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadUsers()
  }, [canManageSelectedCenterAccess, isVisible, section, selectedCenter])

  useEffect(() => {
    if (!contactSearch.trim()) {
      setSearchResults([])
      return
    }

    const search = contactSearch.trim().toLowerCase()
    setSearchResults(
      contacts
        .filter(
          contact =>
            contact.name.toLowerCase().includes(search) ||
            contact.phone.toLowerCase().includes(search)
        )
        .slice(0, 6)
    )
  }, [contactSearch, contacts])

  useEffect(() => {
    setSelectedCenterRole(grantableRoles[0] || 'ATTENDANCE_TAKER')
  }, [grantableRoles])

  useEffect(() => {
    setRenameCenterName(selectedCenterDetails?.name || '')
  }, [selectedCenterDetails?.name])

  useEffect(() => {
    if (!isVisible || section !== 'access' || !user?.canAccessAllCenters) {
      return
    }

    const loadCenters = async () => {
      setIsLoadingCenters(true)
      try {
        setCenters(await centersApi.getAll())
        setHasLoadedCentersOnce(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load centers'
        setCenterError(message)
      } finally {
        setIsLoadingCenters(false)
      }
    }

    loadCenters()
  }, [isVisible, section, user?.canAccessAllCenters])

  if (!isVisible) return null

  const handleAddActivity = () => {
    const updated = adminService.addActivity(activities, newActivityInput.value)
    onActivitiesChange(updated)
    newActivityInput.clear()
  }

  const handleRemoveActivity = (value: string) => {
    const otherActivities = activities.filter(a => a !== value)
    if (otherActivities.length > 0) {
      setMergeDialog({ type: 'activity', itemToDelete: value, options: otherActivities })
      setSelectedMergeTarget(null)
    } else {
      const { activities: updated, contacts: updatedContacts } =
        adminService.removeActivity(activities, contacts, value)
      onActivitiesChange(updated)
      onContactsChange(updatedContacts)
    }
  }

  const handleRenameItem = (type: 'activity' | 'area' | 'program' | 'interest', oldValue: string, newValue: string) => {
    const items = type === 'activity' ? activities : type === 'area' ? areas : type === 'interest' ? interests : programs
    const { items: updated, contacts: updatedContacts } = ConfigService.renameItem(
      items,
      contacts,
      oldValue,
      newValue,
      type
    )
    
    if (type === 'activity') onActivitiesChange(updated)
    else if (type === 'area') onAreasChange(updated)
    else if (type === 'interest') onInterestsChange?.(updated)
    else onProgramsChange(updated)
    onContactsChange(updatedContacts)
    setEditingItem(null)
    setRenameInputs({ ...renameInputs, [oldValue]: '' })
  }

  const handleMergeAndDelete = () => {
    if (!mergeDialog || !selectedMergeTarget) return

    const items =
      mergeDialog.type === 'activity' ? activities :
      mergeDialog.type === 'area' ? areas :
      mergeDialog.type === 'interest' ? interests :
      programs

    const { items: updated, contacts: updatedContacts } = ConfigService.mergeItem(
      items,
      contacts,
      mergeDialog.itemToDelete,
      selectedMergeTarget,
      mergeDialog.type
    )

    if (mergeDialog.type === 'activity') onActivitiesChange(updated)
    else if (mergeDialog.type === 'area') onAreasChange(updated)
    else if (mergeDialog.type === 'interest') onInterestsChange?.(updated)
    else onProgramsChange(updated)
    onContactsChange(updatedContacts)

    setMergeDialog(null)
    setSelectedMergeTarget(null)
  }

  const handleDeleteWithoutMerge = () => {
    if (!mergeDialog) return

    const items =
      mergeDialog.type === 'activity' ? activities :
      mergeDialog.type === 'area' ? areas :
      mergeDialog.type === 'interest' ? interests :
      programs

    const { items: updated, contacts: updatedContacts } = ConfigService.removeItem(
      items,
      contacts,
      mergeDialog.itemToDelete,
      mergeDialog.type
    )

    if (mergeDialog.type === 'activity') onActivitiesChange(updated)
    else if (mergeDialog.type === 'area') onAreasChange(updated)
    else if (mergeDialog.type === 'interest') onInterestsChange?.(updated)
    else onProgramsChange(updated)
    onContactsChange(updatedContacts)

    setMergeDialog(null)
    setSelectedMergeTarget(null)
  }

  const handleAddArea = () => {
    const updated = adminService.addArea(areas, newAreaInput.value)
    onAreasChange(updated)
    newAreaInput.clear()
  }

  const handleRemoveArea = (value: string) => {
    const otherAreas = areas.filter(a => a !== value)
    if (otherAreas.length > 0) {
      setMergeDialog({ type: 'area', itemToDelete: value, options: otherAreas })
      setSelectedMergeTarget(null)
    } else {
      const { areas: updated, contacts: updatedContacts } = adminService.removeArea(
        areas,
        contacts,
        value
      )
      onAreasChange(updated)
      onContactsChange(updatedContacts)
    }
  }

  const handleAddProgram = () => {
    const updated = adminService.addProgram(programs, newProgramInput.value)
    onProgramsChange(updated)
    newProgramInput.clear()
  }

  const handleRemoveProgram = (value: string) => {
    const otherPrograms = programs.filter(p => p !== value)
    if (otherPrograms.length > 0) {
      setMergeDialog({ type: 'program', itemToDelete: value, options: otherPrograms })
      setSelectedMergeTarget(null)
    } else {
      const { programs: updated, contacts: updatedContacts } = adminService.removeProgram(
        programs,
        contacts,
        value
      )
      onProgramsChange(updated)
      onContactsChange(updatedContacts)
    }
  }

  const handleAddInterest = () => {
    const updated = adminService.addInterest(interests, newInterestInput.value)
    onInterestsChange?.(updated)
    newInterestInput.clear()
  }

  const handleRemoveInterest = (value: string) => {
    const otherInterests = interests.filter(i => i !== value)
    if (otherInterests.length > 0) {
      setMergeDialog({ type: 'interest' as any, itemToDelete: value, options: otherInterests })
      setSelectedMergeTarget(null)
    } else {
      const { interests: updated, contacts: updatedContacts } = adminService.removeInterest(
        interests,
        contacts,
        value
      )
      onInterestsChange?.(updated)
      onContactsChange(updatedContacts)
    }
  }

  const reloadManagedUsers = async () => {
    if (!selectedCenter) {
      return
    }

    const users = await authApi.getUsers(selectedCenter)
    setManagedUsers(users)
  }

  const reloadCenters = async () => {
    if (!user?.canAccessAllCenters) {
      return
    }

    const nextCenters = await centersApi.getAll()
    setCenters(nextCenters)
  }

  const patchManagedUser = (managedUser: ManagedUser, updates: Partial<ManagedUser>) => (
    currentUsers: ManagedUser[]
  ) => currentUsers.map(currentUser => (
    toManagedKey(currentUser) === toManagedKey(managedUser)
      ? { ...currentUser, ...updates }
      : currentUser
  ))

  const handleSaveUser = async () => {
    if (!selectedCenter) {
      setUserError('Select a center before managing users')
      return
    }

    const trimmedPhone = userPhone.trim()
    const trimmedName = userName.trim()

    if (!trimmedPhone) {
      setUserError('Phone is required')
      return
    }

    if (!trimmedName) {
      setUserError('Name is required')
      return
    }

    setIsManagingUsers(true)
    setUserError(null)

    try {
      if (!toExistingContactByPhone(trimmedPhone)) {
        const response = await contactsApi.create(
          {
            name: trimmedName,
            phone: trimmedPhone,
            gender: 'Other',
            selected: false
          },
          selectedCenter
        )

        const createdContact = (response as { contact?: Contact }).contact
        if (createdContact) {
          onContactsChange([createdContact, ...contacts])
        }
      }

      await authApi.upsertUserAccess(
        trimmedPhone,
        {
          name: trimmedName || undefined,
          centerRole: selectedCenterRole,
          canAccessAllCenters: user?.canAccessAllCenters ? isOverallAdmin : undefined
        },
        selectedCenter
      )
      setContactSearch('')
      setUserPhone('')
      setUserName('')
      setSearchResults([])
      setIsOverallAdmin(false)
      setSelectedCenterRole(grantableRoles[0] || 'ATTENDANCE_TAKER')
      await reloadManagedUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save user access'
      setUserError(message)
    } finally {
      setIsManagingUsers(false)
    }
  }

  const handleRoleUpdate = async (managedUser: ManagedUser, nextRole: CenterRole) => {
    if (!selectedCenter) {
      return
    }

    const previousManagedUsers = managedUsers
    setManagedUsers(patchManagedUser(managedUser, {
      centerRole: nextRole,
      isApproved: true,
      accessStatus: 'approved'
    }))

    setIsManagingUsers(true)
    setUserError(null)

    try {
      await authApi.upsertUserAccess(
        managedUser.phone,
        {
          name: managedUser.name,
          centerRole: nextRole,
          canAccessAllCenters: user?.canAccessAllCenters
            ? managedUser.canAccessAllCenters
            : undefined
        },
        selectedCenter
      )
      await reloadManagedUsers()
    } catch (err) {
      setManagedUsers(previousManagedUsers)
      const message = err instanceof Error ? err.message : 'Failed to update roles'
      setUserError(message)
    } finally {
      setIsManagingUsers(false)
    }
  }

  const handleApproveAccess = async (managedUser: ManagedUser) => {
    const nextRole = managedRoleDrafts[toManagedKey(managedUser)] || managedUser.centerRole
    await handleRoleUpdate(managedUser, nextRole)
  }

  const handleOverallAdminToggle = async (managedUser: ManagedUser) => {
    if (!selectedCenter) {
      return
    }

    const previousManagedUsers = managedUsers
    setManagedUsers(patchManagedUser(managedUser, {
      canAccessAllCenters: !managedUser.canAccessAllCenters,
      isApproved: true,
      accessStatus: 'approved'
    }))

    setIsManagingUsers(true)
    setUserError(null)

    try {
      await authApi.upsertUserAccess(
        managedUser.phone,
        {
          name: managedUser.name,
          centerRole: managedRoleDrafts[toManagedKey(managedUser)] || managedUser.centerRole,
          canAccessAllCenters: !managedUser.canAccessAllCenters
        },
        selectedCenter
      )
      await reloadManagedUsers()
    } catch (err) {
      setManagedUsers(previousManagedUsers)
      const message = err instanceof Error ? err.message : 'Failed to update roles'
      setUserError(message)
    } finally {
      setIsManagingUsers(false)
    }
  }

  const handleRemoveAccess = async (managedUser: ManagedUser) => {
    if (!selectedCenter) {
      return
    }

    const previousManagedUsers = managedUsers
    setManagedUsers(currentUsers => currentUsers.filter(currentUser => toManagedKey(currentUser) !== toManagedKey(managedUser)))

    setIsManagingUsers(true)
    setUserError(null)

    try {
      await authApi.removeUserAccess(managedUser.phone, selectedCenter)
      await reloadManagedUsers()
    } catch (err) {
      setManagedUsers(previousManagedUsers)
      const message = err instanceof Error ? err.message : 'Failed to remove access'
      setUserError(message)
    } finally {
      setIsManagingUsers(false)
    }
  }

  const handleCreateCenter = async () => {
    const name = newCenterName.trim()
    if (!name) {
      setCenterError('Center name is required')
      return
    }

    setIsSavingCenter(true)
    setCenterError(null)

    try {
      await centersApi.create(name)
      setNewCenterName('')
      await refreshUser()
      await reloadCenters()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create center'
      setCenterError(message)
    } finally {
      setIsSavingCenter(false)
    }
  }

  const handleRenameCenter = async () => {
    const name = renameCenterName.trim()
    if (!selectedCenter) {
      setCenterError('Select a center before renaming it')
      return
    }

    if (!name) {
      setCenterError('Center name is required')
      return
    }

    setIsSavingCenter(true)
    setCenterError(null)

    try {
      await centersApi.update(selectedCenter, name)
      await refreshUser()
      await reloadCenters()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update center'
      setCenterError(message)
    } finally {
      setIsSavingCenter(false)
    }
  }

  const panelStyle = {
    border: '1px solid var(--border-color, #ccc)',
    padding: 15,
    marginTop: 15,
    backgroundColor: 'var(--panel-bg, #f9f9f9)',
    borderRadius: 4
  }

  const sectionStyle = {
    marginBottom: 20
  }

  const inputStyle = {
    padding: '6px 8px',
    marginRight: 8,
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 3,
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-color, #eee)',
    color: 'var(--text-primary, #000)'
  }

  const pendingUsers = managedUsers.filter(managedUser => !managedUser.isApproved)
  const approvedUsers = managedUsers.filter(managedUser => managedUser.isApproved)

  const renderAccessSection = () => (
    <>
      <div style={sectionStyle}>
        <h5>User Access</h5>
        <p style={{ color: '#555', marginTop: 0 }}>
          Search people in contacts first. If not found, add a new contact before granting access.
        </p>
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search contact by name or phone"
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            style={inputStyle}
          />
          {searchResults.length > 0 && (
            <div style={{ border: '1px solid var(--border-color, #ddd)', borderRadius: 4, overflow: 'hidden' }}>
              {searchResults.map(result => (
                <button
                  key={`${result.id}-${result.phone}`}
                  type="button"
                  onClick={() => {
                    setUserPhone(result.phone)
                    setUserName(result.name)
                    setContactSearch('')
                    setSearchResults([])
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color, #eee)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary, #000)',
                    cursor: 'pointer'
                  }}
                >
                  <strong>{result.name}</strong> ({result.phone})
                </button>
              ))}
            </div>
          )}
          <input
            type="tel"
            placeholder="User phone number"
            value={userPhone}
            onChange={e => setUserPhone(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="User name (required for new user)"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            style={inputStyle}
          />
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Center Access Role</span>
            <select
              value={selectedCenterRole}
              onChange={e => setSelectedCenterRole(e.target.value as CenterRole)}
              style={{ ...inputStyle, marginRight: 0 }}
            >
              {grantableRoles.map(role => (
                <option key={role} value={role}>
                  {roleLabelMap[role]}
                </option>
              ))}
            </select>
          </label>
          {user?.canAccessAllCenters && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={isOverallAdmin}
                onChange={e => setIsOverallAdmin(e.target.checked)}
              />
              Overall admin for all centers
            </label>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveUser}
            disabled={isManagingUsers || !userPhone || !selectedCenter}
          >
            {isManagingUsers ? 'Saving...' : 'Grant Access'}
          </Button>
        </div>

        <SyncStatusNotices
          isSyncing={isAccessSyncing}
          syncMessage={isOnline
            ? 'Sync has not happened yet. Fetching latest access control details...'
            : 'Internet is disconnected. Access control details could not be refreshed yet and may be incomplete.'}
          showLongSyncNotice={showAccessLongSyncNotice}
          showOfflineWarning={showAccessOfflineWarning}
          offlineMessage="Internet is disconnected or access control data is still loading. Users and centers may appear incomplete until sync finishes."
          margin="0 0 12px"
        />

        {userError && <div style={{ color: '#b02a37', marginBottom: 12 }}>{userError}</div>}
      </div>

      <div style={sectionStyle}>
        <h5>Access Requests</h5>
        {pendingUsers.length === 0 && (
          <p style={{ marginBottom: 0, color: '#666' }}>No pending access requests for this center.</p>
        )}
        {pendingUsers.map(managedUser => (
          <div key={`${managedUser.phone}-${managedUser.centerId}`} style={itemStyle}>
            <div>
              <strong>{managedUser.name}</strong> ({managedUser.phone})
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Pending approval</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApproveAccess(managedUser)}
                disabled={isManagingUsers}
              >
                Approve Access
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRemoveAccess(managedUser)}
                disabled={isManagingUsers}
              >
                Reject Request
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h5>Approved Users</h5>
        {approvedUsers.length === 0 && (
          <p style={{ marginBottom: 0, color: '#666' }}>No approved users assigned to this center yet.</p>
        )}
        {approvedUsers.map(managedUser => (
          <div key={toManagedKey(managedUser)} style={itemStyle}>
            <div>
              <strong>{managedUser.name}</strong> ({managedUser.phone})
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {managedUser.canAccessAllCenters
                  ? 'Overall admin'
                  : roleLabelMap[managedUser.centerRole]}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <select
                value={managedRoleDrafts[toManagedKey(managedUser)] || managedUser.centerRole}
                onChange={e =>
                  setManagedRoleDrafts(prev => ({
                    ...prev,
                    [toManagedKey(managedUser)]: e.target.value as CenterRole
                  }))
                }
                style={{ ...inputStyle, marginRight: 0 }}
                disabled={isManagingUsers}
              >
                {(user?.canAccessAllCenters
                  ? (['ADMIN', 'USER', 'ATTENDANCE_TAKER'] as CenterRole[])
                  : grantableRoles
                ).map(role => (
                  <option key={role} value={role}>
                    {roleLabelMap[role]}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleRoleUpdate(
                    managedUser,
                    managedRoleDrafts[toManagedKey(managedUser)] || managedUser.centerRole
                  )
                }
                disabled={isManagingUsers}
              >
                Update Role
              </Button>
              {user?.canAccessAllCenters && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleOverallAdminToggle(managedUser)}
                  disabled={isManagingUsers}
                >
                  {managedUser.canAccessAllCenters
                    ? 'Remove Overall Admin'
                    : 'Make Overall Admin'}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRemoveAccess(managedUser)}
                disabled={isManagingUsers}
              >
                Remove Access
              </Button>
            </div>
          </div>
        ))}
      </div>

      {user?.canAccessAllCenters && (
        <div style={sectionStyle}>
          <h5>Centers</h5>
          <p style={{ color: '#555', marginTop: 0 }}>
            Overall admins can add new centers and rename the selected center.
          </p>
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="New center name"
              value={newCenterName}
              onChange={e => setNewCenterName(e.target.value)}
              style={inputStyle}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCenter}
              disabled={isSavingCenter}
            >
              {isSavingCenter ? 'Saving...' : 'Add Center'}
            </Button>
            <input
              type="text"
              placeholder="Rename selected center"
              value={renameCenterName}
              onChange={e => setRenameCenterName(e.target.value)}
              style={inputStyle}
            />
            <Button
              variant="success"
              size="sm"
              onClick={handleRenameCenter}
              disabled={isSavingCenter || !selectedCenter}
            >
              {isSavingCenter ? 'Saving...' : 'Update Center Name'}
            </Button>
          </div>

          {centerError && <div style={{ color: '#b02a37', marginBottom: 12 }}>{centerError}</div>}

          <div>
            {centers.map(center => (
              <div key={center.id} style={itemStyle}>
                <span>
                  <strong>{center.name}</strong>
                  {center.id === selectedCenter ? ' (selected)' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )

  const renderSettingsSection = () => (
    <>
      <div style={sectionStyle}>
        <h5>Activities</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New activity"
            value={newActivityInput.value}
            onChange={e => newActivityInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <Button variant="secondary" size="sm" onClick={handleAddActivity}>
            Add
          </Button>
        </div>
        {activities.map(a => (
          <div key={a} style={itemStyle}>
            {editingItem?.type === 'activity' && editingItem?.value === a ? (
              <input
                type="text"
                value={renameInputs[a] || ''}
                onChange={e => setRenameInputs({ ...renameInputs, [a]: e.target.value })}
                style={{ ...inputStyle, marginRight: 8 }}
                autoFocus
              />
            ) : (
              <span>{a}</span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {editingItem?.type === 'activity' && editingItem?.value === a ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRenameItem('activity', a, renameInputs[a] || '')}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingItem(null)
                      setRenameInputs({ ...renameInputs, [a]: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setEditingItem({ type: 'activity', value: a })
                      setRenameInputs({ ...renameInputs, [a]: a })
                    }}
                  >
                    Rename
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveActivity(a)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h5>Areas</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New area"
            value={newAreaInput.value}
            onChange={e => newAreaInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <Button variant="secondary" size="sm" onClick={handleAddArea}>
            Add
          </Button>
        </div>
        {areas.map(a => (
          <div key={a} style={itemStyle}>
            {editingItem?.type === 'area' && editingItem?.value === a ? (
              <input
                type="text"
                value={renameInputs[a] || ''}
                onChange={e => setRenameInputs({ ...renameInputs, [a]: e.target.value })}
                style={{ ...inputStyle, marginRight: 8 }}
                autoFocus
              />
            ) : (
              <span>{a}</span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {editingItem?.type === 'area' && editingItem?.value === a ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRenameItem('area', a, renameInputs[a] || '')}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingItem(null)
                      setRenameInputs({ ...renameInputs, [a]: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setEditingItem({ type: 'area', value: a })
                      setRenameInputs({ ...renameInputs, [a]: a })
                    }}
                  >
                    Rename
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveArea(a)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h5>Programs</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New program"
            value={newProgramInput.value}
            onChange={e => newProgramInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <Button variant="secondary" size="sm" onClick={handleAddProgram}>
            Add
          </Button>
        </div>
        {programs.map(p => (
          <div key={p} style={itemStyle}>
            {editingItem?.type === 'program' && editingItem?.value === p ? (
              <input
                type="text"
                value={renameInputs[p] || ''}
                onChange={e => setRenameInputs({ ...renameInputs, [p]: e.target.value })}
                style={{ ...inputStyle, marginRight: 8 }}
                autoFocus
              />
            ) : (
              <span>{p}</span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {editingItem?.type === 'program' && editingItem?.value === p ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRenameItem('program', p, renameInputs[p] || '')}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingItem(null)
                      setRenameInputs({ ...renameInputs, [p]: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setEditingItem({ type: 'program', value: p })
                      setRenameInputs({ ...renameInputs, [p]: p })
                    }}
                  >
                    Rename
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveProgram(p)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h5>Interest Form Categories</h5>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="New interest category"
            value={newInterestInput.value}
            onChange={e => newInterestInput.setValue(e.target.value)}
            style={inputStyle}
          />
          <Button variant="secondary" size="sm" onClick={handleAddInterest}>
            Add
          </Button>
        </div>
        {interests.map(i => (
          <div key={i} style={itemStyle}>
            {editingItem?.type === 'interest' && editingItem?.value === i ? (
              <input
                type="text"
                value={renameInputs[i] || ''}
                onChange={e => setRenameInputs({ ...renameInputs, [i]: e.target.value })}
                style={{ ...inputStyle, marginRight: 8 }}
                autoFocus
              />
            ) : (
              <span>{i}</span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {editingItem?.type === 'interest' && editingItem?.value === i ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRenameItem('interest', i, renameInputs[i] || '')}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingItem(null)
                      setRenameInputs({ ...renameInputs, [i]: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setEditingItem({ type: 'interest', value: i })
                      setRenameInputs({ ...renameInputs, [i]: i })
                    }}
                  >
                    Rename
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveInterest(i)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <div style={panelStyle}>
      <h4 style={{ color: 'var(--text-primary, #000)', marginTop: 0 }}>{section === 'access' ? '🔐 Access Management' : '⚙️ Center Settings'}</h4>
      {section === 'access' ? renderAccessSection() : null}
      {section === 'settings' && canManageSelectedCenterConfig ? renderSettingsSection() : null}
      {section === 'settings' && !canManageSelectedCenterConfig ? (
        <div style={{ color: '#b02a37' }}>Only center admins can manage center configuration.</div>
      ) : null}
      
      {mergeDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setMergeDialog(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary, #ffffff)',
              color: 'var(--text-primary, #000000)',
              padding: 20,
              borderRadius: 8,
              maxWidth: 400,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-color, #ddd)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h5 style={{ marginTop: 0, color: 'var(--text-primary, #000)' }}>Merge {mergeDialog.type}</h5>
            <p style={{ marginBottom: 15, color: 'var(--text-secondary, #666)' }}>
              Select which {mergeDialog.type} to merge "{mergeDialog.itemToDelete}" into. Counts will be added.
            </p>
            <div style={{ marginBottom: 15 }}>
              {mergeDialog.options.map(option => (
                <label key={option} style={{ display: 'block', marginBottom: 10, color: 'var(--text-primary, #000)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="merge-target"
                    value={option}
                    checked={selectedMergeTarget === option}
                    onChange={() => setSelectedMergeTarget(option)}
                  />
                  {' '}{option}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleMergeAndDelete}
                disabled={!selectedMergeTarget}
                style={{ flex: 1 }}
              >
                Merge
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteWithoutMerge}
                style={{ flex: 1 }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMergeDialog(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
