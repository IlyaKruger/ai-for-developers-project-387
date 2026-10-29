# Per-EventType duration

Each Event Type carries its own `durationMinutes` field. Slots generated for an Event Type all share its duration; duration does not vary between individual slots of the same type, but can differ across Event Types.

## Context

The original ADR-0002 specified a single fixed duration for all slots across the entire calendar. That design was revised during implementation: different meeting categories (e.g. "Консультация: 30 min", "Демонстрация: 60 min") naturally require different durations, and a single global setting would prevent that.

## Decision

`durationMinutes` is a required field on `EventType`. There is no global duration setting. When comparing bookings for conflicts, each booking's own `durationMinutes` is used (stored on the Booking at creation time), so the overlap check is always correct even if an Event Type's duration changes later.

## Considered Options

- **Single global duration** *(original, now rejected)* — simpler queries, but prevents offering meeting types of different lengths.
- **Per-EventType duration** *(chosen)* — each type has its own duration; overlap detection uses the per-booking stored value.
- **Per-slot duration** — maximum flexibility but adds complexity with no current use case (see also ADR-0002 original consequences note).

## Consequences

- The `EventType` schema always requires `durationMinutes`; so does the `Booking` record (copied at booking time).
- Overlap detection remains correct after an Event Type's duration is changed, because the stored `Booking.durationMinutes` reflects the duration at booking time.
- Adding per-slot variable durations in the future would require a schema migration only on `Slot`, not on `Booking`.
