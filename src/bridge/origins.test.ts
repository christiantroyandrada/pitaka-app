import { isAllowedUrl, h5UrlFor, isAllowedIn, RELEASE_ORIGINS, DEV_ONLY_ORIGINS } from './origins'
import { DEV_ORIGIN } from '@/config/devHost'

const BASE = 'https://fintech.ctaprojects.xyz'

describe('isAllowedUrl', () => {
  it('accepts an allowlisted origin', () => {
    expect(isAllowedUrl(`${BASE}/h5/bills/`)).toBe(true)
  })

  it('accepts any path under an allowlisted origin', () => {
    expect(isAllowedUrl(`${BASE}/h5/bills/pay?ref=1#top`)).toBe(true)
  })

  // The classic way this check is written wrong.
  it('rejects a host that merely ends with the allowed domain', () => {
    expect(isAllowedUrl('https://evil-fintech.ctaprojects.xyz/h5/bills/')).toBe(false)
  })

  it('rejects a host that prefixes the allowed domain', () => {
    expect(isAllowedUrl('https://fintech.ctaprojects.xyz.attacker.com/h5/bills/')).toBe(false)
  })

  it('rejects a scheme downgrade', () => {
    expect(isAllowedUrl('http://fintech.ctaprojects.xyz/h5/bills/')).toBe(false)
  })

  it('rejects a different port on an allowed host', () => {
    expect(isAllowedUrl('https://fintech.ctaprojects.xyz:8443/h5/bills/')).toBe(false)
  })

  it('rejects an unrelated origin', () => {
    expect(isAllowedUrl('https://attacker.com/h5/bills/')).toBe(false)
  })

  it('rejects a javascript: url', () => {
    expect(isAllowedUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects a data: url', () => {
    expect(isAllowedUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects an unparseable value without throwing', () => {
    expect(() => isAllowedUrl('not a url')).not.toThrow()
    expect(isAllowedUrl('not a url')).toBe(false)
  })

  it('rejects an empty value', () => {
    expect(isAllowedUrl('')).toBe(false)
  })

  it('allows localhost in development so the H5 dev server works', () => {
    expect(DEV_ONLY_ORIGINS.some((o) => o.startsWith('http://localhost'))).toBe(true)
  })

  // __DEV__ is true under jest, so the release list is asserted directly rather
  // than through isAllowedUrl. A plaintext origin here is reachable via the
  // app's deep-link scheme in a shipped build.
  it('ships no plaintext origin in a release build', () => {
    expect(RELEASE_ORIGINS.every((o) => o.startsWith('https://'))).toBe(true)
  })

  it('rejects a localhost url against the release list', () => {
    expect(isAllowedIn(RELEASE_ORIGINS, 'http://localhost:8081/h5/bills/')).toBe(false)
  })

  it('accepts the production origin against the release list', () => {
    expect(isAllowedIn(RELEASE_ORIGINS, `${BASE}/h5/bills/`)).toBe(true)
  })

  // The dev origin is derived at runtime from Expo's manifest, so it is the one
  // entry that isn't visible by reading the list. It must stay dev-only.
  it('keeps the derived dev origin out of the release list', () => {
    expect(RELEASE_ORIGINS).not.toContain(DEV_ORIGIN)
    expect(isAllowedIn(RELEASE_ORIGINS, `${DEV_ORIGIN}/h5/bills/`)).toBe(false)
  })
})

describe('h5UrlFor', () => {
  it('builds a url from a registry key', () => {
    expect(h5UrlFor(BASE, 'bills')).toBe(`${BASE}/h5/bills/`)
  })

  it('tolerates a trailing slash on the base', () => {
    expect(h5UrlFor(`${BASE}/`, 'bills')).toBe(`${BASE}/h5/bills/`)
  })

  it('refuses a key that could traverse the path', () => {
    expect(h5UrlFor(BASE, '../evil')).toBeNull()
  })

  it('refuses a key carrying a query string', () => {
    expect(h5UrlFor(BASE, 'bills?x=1')).toBeNull()
  })

  it('refuses an absolute url disguised as a key', () => {
    expect(h5UrlFor(BASE, 'https://attacker.com')).toBeNull()
  })

  it('refuses a base whose origin is not allowlisted', () => {
    expect(h5UrlFor('https://attacker.com', 'bills')).toBeNull()
  })
})
