import type { ServicesGrid } from './schema'

/**
 * Ships in the binary. Used on first run, offline, and whenever remote config
 * fails to parse — so a bad config value degrades the grid rather than the app.
 */
export const DEFAULT_GRID: ServicesGrid = {
  version: 1,
  categories: [
    {
      key: 'manage',
      label: 'Manage',
      tiles: [
        { key: 'send', label: 'Send', icon: 'send', type: 'native', target: 'send', enabled: true },
        {
          key: 'transactions',
          label: 'Transactions',
          icon: 'list',
          type: 'native',
          target: 'transactions',
          enabled: true,
        },
      ],
    },
  ],
}
