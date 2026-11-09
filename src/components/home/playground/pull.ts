/**
 * Pull-to-dismiss for an opened playground card, after the gesture in
 * ramka's lightbox: drag the card up or down and it follows with resistance,
 * shrinking a little and letting the scrim thin out. Let go past a distance,
 * or flick it, and it flies home; otherwise it springs back.
 *
 * Kept free of the DOM so the feel can be tested on its own.
 */

/** Travel before the gesture commits to an axis, in px. */
export const PULL_LOCK_DISTANCE = 6;

/** Travel that dismisses on release, in px. */
export const PULL_DISMISS_DISTANCE = 100;

/** A flick this fast in the pull's direction dismisses, in px/s. */
export const PULL_DISMISS_VELOCITY = 400;

/** How small the card gets at the dismiss distance, as a fraction. */
export const PULL_MIN_SCALE = 0.85;

/** Pointer samples the release velocity is read across. */
export const PULL_VELOCITY_SAMPLES = 5;

export type PullSample = { t: number; y: number };

/**
 * Where the card sits for a raw pointer offset. Travel is eased towards a
 * ceiling, so the card always follows but resists more the further it goes;
 * sideways travel is held to a shorter leash than vertical travel.
 */
export function pullTransform(dx: number, dy: number) {
  const absY = Math.abs(dy);
  const maxY = PULL_DISMISS_DISTANCE * 1.2;
  const dampedY = maxY * (1 - Math.exp(-absY / maxY));
  const damp = absY > 0 ? dampedY / absY : 1;
  const maxX = PULL_DISMISS_DISTANCE * 0.5;
  const dampedX = maxX * (1 - Math.exp(-(Math.abs(dx) * damp) / maxX));
  const progress = Math.min(absY / PULL_DISMISS_DISTANCE, 1);

  return {
    x: Math.sign(dx) * dampedX,
    y: Math.sign(dy) * dampedY,
    scale: 1 - progress * (1 - PULL_MIN_SCALE),
    progress,
  };
}

/** The axis a drag has committed to, or `none` until it has moved enough. */
export function pullAxis(dx: number, dy: number) {
  if (Math.hypot(dx, dy) < PULL_LOCK_DISTANCE) return "none";
  return Math.abs(dy) >= Math.abs(dx) ? "vertical" : "horizontal";
}

/** Vertical speed across the recent samples, in px/s. */
export function pullVelocity(samples: readonly PullSample[]) {
  if (samples.length < 2) return 0;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const dt = last.t - first.t;
  return dt === 0 ? 0 : ((last.y - first.y) / dt) * 1000;
}

/**
 * Whether letting go here dismisses the card: pulled far enough either way,
 * or flicked fast in the direction it was already pulled.
 */
export function shouldDismiss(dy: number, velocity: number) {
  if (Math.abs(dy) >= PULL_DISMISS_DISTANCE) return true;
  return (
    Math.abs(velocity) >= PULL_DISMISS_VELOCITY &&
    Math.sign(velocity) === Math.sign(dy) &&
    dy !== 0
  );
}

/**
 * How much raw pointer travel puts the card at `offset` px from rest — the
 * inverse of the vertical resistance in `pullTransform`. A card caught away
 * from rest (springing back, or flying home) counts as already pulled that far.
 * Past the resistance's reach it reads as three dismiss distances: far enough
 * that letting go dismisses unless the pointer brings it back.
 */
export function pullTravel(offset: number) {
  if (offset === 0) return 0;
  const maxY = PULL_DISMISS_DISTANCE * 1.2;
  const ratio = Math.abs(offset) / maxY;
  const raw = ratio >= 0.95 ? Infinity : -maxY * Math.log(1 - ratio);
  return Math.sign(offset) * Math.min(raw, PULL_DISMISS_DISTANCE * 3);
}

/**
 * A spring as a CSS `linear()` easing, so a transition can finish a gesture
 * at the speed the pointer left it. `velocity` is the starting speed in units
 * of the whole distance per duration (1 = the distance in one duration);
 * `damping` below 1 overshoots a little, 1 settles without overshoot.
 */
export function springEasing(velocity: number, damping: number, settle = 7) {
  const zeta = Math.min(Math.max(damping, 0.05), 4);
  const omega = settle / zeta;
  let rest: (p: number) => number;
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const c = (zeta * omega - velocity) / omegaD;
    rest = (p) =>
      Math.exp(-zeta * omega * p) *
      (Math.cos(omegaD * p) + c * Math.sin(omegaD * p));
  } else {
    rest = (p) => Math.exp(-omega * p) * (1 + (omega - velocity) * p);
  }

  const points: string[] = [];
  const samples = 40;
  for (let i = 0; i < samples - 1; i += 1) {
    const value = 1 - rest(i / (samples - 1));
    points.push(String(Math.round(value * 10000) / 10000));
  }
  points.push("1");
  return `linear(${points.join(", ")})`;
}
