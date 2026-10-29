import { test, expect } from '@playwright/test'

test.describe('Host admin: event type management', () => {
  test('host can create a new event type and see it in the list', async ({ page }) => {
    await page.goto('/host')

    // Switch to the "Типы встреч" tab
    await page.getByRole('button', { name: 'Типы встреч' }).click()
    await expect(page.getByRole('heading', { name: 'Новый тип встречи' })).toBeVisible()

    // Fill in the form
    await page.getByLabel('Название').fill('Быстрый созвон')
    await page.getByLabel('Описание').fill('15 минут без подготовки')
    await page.getByLabel('Длительность (мин)').fill('15')

    // Select hour 11 (uncheck defaults that include 11 first to get clean state)
    // Just click on hour "11" to make sure it's checked
    const hour11 = page.locator('label').filter({ hasText: '11' }).first()
    // Uncheck all first by reading current state — instead, just ensure 11 is checked
    if (!await hour11.evaluate((el) => el.querySelector('input')?.checked)) {
      await hour11.click()
    }

    // Submit
    await page.getByRole('button', { name: 'Создать тип встречи' }).click()

    // New event type appears in the list
    await expect(page.getByText('Быстрый созвон')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('15 минут без подготовки')).toBeVisible()
    await expect(page.getByText(/^15 мин · /)).toBeVisible()
  })

  test('new event type appears on the public booking page', async ({ page }) => {
    // Create via API for speed
    const API = 'http://localhost:3001'
    const etRes = await page.request.post(`${API}/event-types`, {
      data: {
        title: 'API-created тип',
        description: 'создан через API',
        durationMinutes: 20,
        schedule: { mon: [10], tue: [10], wed: [10], thu: [10], fri: [10] },
      },
    })
    expect(etRes.status()).toBe(201)
    const et = await etRes.json()

    // Public page should list it
    await page.goto('/')
    await expect(page.getByText('API-created тип')).toBeVisible({ timeout: 5_000 })

    // Clicking it should load slots
    await page.getByText('API-created тип').click()
    const slotsRes = await page.request.get(`${API}/slots?eventTypeId=${et.id}`)
    const slots = await slotsRes.json()
    expect(slots.length).toBeGreaterThan(0)
  })
})
