import { describe, expect, it } from "bun:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCharacterBackground } from "../../src/components/home/character/background";
import {
  CHARACTER_BACKGROUNDS,
  CHARACTER_SHUFFLE_LENGTH,
  characterBackgroundColors,
  characterBackgroundScript,
} from "../../src/components/home/character/backgrounds";

function choose(storage: {
  getItem(): string | null;
  setItem(k: string, v: string): void;
}) {
  const dataset: Record<string, string> = {};
  // No Image, canvas or network APIs: choosing a seed in <head> must not
  // load the renderer or request the retired static background images.
  runInNewContext(characterBackgroundScript, {
    document: { documentElement: { dataset } },
    sessionStorage: storage,
  });
  return dataset;
}

describe("generated character backgrounds", () => {
  it("chooses a different colour on reload and keeps the reveal seeds distinct", () => {
    let previous = String(CHARACTER_BACKGROUNDS[0]);
    for (let load = 0; load < 30; load++) {
      const before = previous;
      const dataset = choose({
        getItem: () => previous,
        setItem: (_key, value) => {
          previous = value;
        },
      });
      expect(String(dataset.characterBackground)).not.toBe(before);
      expect(String(dataset.characterBackground)).toBe(previous);
      expect(CHARACTER_BACKGROUNDS).toContain(Number(previous));
      const shuffle = dataset.characterShuffle!.split(",").map(Number);
      expect(shuffle).toHaveLength(CHARACTER_SHUFFLE_LENGTH);
      expect(new Set(shuffle).size).toBe(shuffle.length);
      expect(shuffle).not.toContain(Number(previous));
      for (const seed of shuffle) expect(CHARACTER_BACKGROUNDS).toContain(seed);
    }
  });

  it("still selects a valid colour when session storage is blocked", () => {
    const unavailable = () => {
      throw new Error("Storage unavailable");
    };
    const dataset = choose({ getItem: unavailable, setItem: unavailable });
    expect(CHARACTER_BACKGROUNDS).toContain(
      Number(dataset.characterBackground),
    );
    expect(dataset.characterShuffle!.split(",")).toHaveLength(
      CHARACTER_SHUFFLE_LENGTH,
    );
  });

  it("gives every material its own curated palette, with no neutral stops", () => {
    for (const seed of CHARACTER_BACKGROUNDS) {
      const colors = characterBackgroundColors(seed);
      expect(colors).toHaveLength(3);
      // No black, white or grey: every stop is saturated and mid-light.
      for (const color of colors) {
        const [r, g, b] = [1, 3, 5].map(
          (at) => parseInt(color.slice(at, at + 2), 16) / 255,
        );
        const max = Math.max(r!, g!, b!);
        const min = Math.min(r!, g!, b!);
        const lightness = (max + min) / 2;
        const saturation = (max - min) / (1 - Math.abs(2 * lightness - 1));
        expect(saturation).toBeGreaterThanOrEqual(0.45);
        expect(lightness).toBeGreaterThanOrEqual(0.25);
        expect(lightness).toBeLessThanOrEqual(0.85);
      }
    }
  });

  it("server-renders the SVG container without touching browser canvas APIs", () => {
    const html = renderToStaticMarkup(createElement(HomeCharacterBackground));
    expect(html).not.toContain("<image");
    expect(html).toContain('data-character-background=""');
    expect(html).not.toContain("href=");
    expect(html).not.toContain("<canvas");
  });
});
