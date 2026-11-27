import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCharacterBackground } from "../../src/components/home/character/background";
import {
  CHARACTER_BACKGROUNDS,
  HOME_CHARACTER_BACKGROUND,
  characterBackgroundColors,
  currentCharacterBackground,
  followingCharacterBackground,
} from "../../src/components/home/character/backgrounds";

describe("generated character backgrounds", () => {
  it("starts every load on the same material, and a tap moves on from it", () => {
    expect(CHARACTER_BACKGROUNDS).toContain(HOME_CHARACTER_BACKGROUND);
    expect(currentCharacterBackground()).toBe(HOME_CHARACTER_BACKGROUND);
    expect(followingCharacterBackground(HOME_CHARACTER_BACKGROUND)).not.toBe(
      HOME_CHARACTER_BACKGROUND,
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
