import { describe, expect, it } from "bun:test";
import { createGazeShift } from "../../src/components/home/character/gaze";

describe("idle fixation changes", () => {
  it("holds before the shift, moves fastest in the middle, and settles exactly", () => {
    const shift = createGazeShift(
      { x: -5, y: 2 },
      { x: 5, y: -3 },
      1000,
      false,
    );
    const at = (t: number) => shift.sample(1000 + shift.duration * t).x;
    expect(shift.sample(990)).toEqual({ x: -5, y: 2 });
    expect(at(0.6) - at(0.4)).toBeGreaterThan(at(0.2) - at(0));
    expect(at(0.6) - at(0.4)).toBeGreaterThan(at(1) - at(0.8));
    expect(shift.duration).toBeLessThanOrEqual(145);
    expect(shift.sample(2000)).toEqual({ x: 5, y: -3 });
    expect(shift.sample(6000)).toEqual({ x: 5, y: -3 });
  });
  it("pauses after landing before a small corrective movement", () => {
    const shift = createGazeShift({ x: 0, y: 0 }, { x: 6, y: 4 }, 0, true);
    const landing = shift.sample(shift.duration);
    expect(landing.x).toBeCloseTo(5.7);
    expect(shift.sample(shift.duration + 100)).toEqual(landing);
    expect(shift.sample(shift.duration + 145).x).toBeGreaterThan(landing.x);
    expect(shift.sample(shift.duration + 180)).toEqual({ x: 6, y: 4 });
  });
  it("can retarget during a shift without jumping back or overshooting", () => {
    const first = createGazeShift({ x: -5, y: 0 }, { x: 5, y: 3 }, 0, false);
    const live = first.sample(55);
    const second = createGazeShift(live, { x: -4, y: -2 }, 55, true);
    expect(second.sample(55)).toEqual(live);
    for (let ms = 55; ms < 600; ms += 1000 / 60) {
      const p = second.sample(ms);
      expect(p.x).toBeGreaterThanOrEqual(-4);
      expect(p.x).toBeLessThanOrEqual(live.x);
    }
  });
});
