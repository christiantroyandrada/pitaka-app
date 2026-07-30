import {
  BridgeCallError,
  PROTOCOL_VERSION,
  timeoutFor,
  type BridgeEvent,
  type BridgeRequest,
  type BridgeResponse,
} from './envelope'

export type EventHandler = (payload?: unknown) => void

export type BridgeClient = {
  call: (method: string, params?: unknown) => Promise<unknown>
  on: (event: string, handler: EventHandler) => () => void
  dispose: () => void
  /** Test seam. Also handy for the in-WebView debug overlay. */
  pendingCount: () => number
  _receive: (res: BridgeResponse) => void
  _receiveEvent: (evt: BridgeEvent) => void
}

type Options = {
  send: (req: BridgeRequest) => void
  /** Overridable so tests don't depend on a global. */
  idFactory?: () => string
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (err: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

let counter = 0
const defaultIdFactory = (): string => {
  counter += 1
  return `c${counter}-${Math.round(Math.random() * 1e9)}`
}

export function createBridgeClient({
  send,
  idFactory = defaultIdFactory,
}: Options): BridgeClient {
  const pending = new Map<string, Pending>()
  const listeners = new Map<string, Set<EventHandler>>()
  let disposed = false

  const settle = (id: string): Pending | undefined => {
    const entry = pending.get(id)
    if (!entry) return undefined
    clearTimeout(entry.timer)
    pending.delete(id)
    return entry
  }

  const call = (method: string, params?: unknown): Promise<unknown> => {
    if (disposed) {
      return Promise.reject(
        new BridgeCallError({ code: 'BRIDGE_UNAVAILABLE', message: 'bridge disposed' }),
      )
    }

    const id = idFactory()

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Evict before rejecting so a late reply for this id finds nothing,
        // rather than resolving a promise the caller has already handled.
        pending.delete(id)
        reject(
          new BridgeCallError({
            code: 'TIMEOUT',
            message: `${method} timed out after ${timeoutFor(method)}ms`,
          }),
        )
      }, timeoutFor(method))

      pending.set(id, { resolve, reject, timer })
      send({ id, v: PROTOCOL_VERSION, method, params })
    })
  }

  const _receive = (res: BridgeResponse): void => {
    if (!res || typeof res !== 'object' || typeof res.id !== 'string') return
    const entry = settle(res.id)
    if (!entry) return
    if (res.ok) entry.resolve(res.result)
    else entry.reject(new BridgeCallError(res.error))
  }

  const _receiveEvent = (evt: BridgeEvent): void => {
    if (!evt || typeof evt !== 'object') return
    const handlers = listeners.get(evt.event)
    if (!handlers) return
    // One bad subscriber must not starve the rest.
    handlers.forEach((h) => {
      try {
        h(evt.payload)
      } catch {
        /* swallowed on purpose */
      }
    })
  }

  const on = (event: string, handler: EventHandler): (() => void) => {
    const set = listeners.get(event) ?? new Set<EventHandler>()
    set.add(handler)
    listeners.set(event, set)
    return () => {
      set.delete(handler)
    }
  }

  const dispose = (): void => {
    disposed = true
    pending.forEach((entry, id) => {
      clearTimeout(entry.timer)
      pending.delete(id)
      entry.reject(
        new BridgeCallError({ code: 'BRIDGE_UNAVAILABLE', message: 'document went away' }),
      )
    })
    listeners.clear()
  }

  return { call, on, dispose, pendingCount: () => pending.size, _receive, _receiveEvent }
}
