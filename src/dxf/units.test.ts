import { resolveUnitScale } from './units'

describe('resolveUnitScale', () => {
  it('trusts the header when the declared unit gives a plausible building size', () => {
    // 12 000 x 9 000 mm hall, header says millimetres.
    const result = resolveUnitScale({ declaredCode: 4, extent: { width: 12_000, height: 9_000 } })

    expect(result).toMatchObject({ factor: 1, source: 'header', declared: 'millimetres' })
  })

  it('accepts metres when both header and extent agree', () => {
    const result = resolveUnitScale({ declaredCode: 6, extent: { width: 12, height: 9 } })

    expect(result).toMatchObject({ factor: 1000, source: 'header', declared: 'metres' })
  })

  it('overrides a lying millimetre header when the drawing is clearly in metres', () => {
    // The provided floorplan: $INSUNITS = 4 (mm) but the hall is ~10.3 x 8.2 units.
    const result = resolveUnitScale({ declaredCode: 4, extent: { width: 10.34, height: 8.24 } })

    expect(result.factor).toBe(1000)
    expect(result.source).toBe('heuristic')
    expect(result.declared).toBe('millimetres')
    expect(result.note).toMatch(/metres/)
  })

  it('guesses from extent alone when the header is unitless or missing', () => {
    expect(resolveUnitScale({ declaredCode: 0, extent: { width: 40, height: 20 } })).toMatchObject({
      factor: 1000,
      source: 'heuristic',
      declared: 'unitless',
    })
    expect(resolveUnitScale({ extent: { width: 40_000, height: 20_000 } })).toMatchObject({
      factor: 1,
      source: 'heuristic',
      declared: 'no units',
    })
  })

  it('lets an explicit override win over everything', () => {
    const result = resolveUnitScale({
      declaredCode: 4,
      extent: { width: 10, height: 8 },
      override: 25.4,
    })

    expect(result).toMatchObject({ factor: 25.4, source: 'override' })
  })

  it('falls back to the header for a drawing with no extent', () => {
    const result = resolveUnitScale({ declaredCode: 6, extent: { width: 0, height: 0 } })

    expect(result).toMatchObject({ factor: 1000, source: 'header' })
  })

  it('falls back to the header when no common unit is plausible', () => {
    // 0.0001 units across: nothing sensible fits.
    const result = resolveUnitScale({ declaredCode: 4, extent: { width: 0.0001, height: 0.0001 } })

    expect(result).toMatchObject({ factor: 1, source: 'header' })
    expect(result.note).toMatch(/falling back/)
  })
})
