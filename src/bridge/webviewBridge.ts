import { createHostFor } from './register'
import type { HandlerSet } from './methods'
import type { BridgeEvent, BridgeRequest, BridgeResponse } from './envelope'

type Injector = (js: string) => void

/**
 * Glue between a WebView and the host registry. Native never installs the
 * bridge object; the H5 bundle owns it and this only delivers JSON into it.
 * See ADR 3.
 */
export function createWebViewBridge(handlers: HandlerSet, inject: Injector) {
  // Bumped on every load so a reply from a previous document is dropped rather
  // than delivered to a page that no longer exists. See ADR 3.
  let loadId = 0

  // The generation a request arrived in, captured on the way in. Reading loadId
  // when the reply is produced would compare the new generation against itself.
  const arrivedIn = new Map<string, number>()

  const deliver = (fn: string, payload: BridgeResponse | BridgeEvent, forLoad: number) => {
    if (forLoad !== loadId) return
    // JSON.stringify twice so the payload survives as a string literal.
    inject(`window.__PITAKA_BRIDGE__ && window.__PITAKA_BRIDGE__.${fn}(${JSON.stringify(
      JSON.stringify(payload),
    )}); true;`)
  }

  const host = createHostFor(handlers, {
    reply: (res) => {
      const forLoad = arrivedIn.get(res.id) ?? -1
      arrivedIn.delete(res.id)
      deliver('_receiveJSON', res, forLoad)
    },
    emit: (evt) => deliver('_receiveEventJSON', evt, loadId),
  })

  return {
    /** Call from onLoadStart so in-flight replies for the old document are dropped. */
    onLoadStart: () => {
      loadId += 1
      arrivedIn.clear()
    },
    /** Call from onMessage with event.nativeEvent.data. */
    onMessage: (raw: string) => {
      let req: BridgeRequest
      try {
        req = JSON.parse(raw)
      } catch {
        return
      }
      if (typeof req?.id === 'string') arrivedIn.set(req.id, loadId)
      void host.handle(req)
    },
    sendEvent: host.sendEvent,
    currentLoadId: () => loadId,
  }
}
