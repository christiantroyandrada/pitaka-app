import { createWebViewBridge } from './webviewBridge'
import { createBridgeClient } from './client'
import { createNativeHandlers } from './native'
import { createWalletStore } from '@/data/walletStore'
import { ACCOUNTS } from '@/data/seed'

/**
 * End to end through the real injection boundary.
 *
 * `react-native-webview` has no web implementation and this machine has no
 * simulator, so the native transport itself can't be exercised here. What this
 * does cover is every layer we own on both sides: the client serialises a
 * request, the host parses it, dispatches, serialises a reply, and the injected
 * script string is evaluated to hand it back. The only untested link is
 * react-native-webview's own postMessage plumbing.
 */
function loopback(store = createWalletStore()) {
  const injected: string[] = []

  const bridge = createWebViewBridge(createNativeHandlers(store), (js) => {
    injected.push(js)
    // Stand in for the WebView evaluating the injected script. The host builds
    // `window.__PITAKA_BRIDGE__ && window.__PITAKA_BRIDGE__._receiveJSON("...")`,
    // so pull the JSON literal out and feed the real client entry point.
    const match = /_receive(?:Event)?JSON\((".*")\);/s.exec(js)
    if (!match) return
    const raw = JSON.parse(match[1]) as string
    if (js.includes('_receiveEventJSON')) client._receiveEventJSON(raw)
    else client._receiveJSON(raw)
  })

  // The H5 side posts a string, exactly as window.ReactNativeWebView.postMessage does.
  const client = createBridgeClient({
    send: (req) => bridge.onMessage(JSON.stringify(req)),
  })

  return { client, bridge, injected, store }
}

describe('client to host and back', () => {
  it('resolves a real call across the serialisation boundary', async () => {
    const { client } = loopback()
    await expect(client.call('system.getEnvInfo')).resolves.toMatchObject({
      platform: 'native',
      bridgeVersion: 1,
    })
  })

  it('carries a masked mobile number through, never the raw one', async () => {
    const { client } = loopback()
    const profile = (await client.call('user.getProfile')) as { maskedMobile: string }
    expect(profile.maskedMobile).toMatch(/^•+\d{2}$/)
  })

  it('surfaces a validation failure as INVALID_PARAMS', async () => {
    const { client } = loopback()
    await expect(client.call('ui.toast', { message: '' })).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
    })
  })

  it('surfaces an unknown method as METHOD_NOT_FOUND', async () => {
    const { client } = loopback()
    await expect(client.call('nope')).rejects.toMatchObject({ code: 'METHOD_NOT_FOUND' })
  })

  it('moves money on the ledger from an H5-initiated payment', async () => {
    const { client, store } = loopback()
    const before = store.getBalance(ACCOUNTS.user)

    const res = (await client.call('payments.requestPayment', {
      amountCentavos: 5000,
      billerId: 'meralco',
      reference: '123456789',
      idempotencyKey: 'loopback-1',
    })) as { transactionId: string; status: string }

    expect(res.status).toBe('completed')
    expect(store.getBalance(ACCOUNTS.user)).toBe(before - 5000)
    expect(store.getEntries().reduce((s, e) => s + e.amountCentavos, 0)).toBe(0)
  })

  it('a retried payment with the same key does not charge twice', async () => {
    const { client, store } = loopback()
    const before = store.getBalance(ACCOUNTS.user)
    const params = {
      amountCentavos: 5000,
      billerId: 'meralco',
      reference: '123456789',
      idempotencyKey: 'loopback-retry',
    }

    const first = (await client.call('payments.requestPayment', params)) as {
      transactionId: string
    }
    const retry = (await client.call('payments.requestPayment', params)) as {
      transactionId: string
    }

    expect(retry.transactionId).toBe(first.transactionId)
    expect(store.getBalance(ACCOUNTS.user)).toBe(before - 5000)
  })

  it('delivers a host event to an H5 subscriber', () => {
    const { client, bridge } = loopback()
    const seen: unknown[] = []
    client.on('onResume', (p) => seen.push(p))
    bridge.sendEvent('onResume', { at: 1 })
    expect(seen).toEqual([{ at: 1 }])
  })

  it('drops a reply once the document has navigated', async () => {
    const { client, bridge, injected } = loopback()
    const promise = client.call('system.getEnvInfo')
    bridge.onLoadStart()
    await new Promise<void>((r) => setImmediate(() => r()))

    expect(injected).toHaveLength(0)
    expect(client.pendingCount()).toBe(1)
    client.dispose()
    await expect(promise).rejects.toMatchObject({ code: 'BRIDGE_UNAVAILABLE' })
  })
})
