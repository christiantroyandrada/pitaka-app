import { z } from 'zod'

/**
 * The v1 method surface. Schemas live here so the real host and the browser mock
 * validate identically, which is half of what stops the mock drifting.
 */
export const schemas = {
  'config.getFlags': z.object({ keys: z.array(z.string()) }),
  'ui.toast': z.object({ message: z.string().min(1), variant: z.string().optional() }),
  'payments.requestPayment': z.object({
    amountCentavos: z.number().int().positive(),
    billerId: z.string().min(1),
    reference: z.string().min(1),
    idempotencyKey: z.string().min(1),
  }),
} as const

export type EnvInfo = {
  platform: string
  appVersion: string
  bridgeVersion: number
}

export type Profile = {
  userId: string
  displayName: string
  maskedMobile: string
}

export type PaymentResult = {
  transactionId: string
  status: 'completed'
}

/**
 * What a host must be able to do. The mock and the native host each supply one
 * of these, and the contract suite runs against both.
 */
export type HandlerSet = {
  getEnvInfo: () => EnvInfo
  getProfile: () => Profile
  getFlags: (p: { keys: string[] }) => Record<string, string>
  toast: (p: { message: string; variant?: string }) => void
  requestPayment: (p: {
    amountCentavos: number
    billerId: string
    reference: string
    idempotencyKey: string
  }) => PaymentResult
}

/** Masks all but the last two digits, so a WebView never sees a full number. */
export const maskMobile = (national: string): string =>
  national.length <= 2 ? national : `${'•'.repeat(national.length - 2)}${national.slice(-2)}`
