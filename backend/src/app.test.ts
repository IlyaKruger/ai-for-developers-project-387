import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from './app.js'
import { createDb } from './db.js'
import type { Db } from './db.js'
import type { WeeklySchedule } from './db.js'
import type { SlotConfig } from './slot-config.js'

const TEST_CONFIG: SlotConfig = {
  timezone: 'Europe/Moscow',
  windowDays: 14,
  windowStartOffsetDays: 1,
  stepMinutes: 60,
}

/** Returns a now() that is `days` days after the given base date */
function nowAt(base: Date, days = 0): () => Date {
  return () => new Date(base.getTime() + days * 86_400_000)
}

const BASE_NOW = new Date('2024-01-15T10:00:00Z')

let db: Db
let app: ReturnType<typeof createApp>

beforeEach(() => {
  db = createDb()
  app = createApp(db, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })
})

async function json(res: Response) {
  return res.json()
}

/** Fetches available slots for the first event type */
async function getSlots(): Promise<Array<{ id: string; eventTypeId: string; startTime: string }>> {
  const et = db.eventTypes[0]
  const res = await app.request(`/slots?eventTypeId=${et.id}`)
  return res.json()
}

describe('GET /event-types', () => {
  it('returns seeded event types', async () => {
    const res = await app.request('/event-types')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({ title: expect.any(String), durationMinutes: expect.any(Number) })
  })
})

describe('GET /slots', () => {
  it('returns 400 when eventTypeId is missing', async () => {
    const res = await app.request('/slots')
    expect(res.status).toBe(400)
  })

  it('returns slots for a valid event type', async () => {
    const etId = db.eventTypes[0].id
    const res = await app.request(`/slots?eventTypeId=${etId}`)
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toMatchObject({ eventTypeId: etId, startTime: expect.any(String) })
  })

  it('excludes slots that are booked', async () => {
    const slots = await getSlots()
    const slot = slots[0]
    const et = db.eventTypes[0]
    db.bookings.push({
      id: 'b-1',
      slotId: slot.id,
      eventTypeId: et.id,
      startTime: slot.startTime,
      durationMinutes: et.durationMinutes,
      bookerName: 'Alice',
      bookerEmail: 'alice@example.com',
    })
    const after = await getSlots()
    expect(after.find((s) => s.id === slot.id)).toBeUndefined()
  })

  it('rolling window: still returns slots 15 days after base now', async () => {
    // Simulate the server having been running for 15 days — all original static slots
    // would be in the past, but the rolling window always covers the next 14 days.
    const lateApp = createApp(db, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW, 15) })
    const etId = db.eventTypes[0].id
    const res = await lateApp.request(`/slots?eventTypeId=${etId}`)
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.length).toBeGreaterThan(0)
  })

  it('returns 404 for unknown event type', async () => {
    const res = await app.request('/slots?eventTypeId=nonexistent')
    expect(res.status).toBe(404)
  })
})

