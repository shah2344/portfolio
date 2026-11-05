import { describe, expect, it } from "bun:test";
import { appearanceReaction } from "../../src/components/home/character/appearance";

describe("character light adaptation", () => {
  it("answers bright light with three protective blinks, held closures, then a releasing squint", () => {
    let closures = 0,
      closed = false;
    for (let ms = 0; ms < 1320; ms += 8) {
      const nextClosed = appearanceReaction(false, ms).closure > 0.98;
      if (nextClosed && !closed) closures++;
      closed = nextClosed;
    }
    expect(closures).toBe(3);
    expect(appearanceReaction(false, 80).closure).toBe(1);
    expect(appearanceReaction(false, 130).closure).toBe(1);
    expect(appearanceReaction(false, 300).closure).toBe(1);
    expect(appearanceReaction(false, 390).closure).toBe(1);
    const earlySquint = appearanceReaction(false, 740).closure;
    const lateSquint = appearanceReaction(false, 1120).closure;
    expect(earlySquint).toBeGreaterThan(0.3);
    expect(lateSquint).toBeGreaterThan(0);
    expect(lateSquint).toBeLessThan(earlySquint);
    expect(appearanceReaction(false, 400).pupil).toBeLessThan(1);
  });

  it("opens wider and expands the pupils in darkness before one settling blink", () => {
    const early = appearanceReaction(true, 180);
    const adjusted = appearanceReaction(true, 650);
    expect(early.lids).toBeLessThan(-0.2);
    expect(early.closure).toBe(0);
    expect(adjusted.pupil).toBeGreaterThan(early.pupil);
    expect(adjusted.pupil).toBeGreaterThan(1.2);
    expect(appearanceReaction(true, 700).closure).toBe(0);
    expect(appearanceReaction(true, 900).closure).toBe(1);
    expect(appearanceReaction(true, 1200).closure).toBe(0);
  });

  it("settles completely and stays within natural eye geometry in both directions", () => {
    for (const dark of [false, true]) {
      for (let ms = 0; ms <= 1500; ms += 10) {
        const frame = appearanceReaction(dark, ms);
        expect(frame.closure).toBeGreaterThanOrEqual(0);
        expect(frame.closure).toBeLessThanOrEqual(1);
        expect(frame.pupil).toBeGreaterThanOrEqual(0.82);
        expect(frame.pupil).toBeLessThanOrEqual(1.24);
      }
      for (const elapsed of [-100, 1500]) {
        expect(appearanceReaction(dark, elapsed)).toEqual({
          active: false,
          closure: 0,
          lids: 0,
          pupil: 1,
        });
      }
    }
  });
});
