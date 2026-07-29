import React from 'react'
import {Pressable, Text, View} from 'react-native'
import {tokens} from './tokens'

type Props = {
  label: string,
  badge?: string,
  onPress: () => void,
}

export function ServiceTile({label, badge, onPress}: Props) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 72,
        alignItems: 'center',
        gap: tokens.space.xs,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.color.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {
          badge ? (
            <Text
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                backgroundColor: tokens.color.danger,
                color: tokens.color.onBrand,
                fontSize: 10,
                paddingHorizontal: 6,
                borderRadius: tokens.radius.pill,
                overflow: 'hidden',
              }}
            >
              {badge}
            </Text>
          ) : null
        }
      </View>
      <Text
        style={{
          fontSize: tokens.font.sm,
          color: tokens.color.text,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}