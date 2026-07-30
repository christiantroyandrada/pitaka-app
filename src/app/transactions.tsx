import { useSyncExternalStore } from 'react'
import { SafeAreaView } from 'react-native'
import { TransactionsView } from '@/features/transactions/TransactionsView'
import { walletStore } from '@/data/walletStoreInstance'
import { ACCOUNTS } from '@/data/seed'
import { tokens } from '@/ui/tokens'

export default function TransactionsScreen() {
  const entries = useSyncExternalStore(walletStore.subscribe, walletStore.getEntries)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <TransactionsView entries={entries} accountId={ACCOUNTS.user} />
    </SafeAreaView>
  )
}
