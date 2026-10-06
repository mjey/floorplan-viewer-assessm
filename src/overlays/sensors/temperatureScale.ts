/**
 * Maps a temperature to a colour so the hall's thermal picture reads at a glance.
 *
 * A linear hue sweep from blue (cool) to red (warm), clamped at both ends. The range
 * brackets the ASHRAE recommended inlet band (18 to 27 °C) with some headroom, so the
 * demo data (20 to 29 °C) spans most of the scale.
 */
export const TEMPERATURE_SCALE = { coolC: 18, warmC: 30 } as const

const COOL_HUE = 210
const WARM_HUE = 0

export function temperatureColor(celsius: number): string {
  const t = clamp01(
    (celsius - TEMPERATURE_SCALE.coolC) / (TEMPERATURE_SCALE.warmC - TEMPERATURE_SCALE.coolC),
  )
  const hue = COOL_HUE + (WARM_HUE - COOL_HUE) * t
  return `hsl(${Math.round(hue)} 75% 46%)`
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
