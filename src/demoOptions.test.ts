import { demoOptionsFromSearch, type DemoOptions } from './demoOptions'

const defaults: DemoOptions = { failEvery: 7, latencyMs: { min: 150, max: 600 } }

describe('demoOptionsFromSearch', () => {
  it('returns the defaults for an empty query', () => {
    expect(demoOptionsFromSearch('', defaults)).toEqual(defaults)
  })

  it('reads failEvery and a latency range', () => {
    expect(demoOptionsFromSearch('?failEvery=3&latency=2000-3000', defaults)).toEqual({
      failEvery: 3,
      latencyMs: { min: 2000, max: 3000 },
    })
  })

  it('accepts a single latency value and failEvery=0 to disable failures', () => {
    expect(demoOptionsFromSearch('?latency=250&failEvery=0', defaults)).toEqual({
      failEvery: 0,
      latencyMs: { min: 250, max: 250 },
    })
  })

  it.each(['?failEvery=-1', '?failEvery=abc', '?latency=500-100', '?latency=x-y', '?latency=-5'])(
    'ignores malformed input %s',
    (search) => {
      expect(demoOptionsFromSearch(search, defaults)).toEqual(defaults)
    },
  )
})
