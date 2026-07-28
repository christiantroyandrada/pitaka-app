import { parseServicesGrid, DEFAULT_GRID } from './parseConfig'

const valid = JSON.stringify({
  version: 1,
  categories: [
    {
      key: 'manage',
      label: 'Manage',
      tiles: [
        { key: 'bills', label: 'Bills', icon: 'receipt', type: 'h5', target: 'bills', enabled: true },
      ],
    },
  ],
})

describe('parseServicesGrid', () => {
  it('parses a valid payload', () => {
    const { grid, usedFallback } = parseServicesGrid(valid)
    expect(usedFallback).toBe(false)
    expect(grid.categories[0].tiles[0].key).toBe('bills')
  })

  it('falls back when the payload is undefined', () => {
    const { grid, usedFallback } = parseServicesGrid(undefined)
    expect(usedFallback).toBe(true)
    expect(grid).toEqual(DEFAULT_GRID)
  })

  it('falls back on malformed JSON rather than throwing', () => {
    expect(() => parseServicesGrid('{not json')).not.toThrow()
    expect(parseServicesGrid('{not json').usedFallback).toBe(true)
  })

  it('falls back on an unknown tile type', () => {
    const bad = JSON.stringify({
      version: 1,
      categories: [
        {
          key: 'a',
          label: 'A',
          tiles: [{ key: 'x', label: 'X', icon: 'i', type: 'external', target: 't', enabled: true }],
        },
      ],
    })
    expect(parseServicesGrid(bad).usedFallback).toBe(true)
  })

  it('falls back on a missing required field', () => {
    const bad = JSON.stringify({
      version: 1,
      categories: [
        {
          key: 'a',
          label: 'A',
          tiles: [{ key: 'x', label: 'X', type: 'native', target: 't', enabled: true }],
        },
      ],
    })
    expect(parseServicesGrid(bad).usedFallback).toBe(true)
  })

  it('falls back on a future version', () => {
    const future = JSON.stringify({ version: 99, categories: [] })
    expect(parseServicesGrid(future).usedFallback).toBe(true)
  })

  it('falls back on an empty object', () => {
    expect(parseServicesGrid('{}').usedFallback).toBe(true)
  })

  it('rejects a target that is not a safe registry key', () => {
    const bad = JSON.stringify({
      version: 1,
      categories: [
        {
          key: 'a',
          label: 'A',
          tiles: [{ key: 'x', label: 'X', icon: 'i', type: 'h5', target: '../evil', enabled: true }],
        },
      ],
    })
    expect(parseServicesGrid(bad).usedFallback).toBe(true)
  })

  it('accepts an empty category list', () => {
    const empty = JSON.stringify({ version: 1, categories: [] })
    const { grid, usedFallback } = parseServicesGrid(empty)
    expect(usedFallback).toBe(false)
    expect(grid.categories).toEqual([])
  })
})
