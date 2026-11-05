import {
  blendMouth,
  ease,
  mouthPoses,
  performanceDuration,
  type CharacterPerformance,
  type CharacterPose,
} from "./pose";
import { characterSleep } from "./sleep";
const pulse = (
  time: number,
  start: number,
  attack: number,
  release: number,
  end: number,
) =>
  ease((time - start) / attack) *
  (1 - ease((time - release) / (end - release)));
export function ownsGaze(kind: CharacterPerformance) {
  return (
    kind === "inspect" ||
    kind === "doubleTake" ||
    kind === "smirk" ||
    kind === "nap" ||
    kind === "dizzy"
  );
}
/** Authored beats, sampled from one clock. No per-frame random decisions. */
export function samplePerformance(
  kind: CharacterPerformance,
  ms: number,
  base: CharacterPose,
  side = 1,
): CharacterPose {
  const p = { ...base, mouth: { ...base.mouth } };
  const end = performanceDuration[kind];
  const head = pulse(ms, 70, 240, end - 400, end);
  const face = pulse(ms, 140, 220, end - 350, end);
  let expression: keyof typeof mouthPoses = "interested";
  if (kind === "greeting") {
    p.pitch -= 7 * head;
    p.roll -= 4 * head;
    p.y -= 0.8 * head;
    p.lidLeft -= 0.1 * head;
    p.lidRight -= 0.1 * head;
    // A hello smiles with the eyes as well as the mouth.
    p.happy = 0.7 * face;
    expression = "smile";
  }
  if (kind === "inspect") {
    p.gazeX = side * 5.3;
    p.gazeY = -2;
    p.yaw += side * 13 * head;
    p.pitch -= 5 * head;
    p.roll += side * 5 * head;
    p.lidLeft += 0.22 * head;
    p.lidRight += 0.08 * head;
    expression = "curious";
  }
  if (kind === "doubleTake") {
    const away = pulse(ms, 260, 150, 480, 590),
      back = pulse(ms, 540, 110, 1060, end);
    p.gazeX = side * (3 - 7 * away + 2 * back);
    p.gazeY = -1.5;
    p.yaw += side * (7 * head - 13 * away + 10 * back);
    p.roll -= side * 5 * back;
    p.lidLeft -= 0.22 * back;
    p.lidRight -= 0.2 * back;
    expression = "surprised";
  }
  if (kind === "smirk") {
    p.gazeX = side * 4;
    p.gazeY = 1;
    p.yaw += side * 10 * head;
    p.roll -= side * 5 * head;
    p.lidLeft += 0.32 * face;
    p.lidRight += 0.08 * face;
    expression = "smirk";
  }
  if (kind === "nod") {
    const anticipation = pulse(ms, 0, 90, 100, 240),
      nod = pulse(ms, 150, 140, 330, 640);
    p.pitch += -4 * anticipation + 13 * nod;
    p.y += 1.1 * nod;
    p.lidLeft += 0.12 * nod;
    p.lidRight += 0.12 * nod;
    p.happy = 0.5 * nod;
    expression = "smile";
  }
  if (kind === "wobble") {
    const t = Math.max(0, (ms - 130) / 1000),
      swing = Math.sin(t * 10) * Math.exp(-t * 2.8) * ease(ms / 130);
    p.roll += side * 9 * swing;
    p.yaw += side * 12 * swing;
    p.x += side * 2.2 * swing;
    p.y -= 1.6 * Math.abs(swing);
    p.squash = 1 - 0.045 * pulse(ms, 0, 100, 120, 300) + 0.025 * swing;
    expression = "smile";
  }
  if (kind === "nap") {
    const sleep = characterSleep(ms);
    // Even lids and a forward nod; a tilted head with uneven lids reads as a smirk.
    p.asleep = sleep.asleep;
    p.lidLeft += 0.42 * sleep.tired;
    p.lidRight += 0.42 * sleep.tired;
    p.pitch += 12 * sleep.tired;
    p.roll *= 1 - sleep.tired;
    p.yaw *= 1 - sleep.tired;
    p.y += 1.4 * sleep.tired;
    p.gazeX = 0;
    p.gazeY = 1.5;
    p.mouth = blendMouth(
      blendMouth(base.mouth, mouthPoses.asleep, sleep.tired),
      mouthPoses.yawn,
      pulse(ms, 4700, 250, 5250, 5750),
    );
    return p;
  }
  if (kind === "confused") {
    // A tilt toward the puzzle, then a second, deeper "hm?" as it leans in.
    // The eyes keep the visitor's gaze target: they look at what was tapped.
    const tilt = pulse(ms, 40, 240, end - 420, end),
      lean = pulse(ms, 620, 220, end - 420, end);
    p.roll += side * (6 * tilt + 3 * lean);
    p.yaw += side * 4 * tilt;
    p.pitch -= 3 * tilt + 2 * lean;
    p.y -= 0.5 * lean;
    // One eye narrows while the other opens: a raised brow without brows.
    p.lidLeft += (side > 0 ? 0.3 : -0.12) * tilt;
    p.lidRight += (side > 0 ? -0.12 : 0.3) * tilt;
    expression = "puzzled";
  }
  if (kind === "winded") {
    // Gave up the chase: three quick pants with the head dipped, then relief.
    const tired = pulse(ms, 0, 180, 1100, 1450),
      relief = pulse(ms, 1150, 260, end - 300, end),
      pant = Math.sin((ms / 1000) * Math.PI * 2 * 2.6);
    p.squash = base.squash + 0.028 * pant * tired;
    p.y += 0.9 * tired - 0.4 * pant * tired;
    p.pitch += 6 * tired;
    p.roll *= 1 - 0.6 * tired;
    p.lidLeft += 0.32 * tired - 0.06 * relief;
    p.lidRight += 0.28 * tired - 0.06 * relief;
    p.happy = 0.55 * relief;
    p.mouth = blendMouth(
      blendMouth(base.mouth, mouthPoses.pant, tired),
      mouthPoses.smile,
      relief,
    );
    p.mouth.opening += 0.7 * Math.max(0, pant) * tired;
    return p;
  }
  if (kind === "dizzy") {
    const d = pulse(ms, 0, 220, 650, end);
    const headD = pulse(ms, 0, 220, 800, end);
    // Let the orbit lose speed as well as amplitude. Cursor influence returns
    // during recovery, with the head following the eyes a little later.
    const settling = Math.max(0, ms - 650);
    const phase =
      (Math.min(ms, 650) + 600 * (1 - Math.exp(-settling / 600))) / 150;
    p.gazeX = base.gazeX * (1 - d) + Math.cos(phase) * 2.2 * d;
    p.gazeY = base.gazeY * (1 - d) + Math.sin(phase) * 1.6 * d;
    p.yaw = base.yaw * (1 - headD);
    p.pitch = base.pitch * (1 - headD);
    p.roll =
      base.roll * (1 - headD) + Math.sin((phase * 150) / 220) * 6 * headD;
    p.lidLeft += 0.23 * d;
    p.lidRight += 0.15 * d;
    p.mouth = blendMouth(base.mouth, mouthPoses.dizzy, d);
    return p;
  }
  const target = mouthPoses[expression];
  p.mouth = blendMouth(base.mouth, target, face);
  // Corners precede the curve; opening follows narrowing, never a simultaneous shape swap.
  const corners = pulse(ms, 100, 180, end - 350, end);
  p.mouth.leftCornerY =
    base.mouth.leftCornerY +
    (target.leftCornerY - base.mouth.leftCornerY) * corners;
  p.mouth.rightCornerY =
    base.mouth.rightCornerY +
    (target.rightCornerY - base.mouth.rightCornerY) * corners;
  p.mouth.width =
    base.mouth.width +
    (target.width - base.mouth.width) * pulse(ms, 90, 200, end - 350, end);
  p.mouth.opening =
    base.mouth.opening +
    (target.opening - base.mouth.opening) * pulse(ms, 190, 220, end - 350, end);
  return p;
}
