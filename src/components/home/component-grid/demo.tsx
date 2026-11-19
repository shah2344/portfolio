"use client";

import { animate, m, useMotionValue, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

/*
 * A cursor and a script for the cards that show a flow rather than a part.
 * The glyphs are the macOS pointer, pointing hand and I-beam from Benji
 * Taylor's Stageshow kit (MIT); the rules follow it too: the cursor aims at
 * things by name and measures them, moves in a shallow arc timed by
 * distance, shows each press, and every change on screen has a cause.
 */

export type CursorKind = "pointer" | "hand" | "ibeam";

function Pointer() {
  return (
    <svg fill="none" height="32" viewBox="0 0 32 32" width="32">
      <g transform="translate(10 7)">
        <path
          d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z"
          fill="#fff"
        />
        <path
          d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z"
          fill="#000"
        />
      </g>
    </svg>
  );
}

function Hand() {
  return (
    <svg fill="none" height="34" viewBox="0 0 32 32" width="34">
      <path
        d="M10.6 6a1.7 1.7 0 0 1 3.4 0v6.6a1.3 1.3 0 0 1 2.6 0v.7a1.3 1.3 0 0 1 2.6 0v.7a1.3 1.3 0 0 1 2.6 0V19c0 3.1-2 5.6-5 5.6h-2.6c-2 0-3.3-.9-4.4-2.4l-3.1-4.1c-.6-.9-.4-2 .5-2.5.8-.4 1.7-.2 2.3.5l1.1 1.4V6Z"
        fill="#fff"
        stroke="#000"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
      <path
        d="M14 12.6v3.6M16.6 13.3v3M19.2 14v2.6"
        stroke="#000"
        strokeLinecap="round"
        strokeWidth="1"
      />
    </svg>
  );
}

function IBeam() {
  return (
    <svg
      fill="none"
      height="20"
      overflow="visible"
      viewBox="0 0 10 16"
      width="12.5"
    >
      <path
        d="M3 1H7M3 15H7M5 1V15"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="2.6"
      />
      <path
        d="M3 1H7M3 15H7M5 1V15"
        stroke="#000"
        strokeLinecap="round"
        strokeWidth="1"
      />
    </svg>
  );
}

// Where each glyph's hotspot sits in its box, so the point is the click.
const GLYPHS = {
  pointer: { Glyph: Pointer, x: 10, y: 7 },
  hand: { Glyph: Hand, x: 12.75, y: 4.25 },
  ibeam: { Glyph: IBeam, x: 6.25, y: 10 },
} as const;

/** The cursor, drawn at `x`/`y` in the stage's own points. */
export function DemoCursor({
  x,
  y,
  kind,
  pressed,
  shown,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  kind: CursorKind;
  pressed: boolean;
  shown: boolean;
}) {
  return (
    <m.div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-50"
      animate={{ opacity: shown ? 1 : 0 }}
      initial={false}
      style={{ x, y }}
      transition={{ duration: 0.25 }}
    >
      <m.div
        animate={{ scale: pressed ? 0.86 : 1 }}
        transition={{ type: "spring", duration: 0.18, bounce: 0 }}
        style={{ display: "grid" }}
      >
        {(Object.keys(GLYPHS) as CursorKind[]).map((key) => {
          const { Glyph, x: hx, y: hy } = GLYPHS[key];
          const active = key === kind;
          return (
            <div
              key={key}
              style={{
                gridArea: "1 / 1",
                marginLeft: -hx,
                marginTop: -hy,
                transformOrigin: `${hx}px ${hy}px`,
                transform: `scale(${active ? 1 : 0})`,
                opacity: active ? 1 : 0,
                transition: "transform 0.2s ease, opacity 0.2s ease",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18))",
              }}
            >
              <Glyph />
            </div>
          );
        })}
      </m.div>
    </m.div>
  );
}

class Stopped extends Error {}

export type Act = {
  wait: (ms: number) => Promise<void>;
  /** Glide to the element marked `data-demo={name}`, at `ax`/`ay` of its box. */
  move: (
    name: string,
    options?: { kind?: CursorKind; ax?: number; ay?: number },
  ) => Promise<void>;
  /** Glide to a point in the stage's own points. */
  moveTo: (x: number, y: number, kind?: CursorKind) => Promise<void>;
  click: () => Promise<void>;
  /** Type `text` a key at a time through `set`. */
  type: (
    set: (value: string) => void,
    text: string,
    options?: { from?: string; ms?: number },
  ) => Promise<void>;
};

