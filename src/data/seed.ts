import type { LedgerEntry } from '../domain/ledger'

export const ACCOUNTS = {
  user: 'user:1',
  /** Money enters the demo from here. Expected to run negative — that is the point. */
  funding: 'funding:external',
  peer: 'user:2',
} as const

export const SEED_USER = {
  id: ACCOUNTS.user,
  /** Ten digits, no +63 prefix — the national number the input collects. */
  mobile: '9171234567',
  mpin: '123456',
  displayName: 'Troy',
} as const

const SEEDED_AT = '2026-07-01T00:00:00.000Z'
const OPENING_CENTAVOS = 645613

/** Even the opening balance is a balanced pair. Nothing is conjured. */
export function seedEntries(): LedgerEntry[] {
  return [
    {
      id: 'seed:credit',
      accountId: ACCOUNTS.user,
      txId: 'seed',
      amountCentavos: OPENING_CENTAVOS,
      createdAt: SEEDED_AT,
    },
    {
      id: 'seed:debit',
      accountId: ACCOUNTS.funding,
      txId: 'seed',
      amountCentavos: -OPENING_CENTAVOS,
      createdAt: SEEDED_AT,
    },
  ]
}
