import { useCallback, useMemo, useRef } from 'react'
import { SafeAreaView, Text, View } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import { router, useLocalSearchParams } from 'expo-router'
import { createWebViewBridge } from '@/bridge/webviewBridge'
import { createNativeHandlers } from '@/bridge/native'
import { isAllowedUrl } from '@/bridge/origins'
import { walletStore } from '@/data/walletStoreInstance'
import { tokens } from '@/ui/tokens'

export default function WebViewScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>()
  const ref = useRef<WebView>(null)

  const bridge = useMemo(
    () =>
      createWebViewBridge(createNativeHandlers(walletStore), (js) =>
        ref.current?.injectJavaScript(js),
      ),
    [],
  )

  // The gate that stops an in-page navigation leaving the allowlisted origin.
  const shouldLoad = useCallback((nav: WebViewNavigation) => isAllowedUrl(nav.url), [])

  if (!url || !isAllowedUrl(url)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface, padding: tokens.space.lg }}>
        <Text style={{ color: tokens.color.danger, fontSize: tokens.font.md, fontWeight: '600' }}>
          This page is not available
        </Text>
        <Text style={{ color: tokens.color.textMuted, marginTop: tokens.space.sm }}>
          The address was not on the allowed list, so it was not opened.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: tokens.space.md,
          borderBottomWidth: 1,
          borderBottomColor: tokens.color.border,
        }}
      >
        <Text
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ color: tokens.color.brand, fontSize: tokens.font.md, paddingRight: tokens.space.md }}
        >
          ‹
        </Text>
        <Text style={{ color: tokens.color.text, fontSize: tokens.font.md, fontWeight: '600' }}>
          {title ?? 'Pitaka'}
        </Text>
      </View>

      <WebView
        ref={ref}
        source={{ uri: url }}
        onLoadStart={bridge.onLoadStart}
        onMessage={(e) => bridge.onMessage(e.nativeEvent.data)}
        onShouldStartLoadWithRequest={shouldLoad}
        originWhitelist={['https://*', 'http://localhost:*']}
        javaScriptEnabled
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  )
}
