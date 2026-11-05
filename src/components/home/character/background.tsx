"use client";

import { useLayoutEffect, useRef } from "react";
import { gradientToDataURL } from "@outpacelabs/avatars";

import { homeCharacterDeparture } from "./timing";
import {
  characterBackgroundColors,
  characterShuffle,
  currentCharacterBackground,
  followingCharacterBackground,
  rememberCharacterBackground,
} from "./backgrounds";
import { createCharacterMaterialLayers } from "./material-layers";
import { createCharacterPettingTempo } from "./material";

/*
 * While the page loads the bare glass stays monochrome; the first reveal
 * colours it with a shuffle through other materials. It winds up from a readable first beat to near-cuts, then
 * brakes over several growing beats, like a spring that has been flicked and
 * eases onto this load's colour on the long last step.
 */
const SHUFFLE_STEPS_MS = [64, 44, 30, 24, 24, 28, 40, 60, 90, 170];
// Bare glass holds a moment after load so the shuffle reads as its own beat.
const SHUFFLE_DELAY_MS = 160;
// Every shift is soft, so the run reads as one smeared motion, not flashes.
// The landing stays nearly as soft so it settles rather than snaps.
const SHUFFLE_BLUR_PX = 6;
const SETTLE_BLUR_PX = 7;
// Shuffle materials that have not decoded by then are skipped, not waited on.
const SHUFFLE_WAIT_MS = 250;
// The settled colour holds at least this long before the opening trip leaves,
// and up to the extra when time allows, so the landing reads while the
// character is still. A shuffle that would overrun is compressed to fit, but
// never below the minimum for the extra hold; below the minimum it would only
// flicker, so the colour just fades in instead.
const SETTLE_HOLD_MS = 120;
const SETTLE_EXTRA_HOLD_MS = 220;
const MIN_SHUFFLE_MS = 280;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
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
    const reveal = async () => {
      if (disposed || generation > 0) return;
      if (reduced.matches) {
        void show(initialBackground, 0, 0);
        return;
      }
      const landBy = () => {
        const departure = homeCharacterDeparture();
        return departure === undefined
          ? Infinity
          : departure - SETTLE_HOLD_MS - performance.now();
      };
      // The delay and decode wait overlap, and neither eats into the shortest shuffle.
      const startAt =
        performance.now() +
        Math.min(SHUFFLE_DELAY_MS, Math.max(0, landBy() - MIN_SHUFFLE_MS));
      // Stragglers may only use time the shortest shuffle can spare.
      const wait = Math.min(
        SHUFFLE_WAIT_MS,
        Math.max(0, landBy() - MIN_SHUFFLE_MS),
      );
      await Promise.race([
        Promise.allSettled(others.map(prepare)),
        new Promise((resolve) => window.setTimeout(resolve, wait)),
      ]);
      const delay = startAt - performance.now();
      if (delay > 0)
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      if (disposed || generation > 0) return;
      const ready = others.filter((index) => backgroundUrls.has(index));
      // Two or more decoded materials can fill every beat by repeating.
      let colors = [
        ...(ready.length > 1
          ? SHUFFLE_STEPS_MS.slice(1).map(
              (_, step) => ready[step % ready.length]!,
            )
          : ready),
        initialBackground,
      ];
      let steps = SHUFFLE_STEPS_MS.slice(-colors.length);
      const available = landBy();
      // The extra hold gives way first, down to the shortest shuffle.
      const budget = Math.max(MIN_SHUFFLE_MS, available - SETTLE_EXTRA_HOLD_MS);
      if (available < MIN_SHUFFLE_MS) {
        colors = [initialBackground];
        steps = [Math.max(120, available)];
      } else if (budget < sum(steps))
        steps = steps.map((ms) => (ms * budget) / sum(steps));
      // Each step ends on a fixed schedule, so frame latency never accumulates.
      const startedAt = performance.now();
      const ends = steps.map((_, step) => sum(steps.slice(0, step + 1)));
      for (const [step, index] of colors.entries()) {
        if (disposed || generation > 0) return;
        const duration = Math.max(
          16,
          startedAt + ends[step]! - performance.now(),
        );
        await show(
          index,
          duration,
          step === colors.length - 1 ? SETTLE_BLUR_PX : SHUFFLE_BLUR_PX,
        );
      }
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
    const others = characterShuffle(initialBackground);
    const revealing = !backgroundUrls.has(initialBackground);
    // Prioritize the settled fill. Reduced motion never needs shuffle meshes.
    const initialReady = prepare(initialBackground);
    if (revealing && !reduced.matches)
      for (const index of others) void prepare(index).catch(() => {});
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
