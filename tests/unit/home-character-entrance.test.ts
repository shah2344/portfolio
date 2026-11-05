import { describe, expect, it } from "bun:test";
import {
  homeCharacterDissolveFrames,
  homeCharacterEntranceFrames,
} from "../../src/components/home/character/entrance";
import { HOME_CHARACTER_TIMING as timing } from "../../src/components/home/character/timing";
import {
  performanceDuration,
  restingPose,
} from "../../src/components/home/character/pose";
import {
  chooseTravelEmotion,
  sampleTravelEmotion,
  travelEmotions,
} from "../../src/components/home/character/travel";

describe("homepage opening choreography", () => {
  it("lets the greeting finish and brings copy in during the final approach", () => {
    expect(timing.travelDelayMs).toBeGreaterThanOrEqual(
      timing.greetingDelayMs + performanceDuration.greeting,
    );
    expect(timing.entranceMs).toBeGreaterThan(timing.travelDelayMs);
    expect(timing.contentDelayMs).toBeGreaterThan(timing.travelDelayMs);
    expect(timing.contentDelayMs).toBeLessThan(timing.entranceMs);
    const frames = homeCharacterEntranceFrames(300, 400);
    const last = frames.at(-1)!;
    expect(last.offset).toBe(1);
    expect(last.transform).toBe("translate(0px, 0px) scale(1)");
  });

  it("greets at the centre, then dissolves when the masthead is out of view", () => {
    const frames = homeCharacterDissolveFrames(300, 900);
    const hold = frames.find(
      ({ offset }) => offset === timing.travelDelayMs / timing.entranceMs,
    )!;
    expect(hold.opacity).toBe(1);
    expect(hold.transform).toBe("translate(300px, 900px) scale(1.5)");
    const last = frames.at(-1)!;
    expect(last.offset).toBe(1);
    expect(last.opacity).toBe(0);
    expect(last.filter).toBe("blur(10px)");
  });

  it("settles through one bounded overshoot across viewport sizes", () => {
    for (const [x, y] of [
      [300, 400],
      [0, 250],
      [-200, 900],
      [1200, 1200],
    ]) {
      const travel = homeCharacterEntranceFrames(x!, y!).slice(3, -1);
      const positions = travel.map((frame) => {
        const match = String(frame.transform).match(
          /translate\(([-\d.e]+)px, ([-\d.e]+)px\)/,
        )!;
        return [Number(match[1]), Number(match[2])];
      });
      const overshoots = positions.filter(
        ([px, py]) => px! * x! + py! * y! < 0,
      );
      expect(overshoots.length).toBeGreaterThan(0);
      for (const [px, py] of overshoots)
        expect(Math.hypot(px!, py!)).toBeLessThanOrEqual(5.00001);
      expect(Math.hypot(...positions.at(-1)!)).toBeLessThan(0.5);
    }
  });

  it("looks up before takeoff and holds that gaze through the rise", () => {
    const base = restingPose();
    for (const emotion of travelEmotions) {
      expect(sampleTravelEmotion(base, emotion, -20).gazeY).toBeLessThan(-4);
      expect(sampleTravelEmotion(base, emotion, 200).gazeY).toBeLessThan(-6);
      const landed = timing.entranceMs - timing.travelDelayMs;
      expect(sampleTravelEmotion(base, emotion, landed + 280).gazeY).toBe(
        base.gazeY,
      );
      expect(sampleTravelEmotion(base, undefined, 200)).toEqual(base);
    }
  });

  it("never repeats the prior emotion across successive arrivals", () => {
    for (const random of [() => 0, () => 0.5, () => 0.99999]) {
      let previous: string | undefined;
      for (let i = 0; i < 100; i++) {
        const next = chooseTravelEmotion(random, previous);
        expect(travelEmotions).toContain(next);
        expect(next).not.toBe(previous);
        previous = next;
      }
    }
  });

  it("varies the face without moving the character away from its landing position", () => {
    const base = restingPose();
    const faces = new Set<string>();
    for (const emotion of travelEmotions) {
      faces.add(JSON.stringify(sampleTravelEmotion(base, emotion, 300)));
      expect(sampleTravelEmotion(base, emotion, -100)).toEqual(base);
      expect(sampleTravelEmotion(base, emotion, 1500)).toEqual(base);
      for (let ms = 0; ms <= 1500; ms += 10) {
        const pose = sampleTravelEmotion(base, emotion, ms);
        expect(pose.x).toBe(base.x);
        expect(pose.y).toBe(base.y);
        expect(pose.squash).toBe(base.squash);
        for (const value of Object.values(pose.mouth))
          expect(Number.isFinite(value)).toBe(true);
      }
    }
    expect(faces.size).toBe(travelEmotions.length);
  });
});
