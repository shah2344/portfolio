import { afterEach, expect, test } from "bun:test";
import {
  currentWipe,
  navigateToPage,
  updateWithWipe,
} from "../../src/components/motion/page-wipe";

const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  "document",
);
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  for (const [key, descriptor] of [
    ["document", originalDocument],
    ["window", originalWindow],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function browser({ reduced = false, supported = true } = {}) {
  const dataset: Record<string, string> = {};
  const properties = new Map<string, string>();
  const transitions: {
    finish: () => void;
    updated: Promise<void>;
    routeCapture: boolean;
    skipped: boolean;
  }[] = [];
  const video = {
    paused: false,
    isConnected: true,
    pause() {
      this.paused = true;
    },
    async play() {
      this.paused = false;
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { pathname: "/" },
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: reduced }),
      setTimeout: () => 0,
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {
        dataset,
        style: {
          setProperty: (name: string, value: string) =>
            properties.set(name, value),
          removeProperty: (name: string) => properties.delete(name),
        },
      },
      visibilityState: "visible",
      querySelectorAll: () => [video],
      querySelector: () => null,
      startViewTransition: supported
        ? (update: () => Promise<void>) => {
            let finish!: () => void;
            const finished = new Promise<void>((resolve) => {
              finish = resolve;
            });
            const updated = Promise.resolve().then(update);
            const record = {
              finish,
              updated,
              routeCapture: dataset.routeWipe !== undefined,
              skipped: false,
            };
            transitions.push(record);
            return {
              ready: updated,
              finished,
              skipTransition() {
                record.skipped = true;
                finish();
              },
            };
          }
        : undefined,
    },
  });
  return { dataset, transitions, video, properties };
}

test("appearance updates need no route arrival and restore paused video", async () => {
  const { dataset, transitions, video } = browser();
  let theme = "light";
  updateWithWipe(() => {
    theme = "dark";
  }, "forward");
  expect(video.paused).toBe(true);
  expect(dataset.pageWipe).toBe("forward");
  await transitions[0]!.updated;
  expect(theme).toBe("dark");
  expect(transitions[0]!.routeCapture).toBe(false);
  expect(dataset.routeWipe).toBeUndefined();
  const done = currentWipe();
  transitions[0]!.finish();
  await done;
  expect(currentWipe()).toBeNull();
  expect(dataset.pageWipe).toBeUndefined();
  expect(video.paused).toBe(false);
});

test("rapid appearance requests keep only the latest queued change", async () => {
  const { transitions } = browser();
  const applied: string[] = [];
  updateWithWipe(() => {
    applied.push("first");
  }, "forward");
  updateWithWipe(() => {
    applied.push("superseded");
  }, "back");
  updateWithWipe(() => {
    applied.push("latest");
  }, "back");
  await transitions[0]!.updated;
  const first = currentWipe();
  transitions[0]!.finish();
  await first;
  await transitions[1]!.updated;
  expect(applied).toEqual(["first", "latest"]);
  const last = currentWipe();
  transitions[1]!.finish();
  await last;
});

for (const settings of [{ reduced: true }, { supported: false }]) {
  test(`appearance switches immediately with ${JSON.stringify(settings)}`, () => {
    const { transitions, video } = browser(settings);
    let applied = false;
    updateWithWipe(() => {
      applied = true;
    }, "forward");
    expect(applied).toBe(true);
    expect(transitions).toHaveLength(0);
    expect(video.paused).toBe(false);
    expect(currentWipe()).toBeNull();
  });
}

test("button-origin wipe reaches the farthest corner and cleans up its geometry", async () => {
  const { dataset, transitions, properties } = browser();
  updateWithWipe(() => {}, "forward", { x: 344, y: 86 });
  expect(dataset.wipeOrigin).toBe("button");
  expect(properties.get("--theme-wipe-x")).toBe("344px");
  expect(properties.get("--theme-wipe-y")).toBe("86px");
  const radius = parseFloat(properties.get("--theme-wipe-end")!);
  for (const [x, y] of [
    [0, 0],
    [390, 0],
    [0, 844],
    [390, 844],
  ] as const) {
    expect(radius).toBeGreaterThanOrEqual(Math.hypot(x - 344, y - 86));
  }
  await transitions[0]!.updated;
  const done = currentWipe();
  transitions[0]!.finish();
  await done;
  expect(dataset.wipeOrigin).toBeUndefined();
  expect(properties.size).toBe(0);
});

test("route navigation is immediate and never captures or pauses video", () => {
  const { dataset, transitions, video } = browser();
  let destination = "/";
  navigateToPage(() => {
    destination = "/work/anyday";
  });
  expect(destination).toBe("/work/anyday");
  expect(transitions).toHaveLength(0);
  expect(video.paused).toBe(false);
  expect(currentWipe()).toBeNull();
  expect(dataset.pageWipe).toBeUndefined();
});

test("navigation interrupts a theme snapshot and drops queued theme changes", async () => {
  const { transitions } = browser();
  updateWithWipe(() => {}, "forward");
  await transitions[0]!.updated;
  let queued = false;
  updateWithWipe(() => {
    queued = true;
  }, "back");
  let navigated = false;
  const done = currentWipe();
  navigateToPage(() => {
    navigated = true;
  });
  expect(navigated).toBe(true);
  expect(transitions[0]!.skipped).toBe(true);
  await done;
  expect(queued).toBe(false);
  expect(transitions).toHaveLength(1);
  expect(currentWipe()).toBeNull();
});
