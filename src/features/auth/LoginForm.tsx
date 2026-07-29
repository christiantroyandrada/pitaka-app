import React, { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { MobileInput } from '@/ui/MobileInput'
import { MpinInput } from '@/ui/MpinInput'
import { tokens } from '@/ui/tokens'
import { SEED_USER } from '@/data/seed'

const MPIN_LENGTH = 6
const MOBILE_LENGTH = 10

type Props = {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: Props) {
  const [mobile, setMobile] = useState('')
  const [mpin, setMpin] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  const complete = mobile.length === MOBILE_LENGTH && mpin.length === MPIN_LENGTH

  const handleLogin = () => {
    if (mobile === SEED_USER.mobile && mpin === SEED_USER.mpin) {
      setError(undefined)
      onSuccess()
      return
    }
    setError('Incorrect mobile number or MPIN')
  }

  return (
    <View style={{
      padding: tokens.space.lg,
      gap: tokens.space.lg,
    }}>
      <Text style={{
        fontSize: tokens.font.xl,
        fontWeight: '700',
        color: tokens.color.text,
      }}>Pitaka
      </Text>

      {/* Error shown once, under the MPIN, where the retry happens. */}
      <MobileInput
        value={mobile}
        onChangeText={(v) => {
          setMobile(v)
          setError(undefined)
        }}
      />
      <MpinInput
        value={mpin}
        onChangeText={(v) => {
          setMpin(v)
          setError(undefined)
        }}
        error={error}
      />

      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Login'
        accessibilityState={{disabled: !complete}}
        disabled={!complete}
        onPress={handleLogin}
        style={{
          backgroundColor: complete ? tokens.color.brand : tokens.color.border,
          paddingVertical: tokens.space.md,
          borderRadius: tokens.radius.pill,
          alignItems: 'center',
        }}
      >
        <Text style={{
          color: tokens.color.onBrand,
          fontWeight: '700',
          fontSize: tokens.font.md,
        }}>
          Login
        </Text>
      </Pressable>
    </View>
  )

}