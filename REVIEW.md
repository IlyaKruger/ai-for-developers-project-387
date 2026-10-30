# Review Criteria: Calendar Booking

Criteria for independent code review of the booking calendar. Each criterion states the expected behaviour, the test seam to check, and the consequence of failure.

## 1. Slot booking does not double-book

**Expected:** A slot that already has a booking (`status: booked`) cannot be booked again. A second `POST /bookings` for the same `slotId` must return an error (conflict or not-found).

**Seam:** `POST /bookings` in `backend/src/app.test.ts`. Check the slot status before and after.

**Consequence of failure:** Two guests believe they have the same slot; Host gets two conflicting bookings.

## 2. Time overlap is rejected

**Expected:** Two bookings whose time windows overlap are not both accepted. The system must detect overlap using the `overlap` function in `backend/src/overlap.ts`.

**Seam:** Integration test posting two bookings with overlapping times.

**Consequence of failure:** Host has two overlapping appointments; calendar integrity is lost.

## 3. Topic validation — 280 characters, whitespace trimming

**Expected:**
- `topic` is optional. Omitting it creates a booking without a topic.
- A topic of exactly 280 characters is accepted.
- A topic of 281+ characters is rejected with a validation error (same style as existing booking validation).
- A topic consisting only of whitespace is treated as absent (no topic stored).
- Leading/trailing whitespace is trimmed before validation and storage.

**Seam:** `POST /bookings` in `backend/src/app.test.ts`. Test each boundary.

**Consequence of failure:**
- Over-limit: personal data stored without size bound; potential DoS or display breakage.
- Whitespace: empty-looking topic stored; confusing Host view.

## 3.1. Topic length limit is counted in UTF-16 code units

**Expected:** The 280 limit (`@maxLength(280)` in the contract, a `.length <= 280` refine on the server (zod 4 `max()` would count code points), `maxLength` in the form) counts UTF-16 code units, not user-perceived characters (grapheme clusters). Characters outside the BMP, such as emoji, take 2 units: 140 × 🎉 (280 units) is accepted, 141 × 🎉 (282 units) is rejected with 400.

**Seam:** `POST /bookings` in `backend/src/app.test.ts` (test "counts the topic limit in UTF-16 code units").

**Consequence of failure:** The limit silently changes meaning (e.g. counting code points), diverging between contract, server and form.

## 4. Topic appears only in Host's booking list

**Expected:** The `topic` field is present in `GET /bookings` (Host endpoint) when set, and absent from public slot/event-type responses. The booking confirmation response to the guest does not contain `topic`.

**Seam:** `GET /bookings` and `GET /slots` (or equivalent) in `backend/src/app.test.ts`.

**Consequence of failure:** Guest's private message leaks publicly; privacy violation.

## 5. Topic is immutable after creation

**Expected:** No `PATCH /bookings/:id` or similar endpoint allows topic updates. Consistent with ADR 0003 (no guest editing).

**Seam:** Check that no such route exists in `backend/src/app.ts`. API contract check via `openapi.yaml`.

**Consequence of failure:** Guest or third party could overwrite Host's stored context.

## 6. Cancellation of booking with topic works as before (adjacent scenario)

**Expected:** `DELETE /bookings/:id` (or Host cancellation endpoint) works identically for bookings with and without a topic. ADR 0003 is not affected.

**Seam:** Cancellation test in `backend/src/app.test.ts` using a booking that has a topic.

**Consequence of failure:** Regression in core workflow; Host cannot cancel bookings that have a topic.

## 7. Booking without topic is unaffected (adjacent scenario)

**Expected:** A `POST /bookings` without a `topic` field produces a booking identical to the pre-change behaviour. Host page shows the booking without any empty placeholder noise.

**Seam:** Existing booking creation tests must continue to pass without modification.

**Consequence of failure:** Regression for all existing bookings; form broken for guests who skip the topic.

## 8. Topic rendered as plain text — no XSS

**Expected:** Topic containing HTML or script tags is displayed as plain text (escaped). No `dangerouslySetInnerHTML` or equivalent. Long words wrap; line breaks are preserved.

**Seam:** Frontend unit test (`frontend/src/App.test.tsx` or HostPage component test) asserting escaped rendering.

**Consequence of failure:** Stored XSS — Host page executes injected script from guest input.

## 9. Contract chain integrity

**Expected:** `contract/src/main.tsp` is the single source of truth. After the change, `npm run generate` produces the same `openapi.yaml` and `frontend/src/generated/` as committed. CI `generate-check` must pass (`git diff --exit-code` on those paths).

**Seam:** CI `generate-check` job log.

**Consequence of failure:** Generated client diverges from server contract; silent API mismatches at runtime.

## Formatting

Formatting is checked by the linter (`npm run lint`). Do not repeat linter output in the review — just note whether the lint check passes or fails.
