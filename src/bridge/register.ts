import { createBridgeHost, type BridgeHost } from './host'
import { schemas, type HandlerSet } from './methods'
import type { BridgeEvent, BridgeResponse } from './envelope'

/**
 * Binds a handler set to the wire method names. Both the mock and the native
 * host go through here, so neither can quietly expose a different surface.
 */
export function createHostFor(
  handlers: HandlerSet,
  io: { reply: (r: BridgeResponse) => void; emit?: (e: BridgeEvent) => void },
): BridgeHost {
  const host = createBridgeHost(io)

  host.register('system.getEnvInfo', { handler: () => handlers.getEnvInfo() })
  host.register('user.getProfile', { handler: () => handlers.getProfile() })
  host.register('config.getFlags', {
    schema: schemas['config.getFlags'],
    handler: (p) => handlers.getFlags(p),
  })
  host.register('ui.toast', {
    schema: schemas['ui.toast'],
    handler: (p) => handlers.toast(p),
  })
  host.register('payments.requestPayment', {
    schema: schemas['payments.requestPayment'],
    handler: (p) => handlers.requestPayment(p),
  })

  return host
}
