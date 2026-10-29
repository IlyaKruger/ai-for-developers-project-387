import { useEffect, useState } from 'react'
import './client'
import { bookingsList, bookingsCancel, eventTypesList, eventTypesCreate } from './generated/sdk.gen'
import { formatSlotDate, formatSlotTime } from './lib/format'
import type { Booking, EventType, WeeklySchedule } from './generated/types.gen'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS: Record<string, string> = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
}
type DayKey = typeof DAY_KEYS[number]

function scheduleLabel(schedule: WeeklySchedule): string {
  return DAY_KEYS
    .filter(k => (schedule[k]?.length ?? 0) > 0)
    .map(k => `${DAY_LABELS[k]}: ${schedule[k]!.join(', ')}`)
    .join(' · ') || 'Нет рабочих часов'
}

type Tab = 'bookings' | 'event-types'

// ── Bookings tab ──────────────────────────────────────────────────────────────

type BookingsState =
  | { phase: 'loading' }
  | { phase: 'idle'; bookings: Booking[] }
  | { phase: 'error'; message: string }

function BookingsTab() {
  const [state, setState] = useState<BookingsState>({ phase: 'loading' })

  function load() {
    bookingsList()
      .then((r) => {
        if (r.error) throw new Error('Не удалось загрузить встречи')
        setState({ phase: 'idle', bookings: r.data ?? [] })
      })
      .catch((err: unknown) => setState({ phase: 'error', message: String(err) }))
  }

  useEffect(load, [])

  async function cancel(id: string) {
    await bookingsCancel({ path: { id } })
    load()
  }

  if (state.phase === 'loading') return <p className="text-muted-foreground">Загрузка…</p>
  if (state.phase === 'error') return <p className="text-destructive">{state.message}</p>

  if (state.bookings.length === 0) {
    return <p className="text-muted-foreground">Предстоящих встреч нет.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {state.bookings.map((b) => (
        <li
          key={b.id}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
        >
          <div>
            <p className="font-medium capitalize">{formatSlotDate(b.startTime)}</p>
            <p className="text-sm text-muted-foreground">
              {formatSlotTime(b.startTime, b.durationMinutes)}
            </p>
            <p className="mt-1 text-sm">
              {b.bookerName}{' '}
              <span className="text-muted-foreground">·</span>{' '}
              <a href={`mailto:${b.bookerEmail}`} className="text-primary hover:underline">
                {b.bookerEmail}
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={() => cancel(b.id)}
            className="ml-4 rounded-md border px-3 py-1 text-sm text-destructive hover:bg-destructive/10"
          >
            Отменить
          </button>
        </li>
      ))}
    </ul>
  )
}

// ── Event Types tab ───────────────────────────────────────────────────────────

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i)

const DEFAULT_SELECTED_HOURS: Record<DayKey, Set<number>> = {
  mon: new Set([10, 11, 14, 15, 16]),
  tue: new Set([10, 11, 14, 15, 16]),
  wed: new Set([10, 11, 14, 15, 16]),
  thu: new Set([10, 11, 14, 15, 16]),
  fri: new Set([10, 11, 14, 15, 16]),
  sat: new Set(),
  sun: new Set(),
}

type EventTypesState =
  | { phase: 'loading' }
  | { phase: 'idle'; eventTypes: EventType[]; formError?: string }
  | { phase: 'submitting'; eventTypes: EventType[] }
  | { phase: 'error'; message: string }

