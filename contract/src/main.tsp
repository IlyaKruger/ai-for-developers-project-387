import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{
  title: "Calendar Booking API",
})
namespace CalendarBooking;

// ── Models ────────────────────────────────────────────────────────────────────

model WeeklySchedule {
  mon?: int32[];
  tue?: int32[];
  wed?: int32[];
  thu?: int32[];
  fri?: int32[];
  sat?: int32[];
  sun?: int32[];
}

model EventType {
  id: string;
  title: string;
  description: string;
  durationMinutes: int32;
  schedule: WeeklySchedule;
}

model CreateEventTypeRequest {
  title: string;
  description: string;
  durationMinutes: int32;
  schedule: WeeklySchedule;
}

model Slot {
  id: string;
  eventTypeId: string;
  startTime: utcDateTime;
}

model Booking {
  id: string;
  slotId: string;
  eventTypeId: string;
  startTime: utcDateTime;
  durationMinutes: int32;
  bookerName: string;
  bookerEmail: string;
}

model CreateBookingRequest {
  slotId: string;
  bookerName: string;
  bookerEmail: string;
}

model ConflictError {
  code: "SLOT_UNAVAILABLE";
  message: string;
}

model NotFoundError {
  code: "NOT_FOUND";
  message: string;
}

// ── EventTypes ────────────────────────────────────────────────────────────────

@route("/event-types")
interface EventTypes {
  @get list(): EventType[];

  @post
  create(@body body: CreateEventTypeRequest): {
    @statusCode statusCode: 201;
    @body body: EventType;
  };
}

// ── Slots ─────────────────────────────────────────────────────────────────────

@route("/slots")
interface Slots {
  @get
  list(@query eventTypeId: string): Slot[];
}

// ── Bookings ──────────────────────────────────────────────────────────────────

@route("/bookings")
interface Bookings {
  @get list(): Booking[];

  @post
  create(@body body: CreateBookingRequest):
    | {
        @statusCode statusCode: 201;
        @body body: Booking;
      }
    | {
        @statusCode statusCode: 409;
        @body body: ConflictError;
      };

  @delete
  cancel(@path id: string):
    | {
        @statusCode statusCode: 204;
      }
    | {
        @statusCode statusCode: 404;
        @body body: NotFoundError;
      };
}