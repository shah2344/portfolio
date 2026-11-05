/*
 * The tab icon's frames, rendered from the homepage character's rig at 32px by
 * `scripts/build-favicon.ts` and committed to `public/images/favicon/`. `rest`
 * is the same image as `src/app/favicon.ico`, so swapping to it never shows a
 * change.
 */
export const FAVICON_FRAME_DIR = "/images/favicon";

const HELLO_FRAMES = 10;
/** The greeting performance sampled once per this many milliseconds. */
export const FAVICON_HELLO_STEP_MS = 85;

export type FaviconFrame =
  "rest" | `blink-${1 | 2}` | `doze-${1 | 2 | 3 | 4 | 5}` | `hello-${number}`;
/** A frame and how long it holds before the next; the last frame stays. */
export type FaviconStep = readonly [frame: FaviconFrame, holdMs: number];

export const FAVICON_BLINK: readonly FaviconStep[] = [
  ["blink-1", 60],
  ["blink-2", 70],
  ["blink-1", 60],
  ["rest", 0],
];

// Hidden tabs run timers about once a second at best, so dozing off is drawn
// in whole-second beats: a moment awake, then the nap's lids getting heavier.
export const FAVICON_DOZE: readonly FaviconStep[] = [
  ["rest", 1000],
  ["doze-1", 1000],
  ["doze-2", 1000],
  ["doze-3", 1000],
  ["doze-4", 1000],
  ["doze-5", 0],
];

export const FAVICON_HELLO: readonly FaviconStep[] = [
  ...Array.from({ length: HELLO_FRAMES }, (_, i): FaviconStep => [
    `hello-${i + 1}`,
    FAVICON_HELLO_STEP_MS,
  ]),
  ["rest", 0],
];

export const FAVICON_FRAMES: readonly FaviconFrame[] = [
  ...new Set(
    [FAVICON_BLINK, FAVICON_DOZE, FAVICON_HELLO].flatMap((steps) =>
      steps.map(([frame]) => frame),
    ),
  ),
];

/** Blinks land irregularly, between 3.5 and 7 seconds apart. */
export const nextFaviconBlink = (random: number) => 3500 + random * 3500;
