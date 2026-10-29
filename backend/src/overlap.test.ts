import { describe, it, expect } from 'vitest'
import { overlaps } from './overlap.js'

// Fixed base: 2024-01-15 10:00 UTC
const BASE = new Date('2024-01-15T10:00:00.000Z').getTime()
const iso = (offsetMin: number) => new Date(BASE + offsetMin * 60_000).toISOString()

describe('overlaps', () => {
  it('returns false when intervals do not overlap', () => {
    // A: 10:00–10:30, B: 10:30–11:00  (touching endpoints, no overlap)
    expect(overlaps(iso(0), 30, iso(30), 30)).toBe(false)
  })

  it('returns true when one interval starts inside another', () => {
    // A: 10:00–11:00 (60 min), B: 10:30–11:00 (30 min)
    expect(overlaps(iso(0), 60, iso(30), 30)).toBe(true)
  })

  it('returns true for exact same interval', () => {
    const t = iso(0)
    expect(overlaps(t, 30, t, 30)).toBe(true)
  })

  it('returns true when B contains A', () => {
    // A: 10:10–10:40 (30 min), B: 10:00–11:00 (60 min)
    expect(overlaps(iso(10), 30, iso(0), 60)).toBe(true)
  })

  it('returns false when B ends exactly when A starts', () => {
    // A: 10:30–11:00, B: 10:00–10:30  (adjacent, no overlap)
    expect(overlaps(iso(30), 30, iso(0), 30)).toBe(false)
  })

  // ── Partial-overlap cases with mixed durations ────────────────────────────

  it('60-min meeting at 10:00 and 30-min meeting at 10:30 conflict', () => {
    // The 30-min slot starts inside the 60-min window: [10:00,11:00) ∩ [10:30,11:00) ≠ ∅
    expect(overlaps(iso(0), 60, iso(30), 30)).toBe(true)
  })

  it('30-min meeting at 10:30 and 60-min meeting at 10:00 conflict (symmetric)', () => {
    // Same overlap from the other direction
    expect(overlaps(iso(30), 30, iso(0), 60)).toBe(true)
  })
})
