# Host-only booking cancellation

Only the host can cancel a booking. Bookers have no self-service cancellation. We chose this to keep the public surface minimal — self-service cancellation requires a way to authenticate the original booker (email token, booking reference, etc.), which adds complexity that isn't justified at this stage. A booker who needs to cancel contacts the host directly.

## Consequences

No booking reference or confirmation token is shown to the booker after booking. If self-service cancellation is added later, a token or reference number must be introduced and surfaced in the post-booking confirmation.
