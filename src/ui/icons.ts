/**
 * Config supplies an icon *name*, not an asset, so the host decides how to draw
 * it. Monochrome glyphs keep P0 asset-free and render identically on iOS,
 * Android and web — emoji would tint themselves and break the palette.
 */
const GLYPHS: Record<string, string> = {
  send: '↗',
  receive: '↙',
  bank: '⇄',
  qr: '▣',
  load: '▥',
  bills: '▤',
  receipt: '▤',
  list: '☰',
  rewards: '★',
  savings: '◆',
  cashin: '＋',
}

export const glyphFor = (icon: string): string => GLYPHS[icon] ?? '•'
