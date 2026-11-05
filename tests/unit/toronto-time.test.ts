import { describe, expect, test } from "bun:test";
import {
  replyNote,
  torontoTime,
} from "../../src/components/home/footer/toronto-time";

describe("Toronto local time", () => {
  test("uses Toronto's winter and summer offsets", () => {
    expect(torontoTime(new Date("2026-01-20T17:34:56Z"))).toBe("12:34:56 PM");
    expect(torontoTime(new Date("2026-07-20T17:34:56Z"))).toBe("01:34:56 PM");
  });
  test("switches at Toronto's daylight saving boundary", () => {
    expect(torontoTime(new Date("2026-03-08T06:59:59Z"))).toBe("01:59:59 AM");
    expect(torontoTime(new Date("2026-03-08T07:00:00Z"))).toBe("03:00:00 AM");
  });
  test("handles noon and the previous calendar day's midnight", () => {
    expect(torontoTime(new Date("2026-10-20T16:00:00Z"))).toBe("12:00:00 PM");
    expect(torontoTime(new Date("2026-10-20T04:00:00Z"))).toBe("12:00:00 AM");
  });
});

describe("Toronto reply note", () => {
  test("reads the time in Toronto and picks the reply window", () => {
    // Thursday 2026-10-22, EDT (UTC-4).
    expect(replyNote(new Date("2026-10-23T02:38:00Z"))).toBe(
      "It’s 10:38 PM in Toronto — I’ll reply by morning.",
    );
    expect(replyNote(new Date("2026-10-22T14:05:00Z"))).toBe(
      "It’s 10:05 AM in Toronto — I usually reply fast.",
    );
    expect(replyNote(new Date("2026-10-22T07:12:00Z"))).toBe(
      "It’s 3:12 AM in Toronto — I’m probably asleep.",
    );
  });
  test("holds weekend messages until Monday", () => {
    expect(replyNote(new Date("2026-10-23T22:00:00Z"))).toBe(
      "It’s 6:00 PM Friday in Toronto — I’m back Monday.",
    );
    expect(replyNote(new Date("2026-10-25T23:00:00Z"))).toBe(
      "It’s 7:00 PM in Toronto — I’ll reply by morning.",
    );
  });
  test("treats midnight as the small hours, not 24", () => {
    expect(replyNote(new Date("2026-10-22T04:30:00Z"))).toContain(
      "12:30 AM in Toronto — I’m probably asleep",
    );
  });
});
