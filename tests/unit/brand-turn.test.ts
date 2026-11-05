import { describe, expect, it } from "bun:test";
import { copyBrandArtwork } from "../../src/components/motion/brand-turn-artwork";
import {
  BRAND_HANDOFFS,
  brandHandoffPlan,
  brandTurnFrames,
} from "../../src/components/motion/brand-turn-motion";

class ArtworkNode {
  inert = false;
  children: ArtworkNode[] = [];
  attrs = new Map<string, string>();
  paint = new Map<string, string>();
  style = {
    values: new Map<string, string>(),
    setProperty: (key: string, value: string) => {
      this.style.values.set(key, value);
    },
  };
  constructor(public namespaceURI = "http://www.w3.org/2000/svg") {}
  get id() {
    return this.attrs.get("id") ?? "";
  }
  get attributes() {
    return [...this.attrs].map(([name, value]) => ({ name, value }));
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  querySelectorAll(): ArtworkNode[] {
    return this.children.flatMap((node) => [node, ...node.querySelectorAll()]);
  }
  cloneNode(): ArtworkNode {
    const clone = new ArtworkNode(this.namespaceURI);
    clone.attrs = new Map(this.attrs);
    clone.children = this.children.map((child) => child.cloneNode());
    return clone;
  }
}

describe("brand handoff", () => {
  it("keeps the outlined face's rendered material after leaving its ancestor selectors", () => {
    const source = new ArtworkNode("http://www.w3.org/1999/xhtml");
    source.paint.set("color", "rgb(42, 42, 42)");
    const shell = new ArtworkNode(),
      pupil = new ArtworkNode();
    shell.paint.set("display", "block");
    shell.paint.set("fill", "rgb(252, 252, 252)");
    shell.paint.set("stroke", "rgb(42, 42, 42)");
    pupil.paint.set("fill", "rgb(252, 252, 252)");
    source.children.push(shell, pupil);
    const copy = copyBrandArtwork(
      source as unknown as HTMLElement,
      "-copy",
      (node) =>
        ({
          getPropertyValue: (key) =>
            (node as unknown as ArtworkNode).paint.get(key) ?? "",
        }) as CSSStyleDeclaration,
    ) as unknown as ArtworkNode;
    expect(copy.children[0]!.style.values.get("display")).toBe("block");
    expect(copy.children[0]!.style.values.get("stroke")).toBe(
      "rgb(42, 42, 42)",
    );
    expect(copy.children[1]!.style.values.get("fill")).toBe(
      "rgb(252, 252, 252)",
    );
    expect(copy.style.values.get("color")).toBe("rgb(42, 42, 42)");
    expect(copy.inert).toBe(true);
    expect(source.style.values.size).toBe(0);
  });
  it("keeps cloned clips and links unique without altering the original artwork", () => {
    const source = new ArtworkNode(),
      clip = new ArtworkNode(),
      eye = new ArtworkNode();
    clip.setAttribute("id", "eye-0");
    eye.setAttribute("clip-path", "url(#eye-0)");
    eye.setAttribute("href", "#eye-0");
    source.children.push(clip, eye);
    const copy = copyBrandArtwork(
      source as unknown as HTMLElement,
      "-turn-2",
      () => ({ getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration,
    ) as unknown as ArtworkNode;
    expect(copy.children[0]!.id).toBe("eye-0-turn-2");
    expect(copy.children[1]!.attrs.get("clip-path")).toBe("url(#eye-0-turn-2)");
    expect(copy.children[1]!.attrs.get("href")).toBe("#eye-0-turn-2");
    expect(clip.id).toBe("eye-0");
  });
  it("re-points copied computed paints, which serialise with quotes", () => {
    const source = new ArtworkNode(),
      gradient = new ArtworkNode(),
      shell = new ArtworkNode();
    gradient.setAttribute("id", "glass-base");
    shell.setAttribute("style", 'fill: url("#glass-base");');
    shell.setAttribute("stroke", "url('#glass-base')");
    source.children.push(gradient, shell);
    const copy = copyBrandArtwork(
      source as unknown as HTMLElement,
      "-turn-3",
      () => ({ getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration,
    ) as unknown as ArtworkNode;
    expect(copy.children[1]!.attrs.get("style")).toBe(
      'fill: url("#glass-base-turn-3");',
    );
    expect(copy.children[1]!.attrs.get("stroke")).toBe(
      "url('#glass-base-turn-3')",
    );
  });
  it("overlaps both faces on one timeline without disappearing edge-on or orbiting away", () => {
    for (const direction of [-1, 1]) {
      const incoming = brandTurnFrames(direction, true),
        outgoing = brandTurnFrames(direction, false);
      expect(incoming[0]!.opacity).toBe(0);
      expect(outgoing[0]!.opacity).toBe(1);
      expect(incoming.at(-1)!.opacity).toBe(1);
      expect(outgoing.at(-1)!.opacity).toBe(0);
      expect(incoming[12]!.opacity).toBeCloseTo(0.5);
      expect(outgoing[12]!.opacity).toBeCloseTo(0.5);
      incoming.forEach((frame, i) => {
        expect(
          Number(frame.opacity) + Number(outgoing[i]!.opacity),
        ).toBeCloseTo(1);
        for (const f of [frame, outgoing[i]!]) {
          const transform = String(f.transform);
          const rotation = Number(transform.match(/rotateY\(([^d]+)deg\)/)![1]);
          const position = transform.match(
            /translate3d\(([^p]+)px, ([^p]+)px/,
          )!;
          expect(Math.abs(rotation)).toBeLessThanOrEqual(52);
          expect(Math.abs(Number(position[1]))).toBeLessThanOrEqual(1.5);
          expect(Math.abs(Number(position[2]))).toBeLessThanOrEqual(1.5);
          expect(transform).not.toMatch(/NaN|Infinity/);
        }
      });
    }
  });
  it("starts every handoff on the outgoing face and rests on the incoming one", () => {
    const visible = (frame: Keyframe) => Number(frame.opacity ?? 1);
    const rest = (frame: Keyframe) => {
      const numbers = [
        ...String(frame.transform ?? "").matchAll(
          /(scale|translate\w*|rotate\w*)\(([^)]*)\)/g,
        ),
      ];
      for (const [, fn, args] of numbers)
        for (const value of args!.split(",").map((v) => parseFloat(v)))
          expect(value).toBeCloseTo(fn === "scale" ? 1 : 0, 3);
      expect(String(frame.filter ?? "blur(0px)")).toBe("blur(0px)");
    };
    for (const style of BRAND_HANDOFFS)
      for (const direction of [-1, 1]) {
        const { duration, outgoing, incoming } = brandHandoffPlan(
          style,
          direction,
        );
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThanOrEqual(450);
        rest(outgoing[0]!);
        rest(incoming.at(-1)!);
        expect(visible(outgoing[0]!)).toBe(1);
        expect(visible(incoming.at(-1)!)).toBe(1);
        expect(visible(outgoing.at(-1)!)).toBe(style === "slot" ? 1 : 0);
        if (style === "iris")
          expect(String(incoming[0]!.clipPath)).toBe("circle(0% at 50% 50%)");
        else if (style !== "slot") expect(visible(incoming[0]!)).toBe(0);
        for (const frame of [...outgoing, ...incoming])
          expect(JSON.stringify(frame)).not.toMatch(/NaN|Infinity/);
      }
  });
  it("runs the slot reel off the window in the direction of travel", () => {
    for (const direction of [-1, 1]) {
      const { outgoing, incoming } = brandHandoffPlan("slot", direction);
      const y = (frame: Keyframe) =>
        parseFloat(String(frame.transform).match(/translateY\(([^p]+)px/)![1]!);
      expect(Math.sign(y(outgoing.at(-1)!))).toBe(-direction);
      expect(Math.abs(y(outgoing.at(-1)!))).toBeGreaterThanOrEqual(44);
      expect(Math.sign(y(incoming[0]!))).toBe(direction);
    }
  });
});
