import { afterEach, describe, expect, it } from "bun:test";
import { BRAND_TURN_EVENT } from "../../src/components/motion/brand-turn-motion";
import { HOME_CHARACTER_TIMING } from "../../src/components/home/character/timing";
import { performanceDuration } from "../../src/components/home/character/pose";
import {
  CHARACTER_EVENT,
  startHomeCharacter,
  type CharacterCommand,
} from "../../src/components/home/character/motion";

class Node extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children = new Map<string, Node>();
  disabled = false;
  style = { transform: "" };
  capture: number | null = null;
  setPointerCapture(id: number) {
    this.capture = id;
  }
  hasPointerCapture(id: number) {
    return this.capture === id;
  }
  releasePointerCapture() {
    this.capture = null;
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  querySelector(key: string) {
    return this.children.get(key) ?? null;
  }
  contains(node: Node) {
    return node === this || [...this.children.values()].includes(node);
  }
  getBoundingClientRect() {
    return {
      left: 100,
      top: 100,
      width: 44,
      height: 44,
      bottom: 144,
      right: 144,
    };
  }
}
const originals = new Map<string, PropertyDescriptor | undefined>();
function replace(key: string, value: unknown) {
  if (!originals.has(key))
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}
afterEach(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  originals.clear();
});
function environment() {
  const root = new Node(),
    svg = new Node(),
    play = new Node(),
    doc = Object.assign(new Node(), {
      hidden: false,
      documentElement: new Node(),
    }),
    win = new Node();
  root.children.set("[data-character-play]", play);
  for (const key of ["[data-shell]", "[data-mouth]"])
    svg.children.set(key, new Node());
  const eyes = [0, 1].map(() => {
    const eye = new Node();
    for (const name of [
      "aperture",
      "eye-fill",
      "eye-outline",
      "eye-rim",
      "eye-bloom",
      "eye-rim-mask",
      "upper",
      "lower",
      "pupil",
    ])
      eye.children.set(`[data-${name}]`, new Node());
    return eye;
  });
  Object.assign(svg, { closest: () => root, querySelectorAll: () => eyes });
  const media = Object.assign(new EventTarget(), { matches: false });
  const appearance = Object.assign(new EventTarget(), { matches: false });
  let time = 0,
    id = 0,
    disconnected = 0;
  const frames = new Map<number, FrameRequestCallback>();
  let intersection: (entries: { isIntersecting: boolean }[]) => void = () => {};
  class Observer {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
      intersection = callback;
    }
    observe() {}
    disconnect() {
      disconnected++;
    }
  }
  class OtherObserver {
    observe() {}
    disconnect() {
      disconnected++;
    }
  }
  const values = new Map<string, string>([["home-character-paused", "true"]]);
  replace("window", win);
  replace("document", doc);
  replace("HTMLElement", Node);
  replace("innerWidth", 1280);
  replace("innerHeight", 900);
  replace("scrollY", 0);
  replace("location", { hash: "" });
  replace("matchMedia", (query: string) =>
    query.includes("reduced") ? media : appearance,
  );
  replace("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  replace("cancelAnimationFrame", (key: number) => frames.delete(key));
  replace("IntersectionObserver", Observer);
  replace("ResizeObserver", OtherObserver);
  replace("MutationObserver", OtherObserver);
  replace("sessionStorage", {
    getItem: (k: string) => values.get(k),
    setItem: (k: string, v: string) => values.set(k, v),
  });
  const cleanup = startHomeCharacter(svg as unknown as SVGSVGElement, {
    now: () => time,
    seed: 42,
  });
  const advance = (ms: number) => {
    time += ms;
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach((callback) => callback(time));
  };
  const command = (detail: CharacterCommand) =>
    root.dispatchEvent(new CustomEvent(CHARACTER_EVENT, { detail }));
  return {
    root,
    svg,
    play,
    doc,
    win,
    media,
    frames,
    cleanup,
    advance,
    command,
    intersection: (visible: boolean) =>
      intersection([{ isIntersecting: visible }]),
    disconnected: () => disconnected,
  };
}
describe("character lifecycle", () => {
  it("greets on initial arrival before the reading content is released, ignoring obsolete saved pause state", () => {
    const e = environment();
    const initialMouth = e.svg
      .querySelector("[data-mouth]")!
      .attributes.get("d");
    for (let time = 0; time < 700; time += 16) e.advance(16);
    expect(e.root.dataset.performance).toBe("greeting");
    expect(e.svg.querySelector("[data-mouth]")!.attributes.get("d")).not.toBe(
      initialMouth,
    );
    expect(HOME_CHARACTER_TIMING.contentDelayMs).toBeGreaterThanOrEqual(
      HOME_CHARACTER_TIMING.greetingDelayMs + performanceDuration.greeting,
    );
    for (let time = 0; time < 600; time += 16) e.advance(16);
    expect(e.root.dataset.performance).toBe("idle");
    e.cleanup();
  });
  it("owns only one frame loop and freezes all motion when paused", () => {
    const e = environment();
    expect(e.frames.size).toBe(1);
    for (let i = 0; i < 10; i++) e.play.dispatchEvent(new Event("click"));
    expect(e.frames.size).toBe(1);
    e.advance(150);
    e.command({ type: "pause", value: true });
    expect(e.frames.size).toBe(0);
    const mouth = e.svg.querySelector("[data-mouth]")!.attributes.get("d");
    e.play.dispatchEvent(new Event("click"));
    e.advance(4000);
    expect(e.svg.querySelector("[data-mouth]")!.attributes.get("d")).toBe(
      mouth,
    );
    e.command({ type: "pause", value: false });
    expect(e.frames.size).toBe(1);
    e.cleanup();
    expect(e.frames.size).toBe(0);
  });
  it("holds the live character in its snapshot pose during a brand handoff", () => {
    const e = environment();
    e.advance(150);
    e.root.dispatchEvent(new CustomEvent(BRAND_TURN_EVENT, { detail: true }));
    expect(e.frames.size).toBe(0);
    const frozen = e.svg.querySelector("[data-mouth]")!.attributes.get("d");
    e.advance(300);
    expect(e.svg.querySelector("[data-mouth]")!.attributes.get("d")).toBe(
      frozen,
    );
    e.root.dispatchEvent(new CustomEvent(BRAND_TURN_EVENT, { detail: false }));
    expect(e.frames.size).toBe(1);
    e.advance(16);
    expect(e.frames.size).toBe(1);
    e.cleanup();
  });
  it("suspends offscreen and hidden work without replaying a backlog", () => {
    const e = environment();
    e.intersection(false);
    expect(e.frames.size).toBe(0);
    e.advance(120000);
    e.intersection(true);
    expect(e.frames.size).toBe(1);
    e.advance(16);
    expect(e.root.dataset.performance).toBe("idle");
    e.doc.hidden = true;
    e.doc.dispatchEvent(new Event("visibilitychange"));
    expect(e.frames.size).toBe(0);
    e.advance(120000);
    e.doc.hidden = false;
    e.doc.dispatchEvent(new Event("visibilitychange"));
    e.advance(16);
    expect(e.root.dataset.performance).toBe("idle");
    e.cleanup();
  });
  it("applies reduced motion immediately and never reactivates after disposal", () => {
    const e = environment();
    e.command({ type: "play", performance: "wobble", time: 0 });
    e.advance(250);
    e.media.matches = true;
    e.media.dispatchEvent(new Event("change"));
    expect(e.frames.size).toBe(0);
    expect(e.root.dataset.reduced).toBe("true");
    e.play.dispatchEvent(new Event("click"));
    expect(e.frames.size).toBe(0);
    e.media.matches = false;
    e.media.dispatchEvent(new Event("change"));
    expect(e.frames.size).toBe(1);
    e.cleanup();
    expect(e.disconnected()).toBe(3);
    e.play.dispatchEvent(new Event("click"));
    e.media.dispatchEvent(new Event("change"));
    e.doc.dispatchEvent(new Event("visibilitychange"));
    expect(e.frames.size).toBe(0);
  });
});

