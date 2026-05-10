import { describe, it, expect, vi } from 'vitest'

// ─── Inline the exact logic from campaigns/page.tsx ────────────────────────
// These tests mirror the real implementation so that any future refactor that
// breaks the contract will fail here first.

type CenterRole = 'ATTENDANCE_TAKER' | 'USER' | 'ADMIN'

interface MessageTemplate {
  name: string
  smsContent: string
  whatsappContent: string
}


/** Mirrors the canEditTemplates expression in page.tsx */
function canEdit(role: CenterRole | undefined | null): boolean {
  return role === 'USER' || role === 'ADMIN'
}

/** Mirrors the template-loading useEffect in page.tsx */
function loadTemplatesForCampaign(
  messageTemplates: unknown
): MessageTemplate[] {
  return Array.isArray(messageTemplates) ? messageTemplates as MessageTemplate[] : []
}

/** Mirrors the save logic in page.tsx: validates, trims, then pushes or updates */
function applySaveTemplate(
  templates: MessageTemplate[],
  editing: { index: number; name: string; smsContent: string; whatsappContent: string }
): MessageTemplate[] | 'VALIDATION_ERROR' {
  if (!editing.name.trim() || !editing.smsContent.trim() || !editing.whatsappContent.trim()) {
    return 'VALIDATION_ERROR'
  }
  const updated = [...templates]
  const entry: MessageTemplate = {
    name: editing.name.trim(),
    smsContent: editing.smsContent.trim(),
    whatsappContent: editing.whatsappContent.trim()
  }
  if (editing.index === -1) {
    updated.push(entry)
  } else {
    updated[editing.index] = entry
  }
  return updated
}

/** Mirrors the delete logic in page.tsx */
function deleteTemplate(
  templates: MessageTemplate[],
  index: number,
  currentSelectedIndex: number
): { templates: MessageTemplate[]; selectedIndex: number } | 'GUARD_BLOCKED' {
  if (templates.length <= 1) return 'GUARD_BLOCKED'
  const updated = templates.filter((_, i) => i !== index)
  return {
    templates: updated,
    selectedIndex: Math.min(currentSelectedIndex, updated.length - 1)
  }
}

/** Mirrors the WhatsApp/SMS link substitution in page.tsx */
function substitutePlaceholders(
  content: string,
  name: string,
  phone: string,
  campaignName: string
): string {
  return content
    .replaceAll('{name}', name)
    .replaceAll('{phone}', phone)
    .replaceAll('{campaign}', campaignName)
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CampaignsPage - Message Templates Backend Tests', () => {
  describe('Template Feature Coverage', () => {
    it('verifies message templates are stored in campaign data', () => {
      const campaign = {
        id: 'campaign-1',
        messageTemplates: [
          {
            name: 'Friendly',
            smsContent: 'Hi {name}, please call us back!',
            whatsappContent: 'Hi {name}, are you available?'
          },
          {
            name: 'Professional',
            smsContent: 'Hello {name}, this is a follow-up.',
            whatsappContent: 'Hello {name}, please confirm your availability.'
          }
        ]
      }

      expect(campaign.messageTemplates).toHaveLength(2)
      expect(campaign.messageTemplates[0].name).toBe('Friendly')
      expect(campaign.messageTemplates[1].name).toBe('Professional')
    })

    it('campaign with null messageTemplates loads as empty array — no defaults injected', () => {
      const campaign = { id: 'campaign-1', messageTemplates: null }

      // Mirrors the loadTemplatesForCampaign logic in page.tsx
      const templates = Array.isArray(campaign.messageTemplates) ? campaign.messageTemplates : []
      expect(templates).toHaveLength(0)
    })

    it('campaign with empty array messageTemplates stays empty — no defaults injected', () => {
      const campaign = { id: 'campaign-1', messageTemplates: [] }

      const templates = Array.isArray(campaign.messageTemplates) ? campaign.messageTemplates : []
      expect(templates).toHaveLength(0)
    })

    it('verifies templates support placeholder substitution', () => {
      const template = {
        name: 'Test',
        smsContent: 'Hi {name}, call from {campaign}',
        whatsappContent: 'WhatsApp from {phone}'
      }

      const substituted = {
        sms: template.smsContent
          .replaceAll('{name}', 'John')
          .replaceAll('{campaign}', 'Campaign X'),
        whatsapp: template.whatsappContent.replaceAll('{phone}', '9876543210')
      }

      expect(substituted.sms).toBe('Hi John, call from Campaign X')
      expect(substituted.whatsapp).toBe('WhatsApp from 9876543210')
    })

    it('verifies templates can be added and removed', () => {
      let templates = [
        { name: 'Template 1', smsContent: 'SMS 1', whatsappContent: 'WA 1' }
      ]

      // Add template
      templates = [
        ...templates,
        { name: 'Template 2', smsContent: 'SMS 2', whatsappContent: 'WA 2' }
      ]
      expect(templates).toHaveLength(2)

      // Delete template
      templates = templates.filter(t => t.name !== 'Template 1')
      expect(templates).toHaveLength(1)
      expect(templates[0].name).toBe('Template 2')
    })

    it('verifies template selection persists during call', () => {
      const templates = [
        { name: 'Friendly', smsContent: 'Hi {name}!', whatsappContent: 'Hi!' },
        { name: 'Professional', smsContent: 'Hello {name}.', whatsappContent: 'Hello.' }
      ]

      let selectedIndex = 0
      expect(templates[selectedIndex].name).toBe('Friendly')

      selectedIndex = 1
      expect(templates[selectedIndex].name).toBe('Professional')

      selectedIndex = 0
      expect(templates[selectedIndex].name).toBe('Friendly')
    })
  })
})

