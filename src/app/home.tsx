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

  // P0 reads the grid from the bundled default. P1 replaces this one line with a
  // Remote Config fetch; the parser and the resolver stay exactly as they are.
  const { grid } = parseServicesGrid(undefined)

  const navigate = (intent: NavIntent) => {
    if (intent.kind === 'native') {
      router.push(intent.route === 'send' ? '/send' : '/transactions')
      return
    }
    // P1 opens this in a WebView. P0 proves the intent is produced correctly.
    Alert.alert('H5 page', intent.url)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <HomeView balanceCentavos={balance} grid={grid} flags={{}} onNavigate={navigate} />
    </SafeAreaView>
  )
}
