import { createBridgeClient } from './client'
import {
  DEFAULT_TIMEOUT_MS,
  INTERACTIVE_TIMEOUT_MS,
  PROTOCOL_VERSION,
  type BridgeRequest,
} from './envelope'

const setup = () => {
  const sent: BridgeRequest[] = []
  const client = createBridgeClient({ send: (req) => sent.push(req) })
  return { sent, client }
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('call', () => {
  it('sends a versioned envelope with a correlation id', async () => {
    const { sent, client } = setup()
    void client.call('system.getEnvInfo')
    expect(sent).toHaveLength(1)
    expect(sent[0].v).toBe(PROTOCOL_VERSION)
    expect(sent[0].method).toBe('system.getEnvInfo')
    expect(sent[0].id).toBeTruthy()
  })

  it('gives every call a distinct id', () => {
    const { sent, client } = setup()
    void client.call('a')
    void client.call('b')
    expect(sent[0].id).not.toBe(sent[1].id)
  })

  it('resolves with the result the host returns', async () => {
    const { sent, client } = setup()
    const promise = client.call('user.getProfile')
    client._receive({ id: sent[0].id, ok: true, result: { userId: 'user:1' } })
    await expect(promise).resolves.toEqual({ userId: 'user:1' })
  })

  it('rejects with the host error code', async () => {
    const { sent, client } = setup()
    const promise = client.call('nope')
    client._receive({
      id: sent[0].id,
      ok: false,
      error: { code: 'METHOD_NOT_FOUND', message: 'no such method' },
    })
    await expect(promise).rejects.toMatchObject({ code: 'METHOD_NOT_FOUND' })
  })
})

describe('timeouts', () => {
  it('rejects with TIMEOUT when the host never answers', async () => {
    const { client } = setup()
    const promise = client.call('system.getEnvInfo')
    const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' })
    jest.advanceTimersByTime(DEFAULT_TIMEOUT_MS)
    await assertion
  })

  it('gives interactive methods a longer deadline', async () => {
    const { sent, client } = setup()
    const promise = client.call('payments.requestPayment', { amountCentavos: 100 })

    jest.advanceTimersByTime(DEFAULT_TIMEOUT_MS + 1)
    client._receive({ id: sent[0].id, ok: true, result: { transactionId: 'tx:1' } })
    await expect(promise).resolves.toEqual({ transactionId: 'tx:1' })
  })

  it('still times out an interactive method eventually', async () => {
    const { client } = setup()
    const promise = client.call('ui.confirm', { title: 'ok?' })
    const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' })
    jest.advanceTimersByTime(INTERACTIVE_TIMEOUT_MS)
    await assertion
  })

  // A timeout means the H5 stopped waiting, not that nothing happened. A late
  // reply must not resolve a promise the caller already handled. See ADR 2.
  it('drops a late response for an evicted call', async () => {
    const { sent, client } = setup()
    const promise = client.call('payments.requestPayment')
    const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' })
    jest.advanceTimersByTime(INTERACTIVE_TIMEOUT_MS)
    await assertion

    expect(() =>
      client._receive({ id: sent[0].id, ok: true, result: { transactionId: 'tx:1' } }),
    ).not.toThrow()
  })

  it('clears the timer once a call settles', async () => {
    const { sent, client } = setup()
    const promise = client.call('system.getEnvInfo')
    client._receive({ id: sent[0].id, ok: true, result: {} })
    await promise
    expect(client.pendingCount()).toBe(0)
  })
})

describe('malformed traffic', () => {
  it('ignores a response for an unknown id', () => {
    const { client } = setup()
    expect(() => client._receive({ id: 'nope', ok: true, result: 1 })).not.toThrow()
  })

  it('ignores a response that is not an object', () => {
    const { client } = setup()
    expect(() => client._receive('garbage' as unknown as never)).not.toThrow()
  })
})

describe('events', () => {
  it('delivers a host event to a subscriber', () => {
    const { client } = setup()
    const seen: unknown[] = []
    client.on('onResume', (payload) => seen.push(payload))
    client._receiveEvent({ v: PROTOCOL_VERSION, event: 'onResume', payload: { at: 1 } })
    expect(seen).toEqual([{ at: 1 }])
  })

  it('stops delivering after unsubscribe', () => {
    const { client } = setup()
    let calls = 0
    const off = client.on('onResume', () => { calls += 1 })
    off()
    client._receiveEvent({ v: PROTOCOL_VERSION, event: 'onResume' })
    expect(calls).toBe(0)
  })

  it('ignores an event with no subscriber', () => {
    const { client } = setup()
    expect(() =>
      client._receiveEvent({ v: PROTOCOL_VERSION, event: 'onNothing' }),
    ).not.toThrow()
  })

  it('one throwing subscriber does not stop the others', () => {
    const { client } = setup()
    let reached = false
    client.on('onResume', () => { throw new Error('boom') })
    client.on('onResume', () => { reached = true })
    client._receiveEvent({ v: PROTOCOL_VERSION, event: 'onResume' })
    expect(reached).toBe(true)
  })
})

describe('document lifecycle', () => {
  // An in-flight await must not outlive its document. See ADR 3.
  it('rejects everything pending on dispose', async () => {
    const { client } = setup()
    const promise = client.call('system.getEnvInfo')
    client.dispose()
    await expect(promise).rejects.toMatchObject({ code: 'BRIDGE_UNAVAILABLE' })
    expect(client.pendingCount()).toBe(0)
  })

  it('refuses new calls after dispose', async () => {
    const { client } = setup()
    client.dispose()
    await expect(client.call('system.getEnvInfo')).rejects.toMatchObject({
      code: 'BRIDGE_UNAVAILABLE',
    })
  })

  it('does not send after dispose', async () => {
    const { sent, client } = setup()
    client.dispose()
    await client.call('a').catch(() => {})
    expect(sent).toHaveLength(0)
  })
})
