/** Candidate bar lengths in millimetres; the one closest to the target width wins. */
const NICE_LENGTHS_MM = [100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000] as const
const TARGET_WIDTH_PX = 120

/** Picks the "nice" real-world length whose on-screen width is closest to the target. */
export function pickScaleBarLength(scale: number): number {
  let best: number = NICE_LENGTHS_MM[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const length of NICE_LENGTHS_MM) {
    const distance = Math.abs(length * scale - TARGET_WIDTH_PX)
    if (distance < bestDistance) {
      best = length
      bestDistance = distance
    }
  }
  return best
}

export function formatLength(mm: number): string {
  return mm >= 1000 ? `${mm / 1000} m` : `${mm} mm`
}
