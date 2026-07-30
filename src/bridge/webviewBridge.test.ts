import { createWebViewBridge } from './webviewBridge'
import { createMockHandlers } from './mock'
import { PROTOCOL_VERSION } from './envelope'

const setup = () => {
  const injected: string[] = []
  const bridge = createWebViewBridge(createMockHandlers(), (js) => injected.push(js))
  return { injected, bridge }
}

const request = (method: string, params?: unknown, id = 'r1') =>
  JSON.stringify({ id, v: PROTOCOL_VERSION, method, params })

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()))

describe('onMessage', () => {
  it('answers a valid request by injecting into the page', async () => {
    const { injected, bridge } = setup()
    bridge.onMessage(request('system.getEnvInfo'))
    await flush()
    expect(injected).toHaveLength(1)
    expect(injected[0]).toContain('__PITAKA_BRIDGE__')
    expect(injected[0]).toContain('_receiveJSON')
  })

  it('guards the call so a page without the bridge object is a no-op', async () => {
    const { injected, bridge } = setup()
    bridge.onMessage(request('system.getEnvInfo'))
    await flush()
    expect(injected[0]).toMatch(/^window\.__PITAKA_BRIDGE__ &&/)
  })

  it('ends the injected script with true so iOS does not warn', async () => {
    const { injected, bridge } = setup()
    bridge.onMessage(request('system.getEnvInfo'))
    await flush()
    expect(injected[0].trim().endsWith('true;')).toBe(true)
  })

  it('ignores malformed json without throwing', () => {
    const { injected, bridge } = setup()
    expect(() => bridge.onMessage('{not json')).not.toThrow()
    expect(injected).toHaveLength(0)
  })

  it('answers an unknown method with an error rather than silence', async () => {
    const { injected, bridge } = setup()
    bridge.onMessage(request('does.not.exist'))
    await flush()
    expect(injected[0]).toContain('METHOD_NOT_FOUND')
  })
})

describe('load generation guard', () => {
  it('increments the generation on each load', () => {
    const { bridge } = setup()
    const before = bridge.currentLoadId()
    bridge.onLoadStart()
    expect(bridge.currentLoadId()).toBe(before + 1)
  })

  // A reply for a document that has since navigated must not be delivered to
  // whatever page now occupies the WebView. See ADR 3.
  it('drops a reply once the document has navigated', async () => {
    const { injected, bridge } = setup()
    bridge.onMessage(request('system.getEnvInfo'))
    bridge.onLoadStart()
    await flush()
    expect(injected).toHaveLength(0)
  })

  it('delivers replies again for the new document', async () => {
    const { injected, bridge } = setup()
    bridge.onLoadStart()
    bridge.onMessage(request('system.getEnvInfo'))
    await flush()
    expect(injected).toHaveLength(1)
  })
})

describe('events', () => {
  it('injects an event envelope', () => {
    const { injected, bridge } = setup()
    bridge.sendEvent('onResume', { at: 1 })
    expect(injected[0]).toContain('_receiveEventJSON')
    expect(injected[0]).toContain('onResume')
  })
})
