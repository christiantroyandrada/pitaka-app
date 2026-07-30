import Constants from 'expo-constants'

/**
 * The host:port Expo Go actually fetched the bundle from, e.g. `192.168.1.5:8081`.
 *
 * Inside a WebView on a physical handset `localhost` is the handset, not the dev
 * machine, so a hardcoded localhost base URL leaves every H5 page unreachable on
 * the one run path the README documents. Falls back to localhost for the iOS
 * simulator and for web, where localhost is already correct.
 */
export const DEV_HOST: string = Constants.expoConfig?.hostUri?.split('/')[0] ?? 'localhost:8081'

export const DEV_ORIGIN = `http://${DEV_HOST}`
