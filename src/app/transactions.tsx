import { SafeAreaView, Text } from 'react-native'
import { tokens } from '@/ui/tokens'

// Placeholder so the route exists for expo-router's generated types.
// Task 14 replaces the body with TransactionsView.
export default function TransactionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface, padding: tokens.space.lg }}>
      <Text style={{ color: tokens.color.textMuted }}>Transactions — Task 14</Text>
    </SafeAreaView>
  )
}
