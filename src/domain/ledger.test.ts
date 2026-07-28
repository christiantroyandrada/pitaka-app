import { balanceOf, isZeroSum, entriesForTx, type LedgerEntry } from './ledger'

const entry = (
  id: string,
  accountId: string,
  txId: string,
  amountCentavos: number,
): LedgerEntry => ({ id, accountId, txId, amountCentavos, createdAt: '2026-07-27T00:00:00.000Z' })

describe('balanceOf', () => {
  it('is zero for an account with no entries', () => {
    expect(balanceOf([], 'user:1')).toBe(0)
  })

  it('sums entries for the requested account only', () => {
    const entries = [
      entry('1', 'user:1', 'tx1', 10000),
      entry('2', 'user:2', 'tx1', -10000),
      entry('3', 'user:1', 'tx2', 2500),
    ]
    expect(balanceOf(entries, 'user:1')).toBe(12500)
  })

  it('handles debits', () => {
    const entries = [entry('1', 'user:1', 'tx1', 10000), entry('2', 'user:1', 'tx2', -3000)]
    expect(balanceOf(entries, 'user:1')).toBe(7000)
  })
})

describe('isZeroSum', () => {
  it('is true for a balanced pair', () => {
    const entries = [entry('1', 'user:1', 'tx1', -5000), entry('2', 'user:2', 'tx1', 5000)]
    expect(isZeroSum(entries)).toBe(true)
  })

  it('is true for an empty ledger', () => {
    expect(isZeroSum([])).toBe(true)
  })

  it('is false when entries do not balance', () => {
    const entries = [entry('1', 'user:1', 'tx1', -5000), entry('2', 'user:2', 'tx1', 4000)]
    expect(isZeroSum(entries)).toBe(false)
  })
})

describe('entriesForTx', () => {
  it('returns only the entries for one transaction', () => {
    const entries = [
      entry('1', 'user:1', 'tx1', -5000),
      entry('2', 'user:2', 'tx1', 5000),
      entry('3', 'user:1', 'tx2', 100),
    ]
    expect(entriesForTx(entries, 'tx1').map((e) => e.id)).toEqual(['1', '2'])
  })
})
