'use client'

import { useState } from 'react'

/**
 * useInputState Hook
 * Manages simple input field state
 */
export function useInputState(initialValue: string = '') {
  const [value, setValue] = useState(initialValue)

  const clear = () => setValue('')
  const reset = (val: string) => setValue(val)

  return {
    value,
    setValue,
    clear,
    reset
  }
}
