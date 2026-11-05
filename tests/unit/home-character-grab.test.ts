import { describe, expect, it } from "bun:test";
import { createCharacterGrab } from "../../src/components/home/character/grab";

function pull(hz = 60) {
  const grab = createCharacterGrab(() => 0.9);
  grab.begin({ x: 0, y: 0 }, 0);
  grab.move({ x: 90, y: 30 });
  for (let i = 1; i <= hz / 2; i++) grab.sample((i * 1000) / hz, 1 / hz);
  return grab;
}
describe("character grab physics", () => {
  it("resists large pulls, stays within viewport bounds, and keeps deformation subtle", () => {
    const grab = createCharacterGrab(() => 0.9);
    grab.begin({ x: 0, y: 0 }, 0, {
      left: -12,
      right: 70,
      top: -30,
      bottom: 80,
    });
    grab.move({ x: -5000, y: 5000 });
    for (let i = 1; i < 120; i++) {
      const p = grab.sample(i * 16, 0.016);
      expect(p.x).toBeGreaterThanOrEqual(-12);
      expect(p.y).toBeLessThanOrEqual(80);
      expect(p.stretch).toBeLessThanOrEqual(0.04);
      expect(p.squeeze).toBeLessThanOrEqual(0.025);
      expect(1 - p.stretch - p.squeeze).toBeGreaterThanOrEqual(0.95);
    }
    expect(grab.dragged).toBe(true);
  });
  it("rebounds past home and settles, independently of refresh rate", () => {
    const positions = [60, 120].map((hz) => {
      const grab = pull(hz);
      grab.release(500);
      let minimum = 0;
      for (let i = 1; i <= hz * 2; i++) {
        minimum = Math.min(
          minimum,
          grab.sample(500 + (i * 1000) / hz, 1 / hz).x,
        );
      }
      expect(minimum).toBeLessThan(-4);
      expect(grab.engaged).toBe(false);
      return minimum;
    });
    expect(Math.abs(positions[0]! - positions[1]!)).toBeLessThan(0.3);
  });
  it("can be caught mid-rebound without snapping back to its original slot", () => {
    const grab = pull();
    grab.release(500);
    const before = grab.sample(516, 0.016);
    grab.begin({ x: 10, y: 10 }, 516);
    const after = grab.sample(516, 0);
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(grab.held).toBe(true);
  });
  it("distinguishes taps from long holds, drags and cancellations", () => {
    const grab = createCharacterGrab(() => 0.9);
    grab.begin({ x: 0, y: 0 }, 0);
    expect(grab.release(100)).toBe(true);
    grab.begin({ x: 0, y: 0 }, 200);
    expect(grab.release(700)).toBe(false);
    grab.begin({ x: 0, y: 0 }, 800);
    grab.move({ x: 10, y: 0 });
    expect(grab.release(900)).toBe(false);
    grab.begin({ x: 0, y: 0 }, 1000);
    expect(grab.release(1100, true)).toBe(false);
  });
  it("wriggles before occasionally slipping free, then resets without residual motion", () => {
    const grab = createCharacterGrab(() => 0.1);
    grab.begin({ x: 0, y: 0 }, 0);
    let wriggled = false,
      escaped = false;
    for (let i = 1; i < 200; i++) {
      const p = grab.sample(i * 16, 0.016);
      wriggled ||= Math.abs(p.wriggle) > 0.25;
      escaped ||= p.escaped;
    }
    expect(wriggled).toBe(true);
    expect(escaped).toBe(true);
    expect(grab.held).toBe(false);
    expect(grab.release(3200)).toBe(false);
    grab.reset();
    expect(grab.engaged).toBe(false);
    expect(grab.sample(4000, 0.016).x).toBe(0);
  });
});