function EventTypesTab() {
  const [state, setState] = useState<EventTypesState>({ phase: 'loading' })
  const [selectedHours, setSelectedHours] = useState<Record<DayKey, Set<number>>>(DEFAULT_SELECTED_HOURS)

  function load() {
    eventTypesList()
      .then((r) => {
        if (r.error) throw new Error('Не удалось загрузить типы встреч')
        setState({ phase: 'idle', eventTypes: r.data ?? [] })
      })
      .catch((err: unknown) => setState({ phase: 'error', message: String(err) }))
  }

  useEffect(load, [])

  function toggleHour(day: DayKey, h: number) {
    setSelectedHours((prev) => {
      const next = new Set(prev[day])
      if (next.has(h)) { next.delete(h) } else { next.add(h) }
      return { ...prev, [day]: next }
    })
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state.phase !== 'idle') return

    const hasAny = DAY_KEYS.some(k => selectedHours[k].size > 0)
    if (!hasAny) {
      setState({ ...state, formError: 'Выберите хотя бы один день и один час.' })
      return
    }

    const fd = new FormData(e.currentTarget)
    setState({ phase: 'submitting', eventTypes: state.eventTypes })

    const schedule = Object.fromEntries(
      DAY_KEYS
        .filter(k => selectedHours[k].size > 0)
        .map(k => [k, [...selectedHours[k]].sort((a, b) => a - b)])
    )

    const r = await eventTypesCreate({
      body: {
        title: fd.get('title') as string,
        description: (fd.get('description') as string) ?? '',
        durationMinutes: Number(fd.get('durationMinutes')),
        schedule,
      },
    })

    if (r.error) {
      setState({
        phase: 'idle',
        eventTypes: state.eventTypes,
        formError: (r.error as { message?: string }).message ?? 'Ошибка при создании.',
      })
      return
    }

    // Reset hours selection and reload list
    setSelectedHours(DEFAULT_SELECTED_HOURS)
    const form = e.target as HTMLFormElement
    form.reset()
    load()
  }

  if (state.phase === 'loading') return <p className="text-muted-foreground">Загрузка…</p>
  if (state.phase === 'error') return <p className="text-destructive">{state.message}</p>

  const eventTypes = (state as Extract<EventTypesState, { phase: 'idle' | 'submitting' }>).eventTypes
  const formError = state.phase === 'idle' ? state.formError : undefined
  const submitting = state.phase === 'submitting'

  return (
    <div className="flex flex-col gap-8">
      {/* List */}
      {eventTypes.length === 0 ? (
        <p className="text-muted-foreground">Типов встреч пока нет.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {eventTypes.map((et) => (
            <li key={et.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="font-semibold">{et.title}</p>
              {et.description && (
                <p className="mt-1 text-sm text-muted-foreground">{et.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {et.durationMinutes} мин · {scheduleLabel(et.schedule)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Create form */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Новый тип встречи</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Название
            <input
              name="title"
              type="text"
              required
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Описание
            <textarea
              name="description"
              rows={2}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Длительность (мин)
            <input
              name="durationMinutes"
              type="number"
              min={5}
              step={5}
              defaultValue={30}
              required
              className="w-32 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Доступные часы</legend>
            <div className="flex flex-col gap-3">
              {DAY_KEYS.map((day) => (
                <div key={day} className="flex items-start gap-3">
                  <span className="w-6 pt-2 text-sm font-medium text-muted-foreground">{DAY_LABELS[day]}</span>
                  <div className="flex flex-wrap gap-2">
                    {ALL_HOURS.map((h) => (
                      <label
                        key={h}
                        className={`flex h-9 w-12 cursor-pointer items-center justify-center rounded-md border text-sm transition
                          ${selectedHours[day].has(h)
                            ? 'border-primary bg-primary/10 font-medium text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedHours[day].has(h)}
                          onChange={() => toggleHour(day, h)}
                        />
                        {String(h).padStart(2, '0')}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Сохранение…' : 'Создать тип встречи'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Host page shell ───────────────────────────────────────────────────────────

export default function HostPage() {
  const [tab, setTab] = useState<Tab>('bookings')

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Панель управления</h1>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← К публичной странице
        </a>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {(['bookings', 'event-types'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition
              ${tab === t
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t === 'bookings' ? 'Встречи' : 'Типы встреч'}
          </button>
        ))}
      </div>

      {tab === 'bookings' ? <BookingsTab /> : <EventTypesTab />}
    </main>
  )
}
