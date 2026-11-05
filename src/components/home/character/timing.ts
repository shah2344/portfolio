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
  { doubleBlink: boolean; waitedMs: number; waitingAt?: Waiting } | undefined;
/**
 * Chosen only in client effects, once per full load and shared across siblings.
 * The first caller must run while the masthead is still idle, so it can read
 * how long the CSS waiting state has been on screen and where it stands.
 * Strict Mode replays effects after the opening has ended it, so both are kept.
 */
export function homeCharacterArrival() {
  if (!arrival) {
    const waitingAt = cssWaiting();
    arrival = {
      doubleBlink: Math.random() < 0.28,
      waitedMs: waitingAt?.ms ?? 0,
      waitingAt,
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
