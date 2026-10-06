import { temperatureColor } from './temperatureScale'

describe('temperatureColor', () => {
  it('is blue at the cool end and red at the warm end', () => {
    expect(temperatureColor(18)).toBe('hsl(210 75% 46%)')
    expect(temperatureColor(30)).toBe('hsl(0 75% 46%)')
  })

  it('interpolates the hue linearly in between', () => {
    expect(temperatureColor(24)).toBe('hsl(105 75% 46%)')
  })

  it('clamps outside the range instead of wrapping the hue', () => {
    expect(temperatureColor(-40)).toBe(temperatureColor(18))
    expect(temperatureColor(99)).toBe(temperatureColor(30))
  })
})
