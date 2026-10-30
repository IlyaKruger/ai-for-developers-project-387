import { render, screen } from '@testing-library/react'
import { vi, it, expect } from 'vitest'
import HostPage from './HostPage'
import * as sdk from './generated/sdk.gen'

vi.mock('./generated/sdk.gen', () => ({
  eventTypesList: vi.fn(),
  eventTypesCreate: vi.fn(),
  bookingsList: vi.fn(),
  bookingsCancel: vi.fn(),
}))

function booking(id: string, topic?: string) {
  return {
    id,
    slotId: `slot-${id}`,
    eventTypeId: 'et',
    startTime: '2030-01-15T10:00:00Z',
    durationMinutes: 30,
    bookerName: `Гость ${id}`,
    bookerEmail: `${id}@example.com`,
    ...(topic ? { topic } : {}),
  }
}

function mockBookings(bookings: ReturnType<typeof booking>[]) {
  vi.mocked(sdk.bookingsList).mockResolvedValue({
    data: bookings,
    error: undefined,
    response: new Response(),
  } as unknown as ReturnType<typeof sdk.bookingsList>)
}

it('renders the topic as plain text, not markup', async () => {
  mockBookings([booking('a', '<b>жирный</b>\nвторая строка')])
  const { container } = render(<HostPage />)
  expect(await screen.findByText(/<b>жирный<\/b>/)).toBeTruthy()
  expect(container.querySelector('li b')).toBeNull()
})

it('shows no topic label for bookings without a topic', async () => {
  mockBookings([booking('b')])
  render(<HostPage />)
  expect(await screen.findByText('Гость b', { exact: false })).toBeTruthy()
  expect(screen.queryByText(/Тема:/)).toBeNull()
})
