/** Center arrival → greeting → travel, with copy joining the final approach. */
export const HOME_CHARACTER_TIMING = {
  arrivalMs: 480,
  wakeDelayMs: 120,
  wakeMs: 180,
  greetingDelayMs: 120,
  travelDelayMs: 980,
  contentDelayMs: 1240,
  entranceMs: 1440,
  doubleBlinkExtraMs: 240,
} as const;
export type HomeCharacterTiming = {
  -readonly [K in keyof typeof HOME_CHARACTER_TIMING]: number;
};

/**
 * The first reveal's colour shuffle (`background.tsx`). It winds up from a
 * readable first beat to near-cuts, then brakes over several growing beats
 * onto this load's colour. It starts `delayMs` after the settled colour
 * decodes, or once the others decode, up to `waitMs`; the colour then holds
 * `settleHoldMs` before the trip leaves.
 */
export const HOME_CHARACTER_SHUFFLE = {
  stepsMs: [64, 44, 30, 24, 24, 28, 40, 60, 90, 170] as readonly number[],
  delayMs: 160,
  waitMs: 250,
  settleHoldMs: 120,
} as const;
/** Time for the settled colour's mesh to decode before the shuffle can start. */
const SHUFFLE_DECODE_ALLOWANCE_MS = 80;
/** From the opening's start, how long the shuffle needs before the trip. */
const SHUFFLE_RUN_MS =
  SHUFFLE_DECODE_ALLOWANCE_MS +
  HOME_CHARACTER_SHUFFLE.waitMs +
  HOME_CHARACTER_SHUFFLE.stepsMs.reduce((a, b) => a + b, 0) +
  HOME_CHARACTER_SHUFFLE.settleHoldMs;

let departure: number | undefined;
/**
 * When this load's opening trip leaves the centre, on the `performance.now()`
 * clock, or undefined when there is no opening to wait for. Set by
 * `HomeEntranceRoot`, so the material's first reveal can land before it.
 */
export const homeCharacterDeparture = () => departure;
export function setHomeCharacterDeparture(time: number | undefined) {
  departure = time;
}

/** Past this, the opening reads as a wait the character felt, not a beat. */
export const HOME_CHARACTER_LONG_WAIT_MS = 3000;

type Waiting = { ms: number; x: number; y: number };
let arrival:
  | {
      doubleBlink: boolean;
      waitedMs: number;
      waitingAt?: Waiting;
      timing: HomeCharacterTiming;
    }
  | undefined;
/**
 * Chosen only in client effects, once per full load and shared across siblings.
 * The first caller must run while the masthead is still idle, so it can read
 * how long the CSS waiting state has been on screen and where it stands.
 * Strict Mode replays effects after the opening has ended it, so both are kept.
 *
 * `timing` is this load's opening. A slow load joins the CSS arrival partway,
 * which leaves less time at the centre than the colour shuffle needs, so the
 * character holds there a little longer and everything after the hold (the
 * trip, the copy, the landing) moves back with it. A quick load needs little
 * or none.
 */
export function homeCharacterArrival() {
  if (!arrival) {
    const waitingAt = cssWaiting();
    const waitedMs = waitingAt?.ms ?? 0;
    const elapsed = Math.min(waitedMs, HOME_CHARACTER_TIMING.arrivalMs);
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const holdMs = reduced
      ? 0
      : Math.max(
          0,
          SHUFFLE_RUN_MS - (HOME_CHARACTER_TIMING.travelDelayMs - elapsed),
        );
    arrival = {
      doubleBlink: Math.random() < 0.28,
      waitedMs,
      waitingAt,
      timing: {
        ...HOME_CHARACTER_TIMING,
        travelDelayMs: HOME_CHARACTER_TIMING.travelDelayMs + holdMs,
        contentDelayMs: HOME_CHARACTER_TIMING.contentDelayMs + holdMs,
        entranceMs: HOME_CHARACTER_TIMING.entranceMs + holdMs,
      },
    };
  }
  return arrival;
}

/** The no-script arrival in `globals.css`: how long it has run, and its centre. */
function cssWaiting(): Waiting | undefined {
  const root = document.querySelector(
    '.home-masthead__character[data-home-enter="idle"] [data-character-root]',
  );
  const animation = root
    ?.getAnimations()
    .find(
      (animation) =>
        animation instanceof CSSAnimation &&
        animation.animationName === "home-character-wait-arrive",
    );
  const time = animation?.currentTime;
  if (!root || typeof time !== "number" || time <= 0) return undefined;
  const rect = root.getBoundingClientRect();
  return {
    ms: time,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
