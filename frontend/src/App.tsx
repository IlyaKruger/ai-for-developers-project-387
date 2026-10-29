import { useEffect, useState } from 'react'
import './client'
import { eventTypesList, slotsList, bookingsCreate } from './generated/sdk.gen'
import { formatSlotDate, formatSlotTime } from './lib/format'
import { Button } from '@/components/ui/button'
import type { EventType, Slot } from './generated/types.gen'

type State =
  | { phase: 'loading' }
  | { phase: 'pick-type'; eventTypes: EventType[] }
  | { phase: 'loading-slots'; eventTypes: EventType[]; eventType: EventType }
  | { phase: 'pick-slot'; eventTypes: EventType[]; eventType: EventType; slots: Slot[]; conflictBanner?: string }
  | { phase: 'booking'; eventTypes: EventType[]; eventType: EventType; slots: Slot[]; slot: Slot }
  | { phase: 'submitting'; eventTypes: EventType[]; eventType: EventType; slots: Slot[]; slot: Slot }
  | { phase: 'success'; eventType: EventType; slot: Slot }
  | { phase: 'error'; message: string }

export default function App() {
  const [state, setState] = useState<State>({ phase: 'loading' })

  useEffect(() => {
    eventTypesList()
      .then((r) => {
        if (r.error) throw new Error('Не удалось загрузить типы встреч')
        setState({ phase: 'pick-type', eventTypes: r.data ?? [] })
      })
      .catch((err: unknown) => setState({ phase: 'error', message: String(err) }))
  }, [])

  function selectEventType(eventType: EventType) {
    if (state.phase !== 'pick-type') return
    setState({ phase: 'loading-slots', eventTypes: state.eventTypes, eventType })
    slotsList({ query: { eventTypeId: eventType.id } })
      .then((r) => {
        if (r.error) throw new Error('Не удалось загрузить слоты')
        setState({
          phase: 'pick-slot',
          eventTypes: state.eventTypes,
          eventType,
          slots: r.data ?? [],
        })
      })
      .catch((err: unknown) => setState({ phase: 'error', message: String(err) }))
  }

  async function handleBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state.phase !== 'booking') return
    const { eventType, slot, slots, eventTypes } = state
    const fd = new FormData(e.currentTarget)
    setState({ phase: 'submitting', eventType, slot, slots, eventTypes })
    const r = await bookingsCreate({
      body: {
        slotId: slot.id,
        bookerName: fd.get('name') as string,
        bookerEmail: fd.get('email') as string,
      },
    })
    if (r.error) {
      const errCode = (r.error as { code?: string }).code
      if (errCode === 'SLOT_UNAVAILABLE') {
        // Slot was taken between listing and booking — refresh the list and show inline banner
        const fresh = await slotsList({ query: { eventTypeId: slot.eventTypeId } })
        setState({
          phase: 'pick-slot',
          eventTypes,
          eventType,
          slots: fresh.data ?? [],
          conflictBanner: 'Этот слот только что заняли. Пожалуйста, выберите другое время.',
        })
      } else {
        setState({ phase: 'error', message: (r.error as { message?: string }).message ?? 'Ошибка бронирования' })
      }
      return
    }
    setState({ phase: 'success', eventType, slot })
  }

  if (state.phase === 'loading' || state.phase === 'loading-slots') {
    return <Page title="Запись на звонок"><p className="text-muted-foreground">Загрузка…</p></Page>
  }

  if (state.phase === 'error') {
    return <Page title="Запись на звонок"><p className="text-destructive">{state.message}</p></Page>
  }

  if (state.phase === 'success') {
    return (
      <Page title="Запись на звонок">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-medium text-green-800">Запись подтверждена!</p>
          <p className="mt-1 text-sm text-green-700">
            {state.eventType.title} · {formatSlotDate(state.slot.startTime)},{' '}
            {formatSlotTime(state.slot.startTime, state.eventType.durationMinutes)}
          </p>
          <p className="mt-2 text-sm text-green-600">Мы свяжемся с вами в ближайшее время.</p>
        </div>
      </Page>
    )
  }

  if (state.phase === 'pick-type') {
    return (
      <Page title="Запись на звонок">
        <p className="mb-6 text-muted-foreground">Выберите тип встречи:</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {state.eventTypes.map((et) => (
            <li key={et.id}>
              <button
                type="button"
                onClick={() => selectEventType(et)}
                className="w-full rounded-lg border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <p className="font-semibold">{et.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{et.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{et.durationMinutes} мин</p>
              </button>
            </li>
          ))}
        </ul>
      </Page>
    )
  }

  if (state.phase === 'pick-slot') {
    const { eventType, slots, eventTypes, conflictBanner } = state
    return (
      <Page title={eventType.title}>
        <button
          type="button"
          onClick={() => setState({ phase: 'pick-type', eventTypes })}
          className="mb-5 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Назад
        </button>
        {conflictBanner && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {conflictBanner}
          </div>
        )}
        {slots.length === 0 ? (
          <p className="text-muted-foreground">Нет свободных слотов в ближайшие 14 дней.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <li key={slot.id}>
                <button
                  type="button"
                  onClick={() =>
                    setState({ phase: 'booking', eventTypes, eventType, slots, slot })
                  }
                  className="w-full rounded-lg border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                >
                  <p className="font-medium capitalize">{formatSlotDate(slot.startTime)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatSlotTime(slot.startTime, eventType.durationMinutes)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Page>
    )
  }

  // booking | submitting
  const { eventType, slot, slots, eventTypes } = state
  const submitting = state.phase === 'submitting'

  return (
    <Page title={eventType.title}>
      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setState({ phase: 'pick-slot', eventTypes, eventType, slots })}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Назад
        </button>
        <h2 className="text-lg font-semibold capitalize">{formatSlotDate(slot.startTime)}</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {formatSlotTime(slot.startTime, eventType.durationMinutes)}
        </p>
        <form onSubmit={handleBooking} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Имя
            <input
              name="name"
              type="text"
              required
              autoFocus
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? 'Отправка…' : 'Забронировать'}
          </Button>
        </form>
      </div>
    </Page>
  )
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <a href="/host" className="text-sm text-muted-foreground hover:text-foreground">
          Владелец →
        </a>
      </div>
      {children}
    </main>
  )
}
