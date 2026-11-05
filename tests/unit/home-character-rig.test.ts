import { describe, expect, it } from "bun:test";
import { createCharacterDirector } from "../../src/components/home/character/director";
import {
  characterGeometry,
  mouthPoints,
} from "../../src/components/home/character/geometry";
import { samplePerformance } from "../../src/components/home/character/performances";
import {
  blendMouth,
  mouthPoses,
  performanceDuration,
  restingPose,
  type CharacterPerformance,
} from "../../src/components/home/character/pose";

const kinds = Object.keys(performanceDuration) as CharacterPerformance[];
describe("character director", () => {
  it("replays the same seed and excludes the previous two featured performances", () => {
    const a = createCharacterDirector(42, 0),
      b = createCharacterDirector(42, 0);
    const history: CharacterPerformance[] = [];
    let previous: CharacterPerformance | null = null;
    for (let time = 0; time < 180000; time += 100) {
      if (time % 15000 === 0) {
        a.input(time);
        b.input(time);
      }
      expect(a.sample(time, restingPose())).toEqual(
        b.sample(time, restingPose()),
      );
      expect(a.active).toBe(b.active);
      if (a.active && a.active !== previous) {
        expect(history.slice(-2)).not.toContain(a.active);
        history.push(a.active);
      }
      previous = a.active;
    }
    expect(history.length).toBeGreaterThan(12);
  });
  it("interrupts a sampled performance continuously", () => {
    const d = createCharacterDirector(12, 0);
    d.play("smirk", 0);
    const before = d.sample(500, restingPose(), false);
    d.play("nod", 500);
    expect(d.sample(500, restingPose(), false)).toEqual(before);
    expect(d.active).toBe("nod");
  });
  it("debounces activation without queuing work and wakes a nap", () => {
    const d = createCharacterDirector(42, 0);
    expect(d.activate(0)).toBe(true);
    expect(d.active).toBe("nod");
    for (let i = 1; i < 600; i++) expect(d.activate(i)).toBe(false);
    d.sample(2000, restingPose(), false);
    expect(d.active).toBeNull();
    d.play("nap", 3000);
    d.sample(6000, restingPose(), false);
    d.input(6000);
    expect(d.active).toBe("greeting");
  });
  it("schedules short, rare naps and discards missed performances on resume", () => {
    const d = createCharacterDirector(4, 0);
    const naps: number[] = [];
    let previous: CharacterPerformance | null = null;
    for (let t = 0; t < 260000; t += 100) {
      d.sample(t, restingPose());
      if (d.active === "nap" && previous !== "nap") naps.push(t);
      previous = d.active;
    }
    expect(naps.length).toBeGreaterThanOrEqual(2);
    expect(naps[0]!).toBeGreaterThanOrEqual(55000);
    for (let i = 1; i < naps.length; i++)
      expect(naps[i]! - naps[i - 1]!).toBeGreaterThanOrEqual(90000);
    d.reset(999000);
    d.sample(999000, restingPose());
    expect(d.active).toBeNull();
  });
});

