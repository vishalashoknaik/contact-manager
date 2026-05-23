import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SyncStatusNotices } from './SyncStatusNotices'

describe('SyncStatusNotices', () => {
  it('renders nothing when no notice flags are enabled', () => {
    const { container } = render(<SyncStatusNotices />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders sync, delayed, and offline notices with custom messages', () => {
    render(
      <SyncStatusNotices
        isSyncing
        syncMessage="Loading access control"
        showLongSyncNotice
        longSyncMessage="Sync still pending"
        showOfflineWarning
        offlineMessage="Offline warning"
      />
    )

    expect(screen.getByText('Loading access control')).toBeInTheDocument()
    expect(screen.getByText('Sync still pending')).toBeInTheDocument()
    expect(screen.getByText('Offline warning')).toBeInTheDocument()
  })

  it('uses default follow-up margins for delayed notices and respects custom margins', () => {
    const { rerender } = render(
      <SyncStatusNotices
        isSyncing
        showLongSyncNotice
        showOfflineWarning
      />
    )

    // Margin is now applied to the Alert container div, not the text span
    const firstAlert = screen.getByText('Sync has not happened yet.').closest('div')
    const secondAlert = screen.getByText('Sync has not happened for more than 5 seconds.').closest('div')
    const thirdAlert = screen.getByText('Internet connection is unavailable. Latest data may be outdated until connection returns.').closest('div')

    expect(firstAlert).toHaveStyle({ margin: '12px 16px 0' })
    expect(secondAlert).toHaveStyle({ margin: '12px 16px 0' })
    expect(thirdAlert).toHaveStyle({ margin: '12px 16px 0' })

    rerender(
      <SyncStatusNotices
        isSyncing
        showLongSyncNotice
        showOfflineWarning
        margin="0 0 12px"
      />
    )

    const firstUpdated = screen.getByText('Sync has not happened yet.').closest('div')
    const secondUpdated = screen.getByText('Sync has not happened for more than 5 seconds.').closest('div')
    const thirdUpdated = screen.getByText('Internet connection is unavailable. Latest data may be outdated until connection returns.').closest('div')

    expect(firstUpdated).toHaveStyle({ margin: '0 0 12px' })
    expect(secondUpdated).toHaveStyle({ margin: '0 0 12px' })
    expect(thirdUpdated).toHaveStyle({ margin: '0 0 12px' })
  })
})