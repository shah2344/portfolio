import { restingPose, type CharacterPose } from "./pose";
import { characterMaterialSweep, createCharacterShine } from "./material";

const SVG_NS = "http://www.w3.org/2000/svg";
let nextMask = 0;
type Sweep = {
  clock: ReturnType<typeof createCharacterShine>;
  definition: SVGDefsElement;
  edge: SVGPathElement;
  reveal: SVGGElement;
  shine: SVGGElement;
  halo: SVGPathElement;
  core: SVGPathElement;
  resolve: () => void;
};
const owners = new WeakMap<
  SVGGElement,
  {
    update(pose: CharacterPose, roll: number, time: number): void;
  }
>();

/** Called by the character's existing frame owner: no second animation loop. */
export function updateCharacterMaterialLayers(
  group: SVGGElement,
  pose: CharacterPose,
  roll: number,
  time: number,
) {
  owners.get(group)?.update(pose, roll, time);
}

/** Each tap adds a colour and its own shine/reveal edge over the live composite. */
export function createCharacterMaterialLayers(group: SVGGElement) {
  const animations = new Map<SVGGElement, Animation>();
  const sweeps = new Map<SVGGElement, Sweep>();
  let active: SVGGElement | undefined;
  let disposed = false;

  const remove = (layer: SVGGElement) => {
    animations.get(layer)?.cancel();
    animations.delete(layer);
    sweeps.get(layer)?.resolve();
    sweeps.delete(layer);
    layer.remove();
  };
  const coverOlder = (layer: SVGGElement) => {
    for (const older of [...group.children] as SVGGElement[]) {
      if (older === layer) break;
      remove(older);
    }
  };
  const completeSweep = (layer: SVGGElement, sweep: Sweep) => {
    layer.removeAttribute("data-character-sweep");
    sweep.reveal.removeAttribute("mask");
    sweep.definition.remove();
    sweep.shine.remove();
    sweeps.delete(layer);
    sweep.resolve();
  };
  const finish = () => {
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
    for (const [layer, sweep] of sweeps) completeSweep(layer, sweep);
    for (const layer of [...group.children] as SVGGElement[])
      if (layer !== active) layer.remove();
    if (active) {
      active.style.opacity = "1";
      active.style.filter = "none";
    }
  };
  const update = (pose: CharacterPose, roll: number, time: number) => {
    for (const [layer, sweep] of [...sweeps]) {
      if (!sweeps.has(layer)) continue;
      const progress = sweep.clock.progress(time);
      if (progress >= 1) {
        completeSweep(layer, sweep);
        coverOlder(layer);
        continue;
      }
      const geometry = characterMaterialSweep(pose, roll, progress);
      sweep.edge.setAttribute("d", geometry.reveal);
      sweep.edge.setAttribute("transform", geometry.transform);
      sweep.shine.setAttribute("transform", geometry.transform);
      sweep.shine.style.opacity = `calc(var(--character-glass-hotspot) * ${geometry.opacity})`;
      sweep.halo.setAttribute("d", geometry.edge);
      sweep.halo.setAttribute("stroke-width", String(geometry.halo));
      sweep.core.setAttribute("d", geometry.edge);
      sweep.core.setAttribute("stroke-width", String(geometry.core));
    }
  };
  const owner = { update };
  owners.set(group, owner);

  return {
    finish,
    update,
    accelerate(duration: number, time = performance.now()) {
      for (const sweep of sweeps.values())
        sweep.clock.accelerate(time, duration);
      for (const animation of animations.values()) {
        const original = Number(animation.effect?.getTiming().duration);
        if (original > 0)
          animation.updatePlaybackRate(Math.max(1, original / duration));
      }
    },
    show(
      url: string,
      duration: number,
      blur: number,
      wipe = false,
      time = performance.now(),
    ) {
      if (disposed) return Promise.resolve();
      const layer = document.createElementNS(SVG_NS, "g");
      const field = document.createElementNS(SVG_NS, "g");
      field.setAttribute("data-character-material", "");
      const image = document.createElementNS(SVG_NS, "image");
      image.setAttribute("href", url);
      image.setAttribute("x", "-8");
      image.setAttribute("y", "-8");
      image.setAttribute("width", "80");
      image.setAttribute("height", "80");
      image.setAttribute("preserveAspectRatio", "xMidYMid slice");
      field.append(image);
      layer.append(field);
      layer.style.opacity = "1";
      group.append(layer);
      active = layer;
      group.style.opacity = "1";
      if (duration <= 0) {
        finish();
        return Promise.resolve();
      }
      if (wipe) {
        layer.setAttribute("data-character-sweep", "");
        const id = `character-material-wipe-${++nextMask}`;
        const definition = document.createElementNS(SVG_NS, "defs");
        // Feather the colour boundary as well as the shine over it.
        const mask = document.createElementNS(SVG_NS, "mask");
        mask.setAttribute("id", id);
        mask.setAttribute("maskUnits", "userSpaceOnUse");
        mask.setAttribute("maskContentUnits", "userSpaceOnUse");
        mask.setAttribute("mask-type", "alpha");
        mask.setAttribute("x", "-96");
        mask.setAttribute("y", "-96");
        mask.setAttribute("width", "256");
        mask.setAttribute("height", "256");
        const edge = document.createElementNS(SVG_NS, "path");
        edge.setAttribute("d", "");
        edge.setAttribute("fill", "white");
        edge.setAttribute("stroke", "none");
        edge.style.filter = "blur(2.4px)";
        mask.append(edge);
        definition.append(mask);
        const reveal = document.createElementNS(SVG_NS, "g");
        reveal.setAttribute("mask", `url(#${id})`);
        reveal.append(field);
        const shine = document.createElementNS(SVG_NS, "g");
        shine.setAttribute("data-character-sweep-shine", "");
        shine.setAttribute("fill", "none");
        shine.setAttribute("stroke", "white");
        shine.setAttribute("stroke-linecap", "round");
        const halo = document.createElementNS(SVG_NS, "path");
        halo.setAttribute("stroke-opacity", "0.36");
        halo.style.filter = "blur(3.2px)";
        const core = document.createElementNS(SVG_NS, "path");
        core.setAttribute("stroke-opacity", "0.65");
        core.style.filter = "blur(1.2px)";
        shine.append(halo, core);
        layer.append(definition, reveal, shine);
        const clock = createCharacterShine();
        clock.start(time, duration);
        const finished = new Promise<void>((resolve) => {
          sweeps.set(layer, {
            clock,
            definition,
            edge,
            reveal,
            shine,
            halo,
            core,
            resolve,
          });
        });
        update(restingPose(), 0, time);
        return finished;
      }
      const animation = layer.animate(
        [
          { opacity: 0, filter: `blur(${blur}px)` },
          { opacity: 0.5, filter: `blur(${(blur * 2) / 3}px)`, offset: 0.5 },
          { opacity: 1, filter: "blur(0px)" },
        ],
        { duration, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" },
      );
      animations.set(layer, animation);
      return animation.finished.then(
        () => {
          if (disposed || layer.parentNode !== group) return;
          layer.style.filter = "none";
          animations.delete(layer);
          animation.cancel();
          coverOlder(layer);
        },
        () => {
          animations.delete(layer);
        },
      );
    },
    dispose() {
      disposed = true;
      for (const layer of [...group.children] as SVGGElement[]) remove(layer);
      if (owners.get(group) === owner) owners.delete(group);
    },
  };
}
