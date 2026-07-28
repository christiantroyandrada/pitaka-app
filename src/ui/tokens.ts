/**
 * The single source of visual truth. Components never hardcode a colour or a
 * spacing value — in P1 these same tokens are published to the H5 apps so the
 * WebView pages look continuous with the shell.
 */
export const tokens = {
  color: {
    brand: '#0057E4',
    brandDark: '#0043B0',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F6FF',
    text: '#12203A',
    textMuted: '#5B6B87',
    border: '#D7E0F0',
    danger: '#C62828',
    onBrand: '#FFFFFF',
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 20, pill: 999 },
  font: { sm: 13, md: 16, lg: 20, xl: 28 },
  /** Named so stacking order is a decision, not an accident of ad hoc numbers. */
  layer: { base: 0, overlay: 100, modal: 200, toast: 300 },
} as const
