# Per-day weekly schedule for Event Type

Each Event Type carries a `schedule: WeeklySchedule` — a map from day keys (`mon`–`sun`) to arrays of start hours. This replaces the earlier single `availableHours: number[]` field that applied uniformly to every day of the week.

## Context

The original design used a flat list of hours that repeated on every working day. This worked for simple calendars but made it impossible to express common real-world schedules: different hours on Mondays vs Fridays, no slots on weekends without listing zero days, or shortened Saturday hours.

## Decision

Replace `availableHours: number[]` on `EventType` with `schedule: WeeklySchedule`:

```ts
type WeeklySchedule = {
  mon?: number[];
  tue?: number[];
  wed?: number[];
  thu?: number[];
  fri?: number[];
  sat?: number[];
  sun?: number[];
};
```

A missing key or an empty array means "no slots that day". The slot generator iterates only over keys present in the schedule, so days with no entry produce no slots without any special casing.

## Considered Options

- **Single `availableHours` list applied to all days** *(original, now rejected)* — simple but can't express day-specific hours; silencing weekends requires a separate boolean.
- **Per-day `WeeklySchedule` map** *(chosen)* — natural representation, no extra booleans needed, maps directly to iCal BYHOUR recurrence semantics.
- **iCal RRULE string** — maximum expressiveness (nth weekday, exclusion dates, etc.) but requires a parser and is hard to validate and display in a form.
- **Bitmask per hour across days** — compact but unreadable and harder to evolve.

## Consequences

- The TypeSpec contract was updated: `availableHours` removed, `schedule` added (see commit referencing issue #20).
- The generated OpenAPI and frontend SDK were regenerated (`npm run generate`).
- Slot generation reads `et.schedule[dayKey]` per day; days absent from the map are skipped in O(1).
- Existing data in `db.ts` was migrated to the new shape.
- `availableHours` no longer exists anywhere in the codebase; searching for it indicates stale documentation or a merge artifact.
