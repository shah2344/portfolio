import { describe, expect, it } from "bun:test";
import { createCharacterDirector } from "../../src/components/home/character/director";
import type { CharacterMood } from "../../src/components/home/character/mood";
import {
  performanceDuration,
  restingPose,
  type CharacterPerformance,
} from "../../src/components/home/character/pose";

const STEP = 16;
type Start = { time: number; kind: CharacterPerformance };
type Director = ReturnType<typeof createCharacterDirector>;

/** Runs a 16 ms clock and records every performance start. */
function run(
  d: Director,
  from: number,
  to: number,
  starts: Start[] = [],
  each?: (time: number) => void,
) {
  let previous = d.active;
  for (let t = from; t < to; t += STEP) {
    each?.(t);
    d.sample(t, restingPose());
    if (d.active && d.active !== previous)
      starts.push({ time: t, kind: d.active });
    previous = d.active;
  }
  return starts;
}
/** Gap from one performance's end to the next start, tagged by when it was chosen. */
function gaps(starts: Start[]) {
  const result: { chosenAt: number; gap: number }[] = [];
  for (let i = 1; i < starts.length; i++) {
    const a = starts[i - 1]!,
      b = starts[i]!;
    // Naps start on their own timer, so they don't measure a beat gap.
    if (a.kind === "nap" || b.kind === "nap") continue;
    result.push({
      chosenAt: a.time,
      gap: b.time - a.time - performanceDuration[a.kind],
    });
  }
  return result;
}
const lively = (g: number) => g >= 5000 - STEP && g <= 9000 + STEP;
const calm = (g: number) => g >= 10000 - STEP && g <= 18000 + STEP;

describe("director pacing", () => {
  for (const seed of [1, 7, 42]) {
    it(`is lively for 60 s, then calm (seed ${seed})`, () => {
      const g = gaps(run(createCharacterDirector(seed, 0), 0, 300000));
      const early = g.filter((x) => x.chosenAt < 60000);
      const late = g.filter((x) => x.chosenAt >= 60000);
      expect(early.length).toBeGreaterThan(2);
      expect(late.length).toBeGreaterThan(5);
      for (const x of early) expect(lively(x.gap)).toBe(true);
      for (const x of late) expect(calm(x.gap)).toBe(true);
    });
  }
  it("settles early when the visitor starts reading", () => {
    const d = createCharacterDirector(42, 0);
    const g = gaps(
      run(d, 0, 200000, [], (t) => {
        if (t >= 10000 && t < 10000 + STEP) d.settle(10000);
      }),
    );
    const early = g.filter((x) => x.chosenAt < 10000);
    const late = g.filter((x) => x.chosenAt >= 10000);
    expect(late.length).toBeGreaterThan(5);
    for (const x of early) expect(lively(x.gap)).toBe(true);
    for (const x of late) expect(calm(x.gap)).toBe(true);
  });
  it("turns lively for 30 s after an activation", () => {
    const d = createCharacterDirector(7, 0);
    d.settle(0);
    const starts: Start[] = [];
    run(d, 0, 100000, starts);
    const before = gaps(starts);
    expect(d.activate(100000)).toBe(true);
    starts.push({ time: 100000, kind: d.active! });
    run(d, 100000 + STEP, 260000, starts);
    const after = gaps(starts).filter((x) => x.chosenAt >= 100000);
    const inside = after.filter((x) => x.chosenAt < 130000);
    const outside = after.filter((x) => x.chosenAt >= 130000);
    expect(inside.length).toBeGreaterThan(2);
    expect(outside.length).toBeGreaterThan(3);
    for (const x of inside) expect(lively(x.gap)).toBe(true);
    for (const x of outside) expect(calm(x.gap)).toBe(true);
    expect(before.length).toBeGreaterThan(3);
    for (const x of before) expect(calm(x.gap)).toBe(true);
  });
  it("does not restart the lively window on reset", () => {
    const d = createCharacterDirector(3, 0);
    run(d, 0, 90000);
    d.reset(90000);
    run(d, 90000, 90000 + 9000);
    expect(d.active).toBeNull();
    const starts = run(d, 99000, 150000);
    expect(starts[0]!.time).toBeGreaterThanOrEqual(100000 - STEP);
  });
});

describe("director mood", () => {
  const playful: CharacterPerformance[] = ["nod", "wobble", "smirk"];
  const share = (mood: CharacterMood) => {
    let hits = 0,
      total = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const d = createCharacterDirector(seed, 0, () => mood);
      for (const s of run(d, 0, 4000000)) {
        if (s.kind === "nap") continue;
        total++;
        if (playful.includes(s.kind)) hits++;
      }
    }
    return hits / total;
  };
  it("is more playful when warm", () => {
    const neutral = share({ warmth: 0, boredom: 0 });
    const warm = share({ warmth: 1, boredom: 0 });
    expect(warm).toBeGreaterThan(neutral + 0.08);
  });
  it("uses the warm activation pool", () => {
    const kinds = new Set<CharacterPerformance>();
    for (let seed = 0; seed < 40; seed++) {
      const d = createCharacterDirector(seed, 0, () => ({
        warmth: 1,
        boredom: 0,
      }));
      d.activate(0);
      for (let i = 1; i < 6; i++) {
        d.activate(i * 1000);
        kinds.add(d.active!);
      }
    }
    expect(kinds.has("doubleTake")).toBe(false);
    expect(kinds.has("nod")).toBe(true);
  });
  it("never wobbles on its own when bored", () => {
    for (const seed of [1, 2, 3]) {
      const d = createCharacterDirector(seed, 0, () => ({
        warmth: 0,
        boredom: 1,
      }));
      const kinds = run(d, 0, 1500000).map((s) => s.kind);
      expect(kinds.length).toBeGreaterThan(20);
      expect(kinds).not.toContain("wobble");
    }
  });
  it("naps within ~9 s of getting bored", () => {
    for (const seed of [1, 2, 3, 4]) {
      let boredom = 0;
      const d = createCharacterDirector(seed, 0, () => ({
        warmth: 0,
        boredom,
      }));
      const starts = run(d, 0, 40000, [], (t) => {
        if (t >= 10000) boredom = 1;
      });
      const nap = starts.find((s) => s.kind === "nap");
      expect(nap).toBeDefined();
      expect(nap!.time).toBeGreaterThanOrEqual(10000 + 4000);
      // A running performance may delay it, never by more than its length.
      expect(nap!.time).toBeLessThanOrEqual(10000 + 9000 + 2000);
    }
  });
  it("still keeps 90 s between naps", () => {
    let boredom = 0;
    const d = createCharacterDirector(4, 0, () => ({ warmth: 0, boredom }));
    const first = run(d, 0, 200000).find((s) => s.kind === "nap")!;
    expect(first).toBeDefined();
    const d2 = createCharacterDirector(4, 0, () => ({ warmth: 0, boredom }));
    const naps = run(d2, 0, 400000, [], (t) => {
      if (t >= first.time + 10000) boredom = 1;
    }).filter((s) => s.kind === "nap");
    expect(naps[0]!.time).toBe(first.time);
    expect(naps.length).toBeGreaterThanOrEqual(2);
    expect(naps[1]!.time - naps[0]!.time).toBeGreaterThanOrEqual(90000);
    expect(naps[1]!.time - naps[0]!.time).toBeLessThan(90000 + 3000);
  });
});
