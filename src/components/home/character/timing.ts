/**
 * The character leads the masthead stagger and greets in its slot. The copy
 * follows on the shared stagger; it never waits for the character to finish.
 */
export const HOME_CHARACTER_TIMING = {
  wakeDelayMs: 120,
  wakeMs: 180,
  greetingDelayMs: 120,
  /** The face holds its greeting gaze until here, then looks around. */
  greetingEndMs: 1100,
  /** The pop-in spring in `entrance.ts`. */
  entranceMs: 720,
  doubleBlinkExtraMs: 240,
} as const;
export type HomeCharacterTiming = {
  -readonly [K in keyof typeof HOME_CHARACTER_TIMING]: number;
};

let arrival:
  | {
      doubleBlink: boolean;
      timing: HomeCharacterTiming;
    }
  | undefined;
/**
 * Chosen only in client effects, once per full load and shared across siblings.
 * Strict Mode replays effects after the opening has ended, so it is kept.
 */
export function homeCharacterArrival() {
  arrival ??= {
    doubleBlink: Math.random() < 0.28,
    timing: { ...HOME_CHARACTER_TIMING },
  };
  return arrival;
}
