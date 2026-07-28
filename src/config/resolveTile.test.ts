import { resolveTile } from './resolveTile'
import type { Tile } from './schema'

const BASE = 'https://fintech.ctaprojects.xyz'

const tile = (over: Partial<Tile> = {}): Tile => ({
  key: 'bills',
  label: 'Bills',
  icon: 'receipt',
  type: 'h5',
  target: 'bills',
  enabled: true,
  ...over,
})

describe('resolveTile', () => {
  it('resolves an h5 tile to a URL under the base', () => {
    expect(resolveTile(tile(), {}, BASE)).toEqual({
      kind: 'h5',
      url: 'https://fintech.ctaprojects.xyz/h5/bills/',
    })
  })

  it('resolves a native tile to a route', () => {
    expect(resolveTile(tile({ type: 'native', target: 'send' }), {}, BASE)).toEqual({
      kind: 'native',
      route: 'send',
    })
  })

  it('returns null when the tile is disabled in config', () => {
    expect(resolveTile(tile({ enabled: false }), {}, BASE)).toBeNull()
  })

  it('returns null when the greylisting flag disables it', () => {
    const flags = { greylisting_bills: '{"enabled":false}' }
    expect(resolveTile(tile(), flags, BASE)).toBeNull()
  })

  it('resolves when the greylisting flag enables it', () => {
    const flags = { greylisting_bills: '{"enabled":true}' }
    expect(resolveTile(tile(), flags, BASE)).not.toBeNull()
  })

  it('resolves when no flag is present for the tile', () => {
    expect(resolveTile(tile(), { greylisting_other: '{"enabled":false}' }, BASE)).not.toBeNull()
  })

  it('fails closed on a malformed flag value', () => {
    expect(resolveTile(tile(), { greylisting_bills: 'not json' }, BASE)).toBeNull()
  })

  it('fails closed on a flag value of the wrong shape', () => {
    expect(resolveTile(tile(), { greylisting_bills: '{"on":true}' }, BASE)).toBeNull()
  })

  it('does not throw on any flag value', () => {
    expect(() => resolveTile(tile(), { greylisting_bills: '[]' }, BASE)).not.toThrow()
  })

  it('strips a trailing slash on the base url so the path is never doubled', () => {
    expect(resolveTile(tile(), {}, 'https://example.com/')).toEqual({
      kind: 'h5',
      url: 'https://example.com/h5/bills/',
    })
  })
})
