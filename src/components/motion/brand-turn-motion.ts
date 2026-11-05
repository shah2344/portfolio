export const BRAND_TURN_EVENT = "brand-turn-state";

/**
 * How the home character hands off to a case study's mark, and back again.
 * `turn` is the original coin turn; the others are candidates under review.
 */
export const BRAND_HANDOFFS = [
  "turn",
  "blink",
  "pop",
  "focus",
  "slot",
  "iris",
] as const;
export type BrandHandoff = (typeof BRAND_HANDOFFS)[number];
export const BRAND_HANDOFF: BrandHandoff = "blink";
/** Storage key and query parameter that override the default while comparing. */
export const BRAND_HANDOFF_KEY = "brand-handoff";

export const BRAND_HANDOFF_LABELS: Record<
  BrandHandoff,
  { name: string; note: string }
> = {
  turn: {
    name: "Turn",
    note: "The current coin turn: both faces swing on one axis and crossfade.",
  },
  blink: {
    name: "Blink",
    note: "The character shuts like an eyelid; the mark opens out of the slit.",
  },
  pop: {
    name: "Pop",
    note: "The character crouches and ducks away; the mark springs up in its place.",
  },
  focus: {
    name: "Focus pull",
    note: "One face drifts out of focus toward you as the other resolves.",
  },
  slot: {
    name: "Slot",
    note: "Both faces ride one reel through the 44px window and settle.",
  },
  iris: {
    name: "Iris",
    note: "The mark opens from the character's centre as it recedes.",
  },
};

export type HandoffPlan = {
  duration: number;
  outgoing: Keyframe[];
  incoming: Keyframe[];
};

const SAMPLES = 24;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const easeIn = (value: number) => clamp(value) ** 3;
const easeOut = (value: number) => 1 - (1 - clamp(value)) ** 3;
/** Back-out: leaves at speed, passes 1 once by roughly `overshoot`, rests at 1. */
const backOut = (value: number, overshoot = 1.2) => {
  const u = clamp(value) - 1;
  return 1 + (overshoot + 1) * u ** 3 + overshoot * u ** 2;
};
/** An under-damped settle with one visible overshoot; the tail is below a pixel. */
const spring = (value: number, overshoot = 0.08) => {
  const t = clamp(value);
  if (t === 1) return 1;
  const damping = 7;
  const frequency = (damping * Math.PI) / -Math.log(overshoot);
  return 1 - Math.exp(-damping * t) * Math.cos(frequency * t);
};
const round = (value: number) => Math.round(value * 1000) / 1000;

/** Curves are sampled, so the WAAPI timing itself stays linear. */
function sample(frame: (t: number) => Keyframe): Keyframe[] {
  return Array.from({ length: SAMPLES + 1 }, (_, index) => ({
    ...frame(index / SAMPLES),
    offset: index / SAMPLES,
  }));
}

export function brandTurnFrames(
  direction: number,
  incoming: boolean,
): Keyframe[] {
  return sample((offset) => {
    const turn = smooth(offset);
    const depth = Math.sin(turn * Math.PI);
    const mix = smooth((offset - 0.18) / 0.64);
    const yaw = direction * (incoming ? turn - 1 : turn) * 52;
    const x = direction * (incoming ? 1 - turn : -turn) * 1.5;
    return {
      // Perspective lives in the transform: the faces no longer share a parent.
      transform: `perspective(260px) translate3d(${x}px, ${-1.5 * depth}px, ${-2 * depth}px) rotateX(${2 * depth}deg) rotateY(${yaw}deg) scale(${1 - 0.025 * depth})`,
      opacity: incoming ? mix : 1 - mix,
    };
  });
}

/**
 * `direction` is 1 toward a case study's mark and -1 back to the character.
 * Every plan starts on the outgoing face alone and ends on the incoming face
 * at rest, so removing the stage afterwards never shifts a pixel.
 */
