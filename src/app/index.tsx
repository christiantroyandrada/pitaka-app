import { SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { LoginForm } from '@/features/auth/LoginForm'
import { tokens } from '@/ui/tokens'

export default function LoginScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.color.surface, justifyContent: 'center' }}
    >
      <LoginForm onSuccess={() => router.replace('/home')} />
    </SafeAreaView>
  )
}
