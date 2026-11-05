import { describe, expect, test } from "bun:test";
import {
  advanceTooltip,
  createTooltipMotion,
  releaseTooltip,
  showTooltip,
  TOOLTIP_FADE_SECONDS,
} from "../../src/components/home/tooltip/motion";

describe("homepage tooltip motion", () => {
  test("release approaches the viewport edge without clipping or stopping", () => {
    const motion = createTooltipMotion();
    showTooltip(motion, { x: 72, y: 100 });
    advanceTooltip(motion, 0.3, false);
    motion.vx = -800;
    releaseTooltip(motion, { x: -900, y: 0 }, { minX: 60, maxX: 330 });
    for (let elapsed = 0; elapsed < TOOLTIP_FADE_SECONDS; elapsed += 1 / 120) {
      const x = motion.x;
      advanceTooltip(motion, 1 / 120, false);
      expect(motion.x).toBeGreaterThan(60);
      expect(motion.x).toBeLessThan(x);
    }
  });

  test("release follows the same path across different frame rates", () => {
    const run = (frames: number) => {
      const motion = createTooltipMotion();
      showTooltip(motion, { x: 100, y: 100 });
      advanceTooltip(motion, 0.3, false);
      releaseTooltip(motion, { x: 300, y: 100 });
      for (let i = 0; i < frames; i++)
        advanceTooltip(motion, 0.2 / frames, false);
      return motion;
    };
    const slow = run(8);
    const fast = run(30);
    expect(slow.x).toBeCloseTo(fast.x, 8);
    expect(slow.y).toBeCloseTo(fast.y, 8);
    expect(slow.opacity).toBeCloseTo(fast.opacity, 8);
    expect(slow.squash.value).toBeCloseTo(fast.squash.value, 8);
  });

  test("release keeps moving with diminishing momentum until fully transparent", () => {
    const motion = createTooltipMotion();
    showTooltip(motion, { x: 100, y: 100 });
    advanceTooltip(motion, 0.3, false);
    showTooltip(motion, { x: 130, y: 120 });
    advanceTooltip(motion, 1 / 60, false);
    releaseTooltip(motion, { x: 300, y: 100 });
    let tailFrames = 0;
    for (let elapsed = 0; elapsed < TOOLTIP_FADE_SECONDS; elapsed += 1 / 120) {
      const { x, y, vx, vy } = motion;
      advanceTooltip(motion, 1 / 120, false);
      if (motion.opacity > 0) {
        expect(Math.hypot(motion.x - x, motion.y - y)).toBeGreaterThan(0);
        expect(Math.hypot(motion.vx, motion.vy)).toBeLessThan(
          Math.hypot(vx, vy),
        );
        if (motion.opacity < 0.01) tailFrames++;
      }
    }
    expect(tailFrames).toBeGreaterThan(0);
    expect(motion.opacity).toBe(0);
  });

  test("a stationary release still coasts and its compression rebounds", () => {
    const motion = createTooltipMotion();
    showTooltip(motion, { x: 100, y: 100 });
    advanceTooltip(motion, 1, false);
    releaseTooltip(motion, { x: 0, y: 0 });
    const start = motion.y;
    let compressed = false;
    let rebounded = false;
    let visiblyShrunk = false;
    for (let elapsed = 0; elapsed < TOOLTIP_FADE_SECONDS; elapsed += 1 / 120) {
      advanceTooltip(motion, 1 / 120, false);
      compressed ||= motion.squash.value < -0.03;
      visiblyShrunk ||= motion.opacity > 0.15 && motion.scale.value < 0.85;
      rebounded ||= compressed && motion.squash.value > 0.005;
      expect(Math.abs(motion.squash.value)).toBeLessThan(0.05);
    }
    expect(motion.y).toBeGreaterThan(start);
    expect(compressed).toBe(true);
    expect(rebounded).toBe(true);
    expect(visiblyShrunk).toBe(true);
    expect(motion.scale.value).toBeGreaterThan(0.75);
  });

  test("reentry reverses the live fade without resetting position or size", () => {
    const motion = createTooltipMotion();
    showTooltip(motion, { x: 100, y: 100 });
    advanceTooltip(motion, 0.3, false);
    releaseTooltip(motion, { x: 300, y: 0 });
    advanceTooltip(motion, 0.12, false);
    const before = {
      x: motion.x,
      y: motion.y,
      opacity: motion.opacity,
      scale: motion.scale.value,
    };
    showTooltip(motion, { x: 140, y: 100 });
    expect(motion.x).toBe(before.x);
    expect(motion.y).toBe(before.y);
    expect(motion.opacity).toBe(before.opacity);
    expect(motion.scale.value).toBe(before.scale);
    advanceTooltip(motion, 1 / 60, false);
    expect(motion.opacity).toBeGreaterThan(before.opacity);
  });

  test("reduced motion reveals and dismisses immediately without deformation", () => {
    const motion = createTooltipMotion();
    showTooltip(motion, { x: 120, y: 80 });
    expect(advanceTooltip(motion, 0, true)).toBe(false);
    expect(motion.x).toBe(120);
    expect(motion.y).toBe(80);
    expect(motion.opacity).toBe(1);
    expect(motion.scale.value).toBe(1);
    expect(motion.squash.value).toBe(0);
    releaseTooltip(motion, { x: 400, y: 200 });
    expect(advanceTooltip(motion, 0, true)).toBe(false);
    expect(motion.opacity).toBe(0);
    expect(motion.x).toBe(120);
    expect(motion.y).toBe(80);
  });
});
