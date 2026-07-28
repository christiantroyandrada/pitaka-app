import { createWalletStore } from './walletStore'
import { ACCOUNTS } from './seed'
import { isZeroSum } from '../domain/ledger'

const OPENING = 645613

describe('walletStore', () => {
  it('starts with the seeded opening balance', () => {
    const store = createWalletStore()
    expect(store.getBalance(ACCOUNTS.user)).toBe(OPENING)
  })

  it('seed entries are zero-sum', () => {
    const store = createWalletStore()
    expect(isZeroSum(store.getEntries())).toBe(true)
  })

  it('a successful transfer lowers the balance', () => {
    const store = createWalletStore()
    const result = store.transfer({
      to: ACCOUNTS.peer,
      amountCentavos: 5000,
      idempotencyKey: 'k1',
    })
    expect(result.ok).toBe(true)
    expect(store.getBalance(ACCOUNTS.user)).toBe(OPENING - 5000)
  })

  it('the ledger stays zero-sum after a transfer', () => {
    const store = createWalletStore()
    store.transfer({ to: ACCOUNTS.peer, amountCentavos: 5000, idempotencyKey: 'k1' })
    expect(isZeroSum(store.getEntries())).toBe(true)
  })

  it('replaying an idempotency key does not move money twice', () => {
    const store = createWalletStore()
    const req = { to: ACCOUNTS.peer, amountCentavos: 5000, idempotencyKey: 'k1' } as const
    store.transfer(req)
    store.transfer(req)
    expect(store.getBalance(ACCOUNTS.user)).toBe(OPENING - 5000)
  })

  it('rejects an overdraft and leaves the balance untouched', () => {
    const store = createWalletStore()
    const result = store.transfer({
      to: ACCOUNTS.peer,
      amountCentavos: 99999999,
      idempotencyKey: 'k2',
    })
    expect(result).toEqual({ ok: false, code: 'INSUFFICIENT_FUNDS' })
    expect(store.getBalance(ACCOUNTS.user)).toBe(OPENING)
  })

  it('notifies subscribers when the ledger changes', () => {
    const store = createWalletStore()
    const seen: number[] = []
    store.subscribe(() => seen.push(store.getBalance(ACCOUNTS.user)))
    store.transfer({ to: ACCOUNTS.peer, amountCentavos: 100, idempotencyKey: 'k3' })
    expect(seen).toEqual([OPENING - 100])
  })

  it('does not notify subscribers when a transfer is rejected', () => {
    const store = createWalletStore()
    let calls = 0
    store.subscribe(() => {
      calls += 1
    })
    store.transfer({ to: ACCOUNTS.peer, amountCentavos: 99999999, idempotencyKey: 'k4' })
    expect(calls).toBe(0)
  })

  it('returns a stable entries reference between changes so React can bail out', () => {
    const store = createWalletStore()
    expect(store.getEntries()).toBe(store.getEntries())
  })
})