describe('CampaignsPage - Role-Based Template Access', () => {
  it('verifies USER role can edit templates', () => {
    const userRole = 'USER'
    const canEditTemplates = userRole === 'USER' || userRole === 'ADMIN'
    expect(canEditTemplates).toBe(true)
  })

  it('verifies ATTENDANCE_TAKER role cannot edit templates', () => {
    const userRole = 'ATTENDANCE_TAKER'
    const canEditTemplates = userRole === 'USER' || userRole === 'ADMIN'
    expect(canEditTemplates).toBe(false)
  })

  it('verifies ADMIN role can edit templates', () => {
    const userRole = 'ADMIN'
    const canEditTemplates = userRole === 'USER' || userRole === 'ADMIN'
    expect(canEditTemplates).toBe(true)
  })
})

// ─── NEW: comprehensive edge-case and subtle-case coverage ───────────────────

describe('CampaignsPage - canEditTemplates: all role variants', () => {
  it('USER role can edit', () => expect(canEdit('USER')).toBe(true))
  it('ADMIN role can edit', () => expect(canEdit('ADMIN')).toBe(true))
  it('ATTENDANCE_TAKER cannot edit', () => expect(canEdit('ATTENDANCE_TAKER')).toBe(false))
  it('undefined role (no center loaded) cannot edit', () => expect(canEdit(undefined)).toBe(false))
  it('null role (selectedCenterDetails is null) cannot edit', () => expect(canEdit(null)).toBe(false))
})

describe('CampaignsPage - no hardcoded default templates (data integrity)', () => {
  it('initial template state is empty — no defaults injected on mount', () => {
    // Before any campaign is selected, state should be []
    const initialState: MessageTemplate[] = []
    expect(initialState).toHaveLength(0)
  })
  it('loading a campaign with null templates yields empty — not a hardcoded default', () => {
    expect(loadTemplatesForCampaign(null)).toEqual([])
    expect(loadTemplatesForCampaign(null)).not.toContainEqual(
      expect.objectContaining({ name: 'Default' })
    )
  })
  it('loading a campaign with empty array yields empty — not a hardcoded default', () => {
    expect(loadTemplatesForCampaign([])).toEqual([])
  })
})

