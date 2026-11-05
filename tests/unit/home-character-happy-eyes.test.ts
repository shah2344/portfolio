import { describe, expect, it } from "bun:test";
import { characterGeometry } from "../../src/components/home/character/geometry";
import {
  blendPose,
  restingPose,
  type CharacterPose,
  type CharacterTreatment,
  type Point,
} from "../../src/components/home/character/pose";

const parse = (d: string): Point[] =>
  [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
const bounds = (points: Point[]) => {
  const xs = points.map((q) => q.x),
    ys = points.map((q) => q.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    meanY: ys.reduce((s, y) => s + y, 0) / ys.length,
  };
};
const aperture = (pose: CharacterPose, eye: number) =>
  bounds(parse(characterGeometry(pose, "filled").eyes[eye]!.aperture));
// The crescent's arch makes its bounding box misleading (the rise counts as
// height), so measure the band's vertical thickness at the centre column,
// where the aperture polygon holds upper t=0.5 and lower t=0.5 (24 steps).
const height = (pose: CharacterPose, eye: number) => {
  const pts = parse(characterGeometry(pose, "filled").eyes[eye]!.aperture);
  return Math.abs(pts[12]!.y - pts[37]!.y);
};
const at = (patch: Partial<CharacterPose>): CharacterPose => ({
  ...restingPose(),
  ...patch,
});

describe("happy eyes", () => {
  const base = restingPose();
  const poses: CharacterPose[] = [
    base,
    { ...base, yaw: 14, pitch: -8, roll: 5 },
    { ...base, gazeX: -5, gazeY: 4, pupil: 0.8 },
    { ...base, lidLeft: 0.6, lidRight: -0.2, squash: 0.92 },
    { ...base, closure: 0.5, squash: 1.08, x: 1, y: -1 },
    { ...base, closure: 1, yaw: -20, pitch: 12 },
    { ...base, gazeX: 8, gazeY: -6, pupil: 1.3, lidLeft: 0.3, roll: -7 },
  ];
  it("rests at zero and blends like every other numeric key", () => {
    expect(restingPose().happy).toBe(0);
    expect(blendPose(at({ happy: 0 }), at({ happy: 1 }), 0.25).happy).toBe(
      0.25,
    );
  });
  it("leaves happy 0 geometry identical to the pre-happy shape", () => {
    for (const treatment of ["filled", "outline"] as CharacterTreatment[])
      for (const pose of poses) {
        // `happy` absent (legacy callers) must equal an explicit 0.
        const legacy = {
          ...pose,
          happy: undefined,
        } as unknown as CharacterPose;
        expect(characterGeometry({ ...pose, happy: 0 }, treatment)).toEqual(
          characterGeometry(legacy, treatment),
        );
      }
    // Reference captured before the happy field existed.
    expect(characterGeometry(base, "filled").eyes[0]!.upper).toStartWith(
      "M12.730 25.711L12.802 23.620L13.069 21.711L13.512 19.985",
    );
  });
  it("squints each eye above a raised cheek at happy 1", () => {
    for (const eye of [0, 1]) {
      const open = aperture(at({ happy: 0 }), eye),
        happy = aperture(at({ happy: 1 }), eye);
      const ratio =
        height(at({ happy: 1 }), eye) / height(at({ happy: 0 }), eye);
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.5);
      expect(happy.meanY).toBeLessThan(open.meanY);
    }
  });
  it("arches the cheek line upward, smiling rather than flat or wavy", () => {
    for (const happy of [0.75, 1])
      for (const eye of [0, 1]) {
        const lower = parse(
          characterGeometry(at({ happy }), "filled").eyes[eye]!.lower,
        );
        // Image y grows downward: the middle sits above both flanks, and the
        // edge falls steadily from the middle outward with no dip back up.
        for (let i = 4; i < 12; i++) {
          expect(lower[i]!.y).toBeGreaterThan(lower[i + 1]!.y);
          expect(lower[24 - i]!.y).toBeGreaterThan(lower[23 - i]!.y);
        }
      }
  });
  it("keeps the pupil its own size", () => {
    for (const eye of [0, 1]) {
      const size = (happy: number) => {
        const p = bounds(
          parse(characterGeometry(at({ happy }), "filled").eyes[eye]!.pupil),
        );
        return { w: p.maxX - p.minX, h: p.maxY - p.minY };
      };
      expect(size(1).w).toBeCloseTo(size(0).w, 1);
      expect(size(1).h).toBeCloseTo(size(0).h, 1);
    }
  });
  it("narrows monotonically as happy rises", () => {
    for (const eye of [0, 1]) {
      const heights = [0, 0.25, 0.5, 1].map((happy) =>
        height(at({ happy }), eye),
      );
      for (let i = 1; i < heights.length; i++)
        expect(heights[i]!).toBeLessThan(heights[i - 1]!);
    }
  });
  it("still closes on a blink", () => {
    for (const eye of [0, 1])
      expect(height(at({ happy: 1, closure: 1 }), eye)).toBeLessThan(6);
  });
  it("never emits NaN", () => {
    for (const happy of [0, 0.3, 1])
      for (const treatment of ["filled", "outline"] as CharacterTreatment[]) {
        const g = characterGeometry(
          at({ happy, closure: 0.4, gazeX: 9, gazeY: -9 }),
          treatment,
        );
        for (const eye of g.eyes)
          for (const d of Object.values(eye)) expect(d).not.toContain("NaN");
      }
  });
});
