import { SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { SendMoneyForm } from '@/features/send/SendMoneyForm'
import { walletStore } from '@/data/walletStoreInstance'
import { tokens } from '@/ui/tokens'

export default function SendScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <SendMoneyForm store={walletStore} onDone={() => router.back()} />
    </SafeAreaView>
  )
}
