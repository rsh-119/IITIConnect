import { z } from "zod";

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

export function istLocalToUtc(value: string): string {
  const parsed = localDateTime.parse(value);
  const date = new Date(`${parsed}+05:30`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date and time");
  return date.toISOString();
}

export function formatIst(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// Compact board format, e.g. "20 Oct · 09:30".
export function formatIstShort(value: string): string {
  const part = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map(({ type, value: text }) => [type, text]),
  );
  return `${part.day} ${part.month} · ${part.hour}:${part.minute}`;
}

export function istInputValue(value: string): string {
  return new Date(new Date(value).getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function istDayRange(
  value: string,
): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const start = new Date(`${value}T00:00:00+05:30`);
  if (
    Number.isNaN(start.getTime()) ||
    new Date(start.getTime() + 330 * 60_000).toISOString().slice(0, 10) !==
      value
  )
    return null;
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 86_400_000).toISOString(),
  };
}