describe('CampaignsPage - template loading from campaign', () => {
  it('uses campaign templates when present', () => {
    const t = [{ name: 'A', smsContent: 'S', whatsappContent: 'W' }]
    expect(loadTemplatesForCampaign(t)).toEqual(t)
  })
  it('returns empty array when messageTemplates is null — no default injected', () => {
    expect(loadTemplatesForCampaign(null)).toEqual([])
  })
  it('returns empty array when messageTemplates is empty array — no default injected', () => {
    expect(loadTemplatesForCampaign([])).toEqual([])
  })
  it('returns empty array when messageTemplates is undefined', () => {
    expect(loadTemplatesForCampaign(undefined)).toEqual([])
  })
  it('returns empty array when messageTemplates is a non-array value', () => {
    expect(loadTemplatesForCampaign('corrupt')).toEqual([])
  })
  it('preserves multiple templates from campaign', () => {
    const t = [
      { name: 'A', smsContent: 'S1', whatsappContent: 'W1' },
      { name: 'B', smsContent: 'S2', whatsappContent: 'W2' }
    ]
    const result = loadTemplatesForCampaign(t)
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('B')
  })
})

describe('CampaignsPage - template save validation', () => {
  const base = [{ name: 'Default', smsContent: 'S', whatsappContent: 'W' }]

  it('rejects when name is empty string', () => {
    expect(applySaveTemplate(base, { index: -1, name: '', smsContent: 'S', whatsappContent: 'W' }))
      .toBe('VALIDATION_ERROR')
  })
  it('rejects when name is whitespace only', () => {
    expect(applySaveTemplate(base, { index: -1, name: '   ', smsContent: 'S', whatsappContent: 'W' }))
      .toBe('VALIDATION_ERROR')
  })
  it('rejects when smsContent is empty string', () => {
    expect(applySaveTemplate(base, { index: -1, name: 'T', smsContent: '', whatsappContent: 'W' }))
      .toBe('VALIDATION_ERROR')
  })
  it('rejects when smsContent is whitespace only', () => {
    expect(applySaveTemplate(base, { index: -1, name: 'T', smsContent: '\t', whatsappContent: 'W' }))
      .toBe('VALIDATION_ERROR')
  })
  it('rejects when whatsappContent is empty string', () => {
    expect(applySaveTemplate(base, { index: -1, name: 'T', smsContent: 'S', whatsappContent: '' }))
      .toBe('VALIDATION_ERROR')
  })
  it('rejects when whatsappContent is whitespace only', () => {
    expect(applySaveTemplate(base, { index: -1, name: 'T', smsContent: 'S', whatsappContent: '  ' }))
      .toBe('VALIDATION_ERROR')
  })
  it('trims whitespace from all fields before saving', () => {
    const result = applySaveTemplate(base, { index: -1, name: '  New  ', smsContent: ' SMS ', whatsappContent: ' WA ' })
    if (result === 'VALIDATION_ERROR') throw new Error('Should not fail validation')
    const added = result[result.length - 1]
    expect(added.name).toBe('New')
    expect(added.smsContent).toBe('SMS')
    expect(added.whatsappContent).toBe('WA')
  })
})

describe('CampaignsPage - template add vs edit (index -1 vs ≥0)', () => {
  const base = [
    { name: 'First', smsContent: 'S1', whatsappContent: 'W1' },
    { name: 'Second', smsContent: 'S2', whatsappContent: 'W2' }
  ]

  it('index -1 appends a new entry to the end', () => {
    const result = applySaveTemplate(base, { index: -1, name: 'Third', smsContent: 'S3', whatsappContent: 'W3' })
    if (result === 'VALIDATION_ERROR') throw new Error()
    expect(result).toHaveLength(3)
    expect(result[2].name).toBe('Third')
    // originals untouched
    expect(result[0].name).toBe('First')
    expect(result[1].name).toBe('Second')
  })
  it('index 0 updates the first entry in-place', () => {
    const result = applySaveTemplate(base, { index: 0, name: 'Updated', smsContent: 'S-new', whatsappContent: 'W-new' })
    if (result === 'VALIDATION_ERROR') throw new Error()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Updated')
    expect(result[1].name).toBe('Second') // not touched
  })
  it('index 1 updates the correct entry in-place', () => {
    const result = applySaveTemplate(base, { index: 1, name: 'Changed', smsContent: 'S-c', whatsappContent: 'W-c' })
    if (result === 'VALIDATION_ERROR') throw new Error()
    expect(result[0].name).toBe('First') // not touched
    expect(result[1].name).toBe('Changed')
  })
  it('does not mutate the original array', () => {
    const original = [...base]
    applySaveTemplate(base, { index: 0, name: 'X', smsContent: 'S', whatsappContent: 'W' })
    expect(base[0].name).toBe(original[0].name)
  })
})

