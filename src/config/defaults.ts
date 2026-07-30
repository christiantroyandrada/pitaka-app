import type { ServicesGrid } from './schema'

/**
 * Ships in the binary. Used on first run, offline, and whenever remote config
 * fails to parse — so a bad config value degrades the grid, not the app.
 *
 * Tiles marked `h5` are the ones a later phase opens in a WebView; in P0 they
 * resolve to a nav intent and surface the URL, which is enough to prove the
 * routing decision is made correctly.
 */
export const DEFAULT_GRID: ServicesGrid = {
  version: 1,
  categories: [
    {
      key: 'transfer',
      label: 'Send & Receive',
      tiles: [
        { key: 'send', label: 'Send', icon: 'send', type: 'native', target: 'send', enabled: true },
        { key: 'bank', label: 'Bank Transfer', icon: 'bank', type: 'h5', target: 'bank', enabled: true },
        { key: 'qr', label: 'Pay QR', icon: 'qr', type: 'h5', target: 'qr', enabled: true },
        { key: 'load', label: 'Buy Load', icon: 'load', type: 'h5', target: 'load', enabled: true },
      ],
    },
    {
      key: 'manage',
      label: 'Manage',
      tiles: [
        { key: 'bills', label: 'Bills', icon: 'bills', type: 'h5', target: 'bills', enabled: true, badge: 'NEW' },
        { key: 'transactions', label: 'Transactions', icon: 'list', type: 'native', target: 'transactions', enabled: true },
        { key: 'rewards', label: 'Rewards', icon: 'rewards', type: 'h5', target: 'rewards', enabled: true },
        { key: 'savings', label: 'Savings', icon: 'savings', type: 'h5', target: 'savings', enabled: false },
      ],
    },
  ],
}
