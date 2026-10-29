import { describe, it, expect } from 'vitest'
import { generateSlots } from './slot-generator.js'
import type { SlotConfig } from './slot-config.js'

const BASE_CONFIG: SlotConfig = {
  timezone: 'Europe/Moscow', // UTC+3
  windowDays: 14,
  windowStartOffsetDays: 1,
  stepMinutes: 60,
}

const EVENT_CONSULTATION = {
  id: 'et-consultation',
  title: 'Консультация',
  description: '',
  durationMinutes: 30,
  schedule: { mon: [10, 11, 14], tue: [10, 11, 14], wed: [10, 11, 14], thu: [10, 11, 14], fri: [10, 11, 14], sat: [10, 11, 14], sun: [10, 11, 14] },
}

const EVENT_DEMO = {
  id: 'et-demo',
  title: 'Демо',
  description: '',
  durationMinutes: 60,
  schedule: { mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17], sat: [9, 17], sun: [9, 17] },
}

// Fixed reference: 2024-01-15 10:00 UTC (13:00 Moscow)
const NOW = new Date('2024-01-15T10:00:00Z')

// Number of hours per day in each event type's schedule (all 7 days have the same count)
const CONSULTATION_HOURS_PER_DAY = 3 // [10, 11, 14]
const DEMO_HOURS_PER_DAY = 2 // [9, 17]

describe('generateSlots', () => {
  it('generates slots for each day and hour in the window', () => {
    const slots = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    // 14 days × 3 hours = 42 slots
    expect(slots).toHaveLength(14 * CONSULTATION_HOURS_PER_DAY)
  })

  it('generates slots for multiple event types', () => {
    const slots = generateSlots([EVENT_CONSULTATION, EVENT_DEMO], [], BASE_CONFIG, NOW)
    const consultationSlots = slots.filter((s) => s.eventTypeId === EVENT_CONSULTATION.id)
    const demoSlots = slots.filter((s) => s.eventTypeId === EVENT_DEMO.id)
    expect(consultationSlots).toHaveLength(14 * CONSULTATION_HOURS_PER_DAY)
    expect(demoSlots).toHaveLength(14 * DEMO_HOURS_PER_DAY)
  })

  it('interprets hours in the configured timezone (10:00 Moscow = 07:00 UTC)', () => {
    const slots = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    const firstSlot = slots.find((s) => s.eventTypeId === EVENT_CONSULTATION.id)!
    // First available day: 2024-01-16, earliest hour: 10 Moscow = 07:00 UTC
    const date = new Date(firstSlot.startTime)
    expect(date.getUTCHours()).toBe(7) // 10:00 Moscow − 3h = 07:00 UTC
  })

  it('returns empty array when windowDays is 0', () => {
    const config: SlotConfig = { ...BASE_CONFIG, windowDays: 0 }
    const slots = generateSlots([EVENT_CONSULTATION], [], config, NOW)
    expect(slots).toHaveLength(0)
  })

  it('returns empty array when schedule has no hours', () => {
    const et = { ...EVENT_CONSULTATION, schedule: {} }
    const slots = generateSlots([et], [], BASE_CONFIG, NOW)
    expect(slots).toHaveLength(0)
  })

  it('excludes slots that overlap with existing bookings', () => {
    const firstDay = new Date(NOW.getTime() + 1 * 86_400_000)
    // Book the 10:00 Moscow slot on the first available day
    const bookedStart = new Date(firstDay)
    bookedStart.setUTCHours(7, 0, 0, 0) // 10:00 Moscow

    const booking = {
      id: 'b-1',
      slotId: 'some-slot',
      eventTypeId: EVENT_CONSULTATION.id,
      startTime: bookedStart.toISOString(),
      durationMinutes: EVENT_CONSULTATION.durationMinutes,
      bookerName: 'Alice',
      bookerEmail: 'alice@example.com',
    }

    const before = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW).length
    const after = generateSlots([EVENT_CONSULTATION], [booking], BASE_CONFIG, NOW).length
    expect(after).toBe(before - 1)
  })

  it('produces stable (deterministic) slot IDs for same inputs', () => {
    const slots1 = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    const slots2 = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    expect(slots1.map((s) => s.id)).toEqual(slots2.map((s) => s.id))
  })

  it('slot startTime is always after now', () => {
    const slots = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    for (const slot of slots) {
      expect(new Date(slot.startTime).getTime()).toBeGreaterThan(NOW.getTime())
    }
  })

  it('slots are all strictly after now', () => {
    const slots = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    for (const slot of slots) {
      expect(new Date(slot.startTime).getTime()).toBeGreaterThan(NOW.getTime())
    }
  })

  it('slot count matches windowDays × hours per day', () => {
    const slots = generateSlots([EVENT_CONSULTATION], [], BASE_CONFIG, NOW)
    expect(slots).toHaveLength(BASE_CONFIG.windowDays * CONSULTATION_HOURS_PER_DAY)
  })
})

describe('generateSlots with stepMinutes', () => {
  it('stepMinutes=30 generates two sub-slots per hour when duration fits', () => {
    // duration=30, step=30: offset 0 → 0+30≤60 ✓, offset 30 → 30+30=60≤60 ✓, offset 60 → 60+30=90>60 stop
    const config = { ...BASE_CONFIG, stepMinutes: 30 }
    const slots = generateSlots([EVENT_CONSULTATION], [], config, NOW)
    expect(slots).toHaveLength(BASE_CONFIG.windowDays * CONSULTATION_HOURS_PER_DAY * 2)
  })

  it('stepMinutes=30 with 60-min duration fits only one slot per hour', () => {
    // duration=60, step=30: offset 0 → 0+60=60≤60 ✓, offset 30 → 30+60=90>60 stop
    const config = { ...BASE_CONFIG, stepMinutes: 30 }
    const slots = generateSlots([EVENT_DEMO], [], config, NOW)
    expect(slots).toHaveLength(BASE_CONFIG.windowDays * DEMO_HOURS_PER_DAY * 1)
  })

  it('stepMinutes=60 produces the same count as the default', () => {
    const config = { ...BASE_CONFIG, stepMinutes: 60 }
    const slots = generateSlots([EVENT_CONSULTATION], [], config, NOW)
    expect(slots).toHaveLength(BASE_CONFIG.windowDays * CONSULTATION_HOURS_PER_DAY)
  })
})
