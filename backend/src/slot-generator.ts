import { createHash } from "node:crypto";
import type { EventType, Booking, WeeklySchedule } from "./db.js";
import type { SlotConfig } from "./slot-config.js";
import { overlaps } from "./overlap.js";

function getDayKey(date: Date, timezone: string): keyof WeeklySchedule {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date).toLowerCase().slice(0, 3) as keyof WeeklySchedule;
}

export type GeneratedSlot = {
  id: string;
  eventTypeId: string;
  startTime: string;
};

/**
 * Returns the UTC offset in milliseconds for a given timezone at the instant `utc`.
 * Positive value means local time is ahead of UTC.
 */
function getOffsetMs(utc: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utc);
  const p = (type: string) => parseInt(parts.find((x) => x.type === type)!.value, 10);
  // hour12:false may return 24 for midnight in some locales
  const h = p("hour") % 24;
  const localAsUtc = Date.UTC(p("year"), p("month") - 1, p("day"), h, p("minute"), p("second"));
  return localAsUtc - utc.getTime();
}

/**
 * Builds the UTC Date for the moment when the clock in `tz` shows
 * the same calendar date as `referenceUtc` (in that tz) at `hour:offsetMinutes:00`.
 */
function slotStartUtc(referenceUtc: Date, hour: number, tz: string, offsetMinutes = 0): Date {
  // Get the calendar date as seen in the target timezone
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceUtc);
  const pd = (type: string) => parseInt(dateParts.find((x) => x.type === type)!.value, 10);
  const year = pd("year");
  const month = pd("month");
  const day = pd("day");

  // Naive UTC guess: treat local time as UTC
  const naive = new Date(Date.UTC(year, month - 1, day, hour, offsetMinutes, 0, 0));
  // Correct for the timezone offset at approximately this time
  const offset = getOffsetMs(naive, tz);
  return new Date(naive.getTime() - offset);
}

/**
 * Generates available slots for the rolling window defined by `config`,
 * anchored to `now`. Slots that overlap with existing bookings are excluded.
 */
export function generateSlots(
  eventTypes: EventType[],
  bookings: Booking[],
  config: SlotConfig,
  now: Date,
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];

  const startMs = now.getTime() + config.windowStartOffsetDays * 86_400_000;

  for (let dayOffset = 0; dayOffset < config.windowDays; dayOffset++) {
    const dayMs = startMs + dayOffset * 86_400_000;
    const dayRef = new Date(dayMs);

    for (const et of eventTypes) {
      const dayKey = getDayKey(dayRef, config.timezone);
      const hours = et.schedule[dayKey] ?? [];
      if (hours.length === 0) continue;
      for (const hour of hours) {
        let offsetMin = 0;
        while (offsetMin + et.durationMinutes <= 60) {
          const start = slotStartUtc(dayRef, hour, config.timezone, offsetMin);

          // Skip slots in the past
          if (start.getTime() <= now.getTime()) {
            offsetMin += config.stepMinutes;
            continue;
          }

          const startIso = start.toISOString();

          // Skip if overlaps with any existing booking
          const busy = bookings.some((b) =>
            overlaps(startIso, et.durationMinutes, b.startTime, b.durationMinutes),
          );
          if (!busy) {
            // Deterministic ID: same (eventTypeId, startTime) always yields the same slotId,
            // so a slotId returned from GET /slots remains valid in POST /bookings.
            const id = createHash("sha256")
              .update(`${et.id}|${startIso}`)
              .digest("hex")
              .slice(0, 32);
            slots.push({ id, eventTypeId: et.id, startTime: startIso });
          }

          offsetMin += config.stepMinutes;
        }
      }
    }
  }

  return slots;
}
