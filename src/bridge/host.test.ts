import { z } from 'zod'
import { createBridgeHost } from './host'
import { PROTOCOL_VERSION, type BridgeResponse } from './envelope'

const setup = () => {
  const out: BridgeResponse[] = []
  const host = createBridgeHost({ reply: (res) => out.push(res) })
  return { out, host }
}

const req = (method: string, params?: unknown, id = 'r1') => ({
  id,
  v: PROTOCOL_VERSION,
  method,
  params,
})

describe('dispatch', () => {
  it('replies with the handler result', async () => {
    const { out, host } = setup()
    host.register('user.getProfile', { handler: () => ({ userId: 'user:1' }) })
    await host.handle(req('user.getProfile'))
    expect(out[0]).toEqual({ id: 'r1', ok: true, result: { userId: 'user:1' } })
  })

  it('awaits an async handler', async () => {
    const { out, host } = setup()
    host.register('slow', { handler: async () => 'done' })
    await host.handle(req('slow'))
    expect(out[0]).toEqual({ id: 'r1', ok: true, result: 'done' })
  })

  it('echoes the request id so the client can correlate', async () => {
    const { out, host } = setup()
    host.register('ping', { handler: () => 'pong' })
    await host.handle(req('ping', undefined, 'abc'))
    expect(out[0].id).toBe('abc')
  })

  it('answers METHOD_NOT_FOUND for an unregistered method', async () => {
    const { out, host } = setup()
    await host.handle(req('does.not.exist'))
    expect(out[0]).toMatchObject({ ok: false, error: { code: 'METHOD_NOT_FOUND' } })
  })
})

describe('params validation', () => {
  const schema = z.object({ amountCentavos: z.number().int().positive() })

  it('passes validated params to the handler', async () => {
    const { out, host } = setup()
    host.register('pay', { schema, handler: (p) => p.amountCentavos })
    await host.handle(req('pay', { amountCentavos: 500 }))
    expect(out[0]).toEqual({ id: 'r1', ok: true, result: 500 })
  })

  it('answers INVALID_PARAMS when the shape is wrong', async () => {
    const { out, host } = setup()
    host.register('pay', { schema, handler: (p) => p.amountCentavos })
    await host.handle(req('pay', { amountCentavos: -1 }))
    expect(out[0]).toMatchObject({ ok: false, error: { code: 'INVALID_PARAMS' } })
  })

  it('answers INVALID_PARAMS when params are missing entirely', async () => {
    const { out, host } = setup()
    host.register('pay', { schema, handler: (p) => p.amountCentavos })
    await host.handle(req('pay'))
    expect(out[0]).toMatchObject({ ok: false, error: { code: 'INVALID_PARAMS' } })
  })
})

describe('failure containment', () => {
  it('turns a thrown handler into INTERNAL rather than crashing', async () => {
    const { out, host } = setup()
    host.register('boom', {
      handler: () => {
        throw new Error('kaboom')
      },
    })
    await host.handle(req('boom'))
    expect(out[0]).toMatchObject({ ok: false, error: { code: 'INTERNAL' } })
  })

  // A handler's internal message could name a file path or a token.
  it('does not leak the thrown message to the caller', async () => {
    const { out, host } = setup()
    host.register('boom', {
      handler: () => {
        throw new Error('secret at /Users/troy/.ssh/id_rsa')
      },
    })
    await host.handle(req('boom'))
    const res = out[0]
    if (res.ok) throw new Error('expected failure')
    expect(res.error.message).not.toContain('id_rsa')
  })

  it('rejects a request with the wrong protocol version', async () => {
    const { out, host } = setup()
    host.register('ping', { handler: () => 'pong' })
    await host.handle({ id: 'r1', v: 99 as unknown as 1, method: 'ping' })
    expect(out[0]).toMatchObject({ ok: false, error: { code: 'VERSION_MISMATCH' } })
  })

  it('ignores a malformed request instead of replying', async () => {
    const { out, host } = setup()
    await host.handle({ nonsense: true } as unknown as never)
    expect(out).toHaveLength(0)
  })
})

describe('events', () => {
  it('emits an event envelope to the client', () => {
    const seen: unknown[] = []
    const host = createBridgeHost({ reply: () => {}, emit: (e) => seen.push(e) })
    host.sendEvent('onResume', { at: 1 })
    expect(seen).toEqual([{ v: PROTOCOL_VERSION, event: 'onResume', payload: { at: 1 } }])
  })
})
