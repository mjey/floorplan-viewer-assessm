import { formatLength, pickScaleBarLength } from './scaleBarLength'

describe('pickScaleBarLength', () => {
  it('picks the length closest to the target width at the current scale', () => {
    // At 0.06 px/mm, 2 m is 120 px: an exact hit.
    expect(pickScaleBarLength(0.06)).toBe(2000)
    // At 0.01 px/mm, 10 m is 100 px and 20 m is 200 px: 10 m is closer to 120.
    expect(pickScaleBarLength(0.01)).toBe(10_000)
    // Zoomed right in: 1 px/mm makes 100 mm the best fit.
    expect(pickScaleBarLength(1)).toBe(100)
  })
})

describe('formatLength', () => {
  it('uses metres from 1000 mm upwards', () => {
    expect(formatLength(500)).toBe('500 mm')
    expect(formatLength(1000)).toBe('1 m')
    expect(formatLength(2500)).toBe('2.5 m')
  })
})
