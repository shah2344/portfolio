import { clamp, type Point } from "./pose";

type Sample = Point & { time: number };

// Gaze space spans ±1 across the character's view (see characterAttention).
const STEP = 0.03; // ≈8px of cursor travel near the character
const PAUSE_MS = 320;
const SPIN_WINDOW_MS = 3500;
const SPIN_LOOPS = 1.5;
const SWING = 0.2; // ≈50px across the character's view
const REVERSAL_GAP_MS = 650;
const REVERSALS = 4;

/** Dizziness comes from what the eyes are put through: following the cursor
 * around and around the character, or being whipped back and forth. A single
 * stroke, however fast, only moves them once and never counts.
 */
export function createCharacterDizziness() {
  let last: Sample | null = null;
  let strokeStart: Point = { x: 0, y: 0 };
  let turns: { angle: number; time: number }[] = [];
  let reversals: number[] = [];
  const reset = () => {
    last = null;
    turns = [];
    reversals = [];
  };
  return {
    reset,
    /** `gaze` is the cursor in the character's gaze space, clamped to ±1. */
    track(gaze: Point, time: number) {
      if (!last || time - last.time > PAUSE_MS) {
        // A deliberate pause ends the gesture; slow browsing never builds one.
        reset();
        last = { ...gaze, time };
        strokeStart = gaze;
        return false;
      }
      const dx = gaze.x - last.x,
        dy = gaze.y - last.y;
      const step = Math.hypot(dx, dy);
      // Resample by distance, not event count, so polling rate and tremor
      // can't manufacture turns.
      if (step < STEP) return false;

      // Spin: how far the eyes' direction turns around the character. Passing
      // right over the face flips the angle without circling, so it's ignored.
      let angle = Math.atan2(gaze.y, gaze.x) - Math.atan2(last.y, last.x);
      if (angle > Math.PI) angle -= 2 * Math.PI;
      else if (angle < -Math.PI) angle += 2 * Math.PI;
      const radius = Math.min(
        Math.hypot(last.x, last.y),
        Math.hypot(gaze.x, gaze.y),
      );
      turns = turns.filter((turn) => time - turn.time <= SPIN_WINDOW_MS);
      turns.push({ angle: angle * clamp((radius - 0.04) / 0.08), time });
      const spin = Math.abs(turns.reduce((sum, turn) => sum + turn.angle, 0));

      // Shake: the eyes snap back against a wide swing, again and again.
      const sx = last.x - strokeStart.x,
        sy = last.y - strokeStart.y;
      const swing = Math.hypot(sx, sy);
      if (swing > 0 && (dx * sx + dy * sy) / (swing * step) < -0.5) {
        if (swing >= SWING) {
          if (time - (reversals.at(-1) ?? time) > REVERSAL_GAP_MS)
            reversals = [];
          reversals.push(time);
        }
        strokeStart = last;
      }
      last = { ...gaze, time };
      const shaking =
        reversals.length >= REVERSALS &&
        time - reversals.at(-1)! <= REVERSAL_GAP_MS;
      return spin >= SPIN_LOOPS * 2 * Math.PI || shaking;
    },
  };
}
