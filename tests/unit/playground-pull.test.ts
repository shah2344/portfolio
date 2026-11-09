import { describe, expect, it } from "bun:test";
import {
  PULL_DISMISS_DISTANCE,
  PULL_MIN_SCALE,
  pullAxis,
  pullTransform,
  pullTravel,
  pullVelocity,
  shouldDismiss,
  springEasing,
} from "../../src/components/home/playground/pull";

describe("pulling an opened card", () => {
  it("follows the pointer with growing resistance", () => {
    const near = pullTransform(0, 20);
    const far = pullTransform(0, 400);
    expect(near.y).toBeGreaterThan(15);
    expect(near.y).toBeLessThan(20);
    expect(far.y).toBeLessThan(PULL_DISMISS_DISTANCE * 1.2);
    expect(pullTransform(0, -20).y).toBeCloseTo(-near.y);
  });

  it("shrinks to the floor scale at the dismiss distance and no further", () => {
    expect(pullTransform(0, 0).scale).toBe(1);
    expect(pullTransform(0, PULL_DISMISS_DISTANCE).scale).toBeCloseTo(
      PULL_MIN_SCALE,
    );
    expect(pullTransform(0, 1000).scale).toBeCloseTo(PULL_MIN_SCALE);
  });

  it("keeps sideways travel on a shorter leash", () => {
    expect(Math.abs(pullTransform(300, 300).x)).toBeLessThan(
      PULL_DISMISS_DISTANCE * 0.5,
    );
  });

  it("waits for a few pixels before choosing an axis", () => {
    expect(pullAxis(2, 3)).toBe("none");
    expect(pullAxis(2, 8)).toBe("vertical");
    expect(pullAxis(9, 4)).toBe("horizontal");
  });

  it("dismisses past the distance or on a flick the same way", () => {
    expect(shouldDismiss(PULL_DISMISS_DISTANCE, 0)).toBe(true);
    expect(shouldDismiss(-PULL_DISMISS_DISTANCE, 0)).toBe(true);
    expect(shouldDismiss(30, 600)).toBe(true);
    expect(shouldDismiss(30, -600)).toBe(false);
    expect(shouldDismiss(30, 100)).toBe(false);
  });

  it("reads velocity across the samples in px/s", () => {
    expect(
      pullVelocity([
        { t: 0, y: 0 },
        { t: 50, y: 25 },
      ]),
    ).toBe(500);
    expect(pullVelocity([{ t: 0, y: 0 }])).toBe(0);
  });
});

describe("catching and releasing a card", () => {
  it("undoes the resistance for a card caught away from rest", () => {
    for (const raw of [10, 60, -80]) {
      expect(pullTravel(pullTransform(0, raw).y)).toBeCloseTo(raw, 5);
    }
    expect(pullTravel(500)).toBe(PULL_DISMISS_DISTANCE * 3);
    expect(pullTravel(0)).toBe(0);
  });

  it("springs from 0 to 1, leaving faster when flung", () => {
    const parse = (easing: string) =>
      easing.slice(7, -1).split(", ").map(Number);
    const still = parse(springEasing(0, 1));
    const flung = parse(springEasing(3, 1));
    expect(still[0]).toBe(0);
    expect(still.at(-1)).toBe(1);
    expect(flung[1]!).toBeGreaterThan(still[1]!);
    expect(Math.max(...still)).toBeLessThanOrEqual(1);
    expect(Math.max(...parse(springEasing(0, 0.7)))).toBeGreaterThan(1);
  });
});
