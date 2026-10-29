# Derived slot availability

A slot carries no `status` or `available` field. Availability is derived at read time: a slot is available when no active booking references it. We chose this over an explicit status field to avoid keeping two sources of truth in sync — if a booking is cancelled, the slot automatically becomes available again without a separate update.

## Considered Options

- **Explicit `status` field on Slot** — simpler queries, but requires updating the slot every time a booking is created or cancelled, creating a write-coordination problem.
- **Derived from Booking existence** *(chosen)* — single source of truth; availability is always correct by definition.
