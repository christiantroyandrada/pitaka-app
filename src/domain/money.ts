/** An integer number of centavos. Never a float. */
export type Centavos = number

export function formatCentavos(amount: Centavos): string {
  const negative = amount < 0
  const abs = Math.abs(amount)
  const pesos = Math.trunc(abs / 100)
  const cents = abs % 100
  const grouped = pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const body = `${grouped}.${cents.toString().padStart(2, '0')}`
  return negative ? `-${body}` : body
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/
/** Thousands separators only, in the one placement they're valid. */
const GROUPED_PATTERN = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/

/**
 * Parses user-entered pesos into integer centavos, or null if the input is not
 * a well-formed non-negative amount. Deliberately string-based: routing through
 * a float would make 0.29 unrepresentable.
 *
 * Grouping is validated before the commas come out. Stripping first would accept
 * any placement, so `1,5` would read as ₱15.00 instead of being refused.
 */
export function parseAmountToCentavos(input: string): Centavos | null {
  const trimmed = input.trim()
  if (!AMOUNT_PATTERN.test(trimmed) && !GROUPED_PATTERN.test(trimmed)) return null
  const cleaned = trimmed.replace(/,/g, '')
  const [whole, fraction = ''] = cleaned.split('.')
  const cents = fraction.padEnd(2, '0')
  return Number(whole) * 100 + Number(cents)
}
