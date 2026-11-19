"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import styles from "./variants.module.css";

const filters = [
  ["all", "All"],
  ["mobile", "Mobile"],
  ["web", "Web"],
  ["motion", "Motion"],
] as const;

type Filter = (typeof filters)[number][0];

/** How long a leaving tile takes to break up. */
const EXIT_MS = 720;
/** How far into the break-up the rest of the list starts to close over it. */
const HOLD_MS = 300;
const MOVE_MS = 560;
const MOVE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** How far the dust is thrown, in the displacement map's own units. */
const DUST_SCALE = 200;

function matches(tile: HTMLElement, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "motion") return tile.hasAttribute("data-motion");
  return tile.dataset.kind === filter;
}

/**
 * The feed with a filter above it. Tiles are rendered by the server and read
 * here by their `data-kind` and `data-motion`. A tile that no longer matches
 * breaks up into dust where it stood; the ones that stay slide to their new
 * places. With reduced motion the list simply changes.
 */
export function FilteredFeed({
  heading,
  className,
  children,
}: {
  heading: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const settle = useRef<(() => void) | null>(null);
  const filterId = `dust-${useId().replace(/:/g, "")}`;

  useEffect(() => () => settle.current?.(), []);

  const apply = (filter: Filter) => {
    const list = root.current;
    if (!list) return;
    // A change made mid-animation lands the previous one first.
    settle.current?.();

    const tiles = [...list.children] as HTMLElement[];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const tile of tiles) tile.hidden = !matches(tile, filter);
      return;
    }

    const visible = tiles.filter((tile) => !tile.hidden);
    const leaving = visible.filter((tile) => !matches(tile, filter));
    const staying = visible.filter((tile) => matches(tile, filter));
    const entering = tiles.filter(
      (tile) => tile.hidden && matches(tile, filter),
    );

    // Positions are kept against the list, so a scroll during the hold
    // doesn't throw the slide off.
    const offset = (tile: HTMLElement) => {
      const rect = tile.getBoundingClientRect();
      const origin = list.getBoundingClientRect();
      return { top: rect.top - origin.top, left: rect.left - origin.left };
    };
    const before = new Map(visible.map((tile) => [tile, offset(tile)]));

    const animations: Animation[] = [];
    let frame = 0;
    let hold = 0;

    // First the leaving tiles start to break up where they stand, still
    // holding their room in the list.
    for (const tile of leaving) {
      tile.style.pointerEvents = "none";
      tile.style.filter = `url(#${filterId})`;
      animations.push(
        tile.animate(
          [
            { opacity: 1, transform: "none" },
            { opacity: 0.85, offset: 0.35 },
            { opacity: 0, transform: "translateY(-24px) scale(1.05)" },
          ],
          { duration: EXIT_MS, easing: "ease-in", fill: "forwards" },
        ),
      );
    }

    // The grains scatter further as the tile fades.
    let started: number | null = null;
    const scatter = (now: number) => {
      started ??= now;
      const progress = Math.min((now - started) / EXIT_MS, 1);
      displacement.current?.setAttribute(
        "scale",
        String(DUST_SCALE * progress * progress),
      );
      if (progress < 1) frame = requestAnimationFrame(scatter);
    };
    if (leaving.length > 0) frame = requestAnimationFrame(scatter);

    // Once the dust is underway they give up their room, and the rest of the
    // list slides into place over them.
    const reflow = () => {
      hold = 0;
      for (const tile of leaving) {
        const from = before.get(tile);
        if (!from) continue;
        Object.assign(tile.style, {
          position: "absolute",
          top: `${from.top}px`,
          left: `${from.left}px`,
          width: `${tile.offsetWidth}px`,
        });
      }
      for (const tile of entering) tile.hidden = false;

      for (const tile of staying) {
        const from = before.get(tile);
        if (!from) continue;
        const shift = from.top - offset(tile).top;
        if (shift === 0) continue;
        animations.push(
          tile.animate(
            [{ transform: `translateY(${shift}px)` }, { transform: "none" }],
            { duration: MOVE_MS, easing: MOVE_EASE },
          ),
        );
      }
      for (const tile of entering) {
        animations.push(
          tile.animate(
            [
              { opacity: 0, transform: "translateY(16px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 440, delay: 140, easing: MOVE_EASE, fill: "backwards" },
          ),
        );
      }
    };
    if (leaving.length > 0) hold = window.setTimeout(reflow, HOLD_MS);
    else reflow();

    const total =
      leaving.length > 0 ? Math.max(EXIT_MS, HOLD_MS + MOVE_MS) : MOVE_MS;
    const timer = window.setTimeout(() => settle.current?.(), total + 20);
    settle.current = () => {
      window.clearTimeout(timer);
      window.clearTimeout(hold);
      cancelAnimationFrame(frame);
      for (const animation of animations) animation.cancel();
      for (const tile of leaving) {
        tile.hidden = true;
        tile.removeAttribute("style");
      }
      for (const tile of entering) tile.hidden = false;
      displacement.current?.setAttribute("scale", "0");
      settle.current = null;
    };
  };

  return (
    <>
      <div className={styles.sheetHead}>
        {heading}
        <fieldset className={styles.filters}>
          <legend className="sr-only">Show</legend>
          {filters.map(([value, label]) => (
            <label key={value}>
              <input
                defaultChecked={value === "all"}
                name="feed-filter"
                onChange={() => apply(value)}
                type="radio"
                value={value}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <svg aria-hidden="true" className={styles.dustFilter}>
        <filter height="160%" id={filterId} width="160%" x="-30%" y="-30%">
          <feTurbulence
            baseFrequency="0.85"
            numOctaves="1"
            result="grain"
            type="fractalNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            ref={displacement}
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div className={`${styles.filteredList} ${className ?? ""}`} ref={root}>
        {children}
      </div>
    </>
  );
}
