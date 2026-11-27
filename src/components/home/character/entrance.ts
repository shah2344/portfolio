import { ease } from "./pose";

/**
 * Underdamped spring, normalised to land exactly on 1. One visible overshoot
 * and a small correction, then still.
 */
function popSpring(t: number) {
  const response = (s: number) =>
    1 - Math.exp(-5 * s) * (Math.cos(11 * s) + (5 / 11) * Math.sin(11 * s));
  return response(t) - (response(1) - 1) * ease(t);
}

/**
 * The character leads the masthead stagger with its own entrance. The copy
 * rises softly out of a blur; the character pops up from a little below, tips
 * back level and settles on a spring, so it reads as alive rather than as one
 * more line of text. It stays in its slot and never crosses the copy.
 */
export function homeCharacterEntranceFrames(): Keyframe[] {
  const steps = 32;
  return Array.from({ length: steps + 1 }, (_, index): Keyframe => {
    const t = index / steps;
    if (t === 1)
      return {
        offset: 1,
        opacity: 1,
        filter: "blur(0px)",
        transform: "translateY(0px) rotate(0deg) scale(1)",
      };
    const away = 1 - popSpring(t);
    return {
      offset: t,
      opacity: ease(t / 0.22),
      filter: `blur(${(5 * (1 - ease(t / 0.3))).toFixed(3)}px)`,
      transform: `translateY(${(10 * away).toFixed(3)}px) rotate(${(-12 * away).toFixed(3)}deg) scale(${(1 - 0.45 * away).toFixed(4)})`,
    };
  });
}
