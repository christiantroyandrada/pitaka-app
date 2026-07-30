import { applyTransfer, type TransferRequest } from './transfer'
import { balanceOf, isZeroSum, type LedgerEntry } from './ledger'

const NOW = '2026-07-27T00:00:00.000Z'

const opening = (accountId: string, amountCentavos: number): LedgerEntry => ({
  id: `open-${accountId}`,
  accountId,
  txId: 'opening',
  amountCentavos,
  createdAt: NOW,
})

const req = (over: Partial<TransferRequest> = {}): TransferRequest => ({
  from: 'user:1',
  to: 'user:2',
  amountCentavos: 5000,
  idempotencyKey: 'key-1',
  ...over,
})

describe('applyTransfer', () => {
  it('writes a balanced pair of entries', () => {
    const entries = [opening('user:1', 10000)]
    const result = applyTransfer(entries, req(), NOW)
    if (!result.ok) throw new Error('expected success')
    expect(result.entries).toHaveLength(2)
    expect(isZeroSum(result.entries)).toBe(true)
  })

  it('debits the sender and credits the recipient', () => {
    const entries = [opening('user:1', 10000)]
    const result = applyTransfer(entries, req(), NOW)
    if (!result.ok) throw new Error('expected success')
    const after = [...entries, ...result.entries]
    expect(balanceOf(after, 'user:1')).toBe(5000)
    expect(balanceOf(after, 'user:2')).toBe(5000)
  })

  it('rejects a transfer larger than the balance', () => {
    const entries = [opening('user:1', 1000)]
    const result = applyTransfer(entries, req({ amountCentavos: 5000 }), NOW)
    expect(result).toEqual({ ok: false, code: 'INSUFFICIENT_FUNDS' })
  })

  it('rejects a zero amount', () => {
    const entries = [opening('user:1', 10000)]
    const result = applyTransfer(entries, req({ amountCentavos: 0 }), NOW)
    expect(result).toEqual({ ok: false, code: 'INVALID_AMOUNT' })
  })

  it('rejects a negative amount', () => {
    const entries = [opening('user:1', 10000)]
    const result = applyTransfer(entries, req({ amountCentavos: -100 }), NOW)
    expect(result).toEqual({ ok: false, code: 'INVALID_AMOUNT' })
  })

  it('rejects a non-integer amount', () => {
    const entries = [opening('user:1', 10000)]
    const result = applyTransfer(entries, req({ amountCentavos: 10.5 }), NOW)
    expect(result).toEqual({ ok: false, code: 'INVALID_AMOUNT' })
  })

  it('replaying the same key does not move money twice', () => {
    const entries = [opening('user:1', 10000)]
    const first = applyTransfer(entries, req(), NOW)
    if (!first.ok) throw new Error('expected success')
    const after = [...entries, ...first.entries]

    const replay = applyTransfer(after, req(), NOW)
    if (!replay.ok) throw new Error('expected replay to succeed')
    expect(replay.txId).toBe(first.txId)
    expect(replay.entries).toEqual([])
    expect(balanceOf([...after, ...replay.entries], 'user:1')).toBe(5000)
  })

  it('rejects reusing a key with a different amount', () => {
    const entries = [opening('user:1', 10000)]
    const first = applyTransfer(entries, req(), NOW)
    if (!first.ok) throw new Error('expected success')
    const after = [...entries, ...first.entries]

    const result = applyTransfer(after, req({ amountCentavos: 9999 }), NOW)
    expect(result).toEqual({ ok: false, code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  it('rejects reusing a key with a different recipient', () => {
    // Same payer, same amount, different payee. Treating this as a replay would
    // hand back a success receipt for money the new payee never received.
    const entries = [opening('user:1', 10000)]
    const first = applyTransfer(entries, req(), NOW)
    if (!first.ok) throw new Error('expected success')
    const after = [...entries, ...first.entries]

    const result = applyTransfer(after, req({ to: 'user:3' }), NOW)
    expect(result).toEqual({ ok: false, code: 'IDEMPOTENCY_KEY_REUSED' })
    expect(balanceOf(after, 'user:3')).toBe(0)
  })

  it('still replays cleanly when payer, payee and amount all match', () => {
    const entries = [opening('user:1', 10000)]
    const first = applyTransfer(entries, req(), NOW)
    if (!first.ok) throw new Error('expected success')
    const after = [...entries, ...first.entries]

    const replay = applyTransfer(after, req(), NOW)
    if (!replay.ok) throw new Error('expected replay to succeed')
    expect(replay.entries).toEqual([])
  })
})
