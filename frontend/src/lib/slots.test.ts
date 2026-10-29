import { describe, it, expect } from 'vitest'
import { getAvailableSlots } from './slots'
import type { Slot } from '../generated/types.gen'

const future = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()
const past = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString()

const slot = (id: string, startTime: string): Slot => ({ id, eventTypeId: 'et-1', startTime })

describe('getAvailableSlots', () => {
  it('returns all slots when none are booked and all are in the future', () => {
    const slots = [slot('1', future(3600_000)), slot('2', future(7200_000))]
    expect(getAvailableSlots(slots, new Set())).toEqual(slots)
  })

  it('excludes a slot that is in the booked set', () => {
    const s1 = slot('1', future(3600_000))
    const s2 = slot('2', future(7200_000))
    expect(getAvailableSlots([s1, s2], new Set(['1']))).toEqual([s2])
  })

  it('excludes a slot whose startTime is in the past', () => {
    const s1 = slot('1', past(3600_000))
    const s2 = slot('2', future(3600_000))
    expect(getAvailableSlots([s1, s2], new Set())).toEqual([s2])
  })

  it('returns empty array when all slots are booked or past', () => {
    const slots = [slot('1', past(1000)), slot('2', future(1000))]
    expect(getAvailableSlots(slots, new Set(['2']))).toEqual([])
  })
})
