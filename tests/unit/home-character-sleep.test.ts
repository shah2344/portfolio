import { describe, expect, it } from "bun:test";
import {
  characterSleep,
  CHARACTER_SLEEP_MS,
} from "../../src/components/home/character/sleep";

describe("character idle sleep", () => {
  it("gets visibly tired before shutting fully, rests, then wakes", () => {
    expect(characterSleep(-1)).toEqual({ tired: 0, asleep: 0 });
    expect(characterSleep(850).tired).toBeCloseTo(0.5);
    expect(characterSleep(1700)).toEqual({ tired: 1, asleep: 0 });
    expect(characterSleep(2150).asleep).toBeCloseTo(0.5);
    expect(characterSleep(3000).asleep).toBe(1);
    expect(characterSleep(4800).asleep).toBe(1);
    expect(characterSleep(5550).asleep).toBeCloseTo(0.5);
    expect(characterSleep(CHARACTER_SLEEP_MS)).toEqual({
      tired: 0,
      asleep: 0,
    });
  });
  it("keeps both stages continuous across every boundary", () => {
    for (const boundary of [0, 1700, 2600, 5100, CHARACTER_SLEEP_MS]) {
      const before = characterSleep(boundary - 0.01);
      const after = characterSleep(boundary + 0.01);
      expect(Math.abs(after.tired - before.tired)).toBeLessThan(0.001);
      expect(Math.abs(after.asleep - before.asleep)).toBeLessThan(0.001);
    }
  });
});
