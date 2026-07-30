import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { HomeView } from './HomeView'
import type { ServicesGrid } from '@/config/schema'

const BASE = 'https://fintech.ctaprojects.xyz'

const grid: ServicesGrid = {
  version: 1,
  categories: [
    {
      key: 'manage',
      label: 'Manage',
      tiles: [
        {
          key: 'send',
          label: 'Send',
          icon: 'send',
          type: 'native',
          target: 'send',
          enabled: true,
        },
        {
          key: 'bills',
          label: 'Bills',
          icon: 'receipt',
          type: 'h5',
          target: 'bills',
          enabled: true,
        },
        {
          key: 'hidden',
          label: 'Hidden',
          icon: 'x',
          type: 'native',
          target: 'none',
          enabled: false,
        },
      ],
    }
  ],
}

describe('HomeView', () => {
  it('shows the balance', async () => {
    const onNavigate = jest.fn()
    await render(
    <HomeView balanceCentavos={645613} grid={grid} flags={{}} h5BaseUrl={BASE} onNavigate={onNavigate} />
    )
    expect(screen.getByText('₱6,456.13')).toBeOnTheScreen()
  })

  it('renders the enabled tiles', async () => {
    const onNavigate = jest.fn()
    await render(
      <HomeView balanceCentavos={0} grid={grid} flags={{}} h5BaseUrl={BASE} onNavigate={onNavigate} />
    )
    expect(screen.getByText('Send')).toBeOnTheScreen()
    expect(screen.getByText('Bills')).toBeOnTheScreen()
  })

  it('does not render the disabled tiles', async () => {
    const onNavigate = jest.fn()
    await render(
      <HomeView balanceCentavos={0} grid={grid} flags={{}} h5BaseUrl={BASE} onNavigate={onNavigate} />
    )
    expect(screen.queryByText('Hidden')).toBeNull()
  })

  it('does not render a tile disabled by greylisting flag', async () => {
    const onNavigate = jest.fn()
    // The flag key is snake_case on the wire: resolveTile looks up
    // `greylisting_${tile.key}`, so a camelCase key silently never matches.
    const flag = { greylisting_bills: '{"enabled": false}' }
    await render(
      <HomeView balanceCentavos={0} grid={grid} flags={flag} h5BaseUrl={BASE} onNavigate={onNavigate} />
    )
    expect(screen.queryByText('Bills')).toBeNull()
    expect(screen.getByText('Send')).toBeOnTheScreen()
  })

  it('emits a native nav intent when a native tile is pressed', async () => {
    const onNavigate = jest.fn()
    await render(
      <HomeView balanceCentavos={0} grid={grid} flags={{}} h5BaseUrl={BASE} onNavigate={onNavigate} />
    )
    await fireEvent.press(screen.getByText('Send'))
    expect(onNavigate).toHaveBeenCalledWith({ kind: 'native', route: 'send' })
  })

  it('emits a web nav intent when a web tile is pressed', async () => {
    const onNavigate = jest.fn()
    await render(
      <HomeView balanceCentavos={0} grid={grid} flags={{}} h5BaseUrl={BASE} onNavigate={onNavigate} />
    )
    await fireEvent.press(screen.getByText('Bills'))
    expect(onNavigate).toHaveBeenCalledWith({
      kind: 'h5',
      url: 'https://fintech.ctaprojects.xyz/h5/bills/',
    })
  })
})