/**
 * Derives each work card's wash colour from its own image, so the scrim
 * gradient blends into the photograph instead of fading to a fixed cream or
 * violet that only ever suited one of them.
 *
 * Run after adding or replacing a card image:
 *
 *   bun run scripts/extract-card-colors.ts
 *
 * The result is committed as a generated module, so nothing decodes images at
 * request time or in the browser.
 */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const OUT = "src/content/projects/card-colors.ts";

/**
 * The card's own geometry, from the design: a 676×364 frame whose bottom 152px
 * (64 top padding + a 56px mark + 32 bottom) carries the scrim. The image is
 * laid in with `object-fit: cover`, so the pixels behind the gradient are a
 * centred crop of the source — not its own bottom edge. Sampling the file
 * naively would blend toward a colour the card never actually shows.
 */
const CARD_WIDTH = 676;
const CARD_HEIGHT = 364;
const SCRIM_HEIGHT = 152;

/**
 * A mean would average a colourful photograph into mud. Bucketing into a coarse
 * RGB grid and taking the most populated cell finds the colour that actually
 * dominates the band, then the bucket's own pixels are averaged so the answer
 * is a real colour rather than the cell's midpoint.
 */
const BUCKET_BITS = 4;

/**
 * The wash is the band's deep shadow tone, not its most common colour. On a
 * low-key photograph the most common colour is black, and a gradient into
 * black reads as a scrim laid over the image. Keeping to dark pixels that
 * still carry a hue lands on the photograph's own shadow — the espresso of a
 * counter rather than the void under it — so the footer falls into the image.
 * The window is WCAG-free relative luminance on the 0–255 scale.
 */
const DEEP_LUMA = { min: 20, max: 48 };
/** Max minus min channel: below this a pixel is effectively grey. */
const DEEP_MIN_CHROMA = 12;

type Rgb = { r: number; g: number; b: number };

/**
 * A card either names the photograph its wash is sampled from, or — when it
 * carries a drawing on a designed ground rather than a photograph — names its
 * ink outright. Humi's is the darkest hued tone in its People screen, the slate
 * of the table's own text: the rule the sampler applies, applied by hand. Listed
 * here all the same so every card's type colour comes from the one `tone`.
 */
const CARDS: readonly ({ id: string } & ({ file: string } | { ink: Rgb }))[] = [
  { id: "anyday", file: "public/media/anyday/anyday-card-bg.jpg" },
  { id: "humi", ink: { r: 24, g: 32, b: 39 } },
  { id: "montran", file: "public/media/montran/dos.png" },
];

/** The source rect `object-fit: cover` actually shows behind the scrim. */
function scrimCrop(width: number, height: number) {
  const scale = Math.max(CARD_WIDTH / width, CARD_HEIGHT / height);
  // The source area the card frame maps to, centred on both axes.
  const visibleW = Math.min(width, CARD_WIDTH / scale);
  const visibleH = Math.min(height, CARD_HEIGHT / scale);
  const left = Math.round((width - visibleW) / 2);
  const top = Math.round((height - visibleH) / 2);

  const bandH = Math.max(
    1,
    Math.round((SCRIM_HEIGHT / CARD_HEIGHT) * visibleH),
  );

  return {
    left,
    top: Math.round(top + visibleH - bandH),
    width: Math.max(1, Math.round(visibleW)),
    height: bandH,
  };
}

async function washColor(file: string): Promise<Rgb> {
  const image = sharp(file);
  const { width = 0, height = 0 } = await image.metadata();
  if (!width || !height)
    throw new Error(`Could not read dimensions of ${file}`);

  const { data, info } = await image
    .extract(scrimCrop(width, height))
    // Downsample first: the dominant hue survives, and this keeps the scan
    // over thousands of pixels rather than millions.
    .resize(160, null, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const shift = 8 - BUCKET_BITS;
  const buckets = new Map<
    number,
    { count: number; r: number; g: number; b: number }
  >();

  const deep = new Map<
    number,
    { count: number; r: number; g: number; b: number }
  >();

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;

    const key =
      ((r >> shift) << (BUCKET_BITS * 2)) |
      ((g >> shift) << BUCKET_BITS) |
      (b >> shift);

    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (
      luma >= DEEP_LUMA.min &&
      luma <= DEEP_LUMA.max &&
      chroma >= DEEP_MIN_CHROMA
    ) {
      const shade = deep.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      shade.count += 1;
      shade.r += r;
      shade.g += g;
      shade.b += b;
      deep.set(key, shade);
    }
  }

  // A band with no hued shadow at all (a flat or bright image) falls back to
  // its dominant colour, which is what every card used before.
  const pool = deep.size > 0 ? deep : buckets;
  let winner: { count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of pool.values()) {
    if (!winner || bucket.count > winner.count) winner = bucket;
  }
  if (!winner) throw new Error(`No pixels sampled from ${file}`);

  return {
    r: Math.round(winner.r / winner.count),
    g: Math.round(winner.g / winner.count),
    b: Math.round(winner.b / winner.count),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/**
 * WCAG relative luminance, used only to choose between black and white type on
 * the wash — the same test the contrast ratio is built from.
 */
function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const entries = await Promise.all(
  CARDS.map(async (card) => {
    const { id } = card;
    const rgb = "ink" in card ? card.ink : await washColor(card.file);
    return {
      id,
      hex: toHex(rgb),
      rgb: `${rgb.r} ${rgb.g} ${rgb.b}`,
      tone: luminance(rgb) > 0.4 ? ("light" as const) : ("dark" as const),
    };
  }),
);

const body = entries
  .map(
    ({ id, hex, rgb, tone }) =>
      `  "${id}": { hex: "${hex}", rgb: "${rgb}", tone: "${tone}" },`,
  )
  .join("\n");

await writeFile(
  OUT,
  `// Generated by scripts/extract-card-colors.ts — do not edit by hand.
// Each value is the deep shadow tone of the bottom band of that card's image,
// so the scrim gradient fades into the photograph rather than away from it.

export type CardWash = {
  /** The wash colour, for reference and for non-gradient uses. */
  hex: string;
  /** Space-separated channels, for \`rgb(var(--x) / <alpha>)\` in CSS. */
  rgb: string;
  /** Whether type on this wash should be dark or light. */
  tone: "light" | "dark";
};

export const cardWashes = {
${body}
} as const satisfies Record<string, CardWash>;

/** Neutral wash for a card whose image has not been sampled yet. */
const FALLBACK: CardWash = { hex: "#ffffff", rgb: "255 255 255", tone: "light" };

export function cardWash(id: string): CardWash {
  return (cardWashes as Record<string, CardWash>)[id] ?? FALLBACK;
}
`,
  "utf8",
);

console.table(entries);
console.log(`\nWrote ${OUT}`);