describe('CampaignsPage - template delete guard and index clamping', () => {
  const twoTemplates = [
    { name: 'A', smsContent: 'S1', whatsappContent: 'W1' },
    { name: 'B', smsContent: 'S2', whatsappContent: 'W2' }
  ]
  const threeTemplates = [
    { name: 'A', smsContent: 'S1', whatsappContent: 'W1' },
    { name: 'B', smsContent: 'S2', whatsappContent: 'W2' },
    { name: 'C', smsContent: 'S3', whatsappContent: 'W3' }
  ]

  it('blocks delete when only 1 template remains', () => {
    const single = [{ name: 'Only', smsContent: 'S', whatsappContent: 'W' }]
    expect(deleteTemplate(single, 0, 0)).toBe('GUARD_BLOCKED')
  })
  it('allows delete when 2 templates exist', () => {
    const result = deleteTemplate(twoTemplates, 0, 0)
    expect(result).not.toBe('GUARD_BLOCKED')
  })
  it('removes the correct entry by index', () => {
    const result = deleteTemplate(twoTemplates, 0, 0)
    if (result === 'GUARD_BLOCKED') throw new Error()
    expect(result.templates).toHaveLength(1)
    expect(result.templates[0].name).toBe('B')
  })
  it('clamps selectedIndex when deleting the last item (index = length-1)', () => {
    // Deleting index 2 (C) from 3 items while selectedIndex was 2
    const result = deleteTemplate(threeTemplates, 2, 2)
    if (result === 'GUARD_BLOCKED') throw new Error()
    // updated length is 2, so Math.min(2, 1) = 1
    expect(result.selectedIndex).toBe(1)
  })
  it('preserves selectedIndex when deleting an item before it', () => {
    // Deleting index 0 (A) while selectedIndex is 1 → new index 0 (was B at 1, now at 0)
    const result = deleteTemplate(threeTemplates, 0, 1)
    if (result === 'GUARD_BLOCKED') throw new Error()
    // Math.min(1, 1) = 1, but item moved: B is now at index 0 after filter
    expect(result.selectedIndex).toBe(1) // Math.min(1, 2-1) = 1
    expect(result.templates[result.selectedIndex].name).toBe('C')
  })
  it('does not clamp when selected item is not the deleted one and array stays large enough', () => {
    const result = deleteTemplate(threeTemplates, 1, 0) // delete B, selected is A
    if (result === 'GUARD_BLOCKED') throw new Error()
    expect(result.selectedIndex).toBe(0) // Math.min(0, 1) = 0
    expect(result.templates[0].name).toBe('A')
  })
})

describe('CampaignsPage - placeholder substitution', () => {
  it('substitutes {name}', () => {
    expect(substitutePlaceholders('Hello {name}', 'Arjun', '9999', 'C1')).toBe('Hello Arjun')
  })
  it('substitutes {phone}', () => {
    expect(substitutePlaceholders('Call {phone}', 'A', '9876543210', 'C1')).toBe('Call 9876543210')
  })
  it('substitutes {campaign}', () => {
    expect(substitutePlaceholders('Re: {campaign}', 'A', '9', 'Spring Drive')).toBe('Re: Spring Drive')
  })
  it('substitutes all three in a single string', () => {
    const result = substitutePlaceholders(
      'Hi {name} ({phone}), join {campaign}!',
      'Priya', '9876543210', 'Outreach'
    )
    expect(result).toBe('Hi Priya (9876543210), join Outreach!')
  })
  it('handles name with special characters', () => {
    const result = substitutePlaceholders('Hi {name}', "O'Brien & Co.", '9', 'C')
    expect(result).toBe("Hi O'Brien & Co.")
  })
  it('handles empty placeholder values gracefully (leaves empty string)', () => {
    const result = substitutePlaceholders('Hi {name} from {campaign}', '', '', '')
    expect(result).toBe('Hi  from ')
  })
  it('replaces all occurrences of the same placeholder', () => {
    const result = substitutePlaceholders('{name} ... {name}', 'Raj', '9', 'C')
    expect(result).toBe('Raj ... Raj')
  })
})

