export type Point = { x: number; y: number };
type Spring = { value: number; velocity: number };

export const TOOLTIP_FADE_SECONDS = 0.24;
const RELEASE_DECAY_SECONDS = 0.15;

export function createTooltipMotion() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    target: { x: 0, y: 0 },
    visible: false,
    opacity: 0,
    age: 0,
    fromOpacity: 0,
    scale: { value: 0.88, velocity: 0 },
    squash: { value: 0, velocity: 0 },
  };
}

export type TooltipMotion = ReturnType<typeof createTooltipMotion>;

/** Exact damped spring integration keeps the feel consistent across frame rates. */
function stepSpring(
  spring: Spring,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
) {
  const decay = damping / 2;
  const frequency = Math.sqrt(stiffness - decay * decay);
  const offset = spring.value - target;
  const amplitude = (spring.velocity + decay * offset) / frequency;
  const sin = Math.sin(frequency * dt);
  const cos = Math.cos(frequency * dt);
  const envelope = Math.exp(-decay * dt);
  spring.value = target + envelope * (offset * cos + amplitude * sin);
  spring.velocity =
    envelope *
    ((amplitude * frequency - decay * offset) * cos -
      (offset * frequency + decay * amplitude) * sin);
}

export function showTooltip(motion: TooltipMotion, target: Point) {
  motion.target = target;
  if (motion.visible) return;
  if (motion.opacity === 0) {
    motion.x = target.x;
    motion.y = target.y + 5;
    motion.vx = 0;
    motion.vy = 0;
    motion.scale = { value: 0.88, velocity: 0 };
    motion.squash = { value: 0, velocity: 0 };
  }
  motion.visible = true;
  motion.fromOpacity = motion.opacity;
  motion.age = 0;
  motion.squash.velocity = 1.4;
}

export function releaseTooltip(
  motion: TooltipMotion,
  carry: Point,
  bounds?: { minX: number; maxX: number },
) {
  if (!motion.visible) return;
  motion.visible = false;
  motion.fromOpacity = motion.opacity;
  motion.age = 0;
  // Preserve the follower's momentum. A restrained impulse also makes slow
  // releases coast, rather than leaving a stationary pill to fade in place.
  motion.vx += Math.max(-180, Math.min(180, carry.x * 0.2));
  motion.vy += Math.max(-140, Math.min(140, carry.y * 0.2));
  if (Math.hypot(motion.vx, motion.vy) < 45) {
    const length = Math.hypot(carry.x, carry.y);
    motion.vx += length ? (carry.x / length) * 45 : 0;
    motion.vy += length ? (carry.y / length) * 45 : 45;
  }
  if (bounds) {
    // Limit the asymptotic destination, rather than clipping a moving pill at
    // the viewport edge. Its trail continues decelerating even near that edge.
    motion.vx = Math.max(
      (bounds.minX - motion.x) / RELEASE_DECAY_SECONDS,
      Math.min((bounds.maxX - motion.x) / RELEASE_DECAY_SECONDS, motion.vx),
    );
    if (Math.hypot(motion.vx, motion.vy) < 20) motion.vy += 30;
  }
  // An impulse into one spring produces compression, then an actual rebound.
  motion.squash.velocity = -1.8;
}

/** Position, opacity and shape share one clock, including interrupted exits. */
export function advanceTooltip(
  motion: TooltipMotion,
  dt: number,
  reduced: boolean,
) {
  motion.age += dt;
  if (reduced) {
    motion.x = motion.target.x;
    motion.y = motion.target.y;
    motion.vx = 0;
    motion.vy = 0;
    motion.opacity = motion.visible ? 1 : 0;
    motion.scale = { value: 1, velocity: 0 };
    motion.squash = { value: 0, velocity: 0 };
    return false;
  }

  if (motion.visible) {
    const horizontal = { value: motion.x, velocity: motion.vx };
    const vertical = { value: motion.y, velocity: motion.vy };
    stepSpring(horizontal, motion.target.x, 900, 48, dt);
    stepSpring(vertical, motion.target.y, 900, 48, dt);
    motion.x = horizontal.value;
    motion.y = vertical.value;
    motion.vx = horizontal.velocity;
    motion.vy = vertical.velocity;
    const progress = Math.min(1, motion.age / 0.16);
    motion.opacity =
      motion.fromOpacity + (1 - motion.fromOpacity) * (1 - (1 - progress) ** 3);
  } else {
    // Exponential drag has no finite stopping point. Integrating it directly
    // avoids a spring's rest threshold snapping the trail before the fade ends.
    const decay = Math.exp(-dt / RELEASE_DECAY_SECONDS);
    motion.x += motion.vx * RELEASE_DECAY_SECONDS * (1 - decay);
    motion.y += motion.vy * RELEASE_DECAY_SECONDS * (1 - decay);
    motion.vx *= decay;
    motion.vy *= decay;
    const progress = Math.min(1, motion.age / TOOLTIP_FADE_SECONDS);
    motion.opacity = motion.fromOpacity * (1 - progress) ** 1.6;
  }

  stepSpring(motion.scale, motion.visible ? 1 : 0.78, 520, 30, dt);
  stepSpring(motion.squash, 0, 620, 19, dt);
  if (!motion.visible && motion.opacity === 0) return false;
  return (
    motion.age < 0.3 ||
    Math.hypot(motion.x - motion.target.x, motion.y - motion.target.y) > 0.01 ||
    Math.hypot(motion.vx, motion.vy) > 0.1 ||
    Math.abs(motion.scale.velocity) > 0.001 ||
    Math.abs(motion.squash.velocity) > 0.001
  );
}
