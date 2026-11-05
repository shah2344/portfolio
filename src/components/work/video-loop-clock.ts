/** Match the existing loop's trimmed tail and quick 160ms crossfade. */
export const LOOP_START = 0.35;
export const LOOP_TAIL = 0.6;
export const LOOP_BLEND = 0.16;

/** Advance an unseen clip without running a decoder or a background timer. */
export function advanceLoopTime(
  time: number,
  elapsed: number,
  duration: number,
) {
  if (!Number.isFinite(duration) || duration <= 0) return time;
  const advance = Math.max(0, elapsed);
  // Tiny clips use their native loop; there is no room for a crossfade.
  if (duration <= LOOP_START + LOOP_BLEND + LOOP_TAIL) {
    return (time + advance) % duration;
  }
  const end = duration - LOOP_TAIL;
  const landing = LOOP_START + LOOP_BLEND;
  const position = time + advance;
  return position < end
    ? position
    : landing + ((position - end) % (end - landing));
}