function pointer(type: string, x = 120, y = 120, id = 1) {
  return Object.assign(new Event(type), {
    clientX: x,
    clientY: y,
    pointerId: id,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
  });
}
describe("character grab lifecycle", () => {
  it("captures the drag, rejects a second pointer, then releases and returns home with one frame owner", () => {
    const e = environment();
    e.play.dispatchEvent(pointer("pointerdown"));
    expect(e.play.capture).toBe(1);
    e.play.dispatchEvent(pointer("pointerdown", 200, 180, 2));
    e.play.dispatchEvent(pointer("pointermove", 200, 180));
    for (let i = 0; i < 12; i++) e.advance(16);
    expect(e.root.dataset.performance).toBe("grab");
    expect(e.play.style.transform).toContain("translate(");
    expect(e.frames.size).toBe(1);
    e.play.dispatchEvent(pointer("pointerup", 200, 180));
    expect(e.play.capture).toBeNull();
    for (let i = 0; i < 120; i++) e.advance(16);
    expect(e.play.style.transform).toBe("");
    expect(e.root.dataset.grabMotion).toBe("false");
    e.cleanup();
  });
  it("suppresses a drag click before the background handler while leaving keyboard activation available", () => {
    const e = environment();
    e.play.dispatchEvent(pointer("pointerdown"));
    e.play.dispatchEvent(pointer("pointermove", 200, 180));
    e.advance(16);
    e.play.dispatchEvent(pointer("pointerup", 200, 180));
    const click = Object.assign(new Event("click", { cancelable: true }), {
      detail: 1,
    });
    e.play.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const keyboard = Object.assign(new Event("click", { cancelable: true }), {
      detail: 0,
    });
    e.play.dispatchEvent(keyboard);
    expect(keyboard.defaultPrevented).toBe(false);
    e.cleanup();
  });
  it("clears capture and secondary transforms on motion preference, suspension, handoff, blur and disposal", () => {
    for (const interrupt of [
      (e: ReturnType<typeof environment>) =>
        e.command({ type: "reduce", value: true }),
      (e: ReturnType<typeof environment>) => e.intersection(false),
      (e: ReturnType<typeof environment>) =>
        e.root.dispatchEvent(
          new CustomEvent(BRAND_TURN_EVENT, { detail: true }),
        ),
      (e: ReturnType<typeof environment>) =>
        e.win.dispatchEvent(new Event("blur")),
      (e: ReturnType<typeof environment>) => e.cleanup(),
    ]) {
      const e = environment();
      e.play.dispatchEvent(pointer("pointerdown"));
      e.play.dispatchEvent(pointer("pointermove", 200, 180));
      e.advance(16);
      interrupt(e);
      expect(e.play.capture).toBeNull();
      expect(e.play.style.transform).toBe("");
      expect(e.root.dataset.grabbing).toBe("false");
      e.cleanup();
    }
  });
  it("returns on pointer cancellation and keyboard input, then allows another grab", () => {
    for (const type of ["pointercancel", "lostpointercapture", "keyboard"]) {
      const e = environment();
      e.play.dispatchEvent(pointer("pointerdown"));
      e.play.dispatchEvent(pointer("pointermove", 200, 180));
      e.advance(16);
      if (type === "keyboard") e.doc.dispatchEvent(new Event("keydown"));
      else e.play.dispatchEvent(pointer(type));
      expect(e.play.capture).toBeNull();
      for (let i = 0; i < 120; i++) e.advance(16);
      expect(e.play.style.transform).toBe("");
      e.play.dispatchEvent(pointer("pointerdown"));
      expect(e.play.capture).toBe(1);
      e.cleanup();
    }
  });
});

