/**
 * Builds the two layers the Humi card's brand mark reveals between.
 *
 *   bun run scripts/build-humi-mark.ts
 *
 * Both layers come out of one source — `scripts/source/humi-mark.svg`, the
 * Figma export of the Humi glyph — so they occupy one coordinate space and
 * cannot drift apart. The mark is 42px wide on the card; half a unit of slip
 * there is a visible blur. The gradient comes from
 * `scripts/source/humi-mark-fill.png`, the full-size artwork, because the Figma
 * export only has a thumbnail of it.
 *
 * Outputs, all committed:
 *   public/media/humi/logo.svg          the glyph for brand tiles
 *   public/media/humi/mark.svg          the same glyph (reveal layer)
 *   public/media/humi/mark-outline.svg  the same glyph as hairlines
 *   public/media/humi/mark-button.svg          the finished 72px icon tile
 *   public/media/humi/mark-button-outline.svg  its square editor outline
 */

import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "scripts/source/humi-mark.svg";
const FILL = "scripts/source/humi-mark-fill.png";
const OUT_LOGO = "public/media/humi/logo.svg";
const OUT_FINISHED = "public/media/humi/mark.svg";
const OUT_OUTLINE = "public/media/humi/mark-outline.svg";
const OUT_BUTTON_FINISHED = "public/media/humi/mark-button.svg";
const OUT_BUTTON_OUTLINE = "public/media/humi/mark-button-outline.svg";

const PRECISION = 2;

/** The colour of the hairline the outline layers are drawn in. */
const OUTLINE_STROKE = "#1174d6";
/**
 * A unit is 0.77px at the size the card draws this, so a stroke of 1 lands on
 * a sub-pixel hairline.
 */
const OUTLINE_WIDTH = 1;

const ROOT = 'width="55" height="76" viewBox="0 0 55 76"';
const BUTTON_ROOT = 'width="72" height="72" viewBox="0 0 72 72"';
const BUTTON_SIZE = 72;
const GLYPH_HEIGHT = BUTTON_SIZE * 0.81;
const GLYPH_SCALE = GLYPH_HEIGHT / 76;
const GLYPH_WIDTH = 55 * GLYPH_SCALE;
const GLYPH_X = (BUTTON_SIZE - GLYPH_WIDTH) / 2;
const GLYPH_Y = (BUTTON_SIZE - GLYPH_HEIGHT) / 2;

function round(value: string): string {
  return value.replace(/-?\d*\.\d+(?:[eE]-?\d+)?/g, (n) =>
    String(Number(Number(n).toFixed(PRECISION))),
  );
}

/** The `d` of the nth `<path>` in document order. */
function pathData(svg: string, index: number): string {
  const path = [...svg.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)][index]?.[1];
  if (path === undefined) throw new Error(`no path at index ${index}`);
  return round(path);
}

const source = await readFile(SOURCE, "utf8");

/* --- Finished layer ------------------------------------------------------ */

/*
 * The glyph's silhouette path is filled directly with the gradient. It is not
 * masked. WebKit draws an SVG `<mask>` into a buffer at the image's 1× size and
 * scales that up, so a masked glyph smears on every screen above 1×. A path
 * fill is drawn at device resolution, so the ring edges stay sharp everywhere.
 *
 * The gradient comes from the supplied artwork. The artwork has the rings
 * already cut out, so the gaps between them (and the H) are emptied and then
 * filled in from the neighbouring colour. The result is one continuous colour
 * field that the path can take any edge from. A smooth field needs very few
 * pixels, and the path supplies all of the edge detail.
 */
const FIELD_WIDTH = 64;
const FIELD_HEIGHT = 88;

