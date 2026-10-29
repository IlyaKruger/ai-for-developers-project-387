import { test, expect } from '@playwright/test'

test.describe('Guest booking flow', () => {
  test('guest can book a slot and host sees the meeting', async ({ page }) => {
    // 1. Land on the public page
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // 2. Pick an event type
    const eventTypeCards = page.locator('ul li button')
    await expect(eventTypeCards.first()).toBeVisible()
    const eventTypeTitle = await eventTypeCards.first().locator('p').first().textContent()
    await eventTypeCards.first().click()

    // 3. Pick the first available slot
    const slotCards = page.locator('ul li button')
    await expect(slotCards.first()).toBeVisible({ timeout: 5_000 })
    const slotDate = await slotCards.first().locator('p').first().textContent()
    await slotCards.first().click()

    // 4. Fill in the booking form
    await page.getByLabel('Имя').fill('Иван Тестов')
    await page.getByLabel('Email').fill('ivan@example.com')
    await page.getByRole('button', { name: 'Забронировать' }).click()

    // 5. See confirmation
    await expect(page.getByText('Запись подтверждена!')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(eventTypeTitle!)).toBeVisible()
    await expect(page.getByText(slotDate!)).toBeVisible()

    // 6. Host sees the booking
    await page.goto('/host')
    await expect(page.getByText('Иван Тестов')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('ivan@example.com')).toBeVisible()
  })
})

const API = 'http://localhost:3001'

test.describe('Booking conflict', () => {
  test('second booking for the same time is rejected by the server', async ({ request }) => {
    // Get first event type and its first slot via API
    const etRes = await request.get(`${API}/event-types`)
    const eventTypes = await etRes.json()
    const et = eventTypes[0]

    const slotsRes = await request.get(`${API}/slots?eventTypeId=${et.id}`)
    const slots = await slotsRes.json()
    const slot = slots[0]

    // Book the slot
    const r1 = await request.post(`${API}/bookings`, {
      data: { slotId: slot.id, bookerName: 'Alice', bookerEmail: 'alice@example.com' },
    })
    expect(r1.status()).toBe(201)

    // Try to book the same slot again
    const r2 = await request.post(`${API}/bookings`, {
      data: { slotId: slot.id, bookerName: 'Bob', bookerEmail: 'bob@example.com' },
    })
    expect(r2.status()).toBe(409)
    const body = await r2.json()
    expect(body.code).toBe('SLOT_UNAVAILABLE')

    // The booked slot is no longer in the available list
    const slotsRes2 = await request.get(`${API}/slots?eventTypeId=${et.id}`)
    const slots2 = await slotsRes2.json()
    expect(slots2.find((s: { id: string }) => s.id === slot.id)).toBeUndefined()
  })
})