describe("dizzy recovery", () => {
  it("gradually restores live cursor influence, with the head trailing the eyes", () => {
    const left = {
      ...restingPose(),
      gazeX: -6.3,
      gazeY: -7.2,
      yaw: -16,
      pitch: -10,
    };
    const right = {
      ...restingPose(),
      gazeX: 6.3,
      gazeY: 7.2,
      yaw: 16,
      pitch: 10,
    };
    let previousEyes = -1,
      previousHead = -1;
    for (const time of [400, 1000, 1500, 2000, 2200]) {
      const a = samplePerformance("dizzy", time, left);
      const b = samplePerformance("dizzy", time, right);
      const eyes = (b.gazeX - a.gazeX) / (right.gazeX - left.gazeX);
      const head = (b.yaw - a.yaw) / (right.yaw - left.yaw);
      expect(eyes).toBeGreaterThan(previousEyes);
      expect(head).toBeGreaterThan(previousHead);
      expect(eyes).toBeGreaterThanOrEqual(head);
      expect((b.gazeY - a.gazeY) / (right.gazeY - left.gazeY)).toBeCloseTo(
        eyes,
      );
      expect((b.pitch - a.pitch) / (right.pitch - left.pitch)).toBeCloseTo(
        head,
      );
      if (time === 1000) {
        expect(eyes).toBeGreaterThan(0.1);
        expect(eyes).toBeLessThan(0.3);
      }
      previousEyes = eyes;
      previousHead = head;
    }
    expect(previousEyes).toBe(1);
    expect(previousHead).toBe(1);
  });
  it("slows the eye orbit during recovery", () => {
    const base = { ...restingPose(), gazeX: 0, gazeY: 0 };
    const angleTravel = (time: number) => {
      const a = samplePerformance("dizzy", time, base);
      const b = samplePerformance("dizzy", time + 50, base);
      const ax = a.gazeX / 2.2,
        ay = a.gazeY / 1.6;
      const bx = b.gazeX / 2.2,
        by = b.gazeY / 1.6;
      return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    };
    expect(angleTravel(800)).toBeGreaterThan(angleTravel(1200));
    expect(angleTravel(1600)).toBeLessThan(angleTravel(800) / 2);
    expect(angleTravel(1600)).toBeGreaterThan(0);
  });
  it("reaches the live pose before the director releases dizziness", () => {
    const d = createCharacterDirector(42, 0);
    const base = {
      ...restingPose(),
      gazeX: 6.3,
      gazeY: -7.2,
      yaw: 16,
      pitch: -10,
      roll: 2,
    };
    d.play("dizzy", 0);
    const before = d.sample(performanceDuration.dizzy - 1, base, false);
    const after = d.sample(performanceDuration.dizzy, base, false);
    expect(d.active).toBeNull();
    expect(after).toEqual(base);
    for (const key of [
      "gazeX",
      "gazeY",
      "yaw",
      "pitch",
      "roll",
      "lidLeft",
      "lidRight",
    ] as const)
      expect(Math.abs(before[key] - after[key])).toBeLessThan(0.001);
    for (const key of Object.keys(base.mouth) as (keyof typeof base.mouth)[])
      expect(Math.abs(before.mouth[key] - after.mouth[key])).toBeLessThan(
        0.001,
      );
  });
});

describe("face geometry", () => {
  it("keeps mouth contours ordered throughout every expression blend", () => {
    for (const a of Object.values(mouthPoses))
      for (const b of Object.values(mouthPoses))
        for (let t = 0; t <= 1; t += 0.05) {
          const { upper, lower } = mouthPoints(blendMouth(a, b, t));
          expect(upper[0]).toEqual(lower[0]);
          expect(upper.at(-1)).toEqual(lower.at(-1));
          upper.forEach((point, i) => {
            expect(point.y).toBeLessThanOrEqual(lower[i]!.y + 1e-8);
            if (i) expect(point.x).toBeGreaterThan(upper[i - 1]!.x);
          });
        }
  });
  it("keeps every projected performance finite and inside its drawing bounds", () => {
    for (const treatment of ["floating", "outline", "filled"] as const)
      for (const kind of kinds)
        for (const yaw of [-16, 0, 16])
          for (const pitch of [-10, 0, 10])
            for (let time = 0; time <= performanceDuration[kind]; time += 100) {
              const pose = samplePerformance(kind, time, {
                ...restingPose(),
                yaw,
                pitch,
              });
              const g = characterGeometry(pose, treatment);
              for (const path of [
                g.head,
                g.mouth,
                ...g.eyes.flatMap((e) => [
                  e.aperture,
                  e.upper,
                  e.lower,
                  e.pupil,
                ]),
              ]) {
                expect(path).not.toMatch(/NaN|Infinity/);
                const numbers = path.match(/-?\d+\.?\d*/g)!.map(Number);
                expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
                expect(Math.max(...numbers)).toBeLessThanOrEqual(64);
              }
            }
  });
  it("moves facial geometry over the surface rather than rotating a flat plane", () => {
    const p = { ...restingPose(), yaw: 16 };
    const curved = characterGeometry(p, "outline"),
      flat = characterGeometry(p, "outline", true);
    expect(curved.eyes[0]!.aperture).not.toEqual(flat.eyes[0]!.aperture);
    expect(curved.mouth).not.toEqual(flat.mouth);
    expect(curved.head).toEqual(flat.head);
  });
  it("fully closes the eye aperture without deforming the pupil", () => {
    const open = characterGeometry(restingPose());
    const closed = characterGeometry({ ...restingPose(), closure: 1 });
    expect(closed.eyes[0]!.pupil).toEqual(open.eyes[0]!.pupil);
    expect(closed.eyes[0]!.upper).toEqual(closed.eyes[0]!.lower);
  });
});