/** An in-bounds typed-array read, typed as the number it always is. */
function at(values: ArrayLike<number>, index: number): number {
  return values[index] ?? 0;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

async function colourField(file: string): Promise<Buffer> {
  const { data, info } = await sharp(await readFile(file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cells = FIELD_WIDTH * FIELD_HEIGHT;
  const sum = new Float64Array(cells * 3);
  const weight = new Float64Array(cells);

  for (let y = 0; y < info.height; y++) {
    const cy = Math.floor((y * FIELD_HEIGHT) / info.height);
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const rgb = [at(data, i), at(data, i + 1), at(data, i + 2)];
      // The black H is drawn as its own path; it is not part of the gradient.
      if (at(rgb, 0) + at(rgb, 1) + at(rgb, 2) < 120) continue;
      const w = at(data, i + 3) / 255;
      const c = cy * FIELD_WIDTH + Math.floor((x * FIELD_WIDTH) / info.width);
      for (let k = 0; k < 3; k++) {
        sum[c * 3 + k] = at(sum, c * 3 + k) + at(rgb, k) * w;
      }
      weight[c] = at(weight, c) + w;
    }
  }

  const field = new Float64Array(cells * 3);
  const known = new Uint8Array(cells);
  for (let c = 0; c < cells; c++) {
    if (at(weight, c) < 0.5) continue;
    for (let k = 0; k < 3; k++) {
      field[c * 3 + k] = at(sum, c * 3 + k) / at(weight, c);
    }
    known[c] = 1;
  }

  // Grow the known colour outward one ring of cells at a time until every
  // cell has a value.
  for (let pending = cells; pending > 0;) {
    const next = known.slice();
    pending = 0;
    for (let y = 0; y < FIELD_HEIGHT; y++) {
      for (let x = 0; x < FIELD_WIDTH; x++) {
        const c = y * FIELD_WIDTH + x;
        if (at(known, c)) continue;
        const acc = [0, 0, 0];
        let n = 0;
        for (const [dx, dy] of NEIGHBOURS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= FIELD_WIDTH || ny >= FIELD_HEIGHT)
            continue;
          const nc = ny * FIELD_WIDTH + nx;
          if (!at(known, nc)) continue;
          for (let k = 0; k < 3; k++)
            acc[k] = at(acc, k) + at(field, nc * 3 + k);
          n++;
        }
        if (n === 0) {
          pending++;
          continue;
        }
        for (let k = 0; k < 3; k++) field[c * 3 + k] = at(acc, k) / n;
        next[c] = 1;
      }
    }
    known.set(next);
  }

  return sharp(Buffer.from(Uint8ClampedArray.from(field)), {
    raw: { width: FIELD_WIDTH, height: FIELD_HEIGHT, channels: 3 },
  })
    .blur(0.8)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const field = await colourField(FILL);

const finished =
  `<svg ${ROOT} fill="none" xmlns="http://www.w3.org/2000/svg"` +
  ` xmlns:xlink="http://www.w3.org/1999/xlink">` +
  `<defs><pattern id="humi-gradient" patternUnits="userSpaceOnUse"` +
  ` width="55" height="76">` +
  `<image width="55" height="76" preserveAspectRatio="none"` +
  ` xlink:href="data:image/png;base64,${field.toString("base64")}"/>` +
  `</pattern></defs>` +
  `<path d="${pathData(source, 0)}" fill="url(#humi-gradient)"/>` +
  `<path d="${pathData(source, 2)}" fill="black"/>` +
  `</svg>\n`;

await writeFile(OUT_FINISHED, finished);
await writeFile(OUT_LOGO, finished);

/* --- Outline layer ------------------------------------------------------- */

/*
 * Two paths carry the whole drawing: the glyph's silhouette, which the source
 * uses as a luminance mask, and the counter-drawn H that sits on top of it.
 * Stroked rather than filled they become the wireframe — the same contour, so
 * the reveal is the mark gaining its gradient rather than two marks swapping.
 */
const outline =
  `<svg ${ROOT} fill="none" xmlns="http://www.w3.org/2000/svg"` +
  ` stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"` +
  ` stroke-linejoin="round" stroke-linecap="round">` +
  `<path d="${pathData(source, 0)}"/>` +
  `<path d="${pathData(source, 2)}"/>` +
  `</svg>\n`;

await writeFile(OUT_OUTLINE, outline);

/* --- Icon-button layers ------------------------------------------------- */

const finishedBody = finished.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)?.[1];
if (!finishedBody) throw new Error("no finished mark body");

const placement =
  `translate(${round(String(GLYPH_X))} ${round(String(GLYPH_Y))}) ` +
  `scale(${round(String(GLYPH_SCALE))})`;

/* The white surface and material shadow remain CSS so they can acquire the
 * current radius. Both SVG layers only carry pixels that genuinely change. */
const buttonFinished =
  `<svg ${BUTTON_ROOT} fill="none" xmlns="http://www.w3.org/2000/svg"` +
  ` xmlns:xlink="http://www.w3.org/1999/xlink">` +
  `<g transform="${placement}">${finishedBody}</g>` +
  `</svg>\n`;

const buttonOutline =
  `<svg ${BUTTON_ROOT} fill="none" xmlns="http://www.w3.org/2000/svg"` +
  ` stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"` +
  ` stroke-linejoin="miter" stroke-linecap="square">` +
  `<g transform="${placement}">` +
  `<path d="${pathData(source, 0)}"/>` +
  `<path d="${pathData(source, 2)}"/>` +
  `</g></svg>\n`;

await writeFile(OUT_BUTTON_FINISHED, buttonFinished);
await writeFile(OUT_BUTTON_OUTLINE, buttonOutline);

const kb = (text: string) => `${Math.round(Buffer.byteLength(text) / 1024)} KB`;
console.log(`${SOURCE} — ${kb(source)}`);
console.log(`${OUT_FINISHED}, ${OUT_LOGO} — ${kb(finished)}`);
console.log(`${OUT_OUTLINE} — ${kb(outline)}`);
console.log(`${OUT_BUTTON_FINISHED} — ${kb(buttonFinished)}`);
console.log(`${OUT_BUTTON_OUTLINE} — ${kb(buttonOutline)}`);
