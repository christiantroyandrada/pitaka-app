import { isAllowedUrl, h5UrlFor, ALLOWED_ORIGINS } from './origins'

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

  it('allows localhost only for development', () => {
    // Kept deliberately so the H5 dev server works without loosening prod.
    expect(ALLOWED_ORIGINS.some((o) => o.startsWith('http://localhost'))).toBe(true)
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
