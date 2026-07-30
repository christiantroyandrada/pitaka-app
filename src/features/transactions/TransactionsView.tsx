import React from 'react'
import type { LedgerEntry } from '@/domain/ledger'
import { View, Text, FlatList } from 'react-native'
import { AmountText } from '@/ui/AmountText'
import { tokens } from '@/ui/tokens'

type Props = {
  entries: LedgerEntry[],
  accountId: string,
}

export function TransactionsView({ entries, accountId }: Props) {
  const mine = entries
    .filter((entry) => entry.accountId === accountId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (mine.length === 0) {
    return (
      <View style={{padding: tokens.space.lg}}>
        <Text style={{color: tokens.color.textMuted}}>No transactions yet</Text>
      </View>
    )
  }
  return (
    <FlatList
      data={mine}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{padding: tokens.space.lg}}
      renderItem={({ item }) => (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: tokens.space.md,
          borderBottomWidth: 1,
          borderBottomColor: tokens.color.border,
        }}>
          <View>
            <Text
              style={{
                color: tokens.color.text,
                fontSize: tokens.font.md,
              }}
            >
              {item.amountCentavos < 0 ? 'Sent' : 'Received'}
            </Text>
            <Text
              style={{
                color: tokens.color.textMuted,
                fontSize: tokens.font.sm,
              }}
            >
              {item.createdAt.slice(0, 10)}
            </Text>
          </View>
          <AmountText centavos={item.amountCentavos}/>
        </View>
      )}
    />
  )
}