import { formatCentavos, parseAmountToCentavos } from './money'

describe('formatCentavos', () => {
  it('formats whole pesos with two decimals', () => {
    expect(formatCentavos(100000)).toBe('1,000.00')
  })

  it('formats zero', () => {
    expect(formatCentavos(0)).toBe('0.00')
  })

  it('formats sub-peso amounts', () => {
    expect(formatCentavos(5)).toBe('0.05')
  })

  it('groups thousands', () => {
    expect(formatCentavos(123456789)).toBe('1,234,567.89')
  })

  it('formats negative amounts', () => {
    expect(formatCentavos(-2550)).toBe('-25.50')
  })
})

describe('parseAmountToCentavos', () => {
  it('parses a plain peso amount', () => {
    expect(parseAmountToCentavos('100')).toBe(10000)
  })

  it('parses two decimal places', () => {
    expect(parseAmountToCentavos('12.34')).toBe(1234)
  })

  it('parses one decimal place', () => {
    expect(parseAmountToCentavos('12.3')).toBe(1230)
  })

  it('ignores commas', () => {
    expect(parseAmountToCentavos('1,234.56')).toBe(123456)
    expect(parseAmountToCentavos('1,234,567.89')).toBe(123456789)
  })

  // Stripping commas before validating accepts any placement, so a comma-decimal
  // habit turns ₱1.50 into ₱15.00 without complaint. A tenfold error on a money
  // field should be a refusal, not a silent reinterpretation.
  it('rejects a comma used as a decimal separator', () => {
    expect(parseAmountToCentavos('1,5')).toBeNull()
    expect(parseAmountToCentavos('1,50')).toBeNull()
  })

  it('rejects malformed comma grouping', () => {
    expect(parseAmountToCentavos('1,,,5')).toBeNull()
    expect(parseAmountToCentavos('1,23,456')).toBeNull()
    expect(parseAmountToCentavos(',123')).toBeNull()
    expect(parseAmountToCentavos('1234,')).toBeNull()
  })

  it('rejects more than two decimal places', () => {
    expect(parseAmountToCentavos('1.234')).toBeNull()
  })

  it('rejects non-numeric input', () => {
    expect(parseAmountToCentavos('abc')).toBeNull()
  })

  it('rejects empty input', () => {
    expect(parseAmountToCentavos('')).toBeNull()
  })

  it('rejects negative input', () => {
    expect(parseAmountToCentavos('-5')).toBeNull()
  })

  it('never loses precision on values that break floats', () => {
    expect(parseAmountToCentavos('0.29')).toBe(29)
    expect(parseAmountToCentavos('1.10')).toBe(110)
  })
})