export function brandHandoffPlan(
  style: BrandHandoff,
  direction: number,
): HandoffPlan {
  switch (style) {
    case "blink": {
      // Shutting accelerates like an eyelid; both faces are a 2px line at the swap.
      const shut = 0.42;
      return {
        duration: 300,
        outgoing: sample((t) => {
          const c = easeIn(t / shut);
          return {
            transform: `scale(${round(1 + 0.1 * c)}, ${round(1 - 0.95 * c)})`,
            opacity: t < shut ? 1 : 0,
          };
        }),
        incoming: sample((t) => {
          const u = (t - shut) / (1 - shut);
          return {
            transform: `scale(${round(1.1 - 0.1 * easeOut(u))}, ${round(0.05 + 0.95 * backOut(u))})`,
            opacity: u > 0 ? 1 : 0,
          };
        }),
      };
    }
    case "pop": {
      // A planted crouch, a dip out of sight, then the mark rises on a spring.
      const crouch = 0.16,
        gone = 0.5,
        rise = 0.32;
      return {
        duration: 440,
        outgoing: sample((t) => {
          const a = smooth(t / crouch);
          const d = easeIn((t - crouch) / (gone - crouch));
          const sx = 1 + 0.06 * a - 0.56 * d;
          const sy = 1 - 0.08 * a - 0.42 * d;
          return {
            transform: `translateY(${round(22 * (1 - sy) + 4 * d)}px) scale(${round(sx)}, ${round(sy)})`,
            filter: `blur(${round(2 * d)}px)`,
            opacity: round(1 - d),
          };
        }),
        incoming: sample((t) => {
          const u = (t - rise) / (1 - rise);
          const s = spring(u, 0.1);
          return {
            transform: `translateY(${round(6 * (1 - s))}px) rotate(${round(-direction * 8 * (1 - s))}deg) scale(${round(0.4 + 0.6 * s)})`,
            filter: "blur(0px)",
            opacity: round(smooth(u / 0.25)),
          };
        }),
      };
    }
    case "focus":
      return {
        duration: 320,
        outgoing: sample((t) => {
          const p = smooth(t / 0.7);
          return {
            transform: `scale(${round(1 + 0.14 * p)})`,
            filter: `blur(${round(5 * p)}px)`,
            opacity: round(1 - p),
          };
        }),
        incoming: sample((t) => {
          const q = easeOut((t - 0.2) / 0.8);
          return {
            transform: `scale(${round(0.86 + 0.14 * q)})`,
            filter: `blur(${round(5 * (1 - q))}px)`,
            opacity: round(smooth((t - 0.2) / 0.5)),
          };
        }),
      };
    case "slot": {
      // One strip: the faces stay a fixed distance apart and share the settle.
      // 44px plus both 15px glows clears the window without the faces touching.
      const travel = 76;
      return {
        duration: 380,
        outgoing: sample((t) => {
          const r = spring(t, 0.06);
          return {
            transform: `translateY(${round(-direction * travel * r)}px)`,
          };
        }),
        incoming: sample((t) => {
          const r = spring(t, 0.06);
          return {
            transform: `translateY(${round(direction * travel * (1 - r))}px)`,
          };
        }),
      };
    }
    case "iris":
      return {
        duration: 360,
        outgoing: sample((t) => {
          const p = smooth((t - 0.15) / 0.7);
          return {
            transform: `scale(${round(1 - 0.1 * p)})`,
            filter: `blur(${round(2 * p)}px)`,
            opacity: round(1 - p),
          };
        }),
        incoming: sample((t) => {
          const q = easeOut(t / 0.85);
          // 72% of the box's normalised diagonal clears its corners.
          return {
            clipPath: `circle(${round(72 * q)}% at 50% 50%)`,
            transform: `scale(${round(1.12 - 0.12 * q)})`,
          };
        }),
      };
    case "turn":
    default:
      return {
        duration: 300,
        outgoing: brandTurnFrames(direction, false),
        incoming: brandTurnFrames(direction, true),
      };
  }
}

export function isBrandHandoff(value: unknown): value is BrandHandoff {
  return BRAND_HANDOFFS.includes(value as BrandHandoff);
}

export const brandEntryFrames: Keyframe[] = [
  { opacity: 0, transform: "translateY(2px) scale(.98)" },
  { opacity: 1, transform: "translateY(0) scale(1)" },
];
