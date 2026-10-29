# Calendar Booking

A service that lets a host publish available time windows on their calendar and lets anyone book one of those windows by leaving their contact details.

## Language

**Slot**:
A specific, one-time date-and-time window on the host's calendar that can be booked. Slots are generated automatically by the server from each Event Type's schedule; the host does not create them manually. Availability is derived — a slot is available when no active booking exists for it.
_Avoid_: time slot, appointment, event, opening

**Booking**:
A reservation of one slot made by a booker. Holds the booker's name and email alongside a reference to the slot. One booking per slot maximum.
_Avoid_: reservation, appointment, registration

**Booker**:
A person who books a slot on the public page. Identified only by name and email; no account required.
_Avoid_: user, customer, client, visitor

**Host**:
The single owner of the calendar. Creates and manages Event Types (including their title, description, duration, and weekly schedule), views bookings, and cancels bookings. The host is the only party who can cancel a booking. Slots are auto-generated from the Event Type schedule; the host does not create or delete slots manually.
_Avoid_: admin, owner, organiser

**Event Type**:
A category of meeting defined by the host. Carries a title, description, duration in minutes, and a weekly schedule (`schedule: WeeklySchedule`) — a per-day map of start hours at which slots are generated. Multiple Event Types can coexist, each with a different duration and schedule.
_Avoid_: meeting type, slot type, category

**Weekly Schedule**:
A per-day map (`mon`–`sun`) of integer hours (0–23) at which slots are generated for an Event Type. Days absent from the map (or mapped to an empty array) produce no slots. Replaces the earlier single `availableHours` list, enabling different hours on different days of the week.
_Avoid_: available hours, working hours, schedule array

**Slot Generation**:
The automatic server-side process that computes available slots on each `GET /slots` request. For every Event Type, for every day in the rolling booking window, for each hour in `EventType.schedule[dayOfWeek]`, one or more slots are generated (in the configured timezone, stepping by `BOOKING_STEP_MINUTES`) unless they overlap with an existing booking. No host action is required.
_Avoid_: slot creation, bulk create, scheduling, manual scheduling

**Duration**:
The length of a meeting, set per Event Type. Each Event Type carries its own `durationMinutes`; all slots generated for that type share its duration. Duration does not vary between individual slots of the same type.
_Avoid_: length, time block, interval

**Available Slot**:
A slot that has no active booking and whose start time has not yet passed. Only available slots are shown on the public booking page.
_Avoid_: open slot, free slot, unbooked slot

**Cancellation**:
The act of removing a booking, performed by the host only. Cancelling a booking returns the slot to available.
_Avoid_: deletion (of a booking), removal

**Booking Window**:
The range of calendar days for which slots are generated, counted from today. Controlled by `BOOKING_WINDOW_START` (first day offset, default 1 = tomorrow) and `BOOKING_WINDOW_DAYS` (window length, default 14). The window rolls forward with the current date — it never expires.
_Avoid_: availability window, slot horizon
