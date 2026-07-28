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

/**
 * Parses user-entered pesos into integer centavos, or null if the input is not
 * a well-formed non-negative amount. Deliberately string-based: routing through
 * a float would make 0.29 unrepresentable.
 */
export function parseAmountToCentavos(input: string): Centavos | null {
  const cleaned = input.replace(/,/g, '').trim()
  if (!AMOUNT_PATTERN.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  const cents = fraction.padEnd(2, '0')
  return Number(whole) * 100 + Number(cents)
}
