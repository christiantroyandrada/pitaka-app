import type { ServicesGrid } from './schema'

/**
 * Ships in the binary. Used on first run, offline, and whenever remote config
 * fails to parse — so a bad config value degrades the grid, not the app.
 *
 * Tiles marked `h5` open in a WebView. Only the ones whose H5 app is actually
 * deployed are enabled — an enabled tile with no page behind it is a dead end,
 * and `enabled` is the flag that exists to prevent exactly that. Turning one on
 * is what shipping its H5 app looks like.
 */
export const DEFAULT_GRID: ServicesGrid = {
  version: 1,
  categories: [
    {
      key: 'transfer',
      label: 'Send & Receive',
      tiles: [
        { key: 'send', label: 'Send', icon: 'send', type: 'native', target: 'send', enabled: true },
        { key: 'bank', label: 'Bank Transfer', icon: 'bank', type: 'h5', target: 'bank', enabled: false },
        { key: 'qr', label: 'Pay QR', icon: 'qr', type: 'h5', target: 'qr', enabled: false },
        { key: 'load', label: 'Buy Load', icon: 'load', type: 'h5', target: 'load', enabled: false },
      ],
    },
    {
      key: 'manage',
      label: 'Manage',
      tiles: [
        { key: 'bills', label: 'Bills', icon: 'bills', type: 'h5', target: 'bills', enabled: true, badge: 'NEW' },
        { key: 'transactions', label: 'Transactions', icon: 'list', type: 'native', target: 'transactions', enabled: true },
        { key: 'rewards', label: 'Rewards', icon: 'rewards', type: 'h5', target: 'rewards', enabled: false },
        { key: 'savings', label: 'Savings', icon: 'savings', type: 'h5', target: 'savings', enabled: false },
      ],
    },
  ],
}
