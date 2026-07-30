export const PROTOCOL_VERSION = 1 as const

export type ErrorCode =
  | 'METHOD_NOT_FOUND'
  | 'INVALID_PARAMS'
  | 'UNAUTHORIZED'
  | 'USER_CANCELLED'
  | 'TIMEOUT'
  | 'VERSION_MISMATCH'
  | 'BRIDGE_UNAVAILABLE'
  | 'INTERNAL'

export type BridgeError = { code: ErrorCode; message: string }

export type BridgeRequest = {
  id: string
  v: typeof PROTOCOL_VERSION
  method: string
  params?: unknown
}

export type BridgeResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: BridgeError }

export type BridgeEvent = { v: typeof PROTOCOL_VERSION; event: string; payload?: unknown }

/** Thrown by the client so callers can branch on code without string matching. */
export class BridgeCallError extends Error {
  readonly code: ErrorCode
  constructor(error: BridgeError) {
    super(error.message)
    this.name = 'BridgeCallError'
    this.code = error.code
  }
}

/**
 * A human is waiting on these, so they get a far longer deadline than the
 * default. See ADR 2.
 */
export const INTERACTIVE_METHODS = new Set(['payments.requestPayment', 'ui.confirm'])

export const DEFAULT_TIMEOUT_MS = 10_000
export const INTERACTIVE_TIMEOUT_MS = 120_000
/** The readiness probe fails fast on purpose: no host means no host. */
export const PROBE_TIMEOUT_MS = 3_000

export const timeoutFor = (method: string): number =>
  INTERACTIVE_METHODS.has(method) ? INTERACTIVE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
