import { clamp, ease } from "./pose";
import { HOME_CHARACTER_TIMING as timing } from "./timing";

/** Underdamped spring, sampled once for WAAPI rather than a second frame loop. */
function travelSpring(t: number) {
  const response = (s: number) =>
    1 - Math.exp(-8 * s) * (Math.cos(6 * s) + (4 / 3) * Math.sin(6 * s));
  return response(t) - (response(1) - 1) * ease(t);
}

/** One trip with a small overshoot, then an exact, drift-free resting slot. */
export function homeCharacterEntranceFrames(x: number, y: number): Keyframe[] {
  const centered = `translate(${x}px, ${y}px)`;
  const travelStart = timing.travelDelayMs / timing.entranceMs;
  const travel = Array.from({ length: 48 }, (_, index): Keyframe => {
    const t = (index + 1) / 48;
    if (t === 1)
      return {
        offset: 1,
        opacity: 1,
        filter: "blur(0px)",
        transform: "translate(0px, 0px) scale(1)",
      };
    const progress = travelSpring(t);
    // Cap the spring's overshoot at 5px even on very large viewports.
    const remaining =
      progress <= 1
        ? 1 - progress
        : -Math.min(progress - 1, 5 / Math.max(1, Math.hypot(x, y)));
    const size = 1.5 - 0.5 * clamp(progress);
    // Stretch on the rise, compress on arrival; at most 3.5% deformation.
    const stretch = 0.035 * Math.sin(2 * Math.PI * t) * Math.sin(Math.PI * t);
    return {
      offset: travelStart + (1 - travelStart) * t,
      opacity: 1,
      filter: "blur(0px)",
      transform: `translate(${x * remaining}px, ${y * remaining}px) scale(${size / (1 + stretch)}, ${size * (1 + stretch)})`,
    };
  });
  return [...arrivalFrames(centered), ...travel];
}

/**
 * The same arrival and greeting, for a load restored below the masthead: the
 * character drifts a little toward its out-of-view slot and dissolves there.
 */
export function homeCharacterDissolveFrames(x: number, y: number): Keyframe[] {
  const drift = 16 / Math.max(1, Math.hypot(x, y));
  return [
    ...arrivalFrames(`translate(${x}px, ${y}px)`),
    {
      offset: 1,
      opacity: 0,
      filter: "blur(10px)",
      transform: `translate(${x * (1 - drift)}px, ${y * (1 - drift)}px) scale(1.2)`,
    },
  ];
}

/** Arrives at the centre and holds there through the greeting. */
function arrivalFrames(centered: string): Keyframe[] {
  return [
    {
      offset: 0,
      opacity: 0,
      filter: "blur(10px)",
      transform: `${centered} scale(0.55)`,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
    {
      offset: timing.arrivalMs / timing.entranceMs,
      opacity: 1,
      filter: "blur(0px)",
      transform: `${centered} scale(1.5)`,
    },
    {
      offset: timing.travelDelayMs / timing.entranceMs,
      opacity: 1,
      filter: "blur(0px)",
      transform: `${centered} scale(1.5)`,
      easing: "cubic-bezier(0.4, 0, 0.7, 1)",
    },
  ];
}
