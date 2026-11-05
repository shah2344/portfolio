import { describe, expect, it } from "bun:test";
import {
  createCharacterMood,
  neutralMood,
} from "../../src/components/home/character/mood";

describe("character mood", () => {
  it("accumulates taps and caps warmth at 1", () => {
    const m = createCharacterMood(0);
    m.tap(0);
    expect(m.sample(0).warmth).toBeCloseTo(0.22, 5);
    m.tap(5000);
    expect(m.sample(5000).warmth).toBeCloseTo(
      0.22 * 0.5 ** (5000 / 150000) + 0.22,
      5,
    );
    for (let i = 1; i <= 20; i++) m.tap(5000 + i * 2000);
    expect(m.sample(45000).warmth).toBe(1);
  });
  it("counts a cluster of quick taps as one gesture", () => {
    const m = createCharacterMood(0);
    m.tap(0);
    m.tap(300);
    expect(m.sample(300).warmth).toBeCloseTo(0.3, 2);
    m.tap(1100);
    expect(m.sample(1100).warmth).toBeGreaterThan(0.5);
  });
  it("adds a small amount for gentle play", () => {
    const m = createCharacterMood(0);
    m.play(0);
    expect(m.sample(0).warmth).toBeCloseTo(0.08, 5);
  });
  it("halves warmth every 150 seconds and clamps annoyance at 0", () => {
    const m = createCharacterMood(0);
    m.tap(0);
    expect(m.sample(150000).warmth).toBeCloseTo(0.11, 5);
    expect(m.sample(300000).warmth).toBeCloseTo(0.055, 5);
    m.annoy(0.5, 1000);
    expect(m.sample(1000).warmth).toBe(0);
    m.annoy(0.5, 2000);
    expect(m.sample(2000).warmth).toBe(0);
  });
  it("gets bored only after a long silence", () => {
    const m = createCharacterMood(0);
    expect(m.sample(20000).boredom).toBe(0);
    const mid = m.sample(70000).boredom;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(m.sample(130000).boredom).toBe(1);
  });
  it("lets boredom fall gradually after input and restarts the idle clock", () => {
    const m = createCharacterMood(0);
    m.input(130000);
    expect(m.sample(130500).boredom).toBeGreaterThan(0.4);
    expect(m.sample(136000).boredom).toBeLessThan(0.05);
    expect(m.sample(150000).boredom).toBeLessThan(0.001);
    expect(m.sample(130000 + 70000).boredom).toBeGreaterThan(0);
  });
  it("does not depend on how often it is sampled", () => {
    const run = (every: number) => {
      const m = createCharacterMood(0);
      m.tap(1000);
      m.input(40000);
      let value = m.sample(0);
      for (let t = 0; t <= 100000; t += every) m.sample(t);
      value = m.sample(100000);
      return value;
    };
    const dense = run(16),
      sparse = run(100000);
    expect(dense.warmth).toBeCloseTo(sparse.warmth, 9);
    expect(dense.boredom).toBeCloseTo(sparse.boredom, 9);
  });
  it("resets to neutral", () => {
    const m = createCharacterMood(0);
    m.tap(0);
    m.tap(2000);
    m.reset(60000);
    expect(m.sample(60000)).toEqual(neutralMood);
    expect(m.sample(70000).boredom).toBe(0);
    expect(m.sample(70000).warmth).toBe(0);
  });
});
