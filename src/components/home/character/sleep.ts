import { ease } from "./pose";
/** A short nap with a readable lead-in, brief rest, and gentle wake. */
export const CHARACTER_SLEEP_MS = 6000;
export function characterSleep(elapsed: number) {
  if (elapsed < 0 || elapsed >= CHARACTER_SLEEP_MS)
    return { tired: 0, asleep: 0 };
  const waking = 1 - ease((elapsed - 5100) / 900);
  return {
    tired: ease(elapsed / 1700) * waking,
    // Fully shut: the eyes settle into crescents, so no pupil peeks through.
    asleep: ease((elapsed - 1700) / 900) * waking,
  };
}
