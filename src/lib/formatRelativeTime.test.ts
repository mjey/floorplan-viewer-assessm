import { formatRelativeTime } from './formatRelativeTime'

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-08-24T08:10:00Z')

  it.each([
    [0, 'just now'],
    [1_400, 'just now'],
    [2_000, '2 s ago'],
    [59_400, '59 s ago'],
    [60_000, '1 min ago'],
    [59 * 60_000, '59 min ago'],
    [3 * 3_600_000, '3 h ago'],
  ])('formats %i ms ago as "%s"', (ago, expected) => {
    expect(formatRelativeTime(now - ago, now)).toBe(expected)
  })

  it('never reports the future as negative', () => {
    expect(formatRelativeTime(now + 5000, now)).toBe('just now')
  })
})
