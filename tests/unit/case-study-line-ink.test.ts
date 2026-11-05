import { describe, expect, test } from "bun:test";

import {
  advanceLineInkZoom,
  lineInkPointerScale,
  lineInkStep,
} from "../../src/components/motion/case-study-line-ink";

describe("case-study line ink", () => {
  test("only the line crossing the header fades; the following lines keep their ink", () => {
    expect(lineInkStep(196, 32, 164)).toBe(0);
    expect(lineInkStep(192, 32, 164)).toBeGreaterThan(0);
    expect(lineInkStep(164, 32, 164)).toBe(21);
    expect(lineInkStep(228, 32, 164)).toBe(0);
    expect(lineInkStep(148, 32, 164)).toBe(32);
  });

  test("the mobile and desktop header bands produce the same line progress", () => {
    for (const offset of [-40, -16, 0, 16, 40]) {
      expect(lineInkStep(96 + offset, 28, 96)).toBe(
        lineInkStep(164 + offset, 28, 164),
      );
    }
  });

  test("scrolling back restores the line completely, regardless of paragraph length", () => {
    const positions = [220, 180, 164, 148, 120, 148, 164, 180, 220];
    const steps = positions.map((top) => lineInkStep(top, 32, 164));
    expect(steps).toEqual([0, 11, 21, 32, 32, 32, 21, 11, 0]);
  });

  test("a larger root font retains a full clear lead before fading", () => {
    expect(lineInkStep(204, 40, 164, 40)).toBe(0);
    expect(lineInkStep(164, 40, 164, 40)).toBe(21);
    expect(lineInkStep(144, 40, 164, 40)).toBe(32);
  });
});

describe("case-study zoom compensation", () => {
  const metrics = {
    outerWidth: 2380,
    outerHeight: 1300,
    innerWidth: 2380,
    innerHeight: 1213,
    pixelRatio: 2,
  };
  const atZoom = (zoom: number, density = 2) => ({
    ...metrics,
    innerWidth: Math.round(metrics.innerWidth / zoom),
    innerHeight: Math.round(metrics.innerHeight / zoom),
    pixelRatio: density * zoom,
  });

  test("a first measurement always preserves default timing, regardless of viewport shape or DPI", () => {
    for (const pixelRatio of [1, 1.25, 1.5, 1.6, 2, 3]) {
      for (const innerWidth of [390, 800, 1440, 2380]) {
        expect(
          advanceLineInkZoom(undefined, { ...metrics, innerWidth, pixelRatio })
            .scale,
        ).toBe(1);
      }
    }
  });

  test("confirmed zoom changes keep the fade boundary stable and reset exactly to 100%", () => {
    for (const density of [1, 1.25, 1.6, 2, 3]) {
      let state = advanceLineInkZoom(undefined, atZoom(1, density));
      for (const zoom of [1.1, 1.25, 1.5, 1.75, 2, 1.5, 1]) {
        state = advanceLineInkZoom(state, atZoom(zoom, density));
        expect(state.scale).toBeCloseTo(zoom, 5);
        expect(lineInkStep((196 / zoom) * state.scale, 32, 164)).toBe(0);
      }
    }
  });

  test("window resizing and docked panels cannot activate compensation", () => {
    let state = advanceLineInkZoom(undefined, metrics);
    state = advanceLineInkZoom(state, { ...metrics, innerWidth: 1200 });
    expect(state.scale).toBe(1);
    state = advanceLineInkZoom(state, {
      ...metrics,
      outerWidth: 900,
      innerWidth: 900,
    });
    expect(state.scale).toBe(1);
    state = advanceLineInkZoom(state, { ...metrics, innerHeight: 500 });
    expect(state.scale).toBe(1);
  });

  test("changing display density without a matching page reflow isn't zoom", () => {
    let state = advanceLineInkZoom(undefined, metrics);
    state = advanceLineInkZoom(state, { ...metrics, pixelRatio: 1 });
    expect(state.scale).toBe(1);
    state = advanceLineInkZoom(state, { ...metrics, pixelRatio: 2 });
    expect(state.scale).toBe(1);
  });

  test("a calibrated zoom survives reloads but an unrelated display cannot import it", () => {
    const normal = advanceLineInkZoom(undefined, metrics);
    const zoomed = advanceLineInkZoom(normal, atZoom(1.5));
    expect(advanceLineInkZoom(zoomed, atZoom(1.5), true).scale).toBe(1.5);
    expect(
      advanceLineInkZoom(
        zoomed,
        { ...metrics, outerWidth: 1920, innerWidth: 1920, pixelRatio: 1 },
        true,
      ).scale,
    ).toBe(1);
  });

  test("returning to 100% restores default timing even after the window was resized", () => {
    const normal = advanceLineInkZoom(undefined, metrics);
    const zoomed = advanceLineInkZoom(normal, atZoom(1.5));
    expect(
      advanceLineInkZoom(zoomed, {
        ...metrics,
        outerWidth: 1920,
        innerWidth: 1920,
      }).scale,
    ).toBe(1);
  });

  test("native pointer coordinates calibrate an already-zoomed first visit without display guesses", () => {
    const start = { clientX: 100, clientY: 200, screenX: 150, screenY: 387 };
    for (const zoom of [1, 1.1, 1.25, 1.5, 1.75, 2]) {
      expect(
        lineInkPointerScale(start, {
          clientX: 300,
          clientY: 350,
          screenX: start.screenX + 200 * zoom,
          screenY: start.screenY + 150 * zoom,
        }),
      ).toBe(zoom);
    }
  });

  test("tiny or inconsistent pointer deltas cannot change calibration", () => {
    const start = { clientX: 100, clientY: 200, screenX: 100, screenY: 200 };
    expect(
      lineInkPointerScale(start, { ...start, clientX: 110, screenX: 120 }),
    ).toBeUndefined();
    expect(
      lineInkPointerScale(start, {
        clientX: 300,
        clientY: 350,
        screenX: 500,
        screenY: 350,
      }),
    ).toBeUndefined();
  });
});
