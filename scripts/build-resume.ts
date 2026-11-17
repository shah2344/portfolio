/**
 * Prints `scripts/source/resume.html` to `public/Muhammad-Shahid-Resume.pdf`.
 *
 *   bun run scripts/build-resume.ts
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

const SOURCE = resolve("scripts/source/resume.html");
const OUT = resolve("public/Muhammad-Shahid-Resume.pdf");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(SOURCE).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: OUT, format: "A4", printBackground: true });
  console.log(`Wrote ${OUT}`);
} finally {
  await browser.close();
}
