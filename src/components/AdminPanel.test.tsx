import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AdminPanel } from './AdminPanel'
import { makeContact } from '@/lib/services/__tests__/fixtures'
import { within } from '@testing-library/react'

describe('AdminPanel', () => {
  it('does not render when hidden', () => {
    const { container } = render(
      <AdminPanel
        isVisible={false}
        activities={[]}
        areas={[]}
        programs={[]}
        contacts={[]}
        onActivitiesChange={vi.fn()}
        onAreasChange={vi.fn()}
        onProgramsChange={vi.fn()}
        onContactsChange={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('adds and removes configuration items through callbacks', async () => {
    const user = userEvent.setup()
    let activities = ['Walkathon']
    const onActivitiesChange = vi.fn((newActivities: string[]) => {
      activities = newActivities
    })
    const onAreasChange = vi.fn()
    const onProgramsChange = vi.fn()
    const onContactsChange = vi.fn()
    const contacts = [makeContact({ activities: { Walkathon: 1 }, areas: { Area1: 1 }, programs: { Program1: 1 } })]

    const { rerender } = render(
      <AdminPanel
        isVisible
        activities={activities}
        areas={['Area1']}
        programs={['Program1']}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={onAreasChange}
        onProgramsChange={onProgramsChange}
        onContactsChange={onContactsChange}
      />
    )

    await user.type(screen.getByPlaceholderText('New activity'), 'Prayer')

    const activitiesSection = screen.getByText('Activities').closest('div') as HTMLElement
    await user.click(within(activitiesSection).getByRole('button', { name: 'Add' }))

    expect(onActivitiesChange).toHaveBeenCalledWith(['Walkathon', 'Prayer'])

    // Re-render with updated activities before clicking Delete
    rerender(
      <AdminPanel
        isVisible
        activities={activities}
        areas={['Area1']}
        programs={['Program1']}
        contacts={contacts}
        onActivitiesChange={onActivitiesChange}
        onAreasChange={onAreasChange}
        onProgramsChange={onProgramsChange}
        onContactsChange={onContactsChange}
      />
    )

    // Click Delete for the Walkathon activity specifically
    const walkathonItem = within(activitiesSection).getByText('Walkathon').closest('div') as HTMLElement
    await user.click(within(walkathonItem).getByRole('button', { name: 'Delete' }))
    expect(onActivitiesChange).toHaveBeenLastCalledWith(['Prayer'])
    expect(onContactsChange).toHaveBeenCalled()
  })
})