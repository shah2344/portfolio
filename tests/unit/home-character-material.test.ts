import { restingPose } from "../../src/components/home/character/pose";
import { describe, expect, it } from "bun:test";
import {
  CHARACTER_MATERIAL_MS,
  CHARACTER_MATERIAL_MIN_MS,
  createCharacterPettingTempo,
  createCharacterShine,
  characterMaterialSweep,
} from "../../src/components/home/character/material";

describe("petting material tempo", () => {
  it("accelerates repeated taps without becoming an instantaneous flash", () => {
    const pet = createCharacterPettingTempo();
    let previous = pet(0);
    expect(previous).toBe(CHARACTER_MATERIAL_MS);
    for (let time = 100; time <= 2000; time += 100) {
      const duration = pet(time);
      expect(duration).toBeLessThanOrEqual(previous);
      expect(duration).toBeGreaterThanOrEqual(CHARACTER_MATERIAL_MIN_MS);
      previous = duration;
    }
    expect(previous).toBe(CHARACTER_MATERIAL_MIN_MS);
  });

  it("follows the petting cadence and resets after a pause", () => {
    const fast = createCharacterPettingTempo();
    const slow = createCharacterPettingTempo();
    fast(0);
    slow(0);
    let fastDuration = 0,
      slowDuration = 0;
    for (let i = 1; i <= 4; i++) {
      fastDuration = fast(i * 100);
      slowDuration = slow(i * 400);
    }
    expect(fastDuration).toBeLessThan(slowDuration);
    expect(fast(1500)).toBe(CHARACTER_MATERIAL_MS);
    expect(fast(3000)).toBe(CHARACTER_MATERIAL_MS);
  });
});

describe("petting shine clock", () => {
  it("accelerates from the current position instead of restarting at the edge", () => {
    const shine = createCharacterShine();
    shine.start(0, 900);
    const before = shine.progress(225);
    shine.accelerate(225, 180);
    expect(shine.progress(225)).toBeCloseTo(before);
    expect(shine.progress(360)).toBeCloseTo(1);
    expect(shine.progress(360)).toBeGreaterThan(360 / 900);
  });

  it("starts from the beginning whenever a new sweep is triggered", () => {
    const shine = createCharacterShine();
    shine.start(0, 900);
    shine.start(225, 300);
    expect(shine.progress(225)).toBe(0);
    expect(shine.progress(525)).toBe(1);
  });

  it("does not resurrect a completed sweep, and starts the next with its blend", () => {
    const shine = createCharacterShine();
    shine.accelerate(0, 180);
    expect(shine.progress(0)).toBe(Infinity);
    shine.start(100, 180);
    shine.accelerate(400, 200);
    expect(shine.progress(400)).toBeGreaterThan(1);
    shine.start(400, 200);
    expect(shine.progress(400)).toBe(0);
    expect(shine.progress(600)).toBe(1);
  });
});

describe("colour reveal geometry", () => {
  it("reveals nothing at the beginning and uses the shine edge as its boundary", () => {
    const pose = restingPose();
    expect(characterMaterialSweep(pose, 0, 0).reveal).toBe("");
    for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const shape = characterMaterialSweep(pose, 0, progress);
      expect(shape.reveal.startsWith(shape.edge)).toBe(true);
      expect(shape.reveal.endsWith("Z")).toBe(true);
      expect(shape.opacity).toBeGreaterThan(0);
      expect(shape.reveal).not.toMatch(/NaN|Infinity/);
    }
  });
  it("follows the head's position, deformation and rotation with finite geometry", () => {
    for (const squash of [0.9, 1, 1.1]) {
      const pose = { ...restingPose(), x: 2, y: -3, squash };
      const shape = characterMaterialSweep(pose, 15, 0.5);
      expect(shape.transform).toContain("translate(34.0000 28.0000)");
      expect(shape.transform).toContain("rotate(20.0000)");
      expect(shape.edge).not.toMatch(/NaN|Infinity/);
    }
  });
});
