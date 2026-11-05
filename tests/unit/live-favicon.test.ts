import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  FAVICON_BLINK,
  FAVICON_DOZE,
  FAVICON_FRAME_DIR,
  FAVICON_FRAMES,
  FAVICON_HELLO,
  FAVICON_HELLO_STEP_MS,
  nextFaviconBlink,
} from "../../src/components/favicon/live-favicon-frames";
import { performanceDuration } from "../../src/components/home/character/pose";

describe("live favicon", () => {
  test("every frame it swaps to is committed", () => {
    for (const frame of FAVICON_FRAMES)
      expect(
        existsSync(join("public", FAVICON_FRAME_DIR, `${frame}.png`)),
      ).toBe(true);
  });
  test("blinks and hellos settle on the resting face; dozing stays asleep", () => {
    expect(FAVICON_BLINK.at(-1)![0]).toBe("rest");
    expect(FAVICON_HELLO.at(-1)![0]).toBe("rest");
    expect(FAVICON_DOZE.at(-1)![0]).toBe("doze-5");
  });
  test("the hello covers the rig's whole greeting", () => {
    const frames = FAVICON_HELLO.length - 1;
    expect(frames).toBe(
      Math.ceil(performanceDuration.greeting / FAVICON_HELLO_STEP_MS),
    );
  });
  test("hidden-tab beats are at least a second, as browsers throttle them", () => {
    for (const [, hold] of FAVICON_DOZE.slice(0, -1))
      expect(hold).toBeGreaterThanOrEqual(1000);
  });
  test("blinks are spaced between 3.5 and 7 seconds", () => {
    expect(nextFaviconBlink(0)).toBe(3500);
    expect(nextFaviconBlink(1)).toBe(7000);
  });
});
