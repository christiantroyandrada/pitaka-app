import React from 'react'
import { View, Text, TextInput } from 'react-native'
import { tokens } from './tokens'

type Props = {
  value: string
  onChangeText: (value: string) => void
  digits?: 4|6
  error?: string
}

export function MpinInput({ value, onChangeText, digits = 6, error }: Props) {
  const handleChange = (next:string) => {
    onChangeText(next.replace(/\D/g, '').slice(0, digits))
  }

  return (
    <View>
      <View style={{flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md}}>
        {Array.from({length: digits}, (_, i) => (
          <View
            key={i}
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
            style={{
              width: 16,
              height: 16,
              borderRadius: tokens.radius.pill,
              backgroundColor: i < value.length ? tokens.color.brand : 'transparent',
              borderWidth: 1,
              borderColor: error ? tokens.color.danger : tokens.color.border,
            }}
          />
        ))}      
      </View>
      <TextInput
        accessibilityLabel={`MPIN, ${value.length} of ${digits} digits entered`}
        value={value}
        onChangeText={handleChange}
        keyboardType='number-pad'
        secureTextEntry
        autoComplete='off'
        style={{position: 'absolute', opacity: 0, width: '100%', height: 40}}
        />
      {/* Reserved row: always present so showing an error never shifts layout. */}
      <Text
        style={{
          minHeight: 18,
          marginTop: tokens.space.sm,
          color: tokens.color.danger,
          fontSize: tokens.font.sm,
          textAlign: 'center',
        }}
      >
        {error ?? ' '}
      </Text>
    </View>
  )
}