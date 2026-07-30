import { createBridgeClient } from './client'
import { createHostFor } from './register'
import { createMockHandlers } from './mock'
import { createNativeHandlers } from './native'
import { createWalletStore } from '@/data/walletStore'
import { ACCOUNTS } from '@/data/seed'
import type { HandlerSet } from './methods'
import { PROTOCOL_VERSION } from './envelope'

/**
 * Wires a client straight to a host in-process. No WebView, no postMessage, so
 * the whole surface is exercisable in a unit test.
 */
function connect(handlers: HandlerSet) {
  const host = createHostFor(handlers, {
    reply: (res) => client._receive(res),
    emit: (evt) => client._receiveEvent(evt),
  })
  const client = createBridgeClient({ send: (req) => void host.handle(req) })
  return { client, host }
}

/**
 * The same suite runs against the fixture handlers and the real ones. That is
 * what stops the mock drifting from the device: a contract change breaks both.
 */
const contract = (name: string, makeHandlers: () => HandlerSet) => {
  describe(`contract: ${name}`, () => {
    it('exposes exactly the v1 method surface', () => {
      const { host } = connect(makeHandlers())
      expect(host.methods().sort()).toEqual([
        'config.getFlags',
        'payments.requestPayment',
        'system.getEnvInfo',
        'ui.toast',
        'user.getProfile',
      ])
    })

    it('reports env info including the protocol version', async () => {
      const { client } = connect(makeHandlers())
      // Tied to the constant so bumping PROTOCOL_VERSION can't leave a host
      // advertising a version it no longer speaks.
      await expect(client.call('system.getEnvInfo')).resolves.toMatchObject({
        bridgeVersion: PROTOCOL_VERSION,
      })
    })

    it('never hands the WebView an unmasked mobile number', async () => {
      const { client } = connect(makeHandlers())
      const profile = (await client.call('user.getProfile')) as { maskedMobile: string }
      expect(profile.maskedMobile).toMatch(/^•+\d{2}$/)
      expect(profile.maskedMobile).not.toMatch(/^\d{10}$/)
    })

    it('returns only the flags asked for', async () => {
      const { client } = connect(makeHandlers())
      await expect(client.call('config.getFlags', { keys: [] })).resolves.toEqual({})
    })

    it('rejects a flags call with the wrong param shape', async () => {
      const { client } = connect(makeHandlers())
      await expect(client.call('config.getFlags', { keys: 'nope' })).rejects.toMatchObject({
        code: 'INVALID_PARAMS',
      })
    })

    it('accepts a toast', async () => {
      const { client } = connect(makeHandlers())
      await expect(client.call('ui.toast', { message: 'hi' })).resolves.toBeUndefined()
    })

    it('rejects an empty toast message', async () => {
      const { client } = connect(makeHandlers())
      await expect(client.call('ui.toast', { message: '' })).rejects.toMatchObject({
        code: 'INVALID_PARAMS',
      })
    })

    it('rejects an unknown method', async () => {
      const { client } = connect(makeHandlers())
      await expect(client.call('does.not.exist')).rejects.toMatchObject({
        code: 'METHOD_NOT_FOUND',
      })
    })

    describe('payments', () => {
      const payment = (over: Record<string, unknown> = {}) => ({
        amountCentavos: 5000,
        billerId: 'meralco',
        reference: '123456789',
        idempotencyKey: 'idem-1',
        ...over,
      })

      it('completes a payment and returns a transaction id', async () => {
        const { client } = connect(makeHandlers())
        const res = (await client.call('payments.requestPayment', payment())) as {
          transactionId: string
          status: string
        }
        expect(res.status).toBe('completed')
        expect(res.transactionId).toBeTruthy()
      })

      // The H5 recovery path after a TIMEOUT is to retry the same key, so both
      // implementations must treat that as one operation.
      it('replaying a key returns the original transaction', async () => {
        const { client } = connect(makeHandlers())
        const first = (await client.call('payments.requestPayment', payment())) as {
          transactionId: string
        }
        const replay = (await client.call('payments.requestPayment', payment())) as {
          transactionId: string
        }
        expect(replay.transactionId).toBe(first.transactionId)
      })

      // The H5 can tell a refusal from a bug only if the code survives the hop.
      it('refuses the same key with a different amount', async () => {
        const { client } = connect(makeHandlers())
        await client.call('payments.requestPayment', payment())
        await expect(
          client.call('payments.requestPayment', payment({ amountCentavos: 9999 })),
        ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
      })

      it('rejects a zero amount', async () => {
        const { client } = connect(makeHandlers())
        await expect(
          client.call('payments.requestPayment', payment({ amountCentavos: 0 })),
        ).rejects.toMatchObject({ code: 'INVALID_PARAMS' })
      })

      it('rejects a non-integer amount', async () => {
        const { client } = connect(makeHandlers())
        await expect(
          client.call('payments.requestPayment', payment({ amountCentavos: 10.5 })),
        ).rejects.toMatchObject({ code: 'INVALID_PARAMS' })
      })

      it('rejects a missing idempotency key', async () => {
        const { client } = connect(makeHandlers())
        await expect(
          client.call('payments.requestPayment', payment({ idempotencyKey: '' })),
        ).rejects.toMatchObject({ code: 'INVALID_PARAMS' })
      })
    })
  })
}

contract('browser mock', () => createMockHandlers())
contract('native host', () => createNativeHandlers(createWalletStore()))

// Only the real host touches the ledger, so these live outside the shared suite.
describe('native host over the real ledger', () => {
  it('a bridge payment debits the wallet', async () => {
    const store = createWalletStore()
    const before = store.getBalance(ACCOUNTS.user)
    const { client } = connect(createNativeHandlers(store))

    await client.call('payments.requestPayment', {
      amountCentavos: 5000,
      billerId: 'meralco',
      reference: '123456789',
      idempotencyKey: 'idem-ledger',
    })

    expect(store.getBalance(ACCOUNTS.user)).toBe(before - 5000)
  })

  it('credits a per-biller account so the ledger stays zero-sum', async () => {
    const store = createWalletStore()
    const { client } = connect(createNativeHandlers(store))

    await client.call('payments.requestPayment', {
      amountCentavos: 5000,
      billerId: 'meralco',
      reference: '123456789',
      idempotencyKey: 'idem-zero',
    })

    expect(store.getBalance('biller:meralco')).toBe(5000)
    expect(store.getEntries().reduce((s, e) => s + e.amountCentavos, 0)).toBe(0)
  })

  it('surfaces an overdraft as INSUFFICIENT_FUNDS rather than moving money', async () => {
    const store = createWalletStore()
    const before = store.getBalance(ACCOUNTS.user)
    const { client } = connect(createNativeHandlers(store))

    await expect(
      client.call('payments.requestPayment', {
        amountCentavos: 99_999_999,
        billerId: 'meralco',
        reference: '1',
        idempotencyKey: 'idem-over',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' })

    expect(store.getBalance(ACCOUNTS.user)).toBe(before)
  })
})
