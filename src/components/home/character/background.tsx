"use client";

import { useLayoutEffect, useRef } from "react";
import { gradientToDataURL } from "@outpacelabs/avatars";

import {
  characterBackgroundColors,
  currentCharacterBackground,
  followingCharacterBackground,
  rememberCharacterBackground,
} from "./backgrounds";
import { createCharacterMaterialLayers } from "./material-layers";
import { createCharacterPettingTempo } from "./material";

/*
 * While the page loads the bare glass stays monochrome; the first reveal
 * fades this load's colour in once its mesh has decoded.
 */
const REVEAL_MS = 400;
const REVEAL_BLUR_PX = 6;
// SVG image hrefs survive frozen DOM snapshots, unlike a cloned canvas
// bitmap. Cache the small, generated PNGs across remounts and lab faces.
// The finite seed list bounds this cache; nothing is fetched or persisted.
const backgroundUrls = new Map<number, string>();
const pendingBackgrounds = new Map<number, Promise<void>>();

function prepareBackground(seed: number) {
  if (backgroundUrls.has(seed)) return Promise.resolve();
  const pending = pendingBackgrounds.get(seed);
  if (pending) return pending;
  const ready = Promise.resolve().then(async () => {
    const url = gradientToDataURL(seed, {
      colors: characterBackgroundColors(seed),
      size: 256,
      // 80 SVG units in a 58-unit viewBox displayed at 44 CSS pixels.
      // Resolution stays sharp at high DPR without adding tiny mesh details.
      displaySize: (80 * 44) / 58,
      pattern: "mesh",
      p3: true,
    });
    const image = new Image();
    image.src = url;
    await image.decode();
    backgroundUrls.set(seed, url);
  });
  pendingBackgrounds.set(seed, ready);
  void ready.then(
    () => pendingBackgrounds.delete(seed),
    () => pendingBackgrounds.delete(seed),
  );
  return ready;
}

/** Only the material changes: expressions and the glass edges stay sharp. */
export function HomeCharacterBackground() {
  const ref = useRef<SVGGElement>(null);

  // Browser rendering lives in the effect; the SVG glass base covers hydration.
  useLayoutEffect(() => {
    const group = ref.current;
    const button = group?.closest("button");
    if (!group || !button) return;
    const material = createCharacterMaterialLayers(group);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialBackground = currentCharacterBackground();
    let requested = initialBackground;
    let generation = 0;
    let disposed = false;
    const pettingTempo = createCharacterPettingTempo();
    group.dataset.background = String(initialBackground);
    const cached = backgroundUrls.get(initialBackground);
    if (cached) void material.show(cached, 0, 0);

    const prepare = prepareBackground;
    const show = (
      index: number,
      duration: number,
      blur: number,
      wipe = false,
    ) => {
      group.dataset.background = String(index);
      return material.show(
        backgroundUrls.get(index)!,
        reduced.matches ? 0 : duration,
        blur,
        wipe,
      );
    };
    const reveal = () => {
      if (disposed || generation > 0) return;
      void show(initialBackground, REVEAL_MS, REVEAL_BLUR_PX);
    };
    const change = async () => {
      const duration = pettingTempo(performance.now());
      // Existing sweeps accelerate underneath the new fill. Never wait for a
      // previous animation: the next pet starts its own blend as soon as ready.
      if (!reduced.matches) {
        material.accelerate(duration);
      }
      const index = followingCharacterBackground(requested);
      requested = index;
      const request = ++generation;
      try {
        await prepare(index);
      } catch {
        return;
      }
      if (disposed || request !== generation) return;
      rememberCharacterBackground(index);
      void show(index, duration, 12, true);
      void prepare(followingCharacterBackground(index)).catch(() => {});
    };
    const onReducedChange = () => {
      if (!reduced.matches) return;
      // Invalidate any shuffle still awaiting a decode/animation, then finish
      // on the latest requested material without starting another transition.
      const request = ++generation;
      material.finish();
      void prepare(requested).then(
        () => {
          if (disposed || request !== generation) return;
          rememberCharacterBackground(requested);
          void show(requested, 0, 0);
        },
        () => {},
      );
    };
    button.addEventListener("click", change);
    reduced.addEventListener("change", onReducedChange);
    // Generate only in the client effect, never during server rendering.
    const revealing = !backgroundUrls.has(initialBackground);
    const initialReady = prepare(initialBackground);
    if (!revealing) group.style.opacity = "1";
    else
      void initialReady.then(reveal, () => {
        // Canvas/decoding unavailable: the SVG's static glass base remains.
      });
    void prepare(followingCharacterBackground(initialBackground)).catch(
      () => {},
    );
    return () => {
      disposed = true;
      generation++;
      material.dispose();
      button.removeEventListener("click", change);
      reduced.removeEventListener("change", onReducedChange);
    };
  }, []);

  // The effect owns these image layers so overlapping fades can retire them
  // independently. The server's static glass remains a complete fallback.
  return <g ref={ref} data-character-background="" style={{ opacity: 0 }} />;
}
