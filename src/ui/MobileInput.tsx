import React from 'react'
import { View, TextInput, Text } from 'react-native'
import { tokens } from './tokens'

type Props = {
  value: string,
  onChangeText: (text: string) => void,
  error?: string,
}

const NATIONAL_NUMBER_LENGTH = 10

export function MobileInput({ value, onChangeText, error }: Props) {
  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').replace(/^0+/, '')
    onChangeText(digits.slice(0, NATIONAL_NUMBER_LENGTH))
  }

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? tokens.color.danger : tokens.color.border,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.space.md,
        }}>
        <Text style={{ color: tokens.color.textMuted, fontSize: tokens.font.md }}>+63</Text>
        <View style={{
          width: 1,
          height: 24,
          backgroundColor: tokens.color.border,
          marginHorizontal: tokens.space.sm,
        }} />
        <TextInput
          accessibilityLabel='Mobile number'
          value={value}
          onChangeText={handleChangeText}
          keyboardType='phone-pad'
          placeholder='917 123 4567'
          style={{
            flex: 1,
            fontSize: tokens.font.md,
            color: tokens.color.text,
            paddingVertical: tokens.space.md,
          }}
        />
      </View>
      {/* reserved row */}
      <Text style={{
        minHeight: 18,
        marginTop: tokens.space.xs,
        color: tokens.color.danger,
        fontSize: tokens.font.sm,
      }}>
        {error ?? ''}
      </Text>
    </View>
  )
}