export type SlotConfig = {
  timezone: string;
  windowDays: number;
  windowStartOffsetDays: number;
  stepMinutes: number;
};

export function createSlotConfig(): SlotConfig {
  return {
    timezone: process.env.BOOKING_TZ ?? "Europe/Moscow",
    windowDays: parseInt(process.env.BOOKING_WINDOW_DAYS ?? "14", 10),
    windowStartOffsetDays: parseInt(process.env.BOOKING_WINDOW_START ?? "1", 10),
    stepMinutes: parseInt(process.env.BOOKING_STEP_MINUTES ?? "60", 10),
  };
}
