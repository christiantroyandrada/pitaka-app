import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { AmountText } from '@/ui/AmountText'
import { ServiceTile } from '@/ui/ServiceTile'
import { tokens } from '@/ui/tokens'
import { resolveTile, type Flags, type NavIntent } from '@/config/resolveTile'
import type { ServicesGrid } from '@/config/schema'

export const H5_BASE_URL = 'https://fintech.ctaprojects.xyz'

type Props = {
  balanceCentavos: number,
  grid: ServicesGrid,
  flags: Flags,
  onNavigate: (intent: NavIntent) => void,
}

export function HomeView({ balanceCentavos, grid, flags, onNavigate }: Props) {
  const visible = grid.categories.flatMap((category) =>
    category.tiles
      .map((tile) => ({ tile, intent: resolveTile(tile, flags, H5_BASE_URL) }))
      .filter((entry): entry is { tile: typeof entry.tile; intent: NavIntent } => entry.intent !== null),
  )

  return (
    <ScrollView
      contentContainerStyle={{
        padding: tokens.space.lg,
        gap: tokens.space.lg,
      }}
    >
      <View
        style={{
          backgroundColor: tokens.color.brand,
          borderRadius: tokens.radius.lg,
          padding: tokens.space.lg,
          gap: tokens.space.xs,
        }}
      >
        <Text
          style={{
            color: tokens.color.onBrand,
            fontSize: tokens.font.sm,
            letterSpacing: 1,
          }}
        >
          AVAILABLE BALANCE
        </Text>
        <View
          style={{
            backgroundColor: tokens.color.surface,
            alignSelf: 'flex-start',
            paddingHorizontal: tokens.space.sm,
            borderRadius: tokens.radius.sm,
          }}
        >
          <AmountText centavos={balanceCentavos} size='lg'/>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.space.md,
        }}
      >
        {
          visible.map(({ tile, intent }) => (
            <ServiceTile
              key={tile.key}
              label={tile.label}
              icon={tile.icon}
              badge={tile.badge}
              onPress={() => onNavigate(intent)}
            />
          ))
        }
      </View>
    </ScrollView>
  )
}