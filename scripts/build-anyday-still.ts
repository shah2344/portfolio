/**
 * Builds the still the AnyDay card keeps behind its film.
 *
 *   bun run scripts/build-anyday-still.ts
 *
 * The card shows the film's top strip hazed through a blur ramp, with a hazed
 * reflection of it rising above. This bakes both from the film's opening
 * frame into one image, two film heights tall:
 *
 * - below, the film's first frame, its top strip blended through the steps
 *   in `film-haze.ts`;
 * - above, its reflection: the same frame flipped, hazed through the still
 *   ramp in `film-haze.ts`, and faded out into the tile.
 *
 * The film plays over it and fades in once it has a frame, so nothing jumps or
 * sharpens when it takes over; the reflection stays visible above the film
 * throughout.
 *
 * The source is the film's frame at 0s, pulled from `payout.mp4` with
 * AVFoundation (exact time, no tolerance), since that is where the card's
 * film starts.
 *
 * Output, committed:
 *   public/media/anyday/anyday-card-still.webp
 */

import sharp, { type Sharp } from "sharp";

import {
  HAZE_STEPS,
  REFLECTION_FADE,
  STILL_BASE_BLUR,
  STILL_STEPS,
  VEIL,
} from "../src/components/home/case-study-tiles/film-haze";

const SOURCE = "scripts/source/anyday-film-first-frame.png";
const OUT = "public/media/anyday/anyday-card-still.webp";

/** The film's own size; the still is two of it stacked. */
const WIDTH = 1620;
const HEIGHT = 1080;

/*
 * The ramps' blurs are CSS pixels on the card, where the film is drawn about
 * 810px wide, so each is worth two of this still's pixels.
 */
const PIXELS_PER_CSS_PX = WIDTH / 810;

/** Where the reflection fades into the tile, in film heights up from the
    join. */
const FADE = {
  solid: (REFLECTION_FADE.solid - VEIL) / 100,
  clear: (REFLECTION_FADE.clear - VEIL) / 100,
};

const channels = 4;
const rowBytes = WIDTH * channels;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const frame = sharp(SOURCE)
  .resize(WIDTH, HEIGHT, { fit: "fill" })
  .removeAlpha()
  .ensureAlpha();

const raw = (image: Sharp) =>
  image
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data }) => data);

const blurred = (image: Sharp, blur: number) =>
  raw(blur > 0 ? image.clone().blur(blur * PIXELS_PER_CSS_PX) : image);

/** Blends each step over `base`, row by row, by its ramp at that row. */
function blendSteps(
  base: Buffer,
  steps: { pixels: Buffer; alpha: (row: number) => number }[],
) {
  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * rowBytes;
    for (const { pixels, alpha: rampAt } of steps) {
      const alpha = rampAt(y);
      if (alpha === 0) continue;
      for (let i = start; i < start + rowBytes; i += 1) {
        base[i] = Math.round(base[i]! * (1 - alpha) + pixels[i]! * alpha);
      }
    }
  }
  return base;
}

// The film's frame: sharp, hazed across its top strip.
const filmRamp = (from: number, to: number) => (y: number) => {
  // A position on the ramp, in film heights up from its floor.
  const position = VEIL - ((y + 0.5) / HEIGHT) * 100;
  return clamp((position - from) / (to - from));
};
const film = blendSteps(
  Buffer.from(await raw(frame)),
  await Promise.all(
    HAZE_STEPS.filter((step) => step.from < VEIL).map(async (step) => ({
      pixels: await blurred(frame, step.blur),
      alpha: filmRamp(step.from, step.to),
    })),
  ),
);

// Its reflection, flipped so the frame's top row meets the join.
const flipped = frame.clone().flip();
const heightAboveJoin = (y: number) => 1 - (y + 0.5) / HEIGHT;
const reflection = blendSteps(
  Buffer.from(await blurred(flipped, STILL_BASE_BLUR)),
  await Promise.all(
    STILL_STEPS.map(async (step) => ({
      pixels: await blurred(flipped, step.blur),
      alpha: (y: number) =>
        clamp((heightAboveJoin(y) * 100 - step.from) / (step.to - step.from)),
    })),
  ),
);
for (let y = 0; y < HEIGHT; y += 1) {
  const fade = clamp(
    (FADE.clear - heightAboveJoin(y)) / (FADE.clear - FADE.solid),
  );
  for (let i = y * rowBytes; i < (y + 1) * rowBytes; i += channels) {
    reflection[i + 3] = Math.round(255 * fade);
  }
}

await sharp(Buffer.concat([reflection, film]), {
  raw: { width: WIDTH, height: HEIGHT * 2, channels },
})
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toFile(OUT);

console.log(`wrote ${OUT}`);
