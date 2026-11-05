export type CharacterTreatment = "floating" | "outline" | "filled";
/** How the idle breath reaches the face, on top of the body's rise and fall. */
export type CharacterBreathing = "lids" | "mouth" | "lift" | "combined";
export type CharacterPerformance =
  | "greeting"
  | "inspect"
  | "doubleTake"
  | "smirk"
  | "nod"
  | "wobble"
  | "nap"
  | "dizzy"
  | "confused"
  | "winded";
export type Point = { x: number; y: number };
export type MouthPose = {
  width: number;
  leftCornerY: number;
  rightCornerY: number;
  upperLeftCurve: number;
  upperRightCurve: number;
  lowerLeftCurve: number;
  lowerRightCurve: number;
  opening: number;
  offsetX: number;
  offsetY: number;
};
export type CharacterPose = {
  yaw: number;
  pitch: number;
  roll: number;
  x: number;
  y: number;
  squash: number;
  gazeX: number;
  gazeY: number;
  lidLeft: number;
  lidRight: number;
  closure: number;
  /** Sleep closes the eyes into soft downward crescents instead of a slit. */
  asleep: number;
  pupil: number;
  happy: number;
  mouth: MouthPose;
};
export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const ease = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const mouthPoses = {
  rest: {
    width: 4.3,
    leftCornerY: 0.1,
    rightCornerY: -0.15,
    upperLeftCurve: 1.6,
    upperRightCurve: 1.3,
    lowerLeftCurve: 1.6,
    lowerRightCurve: 1.3,
    opening: 0,
    offsetX: 0,
    offsetY: 0,
  },
  interested: {
    width: 4.8,
    leftCornerY: 0.15,
    rightCornerY: -0.8,
    upperLeftCurve: 1.5,
    upperRightCurve: 1,
    lowerLeftCurve: 1.5,
    lowerRightCurve: 1,
    opening: 0,
    offsetX: 0.3,
    offsetY: 0,
  },
  smile: {
    width: 5.7,
    leftCornerY: -0.8,
    rightCornerY: -1.2,
    upperLeftCurve: 3.8,
    upperRightCurve: 3.2,
    lowerLeftCurve: 3.8,
    lowerRightCurve: 3.2,
    opening: 0.3,
    offsetX: 0,
    offsetY: -0.4,
  },
  smirk: {
    width: 4.9,
    leftCornerY: 0.5,
    rightCornerY: -1.9,
    upperLeftCurve: 1.9,
    upperRightCurve: 0.4,
    lowerLeftCurve: 1.9,
    lowerRightCurve: 0.4,
    opening: 0,
    offsetX: 0.6,
    offsetY: -0.3,
  },
  curious: {
    width: 2.6,
    leftCornerY: 0,
    rightCornerY: 0,
    upperLeftCurve: 0,
    upperRightCurve: 0,
    lowerLeftCurve: 0,
    lowerRightCurve: 0,
    opening: 2.7,
    offsetX: -0.3,
    offsetY: -0.4,
  },
  surprised: {
    width: 3.1,
    leftCornerY: 0,
    rightCornerY: 0,
    upperLeftCurve: 0,
    upperRightCurve: 0,
    lowerLeftCurve: 0,
    lowerRightCurve: 0,
    opening: 3.8,
    offsetX: 0,
    offsetY: -0.6,
  },
  yawn: {
    width: 2.7,
    leftCornerY: 0,
    rightCornerY: 0.1,
    upperLeftCurve: 0.1,
    upperRightCurve: 0.1,
    lowerLeftCurve: 0.1,
    lowerRightCurve: 0.1,
    opening: 3.2,
    offsetX: 0,
    offsetY: -0.4,
  },
  asleep: {
    width: 3.2,
    leftCornerY: 0,
    rightCornerY: 0,
    upperLeftCurve: 0.6,
    upperRightCurve: 0.6,
    lowerLeftCurve: 1.4,
    lowerRightCurve: 1.4,
    opening: 0.9,
    offsetX: 0,
    offsetY: 0.2,
  },
  // A lopsided "huh?": one corner up, one down, the line slightly wavy.
  puzzled: {
    width: 3.9,
    leftCornerY: 0.5,
    rightCornerY: -0.7,
    upperLeftCurve: -0.5,
    upperRightCurve: 0.9,
    lowerLeftCurve: -0.5,
    lowerRightCurve: 0.9,
    opening: 0.15,
    offsetX: 0.4,
    offsetY: 0,
  },
  // Catching its breath: a small open mouth, the opening pulsed per pant.
  pant: {
    width: 2.6,
    leftCornerY: 0.2,
    rightCornerY: 0.2,
    upperLeftCurve: 0.2,
    upperRightCurve: 0.2,
    lowerLeftCurve: 0.6,
    lowerRightCurve: 0.6,
    opening: 1.9,
    offsetX: 0,
    offsetY: 0.1,
  },
  dizzy: {
    width: 4,
    leftCornerY: -0.6,
    rightCornerY: 0.6,
    upperLeftCurve: -1,
    upperRightCurve: 0.5,
    lowerLeftCurve: -1,
    lowerRightCurve: 0.5,
    opening: 0.3,
    offsetX: -0.4,
    offsetY: 0,
  },
} satisfies Record<string, MouthPose>;
export function restingPose(): CharacterPose {
  return {
    yaw: 0,
    pitch: 0,
    roll: 0,
    x: 0,
    y: 0,
    squash: 1,
    gazeX: 0.6,
    gazeY: 1,
    lidLeft: 0.12,
    lidRight: 0.1,
    closure: 0,
    asleep: 0,
    pupil: 1,
    happy: 0,
    mouth: { ...mouthPoses.rest },
  };
}
export function blendMouth(
  a: MouthPose,
  b: MouthPose,
  amount: number,
): MouthPose {
  const result = { ...a };
  for (const key of Object.keys(a) as (keyof MouthPose)[])
    result[key] = a[key] + (b[key] - a[key]) * amount;
  return result;
}
export function blendPose(
  a: CharacterPose,
  b: CharacterPose,
  amount: number,
): CharacterPose {
  const result = { ...a, mouth: blendMouth(a.mouth, b.mouth, amount) };
  for (const key of Object.keys(a) as (keyof CharacterPose)[])
    if (key !== "mouth") result[key] = a[key] + (b[key] - a[key]) * amount;
  return result;
}
export const performanceDuration: Record<CharacterPerformance, number> = {
  greeting: 850,
  inspect: 1900,
  doubleTake: 1400,
  smirk: 1500,
  nod: 1000,
  wobble: 1400,
  nap: 6000,
  dizzy: 2200,
  confused: 1600,
  winded: 1900,
};
/** Closed-form critical spring: stable across refresh rates and interrupted targets. */
export function spring(
  x: number,
  v: number,
  target: number,
  speed: number,
  dt: number,
): [number, number] {
  const a = x - target,
    b = v + speed * a,
    decay = Math.exp(-speed * dt);
  return [target + (a + b * dt) * decay, (v - speed * b * dt) * decay];
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
