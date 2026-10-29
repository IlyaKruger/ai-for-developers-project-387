import type { Slot } from '../generated/types.gen'

export function getAvailableSlots(slots: Slot[], bookedSlotIds: Set<string>): Slot[] {
  const now = new Date()
  return slots.filter(
    (slot) => !bookedSlotIds.has(slot.id) && new Date(slot.startTime) >= now,
  )
}
