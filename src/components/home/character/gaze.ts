type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };

/** The cursor in the character's gaze space: ±1 at the edges of its view. */
export function characterAttention(point: Point, rect: Box): Point {
  const reach = (n: number) => Math.max(-1, Math.min(1, n));
  return {
    x: reach((point.x - rect.left - rect.width / 2) / 260),
    y: reach((point.y - rect.top - rect.height / 2) / 230),
  };
}

const blend = (from: Point, to: Point, t: number): Point => {
  const x = Math.max(0, Math.min(1, t));
  const eased = x * x * x * (x * (x * 6 - 15) + 10);
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
  };
};

/** A fast fixation change, with an optional small, delayed landing correction.
 * Coordinates are shared pupil offsets, so the eyes remain aligned and never
 * sweep through a near-field world-space point on their way to a new object.
 */
export function createGazeShift(
  from: Point,
  to: Point,
  start: number,
  correct: boolean,
) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const duration = Math.min(145, 85 + distance * 5);
  const landing =
    correct && distance > 2
      ? {
          x: from.x + (to.x - from.x) * 0.95,
          y: from.y + (to.y - from.y) * 0.95,
        }
      : to;
  const correctionAt = duration + 110;
  return {
    start,
    duration,
    sample(now: number): Point {
      const elapsed = now - start;
      if (elapsed <= duration) return blend(from, landing, elapsed / duration);
      if (elapsed < correctionAt) return landing;
      return blend(landing, to, (elapsed - correctionAt) / 70);
    },
  };
}
