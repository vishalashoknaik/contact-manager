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
    await user.click(screen.getByRole('button', { name: '+1 (Selected)' }))

    expect(onActivityChange).toHaveBeenCalledWith('Walkathon')
    expect(onAreaChange).toHaveBeenCalledWith('Area1')
    expect(onProgramChange).toHaveBeenCalledWith('Program1')
    expect(onIncrement).toHaveBeenCalledTimes(1)
  })
})