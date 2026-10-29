export function formatSlotDate(isoString: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(isoString))
}

export function formatSlotTime(isoString: string, durationMinutes: number): string {
  const start = new Date(isoString)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const fmt = (d: Date) =>
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}