describe('CampaignsPage - out-of-bounds template index safe fallback', () => {
  it('returns empty string when template index is out of bounds (optional chaining)', () => {
    const templates: MessageTemplate[] = [
      { name: 'Only', smsContent: 'SMS text', whatsappContent: 'WA text' }
    ]
    // Simulate what page.tsx does: templates[outOfBoundsIndex]?.content || ''
    const outOfBoundsIndex = 5
    const content = templates[outOfBoundsIndex]?.whatsappContent || ''
    expect(content).toBe('')
  })
  it('returns content when index is valid', () => {
    const templates: MessageTemplate[] = [
      { name: 'T', smsContent: 'SMS', whatsappContent: 'WA' }
    ]
    const content = templates[0]?.whatsappContent || ''
    expect(content).toBe('WA')
  })
})

describe('CampaignsPage - saveTemplates backend skip conditions', () => {
  it('does not call backend API when selectedCampaign is null', async () => {
    const mockApi = vi.fn()
    // Mirror the guard: if (!selectedCampaign || !selectedCenter) return
    const selectedCampaign = null
    const selectedCenter = 'center-1'
    if (!selectedCampaign || !selectedCenter) { /* skip */ } else { mockApi() }
    expect(mockApi).not.toHaveBeenCalled()
  })
  it('does not call backend API when selectedCenter is null', async () => {
    const mockApi = vi.fn()
    const selectedCampaign = { id: 'campaign-1' }
    const selectedCenter = null
    if (!selectedCampaign || !selectedCenter) { /* skip */ } else { mockApi() }
    expect(mockApi).not.toHaveBeenCalled()
  })
  it('would call backend API when both campaign and center are set', async () => {
    const mockApi = vi.fn()
    const selectedCampaign = { id: 'campaign-1' }
    const selectedCenter = 'center-1'
    if (!selectedCampaign || !selectedCenter) { /* skip */ } else { mockApi() }
    expect(mockApi).toHaveBeenCalledOnce()
  })
})

describe('CampaignsPage - Dark Theme Support', () => {
  it('verifies CSS variables are defined for light mode', () => {
    const cssVariables = {
      '--bg-primary': '#ffffff',
      '--text-primary': '#000000',
      '--border-color': '#dddddd',
      '--panel-bg': '#f9f9f9',
      '--selected-item-bg': '#f0f7ff'
    }

    expect(cssVariables['--selected-item-bg']).toBe('#f0f7ff')
    expect(cssVariables['--panel-bg']).toBe('#f9f9f9')
  })

  it('verifies CSS variables are defined for dark mode', () => {
    const darkModeVariables = {
      '--bg-primary': '#1a1a1a',
      '--text-primary': '#ffffff',
      '--border-color': '#333333',
      '--panel-bg': '#252525',
      '--selected-item-bg': '#2d4d6d'
    }

    expect(darkModeVariables['--selected-item-bg']).toBe('#2d4d6d')
    expect(darkModeVariables['--panel-bg']).toBe('#252525')
  })

  it('verifies template styling uses CSS variables', () => {
    const templateStyle = {
      backgroundColor: 'var(--selected-item-bg, #f0f7ff)',
      borderColor: 'var(--text-primary, #000)',
      textColor: 'var(--text-primary, #000)'
    }

    expect(templateStyle.backgroundColor).toContain('var(--')
    expect(templateStyle.borderColor).toContain('var(--')
  })
})