describe('POST /bookings', () => {
  it('creates a booking and returns 201', async () => {
    const et = db.eventTypes[0]
    const slots = await getSlots()
    const slot = slots[0]
    const res = await app.request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: slot.id, bookerName: 'Alice', bookerEmail: 'alice@example.com' }),
    })
    expect(res.status).toBe(201)
    const body = await json(res)
    expect(body).toMatchObject({
      slotId: slot.id,
      bookerName: 'Alice',
      bookerEmail: 'alice@example.com',
      durationMinutes: et.durationMinutes,
    })
  })

  it('returns 409 when the same slot is booked twice', async () => {
    const slots = await getSlots()
    const slot = slots[0]
    const payload = JSON.stringify({ slotId: slot.id, bookerName: 'Alice', bookerEmail: 'alice@example.com' })
    await app.request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    const res2 = await app.request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    expect(res2.status).toBe(409)
    const body = await json(res2)
    expect(body.code).toBe('SLOT_UNAVAILABLE')
  })

  it('returns 409 when a 30-min booking at 10:30 partially overlaps a 60-min slot at 10:00 (POST /bookings)', async () => {
    // Scenario: someone already booked a 30-min slot at 10:30 Moscow.
    // A new 60-min slot starting at 10:00 Moscow covers 10:00–11:00,
    // which overlaps with the existing [10:30, 11:00) booking.
    //
    // BASE_NOW = 2024-01-15T10:00Z; first window day = 2024-01-16 in Moscow.
    // 10:00 Moscow (UTC+3) = 07:00 UTC on 2024-01-16.
    // 10:30 Moscow          = 07:30 UTC on 2024-01-16.

    const et60 = {
      id: 'et-60',
      title: '60min',
      description: '',
      durationMinutes: 60,
      schedule: { mon: [10], tue: [10], wed: [10], thu: [10], fri: [10], sat: [10], sun: [10] },
    }
    const localDb = { eventTypes: [et60], bookings: [] as typeof db.bookings }
    const localApp = createApp(localDb, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })

    // Get the 60-min slot at 10:00 Moscow via the API
    const slotsRes = await localApp.request(`/slots?eventTypeId=${et60.id}`)
    const slots: Array<{ id: string; startTime: string }> = await slotsRes.json()
    const slot1000 = slots[0] // earliest: 10:00 Moscow = 07:00 UTC on 2024-01-16

    // Inject a pre-existing 30-min booking at 10:30 Moscow (07:30 UTC)
    const t1030 = new Date(new Date(slot1000.startTime).getTime() + 30 * 60_000).toISOString()
    localDb.bookings.push({
      id: 'existing-b',
      slotId: 'some-other-slot',
      eventTypeId: 'any',
      startTime: t1030,
      durationMinutes: 30,
      bookerName: 'Alice',
      bookerEmail: 'alice@example.com',
    })

    // Trying to book the 60-min slot at 10:00 must fail: [10:00,11:00) ∩ [10:30,11:00) ≠ ∅
    const res = await localApp.request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: slot1000.id, bookerName: 'Bob', bookerEmail: 'bob@example.com' }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('SLOT_UNAVAILABLE')
  })

  it('GET /slots excludes a 60-min slot at 10:00 when a 30-min booking at 10:30 exists', async () => {
    // Same partial-overlap scenario tested from the slot-listing side.
    // generateSlots must filter out any slot whose window overlaps an existing booking.

    const et60 = {
      id: 'et-60',
      title: '60min',
      description: '',
      durationMinutes: 60,
      schedule: { mon: [10], tue: [10], wed: [10], thu: [10], fri: [10], sat: [10], sun: [10] },
    }
    const localDb = { eventTypes: [et60], bookings: [] as typeof db.bookings }
    const localApp = createApp(localDb, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })

    // Snapshot slots before any booking
    const before: Array<{ id: string; startTime: string }> = await (
      await localApp.request(`/slots?eventTypeId=${et60.id}`)
    ).json()
    const slot1000 = before[0]

    // Inject a 30-min booking at 10:30 (30 min into the 60-min window)
    const t1030 = new Date(new Date(slot1000.startTime).getTime() + 30 * 60_000).toISOString()
    localDb.bookings.push({
      id: 'b-partial',
      slotId: 'other',
      eventTypeId: 'any',
      startTime: t1030,
      durationMinutes: 30,
      bookerName: 'Alice',
      bookerEmail: 'alice@example.com',
    })

    // The 10:00 slot must now be absent from the listing
    const after: Array<{ id: string }> = await (
      await localApp.request(`/slots?eventTypeId=${et60.id}`)
    ).json()
    expect(after.find((s) => s.id === slot1000.id)).toBeUndefined()
    expect(after.length).toBe(before.length - 1)
  })

  it('returns 404 for unknown slotId', async () => {
    const res = await app.request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: 'nonexistent', bookerName: 'Alice', bookerEmail: 'alice@example.com' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('GET /bookings', () => {
  it('returns only upcoming bookings sorted by startTime', async () => {
    const slots = await getSlots()
    for (const slot of slots.slice(0, 2)) {
      await app.request('/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, bookerName: 'Alice', bookerEmail: 'alice@example.com' }),
      })
    }
    const res = await app.request('/bookings')
    expect(res.status).toBe(200)
    const body: Array<{ startTime: string }> = await json(res)
    expect(body.length).toBe(2)
    expect(new Date(body[0].startTime) <= new Date(body[1].startTime)).toBe(true)
  })
})

describe('DELETE /bookings/:id', () => {
  it('cancels a booking and returns 204', async () => {
    const slots = await getSlots()
    const slot = slots[0]
    const createRes = await app.request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: slot.id, bookerName: 'Alice', bookerEmail: 'alice@example.com' }),
    })
    const { id } = await createRes.json()
    const deleteRes = await app.request(`/bookings/${id}`, { method: 'DELETE' })
    expect(deleteRes.status).toBe(204)
    expect(db.bookings).toHaveLength(0)
  })

  it('returns 404 for unknown booking', async () => {
    const res = await app.request('/bookings/nonexistent', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

describe('GET /slots — per-weekday schedule', () => {
  function makeDb(schedule: WeeklySchedule): Db {
    const localDb = createDb()
    localDb.eventTypes = [{
      id: 'test-et',
      title: 'Test',
      description: '',
      durationMinutes: 60,
      schedule,
    }]
    localDb.bookings = []
    return localDb
  }

  // BASE_NOW = Mon 15 Jan 2024 10:00 UTC
  // windowStartOffsetDays: 1 → window starts Tue 16 Jan 2024
  // window covers: Tue 16 Jan – Mon 29 Jan 2024 (14 days)

  it('no slots on Saturday when schedule has no Saturday hours', async () => {
    // Schedule only covers Tue–Fri; no Saturday entry
    const localDb = makeDb({ tue: [10], wed: [10], thu: [10], fri: [10] })
    const localApp = createApp(localDb, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })

    const res = await localApp.request('/slots?eventTypeId=test-et')
    expect(res.status).toBe(200)
    const slots: Array<{ startTime: string }> = await res.json()

    // Verify there is at least one slot (to confirm scheduling works)
    expect(slots.length).toBeGreaterThan(0)

    // None of the slots should fall on a Saturday (getDay() === 6)
    const saturdaySlots = slots.filter((s) => new Date(s.startTime).getDay() === 6)
    expect(saturdaySlots).toHaveLength(0)
  })

  it('Saturday hours differ from weekday hours', async () => {
    // Tuesday slots at 9:00 Moscow (06:00 UTC), Saturday slots at 14:00 Moscow (11:00 UTC)
    const localDb = makeDb({ tue: [9], sat: [14] })
    const localApp = createApp(localDb, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })

    const res = await localApp.request('/slots?eventTypeId=test-et')
    expect(res.status).toBe(200)
    const slots: Array<{ startTime: string }> = await res.json()

    const tuesdaySlots = slots.filter((s) => new Date(s.startTime).getDay() === 2) // Tuesday = 2
    const saturdaySlots = slots.filter((s) => new Date(s.startTime).getDay() === 6) // Saturday = 6

    // There must be at least one Tuesday slot at 9 Moscow = 6 UTC
    expect(tuesdaySlots.length).toBeGreaterThan(0)
    expect(tuesdaySlots.every((s) => new Date(s.startTime).getUTCHours() === 6)).toBe(true)

    // There must be at least one Saturday slot at 14 Moscow = 11 UTC
    expect(saturdaySlots.length).toBeGreaterThan(0)
    expect(saturdaySlots.every((s) => new Date(s.startTime).getUTCHours() === 11)).toBe(true)

    // Saturday slots must NOT have hour 9 Moscow (= 6 UTC)
    const saturdayAt9Moscow = saturdaySlots.filter((s) => new Date(s.startTime).getUTCHours() === 6)
    expect(saturdayAt9Moscow).toHaveLength(0)
  })

  it('empty schedule returns no slots', async () => {
    const localDb = makeDb({})
    const localApp = createApp(localDb, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })

    const res = await localApp.request('/slots?eventTypeId=test-et')
    expect(res.status).toBe(200)
    const slots: Array<unknown> = await res.json()

    expect(slots).toEqual([])
  })

  it('day-of-week is determined in timezone, not UTC', async () => {
    // Sun 21 Jan 2024 00:00 Moscow (UTC+3) = Sat 20 Jan 2024 21:00 UTC.
    // A generator that uses UTC getDay() would see Saturday and skip this slot.
    // A correct generator looks up 'sun' in Moscow timezone and produces the slot.
    // The resulting startTime falls on Saturday in UTC — that's the proof.
    const localDb = makeDb({ sun: [0] }) // midnight Moscow
    const localApp = createApp(localDb, { slotConfig: TEST_CONFIG, now: nowAt(BASE_NOW) })

    const res = await localApp.request('/slots?eventTypeId=test-et')
    expect(res.status).toBe(200)
    const slots: Array<{ startTime: string }> = await res.json()

    // Two Moscow-Sundays in the window (Jan 21 and Jan 28), each at 00:00 Moscow = 21:00 UTC prev day
    expect(slots).toHaveLength(2)

    // Both startTimes are Saturday in UTC — proving day lookup used Moscow, not UTC
    expect(slots.every((s) => new Date(s.startTime).getUTCDay() === 6)).toBe(true) // 6 = Saturday UTC
  })
})