describe("character approach after rough handling", () => {
  it("dodges document pointer approaches only after rough handling and settling", () => {
    const e = environment();
    e.play.dispatchEvent(pointer("pointerdown"));
    for (const x of [230, 20, 230, 20]) {
      e.play.dispatchEvent(pointer("pointermove", x, 120));
      e.advance(80);
    }
    e.play.dispatchEvent(pointer("pointerup", 20, 120));
    for (let i = 0; i < 120; i++) e.advance(16);
    expect(e.play.style.transform).toBe("");
    e.doc.dispatchEvent(pointer("pointermove", 160, 122));
    e.advance(16);
    expect(e.root.dataset.performance).toBe("dodge");
    expect(e.root.dataset.grabMotion).toBe("true");
    expect(e.play.style.transform).not.toBe("");
    e.cleanup();
  });
});

describe("character happiness", () => {
  it("turns a gentle tap into a happy reaction and preserves keyboard activation", () => {
    const e = environment();
    e.play.dispatchEvent(pointer("pointerdown"));
    e.advance(80);
    e.play.dispatchEvent(pointer("pointerup"));
    e.play.dispatchEvent(Object.assign(new Event("click"), { detail: 1 }));
    for (let i = 0; i < 10; i++) e.advance(16);
    expect(e.root.dataset.performance).toBe("happy");
    expect(e.frames.size).toBe(1);
    for (let i = 0; i < 140; i++) e.advance(16);
    expect(e.root.dataset.performance).toBe("idle");
    e.play.dispatchEvent(Object.assign(new Event("click"), { detail: 0 }));
    for (let i = 0; i < 10; i++) e.advance(16);
    expect(e.root.dataset.performance).toBe("happy");
    e.cleanup();
  });
  it("a reassuring activation ends dodging and reduced motion clears its secondary movement", () => {
    const e = environment();
    e.play.dispatchEvent(pointer("pointerdown"));
    for (const x of [230, 20, 230, 20]) {
      e.play.dispatchEvent(pointer("pointermove", x, 120));
      e.advance(80);
    }
    e.play.dispatchEvent(pointer("pointerup", 20, 120));
    for (let i = 0; i < 120; i++) e.advance(16);
    e.doc.dispatchEvent(pointer("pointermove", 160, 122));
    e.advance(100);
    expect(e.root.dataset.performance).toBe("dodge");
    e.play.dispatchEvent(Object.assign(new Event("click"), { detail: 0 }));
    for (let i = 0; i < 40; i++) {
      e.doc.dispatchEvent(pointer("pointermove", 160, 122));
      e.advance(16);
      expect(e.root.dataset.performance).toBe("happy");
    }
    e.command({ type: "reduce", value: true });
    expect(e.play.style.transform).toBe("");
    expect(e.frames.size).toBe(0);
    e.cleanup();
  });
});
