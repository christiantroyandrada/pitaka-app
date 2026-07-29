import { SafeAreaView, Text } from 'react-native'
import { tokens } from '@/ui/tokens'

// Placeholder so the route exists for expo-router's generated types.
// Task 13 replaces the body with SendMoneyForm.
export default function SendScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface, padding: tokens.space.lg }}>
      <Text style={{ color: tokens.color.textMuted }}>Send Money — Task 13</Text>
    </SafeAreaView>
  )
}
