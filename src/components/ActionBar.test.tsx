import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ActionBar } from './ActionBar'

describe('ActionBar', () => {
  it('forwards selection changes and bulk increment clicks', async () => {
    const user = userEvent.setup()
    const onActivityChange = vi.fn()
    const onAreaChange = vi.fn()
    const onProgramChange = vi.fn()
    const onIncrement = vi.fn()

    render(
      <ActionBar
        activities={['Walkathon']}
        areas={['Area1']}
        programs={['Program1']}
        selectedActivity=""
        selectedArea=""
        selectedProgram=""
        onActivityChange={onActivityChange}
        onAreaChange={onAreaChange}
        onProgramChange={onProgramChange}
        onIncrement={onIncrement}
      />
    )

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'Walkathon')
    await user.selectOptions(selects[1], 'Area1')
    await user.selectOptions(selects[2], 'Program1')
    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(onActivityChange).toHaveBeenCalledWith('Walkathon')
    expect(onAreaChange).toHaveBeenCalledWith('Area1')
    expect(onProgramChange).toHaveBeenCalledWith('Program1')
    expect(onIncrement).toHaveBeenCalledTimes(1)
  })

  it('renders interest select when interests are provided', async () => {
    const user = userEvent.setup()
    const onInterestChange = vi.fn()

    render(
      <ActionBar
        activities={[]}
        areas={[]}
        programs={[]}
        selectedActivity=""
        selectedArea=""
        selectedProgram=""
        onActivityChange={vi.fn()}
        onAreaChange={vi.fn()}
        onProgramChange={vi.fn()}
        onIncrement={vi.fn()}
        interests={['Yoga', 'Meditation']}
        selectedInterest=""
        onInterestChange={onInterestChange}
      />
    )

    const selects = screen.getAllByRole('combobox')
    const interestSelect = selects.find(s => s.querySelector('option[value="Yoga"]'))
    expect(interestSelect).toBeDefined()
    await user.selectOptions(interestSelect!, 'Yoga')
    expect(onInterestChange).toHaveBeenCalledWith('Yoga')
  })

  it('does not render interest select when interests list is empty', () => {
    render(
      <ActionBar
        activities={[]}
        areas={[]}
        programs={[]}
        selectedActivity=""
        selectedArea=""
        selectedProgram=""
        onActivityChange={vi.fn()}
        onAreaChange={vi.fn()}
        onProgramChange={vi.fn()}
        onIncrement={vi.fn()}
        interests={[]}
        selectedInterest=""
        onInterestChange={vi.fn()}
      />
    )

    // No option for interests when list is empty
    expect(screen.queryByRole('option', { name: /interest/i })).not.toBeInTheDocument()
  })

  it('disables all selects and shows Updating… on the button while isUpdating', () => {
    render(
      <ActionBar
        activities={['Walkathon']}
        areas={['Area1']}
        programs={['Program1']}
        selectedActivity="Walkathon"
        selectedArea=""
        selectedProgram=""
        onActivityChange={vi.fn()}
        onAreaChange={vi.fn()}
        onProgramChange={vi.fn()}
        onIncrement={vi.fn()}
        isUpdating
      />
    )

    const selects = screen.getAllByRole('combobox')
    selects.forEach(s => expect(s).toBeDisabled())

    const btn = screen.getByRole('button', { name: /Updating/i })
    expect(btn).toBeDisabled()
  })

  it('does not disable controls when isUpdating is false (default)', () => {
    render(
      <ActionBar
        activities={['Walkathon']}
        areas={[]}
        programs={[]}
        selectedActivity=""
        selectedArea=""
        selectedProgram=""
        onActivityChange={vi.fn()}
        onAreaChange={vi.fn()}
        onProgramChange={vi.fn()}
        onIncrement={vi.fn()}
      />
    )

    screen.getAllByRole('combobox').forEach(s => expect(s).not.toBeDisabled())
    expect(screen.getByRole('button', { name: 'Update' })).not.toBeDisabled()
  })
})