import { render, screen } from '@testing-library/react'
import { vi, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import * as sdk from './generated/sdk.gen'

vi.mock('./generated/sdk.gen', () => ({
  eventTypesList: vi.fn(),
  slotsList: vi.fn(),
  bookingsCreate: vi.fn(),
  bookingsList: vi.fn(),
  bookingsCancel: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(sdk.eventTypesList).mockResolvedValue({
    data: [],
    error: undefined,
    response: new Response(),
  } as unknown as ReturnType<typeof sdk.eventTypesList>)
})

it('renders the booking page heading', async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Запись на звонок')
})