describe("character temperament", () => {
  function roughGrab(random = () => 0.9) {
    const grab = createCharacterGrab(random);
    grab.begin({ x: 0, y: 0 }, 0);
    grab.move({ x: 100, y: 0 }, 100);
    grab.move({ x: -100, y: 0 }, 180);
    grab.move({ x: 100, y: 0 }, 260);
    return grab;
  }
  it("initially resists leaving home, then yields smoothly as the pull grows", () => {
    const grab = createCharacterGrab(() => 0.9);
    grab.begin({ x: 0, y: 0 }, 0);
    grab.move({ x: 18, y: 0 }, 100);
    let pose = grab.sample(100, 0.016);
    for (let i = 1; i <= 20; i++) pose = grab.sample(100 + i * 16, 0.016);
    expect(pose.x).toBeLessThan(4);
    expect(pose.x).toBeGreaterThan(1);
    grab.move({ x: 48, y: 0 }, 440);
    for (let i = 1; i <= 20; i++) pose = grab.sample(440 + i * 16, 0.016);
    expect(pose.x).toBeGreaterThan(44);
    expect(grab.wary).toBe(false);
  });
  it("braces and escapes rough handling even when a normal hold would not escape", () => {
    const grab = roughGrab();
    grab.sample(600, 0.016);
    expect(grab.sample(720, 0.016).bracing).toBe(true);
    const escaped = grab.sample(840, 0.016);
    expect(escaped.escaped).toBe(true);
    expect(escaped.held).toBe(false);
    expect(escaped.wary).toBe(true);
  });
  it("remembers rough handling after settling, dodges an approach, allows a catch, and eventually trusts again", () => {
    const grab = roughGrab();
    grab.release(300);
    for (let i = 1; i <= 120; i++) grab.sample(300 + i * 16, 0.016);
    expect(grab.wary).toBe(true);
    expect(grab.approach({ x: -40, y: 0 }, 2250)).toBe(true);
    const dodge = grab.sample(2400, 0.15);
    expect(dodge.x).toBeGreaterThan(25);
    expect(dodge.dodging).toBe(true);
    expect(grab.approach({ x: 0, y: 0 }, 2500)).toBe(false);
    grab.begin({ x: 40, y: 0 }, 2500);
    expect(grab.held).toBe(true);
    expect(grab.sample(2500, 0).x).toBe(dodge.x);
    grab.release(2600);
    for (let i = 1; i <= 2200; i++) grab.sample(2600 + i * 16, 0.016);
    expect(grab.wary).toBe(false);
    expect(grab.approach({ x: 0, y: 0 }, 38000)).toBe(false);
  });
  it("dodges into available space at a narrow edge", () => {
    const grab = roughGrab();
    grab.release(300);
    grab.begin({ x: 0, y: 0 }, 400, {
      left: -14,
      right: 104,
      top: -54,
      bottom: 96,
    });
    grab.release(450);
    for (let i = 1; i <= 120; i++) grab.sample(450 + i * 16, 0.016);
    expect(grab.approach({ x: 20, y: 0 }, 2400)).toBe(true);
    const dodge = grab.sample(2500, 0.1);
    expect(dodge.x).toBeGreaterThanOrEqual(-14);
    expect(dodge.x).toBeLessThanOrEqual(104);
    expect(dodge.y).toBeGreaterThanOrEqual(-54);
    expect(Math.hypot(dodge.x - 20, dodge.y)).toBeGreaterThan(40);
  });
  it("dashes clear quickly and bolts again if the cursor lands on it", () => {
    const grab = roughGrab();
    grab.release(300);
    let time = 300;
    let pose = grab.sample(time, 0);
    for (let i = 0; i < 120; i++) pose = grab.sample((time += 16), 0.016);
    expect(grab.approach({ x: pose.x + 30, y: pose.y }, time)).toBe(true);
    const from = pose;
    for (let i = 0; i < 9; i++) pose = grab.sample((time += 16), 0.016);
    expect(Math.hypot(pose.x - from.x, pose.y - from.y)).toBeGreaterThan(30);
    expect(grab.approach({ x: pose.x, y: pose.y }, time)).toBe(true);
  });
  it("keeps its distance during a chase, then winds down and gives up", () => {
    const grab = roughGrab();
    grab.release(300);
    let time = 300;
    let pose = grab.sample(time, 0);
    for (let i = 0; i < 120; i++) pose = grab.sample((time += 16), 0.016);
    let dodges = 0,
      fluster = 0;
    while (grab.approach({ x: pose.x + 35, y: pose.y }, time)) {
      dodges++;
      for (let i = 0; i < 40; i++) pose = grab.sample((time += 16), 0.016);
      expect(pose.fleeing).toBe(true);
      expect(Math.hypot(pose.x, pose.y)).toBeGreaterThan(20);
      expect(pose.fluster).toBeGreaterThanOrEqual(fluster);
      fluster = pose.fluster;
      expect(dodges).toBeLessThanOrEqual(6);
    }
    expect(dodges).toBeGreaterThanOrEqual(4);
    expect(grab.takeSurrender()).toBe(true);
    expect(grab.takeSurrender()).toBe(false);
    expect(grab.wary).toBe(false);
    expect(grab.approach({ x: pose.x, y: pose.y }, time + 16)).toBe(false);
    for (let i = 0; i < 180; i++) pose = grab.sample((time += 16), 0.016);
    expect(Math.hypot(pose.x, pose.y)).toBeLessThan(1);
  });
  it("calms without giving up when the cursor backs off", () => {
    const grab = roughGrab();
    grab.release(300);
    let time = 300;
    let pose = grab.sample(time, 0);
    for (let i = 0; i < 120; i++) pose = grab.sample((time += 16), 0.016);
    expect(grab.approach({ x: pose.x + 35, y: pose.y }, time)).toBe(true);
    for (let i = 0; i < 180; i++) pose = grab.sample((time += 16), 0.016);
    expect(grab.wary).toBe(false);
    expect(pose.fleeing).toBe(false);
    expect(grab.takeSurrender()).toBe(false);
    expect(grab.approach({ x: pose.x, y: pose.y }, time)).toBe(false);
  });
  it("can give up after as few as four dodges", () => {
    const grab = roughGrab(() => 0.1);
    grab.release(300);
    let time = 300;
    let pose = grab.sample(time, 0);
    for (let i = 0; i < 120; i++) pose = grab.sample((time += 16), 0.016);
    for (let attempt = 0; attempt < 4; attempt++) {
      expect(grab.approach({ x: pose.x + 35, y: pose.y }, time)).toBe(true);
      for (let i = 0; i < 40; i++) pose = grab.sample((time += 16), 0.016);
    }
    expect(grab.approach({ x: pose.x + 35, y: pose.y }, time)).toBe(false);
    expect(grab.takeSurrender()).toBe(true);
    expect(grab.wary).toBe(false);
  });
});

