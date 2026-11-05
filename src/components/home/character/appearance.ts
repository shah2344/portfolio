type Track = readonly (readonly [number, number])[];

export const APPEARANCE_REACTION_MS = { light: 1320, dark: 1440 } as const;

const lightClosure: Track = [
  [0, 0],
  [35, 1],
  [145, 1],
  [225, 0.42],
  [260, 1],
  [410, 1],
  [475, 0.48],
  [510, 1],
  [590, 1],
  [710, 0.45],
  [980, 0.26],
  [1320, 0],
];
const darkClosure: Track = [
  [0, 0],
  [820, 0],
  [865, 1],
  [940, 1],
  [1100, 0],
];
const darkLids: Track = [
  [0, 0],
  [160, -0.28],
  [700, -0.28],
  [1250, 0],
];
const lightPupil: Track = [
  [0, 1],
  [140, 0.82],
  [650, 0.82],
  [1320, 1],
];
const darkPupil: Track = [
  [0, 1],
  [80, 1],
  [620, 1.24],
  [940, 1.24],
  [1440, 1],
];

function sample(track: Track, elapsed: number) {
  for (let i = 1; i < track.length; i++) {
    const [end, to] = track[i]!;
    if (elapsed > end) continue;
    const [start, from] = track[i - 1]!;
    const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
    return from + (to - from) * t * t * (3 - 2 * t);
  }
  return track.at(-1)![1];
}

/** A short eye-only adaptation, sampled from one clock and safe to interrupt. */
export function appearanceReaction(dark: boolean, elapsed: number) {
  const active =
    elapsed >= 0 && elapsed < APPEARANCE_REACTION_MS[dark ? "dark" : "light"];
  if (!active) return { active: false, closure: 0, lids: 0, pupil: 1 };
  return {
    active: true,
    closure: sample(dark ? darkClosure : lightClosure, elapsed),
    lids: dark ? sample(darkLids, elapsed) : 0,
    pupil: sample(dark ? darkPupil : lightPupil, elapsed),
  };
}
