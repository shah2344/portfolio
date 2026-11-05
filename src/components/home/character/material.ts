import { clamp, ease, type CharacterPose } from "./pose";

/** A settled pet keeps the existing slow, liquid colour/shine handoff. */
export const CHARACTER_MATERIAL_MS = 900;
export const CHARACTER_MATERIAL_MIN_MS = 180;

/** Repeated pets build pace; a pause returns the next pet to its resting tempo. */
export function createCharacterPettingTempo() {
  let previous = -Infinity;
  let energy = 0;
  return (time: number) => {
    const gap = Math.max(0, time - previous);
    energy =
      gap >= 700
        ? 0
        : energy * Math.exp(-gap / 650) + Math.max(0, 1 - gap / 600);
    previous = time;
    return Math.max(
      CHARACTER_MATERIAL_MIN_MS,
      CHARACTER_MATERIAL_MS / (1 + energy * 0.75),
    );
  };
}

/** Each tap owns its clock; accelerating an older sweep keeps its position. */
export function createCharacterShine() {
  let startedAt = -Infinity;
  let duration = CHARACTER_MATERIAL_MS;
  const progress = (time: number) => (time - startedAt) / duration;
  return {
    progress,
    start(time: number, ms: number) {
      startedAt = time;
      duration = ms;
    },
    accelerate(time: number, ms: number) {
      const position = progress(time);
      if (position < 0 || position >= 1) return;
      startedAt = time - position * ms;
      duration = ms;
    },
  };
}

/** The same meridian draws the shine and bounds the colour revealed behind it. */
export function characterMaterialSweep(
  pose: CharacterPose,
  roll: number,
  progress: number,
) {
  const t = clamp(progress);
  const longitude = -Math.PI / 2 + Math.PI * ease(t);
  const rx = 27 / pose.squash;
  const ry = 28 * pose.squash;
  const bulge = Math.max(0.001, Math.abs(Math.sin(longitude)) * rx);
  const side = longitude > 0 ? 1 : 0;
  const f = (value: number) => value.toFixed(4);
  const edge = `M0 ${f(-ry)}A${f(bulge)} ${f(ry)} 0 0 ${side} 0 ${f(ry)}`;
  return {
    edge,
    reveal: t === 0 ? "" : `${edge}L0 96L-128 96L-128 -96L0 -96Z`,
    transform: `translate(${f(32 + pose.x)} ${f(31 + pose.y)}) rotate(${f(35 - roll)})`,
    halo: 4 + 8 * Math.cos(longitude),
    core: 1 + 2 * Math.cos(longitude),
    opacity: Math.sin(Math.PI * t),
  };
}
