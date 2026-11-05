import { describe, expect, it } from "bun:test";
import { advanceLoopTime } from "../../src/components/work/video-loop-clock";

describe("unseen video playback clock", () => {
  it("advances by elapsed time without restarting a clip", () => {
    expect(advanceLoopTime(4, 7, 30)).toBe(11);
  });
  it("lands past the crossfade when the trimmed loop ends", () => {
    expect(advanceLoopTime(28, 2, 30)).toBeCloseTo(1.11);
  });
  it("wraps long absences through multiple loops", () => {
    expect(advanceLoopTime(4, 7 + 28.89 * 200, 30)).toBeCloseTo(11);
  });
  it("matches one long absence and multiple resume/suspend cycles", () => {
    let time = 4;
    for (let index = 0; index < 50; index += 1)
      time = advanceLoopTime(time, 3, 30);
    expect(time).toBeCloseTo(advanceLoopTime(4, 150, 30));
  });
  it("preserves the position if duration is unknown", () => {
    expect(advanceLoopTime(4, 7, NaN)).toBe(4);
    expect(advanceLoopTime(4, 7, Infinity)).toBe(4);
    expect(advanceLoopTime(4, 7, 0)).toBe(4);
  });
  it("uses the native loop for clips too short to crossfade", () => {
    expect(advanceLoopTime(0.4, 3, 1)).toBeCloseTo(0.4);
  });
  it("does not move backwards for a negative elapsed time", () => {
    expect(advanceLoopTime(4, -1, 30)).toBe(4);
  });
});
