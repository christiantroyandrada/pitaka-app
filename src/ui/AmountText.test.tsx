import { render, screen } from '@testing-library/react-native'
import { AmountText } from './AmountText'

// NOTE: in @testing-library/react-native v14 `render` is async — it returns a
// Promise and must be awaited before any query runs. Forgetting the await
// fails with the unhelpful "`render` function has not been called".
describe('AmountText', () => {
  it('renders centavos as a peso amount', async () => {
    await render(<AmountText centavos={645613} />)
    expect(screen.getByText('₱6,456.13')).toBeOnTheScreen()
  })

  it('renders zero', async () => {
    await render(<AmountText centavos={0} />)
    expect(screen.getByText('₱0.00')).toBeOnTheScreen()
  })

  it('renders a negative amount', async () => {
    await render(<AmountText centavos={-2550} />)
    expect(screen.getByText('₱-25.50')).toBeOnTheScreen()
  })

  // The glyph and grouping commas are decoration; a screen reader should hear
  // the amount, not "peso sign six comma four five six point one three".
  it('exposes the amount to assistive tech as a spoken label', async () => {
    await render(<AmountText centavos={10050} />)
    expect(screen.getByLabelText('100 pesos and 50 centavos')).toBeOnTheScreen()
  })

  it('omits the centavo half of the spoken label on whole pesos', async () => {
    await render(<AmountText centavos={10000} />)
    expect(screen.getByLabelText('100 pesos')).toBeOnTheScreen()
  })

  it('speaks a negative amount as an amount sent', async () => {
    await render(<AmountText centavos={-2550} />)
    expect(screen.getByLabelText('minus 25 pesos and 50 centavos')).toBeOnTheScreen()
  })
})
