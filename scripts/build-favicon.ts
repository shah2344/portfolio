/**
 * Renders the tab icon and its live-favicon frames from the homepage
 * character's rig, so the icons always match the character's current faces.
 *
 *   bun run dev                                  (in another terminal)
 *   bun run scripts/build-favicon.ts [http://localhost:3000]
 *
 * Each frame's pose is sampled from the rig here; headless Chromium then draws
 * it through the homepage character's own SVG, with its computed styles
 * inlined, in light mode with reduced motion so nothing is mid-transition. The
 * material is one fixed mesh seed rendered in sRGB, since icons are sRGB PNGs.
 *
 * Outputs, all committed:
 *   public/images/favicon/<frame>.png  32px frames swapped in by LiveFavicon
 *   src/app/favicon.ico                the resting face at 16, 32 and 48px
 *   src/app/icon.png                   the resting face at 192px
 *   src/app/apple-icon.png             the resting face on a light 180px tile
 */

import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

import {
  FAVICON_FRAME_DIR,
  FAVICON_FRAMES,
  FAVICON_HELLO_STEP_MS,
} from "../src/components/favicon/live-favicon-frames";
import { characterGeometry } from "../src/components/home/character/geometry";
import { samplePerformance } from "../src/components/home/character/performances";
import {
  restingPose,
  type CharacterPose,
} from "../src/components/home/character/pose";

const URL_BASE = process.argv[2] ?? "http://localhost:3000";
/** A violet-to-blue mesh that keeps the eyes legible at 16px. */
const MATERIAL_SEED = 35;
/** The nap sampled through its lead-in: lids grow heavy, then shut. */
const DOZE_MS = [400, 800, 1200, 1700, 3000];
const ICO_SIZES = [16, 32, 48];
/*
 * Icons are tiny, so the homepage's soft lower edge is scaled down and given
 * room: at full strength it runs past the canvas and is cut off flat.
 */
const DIFFUSION_SCALE = 0.2;
/*
 * Viewbox units added around the homepage crop, most of them below, where the
 * softened edge trails and the nap's nod lowers the head; the greeting lifts
 * it toward the top. Top plus bottom equals both sides together, so the
 * canvas stays square.
 */
const MARGIN = { top: 2, side: 2.5, bottom: 3 };
/** Drawn this many times larger, then downsampled, for clean small edges. */
const SUPERSAMPLE = 8;
const APPLE = { size: 180, face: 146, x: 17, y: 22, background: "#fcfcfc" };

function framePose(frame: string): CharacterPose {
  const rest = restingPose();
  const [kind, step] = frame.split("-");
  const index = Number(step) - 1;
  if (kind === "blink") return { ...rest, closure: [0.5, 0.97][index]! };
  // The middle of each beat, so the first and last differ from rest.
  if (kind === "hello")
    return samplePerformance(
      "greeting",
      (index + 0.5) * FAVICON_HELLO_STEP_MS,
      rest,
    );
  if (kind === "doze") return samplePerformance("nap", DOZE_MS[index]!, rest);
  return rest;
}