/**
 * Runs `script` in a loop while the stage is on screen, for visitors who
 * haven't asked for reduced motion. Leaving the screen stops it and calls
 * `reset`, so it starts clean next time; reduced motion never starts it, so
 * the stage shows its poster state instead.
 */
export function useDemo(
  root: RefObject<HTMLElement | null>,
  script: (act: Act) => Promise<void>,
  {
    reset,
    home,
    interactive = false,
  }: {
    reset: () => void;
    /** Where the cursor rests between runs, in stage points. */
    home: { x: number; y: number };
    /**
     * The component works for real: while the pointer is over its card the
     * film stops and leaves things as they are, and it starts over a moment
     * after the pointer leaves.
     */
    interactive?: boolean;
  },
) {
  const x = useMotionValue(home.x);
  const y = useMotionValue(home.y);
  const [kind, setKind] = useState<CursorKind>("pointer");
  const [pressed, setPressed] = useState(false);
  const [running, setRunning] = useState(false);
  const latest = useRef({ script, reset, home });

  useEffect(() => {
    latest.current = { script, reset, home };
  });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const card = element.closest<HTMLElement>("[role=group]") ?? element;
    let token = 0;
    let visible = false;
    let hovered = false;
    let resume: ReturnType<typeof setTimeout> | undefined;

    const start = async () => {
      const mine = ++token;
      const alive = () => {
        if (mine !== token) throw new Stopped();
      };
      const wait = (ms: number) =>
        new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            if (mine !== token) reject(new Stopped());
            else resolve();
          }, ms);
        });
      // Stage points: the stage is drawn scaled, so screen distances are
      // divided by its scale.
      const locate = (name: string, ax = 0.5, ay = 0.5) => {
        const target = element.querySelector<HTMLElement>(
          `[data-demo="${name}"]`,
        );
        if (!target) return null;
        const box = element.getBoundingClientRect();
        const scale = box.width / element.offsetWidth || 1;
        const rect = target.getBoundingClientRect();
        return {
          x: (rect.left - box.left + rect.width * ax) / scale,
          y: (rect.top - box.top + rect.height * ay) / scale,
        };
      };
      const glide = async (tx: number, ty: number) => {
        const distance = Math.hypot(tx - x.get(), ty - y.get());
        const duration = Math.min(0.9, 0.32 + distance / 900);
        // Different eases on the two axes bend the path into a shallow arc.
        await Promise.all([
          animate(x, tx, { duration, ease: [0.45, 0, 0.25, 1] }),
          animate(y, ty, { duration, ease: [0.3, 0, 0.15, 1] }),
        ]);
        alive();
      };
      const act: Act = {
        wait,
        move: async (name, options = {}) => {
          const point = locate(name, options.ax, options.ay);
          if (!point) return;
          await glide(point.x, point.y);
          if (options.kind) setKind(options.kind);
        },
        moveTo: async (tx, ty, next) => {
          await glide(tx, ty);
          if (next) setKind(next);
        },
        click: async () => {
          setPressed(true);
          await wait(110);
          setPressed(false);
          await wait(60);
        },
        type: async (set, text, options = {}) => {
          const from = options.from ?? "";
          for (let i = 1; i <= text.length; i++) {
            set(from + text.slice(0, i));
            await wait(options.ms ?? 95);
          }
        },
      };

      setRunning(true);
      // Reset once, as it starts. Each pass of the script then picks up
      // where the last left off, so what one pass made stays on screen.
      latest.current.reset();
      try {
        for (;;) {
          alive();
          x.set(latest.current.home.x);
          y.set(latest.current.home.y);
          setKind("pointer");
          await latest.current.script(act);
        }
      } catch (error) {
        if (!(error instanceof Stopped)) throw error;
      }
    };

    const stop = (clean = true) => {
      token++;
      setRunning(false);
      setPressed(false);
      if (clean) latest.current.reset();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (reduce.matches) return;
        if (visible && !hovered) void start();
        else if (!visible) stop();
      },
      { threshold: 0.35 },
    );
    observer.observe(element);

    const onEnter = () => {
      hovered = true;
      clearTimeout(resume);
      stop(false);
    };
    const onLeave = () => {
      hovered = false;
      clearTimeout(resume);
      resume = setTimeout(() => {
        if (visible && !hovered && !reduce.matches) void start();
      }, 1800);
    };
    if (interactive) {
      card.addEventListener("pointerenter", onEnter);
      card.addEventListener("pointerleave", onLeave);
    }

    return () => {
      observer.disconnect();
      clearTimeout(resume);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      token++;
    };
  }, [root, x, y, interactive]);

  return { x, y, kind, pressed, running };
}
