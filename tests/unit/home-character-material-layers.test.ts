import { restingPose } from "../../src/components/home/character/pose";
import { afterEach, describe, expect, it } from "bun:test";
import { createCharacterMaterialLayers } from "../../src/components/home/character/material-layers";

class Fade {
  playbackRate = 1;
  cancelled = false;
  finish!: () => void;
  reject!: () => void;
  finished = new Promise<void>((resolve, reject) => {
    this.finish = resolve;
    this.reject = () => reject(new Error("Cancelled"));
  });
  constructor(public duration: number) {}
  effect = { getTiming: () => ({ duration: this.duration }) };
  cancel() {
    this.cancelled = true;
    this.reject();
  }
  updatePlaybackRate(rate: number) {
    this.playbackRate = rate;
  }
}
class Layer {
  parentNode: Layer | null = null;
  children: Layer[] = [];
  style = { opacity: "", filter: "" };
  attrs = new Map<string, string>();
  fade: Fade | undefined;
  constructor(public tagName = "g") {}
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  removeAttribute(name: string) {
    this.attrs.delete(name);
  }
  animate(_frames: Keyframe[], options: KeyframeAnimationOptions) {
    return (this.fade = new Fade(Number(options.duration)));
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(
      (l) => l !== this,
    );
    this.parentNode = null;
  }
  append(...layers: Layer[]) {
    for (const layer of layers) {
      layer.remove();
      layer.parentNode = this;
      this.children.push(layer);
    }
  }
  replaceChildren() {
    for (const layer of [...this.children]) layer.remove();
  }
  descendants(): Layer[] {
    return this.children.flatMap((l) => [l, ...l.descendants()]);
  }
}
class Group extends Layer {}
const href = (layer: Layer) =>
  layer
    .descendants()
    .find((l) => l.tagName === "image")!
    .attrs.get("href");
const revealEdge = (layer: Layer) =>
  layer.descendants().find((l) => l.tagName === "mask")!.children[0]!;
const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  "document",
);
afterEach(() => {
  if (originalDocument)
    Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});
function setup() {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElementNS: (_ns: string, tag: string) => new Layer(tag) },
  });
  const group = new Group();
  const material = createCharacterMaterialLayers(
    group as unknown as SVGGElement,
  );
  return { group, material };
}

describe("overlapping character materials", () => {
  it("starts the next fill while the previous one is unfinished and retires only covered layers", async () => {
    const { group, material } = setup();
    await material.show("base", 0, 0);
    const first = material.show("first", 900, 12);
    const second = material.show("second", 300, 12);
    expect(group.children.map(href)).toEqual(["base", "first", "second"]);
    expect(group.children[1]!.fade!.cancelled).toBe(false);
    expect(group.children[2]!.fade!.cancelled).toBe(false);
    const firstLayer = group.children[1]!;
    const secondLayer = group.children[2]!;
    firstLayer.fade!.finish();
    await first;
    expect(group.children).toEqual([firstLayer, secondLayer]);
    expect(secondLayer.fade!.cancelled).toBe(false);
    secondLayer.fade!.finish();
    await second;
    expect(group.children).toEqual([secondLayer]);
  });

  it("accelerates all live blends and handles the newest finishing first", async () => {
    const { group, material } = setup();
    await material.show("base", 0, 0);
    const first = material.show("slow", 900, 12);
    const second = material.show("fast", 300, 12);
    const older = group.children[1]!;
    const latest = group.children[2]!;
    material.accelerate(180);
    expect(older.fade!.playbackRate).toBe(5);
    expect(latest.fade!.playbackRate).toBeCloseTo(300 / 180);
    latest.fade!.finish();
    await second;
    await first;
    expect(older.fade!.cancelled).toBe(true);
    expect(group.children).toEqual([latest]);
  });

  it("finishes immediately for reduced motion and cannot restart after disposal", async () => {
    const { group, material } = setup();
    await material.show("base", 0, 0);
    const pending = material.show("next", 900, 12);
    const latest = group.children[1]!;
    material.finish();
    await pending;
    expect(group.children).toEqual([latest]);
    expect(latest.style.opacity).toBe("1");
    expect(latest.style.filter).toBe("none");
    const interrupted = material.show("interrupted", 300, 12);
    material.dispose();
    await interrupted;
    await material.show("late", 300, 12);
    expect(group.children).toHaveLength(0);
  });
});

describe("per-tap colour sweeps", () => {
  it("gives each tap a fresh empty reveal while the previous sweep continues", async () => {
    const { group, material } = setup();
    await material.show("base", 0, 0);
    const first = material.show("first", 900, 0, true, 0);
    const firstLayer = group.children[1]!;
    expect(revealEdge(firstLayer).attrs.get("d")).toBe("");
    material.update(restingPose(), 0, 225);
    const firstEdge = revealEdge(firstLayer).attrs.get("d");
    expect(firstEdge).not.toBe("");
    const second = material.show("second", 300, 0, true, 225);
    const secondLayer = group.children[2]!;
    expect(revealEdge(firstLayer).attrs.get("d")).toBe(firstEdge);
    expect(revealEdge(secondLayer).attrs.get("d")).toBe("");
    const reveal = secondLayer.descendants().find((l) => l.attrs.has("mask"))!;
    expect(
      reveal
        .descendants()
        .find((l) => l.tagName === "image")!
        .attrs.get("href"),
    ).toBe("second");
    expect(secondLayer.fade).toBeUndefined();
    material.update(restingPose(), 0, 375);
    expect(revealEdge(secondLayer).attrs.get("d")).not.toBe("");
    material.update(restingPose(), 0, 525);
    await first;
    await second;
    expect(group.children.map(href)).toEqual(["second"]);
    expect(secondLayer.descendants().some((l) => l.attrs.has("mask"))).toBe(
      false,
    );
    expect(
      secondLayer
        .descendants()
        .some((l) => l.attrs.has("data-character-sweep-shine")),
    ).toBe(false);
  });

  it("settles masks and independent shines immediately on reduced motion", async () => {
    const { group, material } = setup();
    await material.show("base", 0, 0);
    const first = material.show("first", 900, 0, true, 0);
    const second = material.show("second", 300, 0, true, 100);
    material.finish();
    await first;
    await second;
    expect(group.children.map(href)).toEqual(["second"]);
    expect(group.descendants().some((l) => l.attrs.has("mask"))).toBe(false);
    expect(
      group
        .descendants()
        .some((l) => l.attrs.has("data-character-sweep-shine")),
    ).toBe(false);
    const pending = material.show("next", 300, 0, true, 150);
    material.dispose();
    await pending;
    material.update(restingPose(), 0, 200);
    expect(group.children).toHaveLength(0);
  });
});
