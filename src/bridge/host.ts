import type { z } from 'zod'
import {
  PROTOCOL_VERSION,
  type BridgeEvent,
  type BridgeRequest,
  type BridgeResponse,
  type ErrorCode,
} from './envelope'

type Handler<T> = (params: T) => unknown | Promise<unknown>

type Registration<T> = {
  /** Omit for methods that take no params. */
  schema?: z.ZodType<T>
  handler: Handler<T>
}

export type BridgeHost = {
  register: <T>(method: string, reg: Registration<T>) => void
  handle: (req: BridgeRequest) => Promise<void>
  sendEvent: (event: string, payload?: unknown) => void
  methods: () => string[]
}

type Options = {
  reply: (res: BridgeResponse) => void
  emit?: (evt: BridgeEvent) => void
}

export function createBridgeHost({ reply, emit }: Options): BridgeHost {
  const registry = new Map<string, Registration<unknown>>()

  const fail = (id: string, code: ErrorCode, message: string) =>
    reply({ id, ok: false, error: { code, message } })

  const handle = async (req: BridgeRequest): Promise<void> => {
    // A request we can't even correlate has nowhere to send an error, so drop it.
    if (!req || typeof req !== 'object') return
    if (typeof req.id !== 'string' || typeof req.method !== 'string') return

    if (req.v !== PROTOCOL_VERSION) {
      fail(req.id, 'VERSION_MISMATCH', `host speaks protocol v${PROTOCOL_VERSION}`)
      return
    }

    const reg = registry.get(req.method)
    if (!reg) {
      fail(req.id, 'METHOD_NOT_FOUND', `unknown method ${req.method}`)
      return
    }

    let params: unknown = req.params
    if (reg.schema) {
      const parsed = reg.schema.safeParse(req.params)
      if (!parsed.success) {
        fail(req.id, 'INVALID_PARAMS', `bad params for ${req.method}`)
        return
      }
      params = parsed.data
    }

    try {
      const result = await reg.handler(params)
      reply({ id: req.id, ok: true, result })
    } catch {
      // The thrown message can carry paths or secrets, so it stays in the host.
      fail(req.id, 'INTERNAL', `${req.method} failed`)
    }
  }

  return {
    register: <T>(method: string, reg: Registration<T>) => {
      registry.set(method, reg as Registration<unknown>)
    },
    handle,
    sendEvent: (event, payload) => emit?.({ v: PROTOCOL_VERSION, event, payload }),
    methods: () => [...registry.keys()],
  }
}
