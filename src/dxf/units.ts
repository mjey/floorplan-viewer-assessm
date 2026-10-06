import type { Size } from '@/geometry'

import type { UnitResolution } from './types'

/**
 * Resolves the scale factor from a DXF's native units to millimetres.
 *
 * The DXF header carries `$INSUNITS`, but real CAD exports frequently get it wrong:
 * the provided floorplan declares millimetres while its coordinates are plainly metres
 * (the whole hall is ~10 units wide). So the header is treated as a *claim* that must
 * survive a plausibility check against the drawing's actual extent. If it fails, the
 * most plausible common unit is chosen instead and the decision is explained in `note`.
 *
 * An explicit `override` always wins, for the case where an operator knows better.
 */

interface UnitDefinition {
  readonly name: string
  readonly toMm: number
}

/** DXF `$INSUNITS` codes for the units a building drawing could realistically use. */
const INSUNITS: Readonly<Record<number, UnitDefinition>> = {
  1: { name: 'inches', toMm: 25.4 },
  2: { name: 'feet', toMm: 304.8 },
  4: { name: 'millimetres', toMm: 1 },
  5: { name: 'centimetres', toMm: 10 },
  6: { name: 'metres', toMm: 1000 },
}

/** Tried in order when the header cannot be trusted. Metres first: the most common slip. */
const HEURISTIC_CANDIDATES: readonly UnitDefinition[] = [
  INSUNITS[6]!,
  INSUNITS[4]!,
  INSUNITS[5]!,
  INSUNITS[1]!,
  INSUNITS[2]!,
]

/** A data hall is at least a metre across and well under two kilometres. */
export const PLAUSIBLE_EXTENT_MM = { min: 1_000, max: 2_000_000 } as const

export interface ResolveUnitScaleInput {
  /** The raw `$INSUNITS` header value, if present. */
  readonly declaredCode?: number | undefined
  /** Width and height of the drawing's content in its native units. */
  readonly extent: Size
  /** Caller-supplied factor to millimetres; bypasses all detection. */
  readonly override?: number | undefined
}

export function resolveUnitScale(input: ResolveUnitScaleInput): UnitResolution {
  const declaredUnit = input.declaredCode === undefined ? undefined : INSUNITS[input.declaredCode]
  const declared = describeDeclared(input.declaredCode, declaredUnit)

  if (input.override !== undefined) {
    return {
      factor: input.override,
      source: 'override',
      declared,
      note: `Using caller-supplied scale of ${input.override} mm per drawing unit.`,
    }
  }

  const largestExtent = Math.max(input.extent.width, input.extent.height)

  if (largestExtent <= 0 || !Number.isFinite(largestExtent)) {
    const factor = declaredUnit?.toMm ?? 1
    return {
      factor,
      source: 'header',
      declared,
      note: `Drawing has no measurable extent; trusting the header (${declared}).`,
    }
  }

  if (declaredUnit && isPlausible(largestExtent * declaredUnit.toMm)) {
    return {
      factor: declaredUnit.toMm,
      source: 'header',
      declared,
      note: `Header declares ${declared} and the drawing extent agrees.`,
    }
  }

  const guess = HEURISTIC_CANDIDATES.find((unit) => isPlausible(largestExtent * unit.toMm))
  if (guess) {
    return {
      factor: guess.toMm,
      source: 'heuristic',
      declared,
      note:
        `Header declares ${declared} but the drawing is only ${formatExtent(largestExtent)} ` +
        `units across, which is implausible for a building; treating coordinates as ${guess.name}.`,
    }
  }

  const factor = declaredUnit?.toMm ?? 1
  return {
    factor,
    source: 'header',
    declared,
    note:
      `No common unit makes an extent of ${formatExtent(largestExtent)} units plausible; ` +
      `falling back to the header (${declared}).`,
  }
}

function isPlausible(extentMm: number): boolean {
  return extentMm >= PLAUSIBLE_EXTENT_MM.min && extentMm <= PLAUSIBLE_EXTENT_MM.max
}

function describeDeclared(code: number | undefined, unit: UnitDefinition | undefined): string {
  if (code === undefined) return 'no units'
  if (code === 0) return 'unitless'
  return unit?.name ?? `unknown unit code ${code}`
}

function formatExtent(value: number): string {
  return value >= 100 ? Math.round(value).toString() : value.toPrecision(3)
}