/** PNG-in-ICO: every image entry is a complete PNG file. */
function ico(images: { size: number; png: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const bundle = await Bun.build({
  entrypoints: [Bun.resolveSync("@outpacelabs/avatars", process.cwd())],
  target: "browser",
  format: "esm",
});
const avatars = await bundle.outputs[0]!.text();

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  await page.goto(URL_BASE);
  await page.waitForSelector("[data-treatment] svg [data-eye]");
  await page.evaluate(
    async ({ avatars, seed, diffusion, margin }) => {
      const mesh = await import(
        URL.createObjectURL(new Blob([avatars], { type: "text/javascript" }))
      );
      const material = mesh.gradientToDataURL(seed, {
        size: 256,
        displaySize: (80 * 44) / 58,
        pattern: "mesh",
        p3: false,
      });
      const source = document.querySelector("[data-treatment] svg")!;
      const svg = source.cloneNode(true) as SVGSVGElement;
      const properties = [
        "fill",
        "fill-opacity",
        "stroke",
        "stroke-opacity",
        "stroke-width",
        "opacity",
        "display",
        "visibility",
        "filter",
        "mix-blend-mode",
        "stop-color",
        "stop-opacity",
        "color",
        "mask",
        "clip-path",
        "transform",
        "transform-origin",
      ];
      const from = [source, ...source.querySelectorAll("*")];
      const to = [svg, ...svg.querySelectorAll("*")];
      from.forEach((element, i) => {
        const style = getComputedStyle(element);
        to[i]!.setAttribute(
          "style",
          properties.map((p) => `${p}:${style.getPropertyValue(p)}`).join(";"),
        );
      });
      const background = svg.querySelector("[data-character-background]")!;
      background.setAttribute("style", "opacity:1;filter:none");
      background.innerHTML = `<g><g data-character-material=""><image href="${material}" x="-8" y="-8" width="80" height="80" preserveAspectRatio="xMidYMid slice"/></g></g>`;
      for (const image of svg.querySelectorAll("image")) {
        const href = image.getAttribute("href")!;
        if (href.startsWith("data:")) continue;
        const blob = await (await fetch(href)).blob();
        image.setAttribute(
          "href",
          await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          }),
        );
      }
      svg
        .querySelectorAll('filter[id$="-diffusion"] feGaussianBlur')
        .forEach((blur) =>
          blur.setAttribute(
            "stdDeviation",
            String(Number(blur.getAttribute("stdDeviation")) * diffusion),
          ),
        );
      const [x, y, width, height] = svg
        .getAttribute("viewBox")!
        .split(" ")
        .map(Number);
      svg.setAttribute(
        "viewBox",
        [
          x! - margin.side,
          y! - margin.top,
          width! + 2 * margin.side,
          height! + margin.top + margin.bottom,
        ].join(" "),
      );
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.removeAttribute("class");
      (window as unknown as { faviconTemplate: string }).faviconTemplate =
        new XMLSerializer().serializeToString(svg);
    },
    {
      avatars,
      seed: MATERIAL_SEED,
      diffusion: DIFFUSION_SCALE,
      margin: MARGIN,
    },
  );

  const render = (pose: CharacterPose, size: number) =>
    page
      .evaluate(
        async ({ geometry, size }) => {
          const template = (window as unknown as { faviconTemplate: string })
            .faviconTemplate;
          const svg = new DOMParser().parseFromString(
            template,
            "image/svg+xml",
          ).documentElement;
          const set = (selector: string, d: string, root: Element = svg) =>
            root
              .querySelectorAll(selector)
              .forEach((path) => path.setAttribute("d", d));
          set("[data-shell], [data-glass-edge]", geometry.head);
          set("[data-mouth]", geometry.mouth);
          svg.querySelectorAll("[data-eye]").forEach((eye, i) => {
            const shape = geometry.eyes[i]!;
            set(
              "[data-aperture], [data-eye-outline], [data-eye-fill], [data-eye-rim], [data-eye-rim-mask]",
              shape.aperture,
              eye,
            );
            set("[data-upper]", shape.upper, eye);
            set("[data-lower]", shape.lower, eye);
            set("[data-pupil]", shape.pupil, eye);
          });
          svg.setAttribute("width", String(size));
          svg.setAttribute("height", String(size));
          const image = new Image();
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src =
              "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(new XMLSerializer().serializeToString(svg));
          });
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          canvas.getContext("2d")!.drawImage(image, 0, 0, size, size);
          return canvas.toDataURL("image/png").split(",")[1]!;
        },
        {
          geometry: characterGeometry(pose, "filled"),
          size: size * SUPERSAMPLE,
        },
      )
      .then((base64) =>
        sharp(Buffer.from(base64, "base64"))
          .resize(size, size, { kernel: "lanczos3" })
          .png()
          .toBuffer(),
      );

  for (const frame of FAVICON_FRAMES) {
    await writeFile(
      `public${FAVICON_FRAME_DIR}/${frame}.png`,
      await render(framePose(frame), 32),
    );
  }
  const rest = restingPose();
  await writeFile(
    "src/app/favicon.ico",
    ico(
      await Promise.all(
        ICO_SIZES.map(async (size) => ({
          size,
          png: await render(rest, size),
        })),
      ),
    ),
  );
  await writeFile("src/app/icon.png", await render(rest, 192));
  await sharp({
    create: {
      width: APPLE.size,
      height: APPLE.size,
      channels: 4,
      background: APPLE.background,
    },
  })
    .composite([
      { input: await render(rest, APPLE.face), left: APPLE.x, top: APPLE.y },
    ])
    .png()
    .toFile("src/app/apple-icon.png");
  console.log(`Rendered ${FAVICON_FRAMES.length} frames and the app icons.`);
} finally {
  await browser.close();
}
