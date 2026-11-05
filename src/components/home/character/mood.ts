import { clamp, ease } from "./pose";

/** Slow emotional state, both 0..1: kindness received and feeling ignored. */
export type CharacterMood = { warmth: number; boredom: number };
export const neutralMood: CharacterMood = { warmth: 0, boredom: 0 };

const WARMTH_HALF_LIFE = 150000;
const TAP_GAIN = 0.22;
const TAP_CLUSTER_GAIN = 0.08;
const TAP_CLUSTER_WINDOW = 650;
const PLAY_GAIN = 0.08;
const BORED_AFTER = 25000;
const BORED_FULL = 120000;
const BORED_RELEASE = 1500;

/**
 * Lazy and pure: every value is a closed-form function of the times passed
 * in, so sampling per frame or once gives the same answer.
 */
export function createCharacterMood(now: number) {
  let warmth = 0,
    warmthAt = now,
    lastTap = -Infinity,
    idleFrom = now,
    // Boredom at the last input; it fades out instead of snapping to 0.
    carried = 0;
  const warmthAtTime = (time: number) =>
    warmth * 0.5 ** (Math.max(0, time - warmthAt) / WARMTH_HALF_LIFE);
  const boredomAtTime = (time: number) => {
    const idle = Math.max(0, time - idleFrom);
    return Math.max(
      carried * Math.exp(-idle / BORED_RELEASE),
      ease((idle - BORED_AFTER) / (BORED_FULL - BORED_AFTER)),
    );
  };
  const addWarmth = (delta: number, time: number) => {
    warmth = clamp(warmthAtTime(time) + delta);
    warmthAt = Math.max(warmthAt, time);
  };
  return {
    /** A cluster of quick taps reads as one gesture, so followers add little. */
    tap(time: number) {
      addWarmth(
        time - lastTap < TAP_CLUSTER_WINDOW ? TAP_CLUSTER_GAIN : TAP_GAIN,
        time,
      );
      lastTap = time;
    },
    play(time: number) {
      addWarmth(PLAY_GAIN, time);
    },
    annoy(amount: number, time: number) {
      addWarmth(-amount, time);
    },
    input(time: number) {
      carried = boredomAtTime(time);
      idleFrom = Math.max(idleFrom, time);
    },
    sample(time: number): CharacterMood {
      return { warmth: warmthAtTime(time), boredom: boredomAtTime(time) };
    },
    reset(time: number) {
      warmth = 0;
      warmthAt = time;
      lastTap = -Infinity;
      idleFrom = time;
      carried = 0;
    },
  };
}
