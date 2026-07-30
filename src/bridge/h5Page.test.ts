import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_TIMEOUT_MS,
  INTERACTIVE_TIMEOUT_MS,
  INTERACTIVE_METHODS,
  PROTOCOL_VERSION,
} from './envelope'

/**
 * The shipped H5 page hand-writes its own client in plain JS, because it has no
 * build step and can't import from src/. That makes every wire constant a copy,
 * and nothing else in the suite loads the file — so bumping PROTOCOL_VERSION
 * used to leave all bridge tests green while bricking the page on device.
 *
 * This reads the page as text and asserts the copies still agree with the source
 * of truth. It's a guard against silent drift, not a substitute for a real build.
 */
const page = readFileSync(
  join(__dirname, '..', '..', 'public', 'h5', 'bills', 'index.html'),
  'utf8',
)

describe('bills page stays in step with the envelope', () => {
  it('declares the current protocol version', () => {
    expect(page).toContain(`const PROTOCOL_VERSION = ${PROTOCOL_VERSION}`)
  })

  it('uses the same default timeout', () => {
    expect(page).toContain(String(DEFAULT_TIMEOUT_MS))
  })

  it('uses the same interactive timeout', () => {
    expect(page).toContain(String(INTERACTIVE_TIMEOUT_MS))
  })

  it('lists every interactive method the envelope marks as interactive', () => {
    // The page needs the longer deadline for exactly these, or a confirmation
    // sheet would time out while the user is still deciding.
    for (const method of INTERACTIVE_METHODS) {
      expect(page).toContain(method)
    }
  })

  it('installs the bridge object the host injects into', () => {
    expect(page).toContain('window.__PITAKA_BRIDGE__')
    expect(page).toContain('_receiveJSON')
    expect(page).toContain('_receiveEventJSON')
  })

  it('posts through the channel react-native-webview provides', () => {
    expect(page).toContain('window.ReactNativeWebView.postMessage')
  })

  it('generates one idempotency key per intent, outside the click handler', () => {
    const keyLine = page.indexOf('const idempotencyKey')
    const handler = page.indexOf("addEventListener('click'")
    expect(keyLine).toBeGreaterThan(-1)
    // Inside the handler it would mint a new key per tap, so a retry would
    // become a second payment.
    expect(keyLine).toBeLessThan(handler)
  })

  it('retries a timed-out payment rather than reporting failure', () => {
    expect(page).toContain('TIMEOUT')
    expect(page).toMatch(/will not charge twice|not charge twice/)
  })
})
