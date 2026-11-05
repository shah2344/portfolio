import { describe, expect, it } from "bun:test";
import { createCharacterDizziness } from "../../src/components/home/character/dizziness";
import { characterAttention } from "../../src/components/home/character/gaze";

// The character sits at (500, 300); paths are in screen pixels.
const character = { left: 478, top: 278, width: 44, height: 44 };
type Path = (ms: number) => { x: number; y: number };
function triggers(path: Path, duration: number, hz = 60) {
  const detector = createCharacterDizziness();
  for (let ms = 0; ms <= duration; ms += 1000 / hz) {
    if (detector.track(characterAttention(path(ms), character), ms))
      return true;
  }
  return false;
}
const circle =
  (radius: number, periodMs: number, cx = 500, cy = 300): Path =>
  (ms) => ({
    x: cx + Math.cos((ms / periodMs) * Math.PI * 2) * radius,
    y: cy + Math.sin((ms / periodMs) * Math.PI * 2) * radius,
  });
const shake =
  (amplitude: number, periodMs: number, cx = 500): Path =>
  (ms) => ({
    x: cx + Math.sin((ms / periodMs) * Math.PI * 2) * amplitude,
    y: 300,
  });

describe("character dizziness", () => {
  for (const hz of [30, 60, 120, 240]) {
    it(`notices continuous circles around it at ${hz}Hz`, () => {
      expect(triggers(circle(75, 940), 2400, hz)).toBe(true);
    });
    it(`notices relaxed, wide circles around it at ${hz}Hz`, () => {
      expect(triggers(circle(160, 1800), 4000, hz)).toBe(true);
    });
    it(`notices big loops past the edge of its view at ${hz}Hz`, () => {
      expect(triggers(circle(420, 1600), 4000, hz)).toBe(true);
    });
    it(`notices compact fast circles over its face at ${hz}Hz`, () => {
      expect(triggers(circle(28, 380), 1200, hz)).toBe(true);
    });
    it(`notices fast back-and-forth at ${hz}Hz`, () => {
      expect(triggers(shake(130, 1070), 2400, hz)).toBe(true);
    });
    it(`notices tight, frantic shaking at ${hz}Hz`, () => {
      expect(triggers(shake(35, 240), 1200, hz)).toBe(true);
    });
  }
  it("ignores one fast stroke, however long", () => {
    expect(triggers((ms) => ({ x: 150 + ms * 5, y: 300 }), 150)).toBe(false);
    expect(triggers((ms) => ({ x: ms * 9, y: 320 }), 400, 240)).toBe(false);
  });
  it("ignores a single fast flick there and back", () => {
    expect(
      triggers(
        (ms) => ({ x: 200 + Math.sin((ms / 500) * Math.PI) * 600, y: 300 }),
        500,
        120,
      ),
    ).toBe(false);
  });
  it("ignores separate fast strokes with a pause between them", () => {
    const detector = createCharacterDizziness();
    let fired = false;
    for (const start of [0, 900, 1800]) {
      for (let ms = 0; ms <= 120; ms += 8) {
        const x = (start / 900) % 2 ? 900 - ms * 6 : 150 + ms * 6;
        fired ||= detector.track(
          characterAttention({ x, y: 300 }, character),
          start + ms,
        );
      }
    }
    expect(fired).toBe(false);
  });
  it("ignores slow circles and ordinary back-and-forth adjustments", () => {
    expect(triggers(circle(28, 3000), 8000)).toBe(false);
    expect(triggers(circle(75, 12600), 14000)).toBe(false);
    expect(triggers(shake(60, 3000), 8000)).toBe(false);
    expect(triggers(shake(200, 3000), 8000)).toBe(false);
  });
  it("ignores shaking well outside its view, where the eyes stay pinned", () => {
    expect(triggers(shake(130, 600, 1500), 3000)).toBe(false);
  });
  it("ignores normal straight pointer travel", () => {
    expect(triggers((ms) => ({ x: 100 + ms * 0.7, y: 300 }), 1400)).toBe(false);
  });
  it("ignores tiny frantic jitter", () => {
    expect(
      triggers(
        (ms) => ({ x: 500 + Math.sin(ms) * 6, y: 300 + Math.cos(ms) * 6 }),
        3000,
        240,
      ),
    ).toBe(false);
  });
  it("a pause or reset clears the preceding gesture", () => {
    const detector = createCharacterDizziness();
    const at = (x: number) => characterAttention({ x, y: 300 }, character);
    for (let ms = 0; ms < 700; ms += 16) {
      expect(detector.track(at(500 + Math.sin(ms / 170) * 130), ms)).toBe(
        false,
      );
    }
    expect(detector.track(at(500), 1400)).toBe(false);
    detector.reset();
    expect(detector.track(at(700), 1416)).toBe(false);
  });
});
