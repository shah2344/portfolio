import { describe, expect, test } from "bun:test";
import {
  homeTooltipFocusPoint,
  placeHomeTooltip,
} from "../../src/components/home/tooltip/position";

describe("homepage tooltip placement", () => {
  test("keeps the complete pill inside a narrow viewport at every edge", () => {
    const size = { width: 240, height: 30 };
    const viewport = { width: 320, height: 640 };
    expect(placeHomeTooltip({ x: 0, y: -100 }, size, viewport)).toEqual({
      x: 132,
      y: 42,
    });
    expect(placeHomeTooltip({ x: 320, y: 800 }, size, viewport)).toEqual({
      x: 188,
      y: 628,
    });
  });

  test("anchors keyboard focus to the visible part of an oversized card", () => {
    const viewport = { width: 390, height: 844 };
    const point = homeTooltipFocusPoint(
      { left: -80, right: 350, top: -100, bottom: 500 },
      viewport,
    );
    expect(point).toEqual({ x: 175, y: -108 });
    expect(
      placeHomeTooltip(point!, { width: 160, height: 30 }, viewport),
    ).toEqual({ x: 175, y: 42 });
  });

  test("places top utility tooltips 4px below their controls", () => {
    const viewport = { width: 390, height: 844 };
    const box = { left: 276, right: 320, top: 16, bottom: 60 };
    const point = homeTooltipFocusPoint(box, viewport, "bottom");
    const placed = placeHomeTooltip(
      point!,
      { width: 120, height: 30 },
      viewport,
    );
    expect(placed.x).toBe(298);
    expect(placed.y - 30 - box.bottom).toBe(4);
  });

  test("hides when scrolling the focused control entirely out of view", () => {
    const viewport = { width: 1280, height: 720 };
    expect(
      homeTooltipFocusPoint(
        { left: 100, right: 200, top: -100, bottom: 0 },
        viewport,
      ),
    ).toBeNull();
    expect(
      homeTooltipFocusPoint(
        { left: 100, right: 200, top: 720, bottom: 900 },
        viewport,
      ),
    ).toBeNull();
  });
});
