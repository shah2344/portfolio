import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import {
  createShotSnap,
  nearestSlide,
} from "../../src/components/work/anyday/shot-snap";

let now = 0;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
const originalRequest = globalThis.requestAnimationFrame;
const originalCancel = globalThis.cancelAnimationFrame;
let time: ReturnType<typeof spyOn>;

beforeEach(() => {
  now = 0;
  nextFrame = 0;
  frames.clear();
  time = spyOn(performance, "now").mockImplementation(() => now);
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
});
afterEach(() => {
  time.mockRestore();
  globalThis.requestAnimationFrame = originalRequest;
  globalThis.cancelAnimationFrame = originalCancel;
});

function tick(ms: number) {
  now += ms;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(now));
}
function rail() {
  const properties = new Map<string, [string, string]>([
    ["scroll-snap-type", ["x mandatory", ""]],
  ]);
  return {
    scrollLeft: 90,
    clientWidth: 300,
    scrollWidth: 900,
    children: [0, 200, 400].map((offsetLeft) => ({
      offsetLeft: offsetLeft + 50,
      offsetWidth: 200,
    })),
    style: {
      getPropertyValue: (key: string) => properties.get(key)?.[0] ?? "",
      getPropertyPriority: (key: string) => properties.get(key)?.[1] ?? "",
      setProperty: (key: string, value: string, priority = "") => {
        properties.set(key, [value, priority]);
      },
      removeProperty: (key: string) => {
        properties.delete(key);
      },
    },
    scrollTo(this: { scrollLeft: number }, { left }: ScrollToOptions) {
      this.scrollLeft = left ?? this.scrollLeft;
    },
  } as unknown as HTMLElement;
}

describe("AnyDay shot release", () => {
  it("returns a short drag to the nearest centre, starts moving on the first frame, and finishes within 280ms", () => {
    const track = rail();
    let completed = 0;
    const snap = createShotSnap(
      track,
      () => false,
      () => {
        completed++;
      },
    );
    snap.hold();
    snap.centre(nearestSlide(track), "smooth");
    expect(track.scrollLeft).toBe(90);
    expect(track.style.getPropertyValue("scroll-snap-type")).toBe("none");
    tick(16);
    expect(track.scrollLeft).toBeLessThan(90);
    expect(track.scrollLeft).toBeGreaterThan(0);
    tick(124);
    expect(track.scrollLeft).toBeLessThan(20);
    tick(140);
    expect(track.scrollLeft).toBe(0);
    expect(snap.active).toBe(false);
    expect(track.style.getPropertyValue("scroll-snap-type")).toBe(
      "x mandatory",
    );
    expect(completed).toBe(1);
    expect(frames.size).toBe(0);
  });
  it("a new gesture interrupts settling without moving the rail or restoring native snapping mid-gesture", () => {
    const track = rail();
    const snap = createShotSnap(
      track,
      () => false,
      () => {},
    );
    snap.centre(1, "smooth");
    tick(60);
    const interrupted = track.scrollLeft;
    snap.hold();
    tick(300);
    expect(track.scrollLeft).toBe(interrupted);
    expect(snap.active).toBe(true);
    expect(frames.size).toBe(0);
    snap.cancel();
    expect(track.style.getPropertyValue("scroll-snap-type")).toBe(
      "x mandatory",
    );
  });
  it("a drag past halfway centres the following card without overshooting", () => {
    const track = rail();
    track.scrollLeft = 110;
    const snap = createShotSnap(
      track,
      () => false,
      () => {},
    );
    snap.centre(nearestSlide(track), "smooth");
    for (let i = 0; i < 18; i++) {
      tick(16);
      expect(track.scrollLeft).toBeGreaterThanOrEqual(110);
      expect(track.scrollLeft).toBeLessThanOrEqual(200);
    }
    expect(track.scrollLeft).toBe(200);
  });
  it("reduced motion centres immediately and leaves no pending animation", () => {
    const track = rail();
    const snap = createShotSnap(
      track,
      () => true,
      () => {},
    );
    snap.centre(1, "smooth");
    expect(track.scrollLeft).toBe(200);
    expect(snap.active).toBe(false);
    expect(frames.size).toBe(0);
  });
});
