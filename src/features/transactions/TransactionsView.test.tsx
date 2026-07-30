import React from 'react'
import { render, screen, } from '@testing-library/react-native'
import { TransactionsView } from './TransactionsView'
import type { LedgerEntry } from '@/domain/ledger'

const entry = (id: string, amountCentavos: number, createdAt: string):
LedgerEntry => ({
  id,
  accountId: 'user:1',
  txId: id,
  amountCentavos,
  createdAt,
})

describe('TransactionsView', () => {
  it('shows an empty state when there are no transactions', async () => {
    await render(<TransactionsView entries={[]} accountId="user:1" />)
    expect(screen.getByText('No transactions yet')).toBeOnTheScreen()
  })

  it('list entries only for the given account', async () => {
    const entries:LedgerEntry[] = [
      entry('a', -5000, '2026-07-01T00:00:00.000Z'),
      {...entry('b', 5000, '2026-07-01T00:00:00.000Z'), accountId: 'user:2'},
    ]
    await render(<TransactionsView entries={entries} accountId="user:1" />)
    expect(screen.getAllByLabelText(/pesos/)).toHaveLength(1)
  })

  it('shows newest transactions first', async () => {
    const entries:LedgerEntry[] = [
      entry('old', -100, '2026-07-01T00:00:00.000Z'),
      entry('new', -200, '2026-07-05T00:00:00.000Z'),
    ]
    await render(<TransactionsView entries={entries} accountId="user:1" />)
    // Assert on the dates, since the date is what the ordering is keyed on.
    const dates = screen.getAllByText(/^\d{4}-\d{2}-\d{2}$/)
    expect(dates.map((d) => d.props.children)).toEqual(['2026-07-05', '2026-07-01'])
  })

  it('labels a debit as sent and credit as receive', async () => {
    const entries:LedgerEntry[] = [
      entry('debit', -5000, '2026-07-02T00:00:00.000Z'),
      entry('credit', 3000, '2026-07-01T00:00:00.000Z'),
    ]
    await render(<TransactionsView entries={entries} accountId="user:1" />)
    expect(screen.getByText('Sent')).toBeOnTheScreen()
    expect(screen.getByText('Received')).toBeOnTheScreen()
  })
})