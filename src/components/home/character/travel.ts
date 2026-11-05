import { HOME_CHARACTER_TIMING as timing } from "./timing";
import { blendPose, ease, mouthPoses, type CharacterPose } from "./pose";

export const travelEmotions = [
  "delighted",
  "curious",
  "confident",
  "surprised",
] as const;
export type TravelEmotion = (typeof travelEmotions)[number];

export function chooseTravelEmotion(
  random: () => number,
  previous?: string,
): TravelEmotion {
  const choices = travelEmotions.filter((emotion) => emotion !== previous);
  return choices[Math.floor(random() * choices.length)] ?? choices[0]!;
}

let arrivalEmotion: TravelEmotion | undefined;
/** Survives Strict Mode; the prior full load is excluded even after refresh. */
export function homeTravelEmotion() {
  if (arrivalEmotion) return arrivalEmotion;
  let previous: string | undefined;
  try {
    previous =
      sessionStorage.getItem("home-character-travel-emotion") ?? undefined;
  } catch {
    /* Motion still works when storage is unavailable. */
  }
  arrivalEmotion = chooseTravelEmotion(Math.random, previous);
  try {
    sessionStorage.setItem("home-character-travel-emotion", arrivalEmotion);
  } catch {
    /* Variation needs no persistent storage. */
  }
  return arrivalEmotion;
}

/** A small facial beat carried through travel and held briefly after landing.
 * Position, scale and squash belong entirely to the entrance, never this beat. */
export function sampleTravelEmotion(
  base: CharacterPose,
  emotion: TravelEmotion | undefined,
  ms: number,
): CharacterPose {
  if (!emotion || ms <= -100 || ms >= 1500) return base;
  const amount = ease((ms + 100) / 160) * (1 - ease((ms - 950) / 550));
  const p = { ...base, mouth: { ...base.mouth } };
  if (emotion === "delighted") {
    p.mouth = { ...mouthPoses.smile };
    p.pitch = -5;
    p.roll = -4;
    p.lidLeft = p.lidRight = 0.02;
  } else if (emotion === "curious") {
    p.mouth = { ...mouthPoses.curious };
    p.pitch = -8;
    p.yaw = 6;
    p.roll = 6;
    p.lidLeft = 0.04;
    p.lidRight = 0.2;
  } else if (emotion === "confident") {
    p.mouth = { ...mouthPoses.smirk };
    p.pitch = -3;
    p.yaw = -8;
    p.roll = -5;
    p.lidLeft = 0.32;
    p.lidRight = 0.15;
  } else {
    p.mouth = { ...mouthPoses.surprised };
    p.pitch = -5;
    p.roll = 3;
    p.lidLeft = p.lidRight = -0.05;
  }
  const result = blendPose(base, p, amount);
  // The eyes lead takeoff, follow the rise, then return after the body settles.
  const flightMs = timing.entranceMs - timing.travelDelayMs;
  const lookUp =
    ease((ms + 100) / 110) * (1 - ease((ms - flightMs + 40) / 280));
  result.gazeX = base.gazeX + (-0.7 - base.gazeX) * lookUp;
  result.gazeY = base.gazeY + (-6.2 - base.gazeY) * lookUp;
  return result;
}
