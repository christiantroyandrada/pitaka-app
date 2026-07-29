import React, { useRef, useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { MobileInput } from '@/ui/MobileInput'
import { tokens } from '@/ui/tokens'
import { parseAmountToCentavos } from '@/domain/money'
import { ACCOUNTS } from '@/data/seed'
import type { WalletStore } from '@/data/walletStore'

type Props = { store: WalletStore; onDone: () => void }

export function SendMoneyForm({ store, onDone }: Props) {
  const [mobile, setMobile] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | undefined>()

  // Never changes while mounted: two presses are one intent, so one key.
  const idempotencyKey = useRef(`send-${Date.now()}-${Math.round(Math.random() * 1e9)}`)

  // The key protects the ledger; this protects the UI from a double onDone.
  const submitted = useRef(false)

  const complete = mobile.length > 0 && amount.length > 0

  const submit = () => {
    if (submitted.current) return

    const centavos = parseAmountToCentavos(amount)
    if (centavos === null) {
      setError('Enter a valid amount')
      return
    }

    const result = store.transfer({
      to: ACCOUNTS.peer,
      amountCentavos: centavos,
      idempotencyKey: idempotencyKey.current,
    })

    if (!result.ok) {
      setError(result.code === 'INSUFFICIENT_FUNDS' ? 'Not enough balance' : 'Could not send')
      return
    }

    submitted.current = true
    setError(undefined)
    onDone()
  }

  return (
    <View style={{ padding: tokens.space.lg, gap: tokens.space.lg }}>
      <Text style={{ fontSize: tokens.font.lg, fontWeight: '700', color: tokens.color.text }}>
        Send Money
      </Text>

      <MobileInput value={mobile} onChangeText={(v) => { setMobile(v); setError(undefined) }} />

      <View>
        <TextInput
          accessibilityLabel="Amount"
          value={amount}
          onChangeText={(v) => { setAmount(v); setError(undefined) }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          style={{
            borderWidth: 1,
            borderColor: error ? tokens.color.danger : tokens.color.border,
            borderRadius: tokens.radius.md,
            padding: tokens.space.md,
            fontSize: tokens.font.md,
            color: tokens.color.text,
          }}
        />
        <Text style={{ minHeight: 18, marginTop: tokens.space.xs, color: tokens.color.danger, fontSize: tokens.font.sm }}>
          {error ?? ''}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !complete }}
        disabled={!complete}
        onPress={submit}
        style={{
          backgroundColor: complete ? tokens.color.brand : tokens.color.border,
          paddingVertical: tokens.space.md,
          borderRadius: tokens.radius.pill,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: tokens.color.onBrand, fontWeight: '700' }}>Send</Text>
      </Pressable>
    </View>
  )
}