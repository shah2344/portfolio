import { describe, expect, it } from "bun:test";
import { homeCharacterEntranceFrames } from "../../src/components/home/character/entrance";
import { HOME_CHARACTER_TIMING as timing } from "../../src/components/home/character/timing";
import { performanceDuration } from "../../src/components/home/character/pose";

const scaleOf = (frame: Keyframe) =>
  Number(String(frame.transform).match(/scale\(([-\d.]+)\)/)![1]);

describe("homepage opening choreography", () => {
  it("holds the greeting gaze until the greeting has finished", () => {
    expect(timing.greetingEndMs).toBeGreaterThanOrEqual(
      timing.greetingDelayMs + performanceDuration.greeting,
    );
  });

  it("pops up in its slot and lands exactly at rest", () => {
    const frames = homeCharacterEntranceFrames();
    expect(frames[0]!.opacity).toBe(0);
    const last = frames.at(-1)!;
    expect(last.offset).toBe(1);
    expect(last.opacity).toBe(1);
    expect(last.filter).toBe("blur(0px)");
    expect(last.transform).toBe("translateY(0px) rotate(0deg) scale(1)");
  });

  it("overshoots once, by a small amount, so it reads as a spring", () => {
    const scales = homeCharacterEntranceFrames().map(scaleOf);
    const peak = Math.max(...scales);
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.15);
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.55);
  });
});