describe("reassuring character taps", () => {
  it("interrupts a chase without teleporting and settles home happier", () => {
    const grab = createCharacterGrab(() => 0.9);
    grab.begin({ x: 0, y: 0 }, 0);
    for (const [time, x] of [
      [100, 100],
      [180, -100],
      [260, 100],
    ] as const)
      grab.move({ x, y: 0 }, time);
    grab.release(300);
    for (let i = 1; i <= 120; i++) grab.sample(300 + i * 16, 0.016);
    expect(grab.approach({ x: -40, y: 0 }, 2250)).toBe(true);
    const before = grab.sample(2400, 0.15);
    expect(before.dodging).toBe(true);
    grab.tap(2400);
    const after = grab.sample(2400, 0);
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(after.wary).toBe(false);
    expect(after.dodging).toBe(false);
    expect(after.happiness).toBeGreaterThan(0.3);
    let pose = after;
    for (let i = 1; i <= 80; i++) {
      pose = grab.sample(2400 + i * 16, 0.016);
      expect(grab.approach({ x: pose.x, y: pose.y }, 2400 + i * 16)).toBe(
        false,
      );
    }
    expect(Math.hypot(pose.x, pose.y)).toBeLessThan(0.1);
    expect(pose.comfort).toBeGreaterThan(0);
  });
  it("builds a lingering happy mood with taps while keeping the body at rest", () => {
    const grab = createCharacterGrab(() => 0.9);
    let pose = grab.sample(0, 0);
    for (let i = 0; i < 50; i++) {
      grab.tap(i * 40);
      pose = grab.sample(i * 40 + 40, 0.04);
      expect(pose.happiness).toBeLessThanOrEqual(1);
      expect(pose.y).toBe(0);
      expect(pose.x).toBe(0);
    }
    expect(pose.happiness).toBeGreaterThan(0.9);
    for (let i = 1; i <= 150; i++) pose = grab.sample(2000 + i * 16, 0.016);
    expect(pose.comfort).toBe(0);
    expect(pose.happiness).toBeGreaterThan(0.8);
    expect(grab.engaged).toBe(false);
    for (let i = 1; i <= 3000; i++) pose = grab.sample(4400 + i * 16, 0.016);
    expect(pose.happiness).toBe(0);
  });
  it("allows new rough pulling to undo reassurance and trigger escape again", () => {
    const grab = createCharacterGrab(() => 0.9);
    grab.tap(0);
    grab.begin({ x: 0, y: 0 }, 200);
    for (const [time, x] of [
      [300, 100],
      [380, -100],
      [460, 100],
    ] as const)
      grab.move({ x, y: 0 }, time);
    grab.sample(800, 0.016);
    const pose = grab.sample(1040, 0.016);
    expect(pose.wary).toBe(true);
    expect(pose.escaped).toBe(true);
    expect(pose.happiness).toBe(0);
    grab.reset();
    const reset = grab.sample(1100, 0);
    expect(reset.happiness).toBe(0);
    expect(reset.comfort).toBe(0);
  });
});

describe("natural tap continuity", () => {
  it("preserves the live smile and body position across a cluster of taps", () => {
    const grab = createCharacterGrab(() => 0.9);
    grab.tap(0);
    const before = grab.sample(160, 0.16);
    expect(before.comfort).toBeGreaterThan(0.4);
    grab.tap(160);
    const after = grab.sample(160, 0);
    expect(after.comfort).toBe(before.comfort);
    expect(after.tapTilt).toBe(before.tapTilt);
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    grab.begin({ x: 0, y: 0 }, 180);
    const pressed = grab.sample(260, 0.08);
    expect(pressed.squeeze).toBe(0);
    expect(pressed.stretch).toBe(0);
    expect(pressed.pulling).toBe(false);
    expect(pressed.comfort).toBeGreaterThan(after.comfort);
  });
  it("varies spaced reactions while keeping every tilt small", () => {
    const values = [0.1, 0.2, 0.3, 0.9, 0.8, 0.7];
    const grab = createCharacterGrab(() => values.shift() ?? 0.5);
    grab.tap(0);
    let first = grab.sample(0, 0);
    for (let i = 1; i <= 60; i++) first = grab.sample(i * 16, 0.016);
    grab.tap(1000);
    let second = grab.sample(1000, 0);
    for (let i = 1; i <= 60; i++) second = grab.sample(1000 + i * 16, 0.016);
    expect(first.tapTilt).toBeLessThan(-1);
    expect(second.tapTilt).toBeGreaterThan(1);
    expect(Math.abs(first.tapTilt)).toBeLessThanOrEqual(2.5);
    expect(Math.abs(second.tapTilt)).toBeLessThanOrEqual(2.5);
  });
});
