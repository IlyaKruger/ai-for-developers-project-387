import { randomUUID } from "node:crypto";

export type WeeklySchedule = {
  mon?: number[];
  tue?: number[];
  wed?: number[];
  thu?: number[];
  fri?: number[];
  sat?: number[];
  sun?: number[];
};

export type EventType = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  schedule: WeeklySchedule;
};

export type Booking = {
  id: string;
  slotId: string;
  eventTypeId: string;
  startTime: string;
  durationMinutes: number;
  bookerName: string;
  bookerEmail: string;
};

export type Db = {
  eventTypes: EventType[];
  bookings: Booking[];
};

export function createDb(): Db {
  const consultationId = randomUUID();
  const demoId = randomUUID();

  return {
    eventTypes: [
      {
        id: consultationId,
        title: "Консультация",
        description: "Разбираем ваш вопрос и намечаем следующие шаги.",
        durationMinutes: 30,
        schedule: { mon:[10,11,14,15,16], tue:[10,11,14,15,16], wed:[10,11,14,15,16], thu:[10,11,14,15,16], fri:[10,11,14,15,16], sat:[10,11] },
      },
      {
        id: demoId,
        title: "Демонстрация продукта",
        description: "Показываю возможности продукта под ваш сценарий.",
        durationMinutes: 60,
        schedule: { mon:[9,13,17], tue:[9,13,17], wed:[9,13,17], thu:[9,13,17], fri:[9,13] },
      },
    ],
    bookings: [],
  };
}
