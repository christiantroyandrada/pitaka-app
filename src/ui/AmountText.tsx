import { Text } from 'react-native'
import { formatCentavos, type Centavos } from '../domain/money'
import { tokens } from './tokens'

type Props = {
  centavos: Centavos
  size?: 'lg' | 'md'
}

/**
 * Screen readers would otherwise announce the grouping commas and the peso
 * glyph character by character, so the visual string and the spoken string are
 * built separately.
 */
function spokenLabel(centavos: Centavos): string {
  const sign = centavos < 0 ? 'minus ' : ''
  const abs = Math.abs(centavos)
  const pesos = Math.trunc(abs / 100)
  const cents = abs % 100
  const body = cents === 0 ? `${pesos} pesos` : `${pesos} pesos and ${cents} centavos`
  return `${sign}${body}`
}

export function AmountText({ centavos, size = 'md' }: Props) {
  return (
    <Text
      accessibilityLabel={spokenLabel(centavos)}
      style={{
        color: tokens.color.text,
        fontSize: size === 'lg' ? tokens.font.xl : tokens.font.md,
        fontWeight: size === 'lg' ? '700' : '500',
      }}
    >
      {`₱${formatCentavos(centavos)}`}
    </Text>
  )
}
