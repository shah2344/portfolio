const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Toronto",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

/** Format the same Toronto time for every visitor, including DST changes. */
export function torontoTime(date: Date) {
  return formatter.format(date).replace(/\s+/g, " ");
}

const replyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Toronto",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Toronto",
  hour: "numeric",
  hourCycle: "h23",
});

/** Shown before the visitor's clock is known, and without JavaScript. */
export const REPLY_NOTE_FALLBACK = "I’m in Toronto and usually reply fast.";

/**
 * When a message sent now is likely to be answered, read off the time in
 * Toronto: quickly through the working day, by the morning overnight, and
 * Monday from Friday evening until Sunday evening. The time comes apart
 * from the words around it so it can be animated on its own.
 */
export function replyParts(date: Date) {
  const parts = replyFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = part("weekday");
  const time = `${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
  const hour = Number(hourFormatter.format(date));

  const weekend =
    weekday === "Saturday" ||
    (weekday === "Friday" && hour >= 17) ||
    (weekday === "Sunday" && hour < 17);
  const reply = (promise: string, day = "") => ({ time, day, promise });

  if (weekend) return reply("I’m back Monday.", weekday);
  if (hour < 6) return reply("I’m probably asleep.");
  if (hour < 9) return reply("I’m just getting started.");
  if (hour < 17) return reply("I usually reply fast.");
  return reply("I’ll reply by morning.");
}

export type ReplyParts = ReturnType<typeof replyParts>;

/** The reply note as one sentence. */
export function replySentence({ time, day, promise }: ReplyParts) {
  return `It’s ${time}${day ? ` ${day}` : ""} in Toronto — ${promise}`;
}

export function replyNote(date: Date) {
  return replySentence(replyParts(date));
}
