import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Db } from "./db.js";
import type { SlotConfig } from "./slot-config.js";
import { createSlotConfig } from "./slot-config.js";
import { generateSlots } from "./slot-generator.js";
import { overlaps } from "./overlap.js";

export type AppOptions = {
  slotConfig?: SlotConfig;
  now?: () => Date;
};

export function createApp(db: Db, options: AppOptions = {}) {
  const slotConfig = options.slotConfig ?? createSlotConfig();
  const getNow = options.now ?? (() => new Date());

  const app = new Hono();

  app.use("*", cors({ origin: "*" }));

  // ── EventTypes ────────────────────────────────────────────────────────────
  app.get("/event-types", (c) => c.json(db.eventTypes));

  app.post(
    "/event-types",
    zValidator(
      "json",
      z.object({
        title: z.string().min(1),
        description: z.string(),
        durationMinutes: z.number().int().positive(),
        schedule: z.object({
          mon: z.array(z.number().int().min(0).max(23)).optional(),
          tue: z.array(z.number().int().min(0).max(23)).optional(),
          wed: z.array(z.number().int().min(0).max(23)).optional(),
          thu: z.array(z.number().int().min(0).max(23)).optional(),
          fri: z.array(z.number().int().min(0).max(23)).optional(),
          sat: z.array(z.number().int().min(0).max(23)).optional(),
          sun: z.array(z.number().int().min(0).max(23)).optional(),
        }),
      }),
    ),
    (c) => {
      const body = c.req.valid("json");
      const et = { id: randomUUID(), ...body };
      db.eventTypes.push(et);
      return c.json(et, 201);
    },
  );

  // ── Slots ─────────────────────────────────────────────────────────────────
  app.get("/slots", (c) => {
    const eventTypeId = c.req.query("eventTypeId");
    if (!eventTypeId) return c.json({ code: "MISSING_PARAM", message: "eventTypeId required" }, 400);

    const et = db.eventTypes.find((e) => e.id === eventTypeId);
    if (!et) return c.json({ code: "NOT_FOUND", message: "Event type not found" }, 404);

    const now = getNow();
    const all = generateSlots(db.eventTypes, db.bookings, slotConfig, now);
    const available = all.filter((s) => s.eventTypeId === eventTypeId);

    return c.json(available);
  });

  // ── Bookings ──────────────────────────────────────────────────────────────
  app.get("/bookings", (c) => {
    const now = getNow();
    const upcoming = db.bookings
      .filter((b) => new Date(b.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return c.json(upcoming);
  });

  app.post(
    "/bookings",
    zValidator(
      "json",
      z.object({
        slotId: z.string(),
        bookerName: z.string().min(1),
        bookerEmail: z.email(),
      }),
    ),
    (c) => {
      const { slotId, bookerName, bookerEmail } = c.req.valid("json");
      const now = getNow();

      // Verify the slot exists in the rolling window (ignoring current bookings).
      // Booking filter is checked separately so we can return 409 vs 404 correctly.
      const allSlots = generateSlots(db.eventTypes, [], slotConfig, now);
      const slot = allSlots.find((s) => s.id === slotId);
      if (!slot) return c.json({ code: "NOT_FOUND", message: "Slot not found" }, 404);

      const et = db.eventTypes.find((e) => e.id === slot.eventTypeId);
      if (!et) return c.json({ code: "NOT_FOUND", message: "Event type not found" }, 404);

      if (new Date(slot.startTime) <= now) {
        return c.json({ code: "SLOT_UNAVAILABLE", message: "Slot is in the past" }, 409);
      }

      const conflict = db.bookings.some((b) =>
        overlaps(slot.startTime, et.durationMinutes, b.startTime, b.durationMinutes),
      );
      if (conflict) {
        return c.json({ code: "SLOT_UNAVAILABLE", message: "This time is already booked" }, 409);
      }

      const booking = {
        id: randomUUID(),
        slotId,
        eventTypeId: et.id,
        startTime: slot.startTime,
        durationMinutes: et.durationMinutes,
        bookerName,
        bookerEmail,
      };
      db.bookings.push(booking);
      return c.json(booking, 201);
    },
  );

  app.delete("/bookings/:id", (c) => {
    const id = c.req.param("id");
    const idx = db.bookings.findIndex((b) => b.id === id);
    if (idx === -1) return c.json({ code: "NOT_FOUND", message: "Booking not found" }, 404);
    db.bookings.splice(idx, 1);
    return new Response(null, { status: 204 });
  });

  return app;
}
