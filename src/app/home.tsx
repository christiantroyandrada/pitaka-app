import { useSyncExternalStore } from 'react'
import { SafeAreaView, Alert } from 'react-native'
import { router } from 'expo-router'
import { HomeView } from '@/features/home/HomeView'
import { walletStore } from '@/data/walletStoreInstance'
import { ACCOUNTS } from '@/data/seed'
import { parseServicesGrid } from '@/config/parseConfig'
import { tokens } from '@/ui/tokens'
import type { NavIntent } from '@/config/resolveTile'

export default function HomeScreen() {
  const balance = useSyncExternalStore(walletStore.subscribe, () =>
    walletStore.getBalance(ACCOUNTS.user),
  )

  // P1 swaps this one line for a Remote Config fetch.
  const { grid } = parseServicesGrid(undefined)

  // Registry ids map to routes here rather than being interpolated, so an
  // unknown target from config cannot navigate anywhere unexpected.
  const NATIVE_ROUTES = { send: '/send', transactions: '/transactions' } as const

  const navigate = (intent: NavIntent) => {
    if (intent.kind === 'native') {
      const route = NATIVE_ROUTES[intent.route as keyof typeof NATIVE_ROUTES]
      if (route) router.push(route)
      return
    }
    // P1 opens this in a WebView.
    Alert.alert('H5 page', intent.url)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <HomeView balanceCentavos={balance} grid={grid} flags={{}} onNavigate={navigate} />
    </SafeAreaView>
  )
}
