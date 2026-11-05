/*
 * The film's blur ramp, as `scripts/build-anyday-still.ts` bakes it into the
 * card's still. That script is the only thing that reads this file.
 *
 * It does not start at the join. It starts at nothing inside the film,
 * `VEIL` below its top edge — the strip of brick wall above the product
 * window — and climbs up through the join, so there is no line anywhere where
 * sharp meets soft: the film is already softening before it ends, and the
 * reflection above carries on from there. It is steep and heavy, because the
 * reflection is the film upside down; left anywhere near sharp it reads as a
 * mirror image rather than as the room.
 *
 * Every position is in film heights, measured up from the ramp's floor: 0 is
 * `VEIL` below the join, `VEIL` is the join, `VEIL + 100` the top of the
 * reflection. Each step fades in between `from` and `to` and holds above,
 * painting over the step beneath; `blur` is its radius in CSS pixels on the
 * card. The script bakes only the steps that begin inside the film, since the
 * reflection above the join has its own ramp, below.
 */
export type HazeStep = {
  blur: number;
  from: number;
  to: number;
};

/** How far into the film the ramp begins, in film heights. */
export const VEIL = 14;

export const HAZE_STEPS: readonly HazeStep[] = [
  { blur: 2, from: 0, to: 4 },
  { blur: 4, from: 4, to: 8 },
  { blur: 8, from: 8, to: 13 },
  { blur: 16, from: 13, to: 20 },
  { blur: 32, from: 20, to: 30 },
  { blur: 48, from: 30, to: 44 },
];

/** Where the reflection fades into the tile, measured the same way. */
export const REFLECTION_FADE = { solid: VEIL + 28, clear: VEIL + 76 };

/*
 * The reflection's own ramp, baked into the still that stays behind the film
 * (see `scripts/build-anyday-still.ts`). It only exists above the join, so
 * it is measured from there, and its floor is already hazed.
 */
export const STILL_STEPS: readonly {
  blur: number;
  from: number;
  to: number;
}[] = [
  { blur: 16, from: 0, to: 6 },
  { blur: 32, from: 6, to: 16 },
  { blur: 48, from: 16, to: 30 },
];
export const STILL_BASE_BLUR = 8;
