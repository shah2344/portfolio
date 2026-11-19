"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";

import { FitStage } from "../fit-stage";
import { useAutoplay } from "../use-autoplay";
import { AnimatedAmount } from "./ui/animated-amount";

const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
type Range = (typeof RANGES)[number];

const LABEL: Record<Range, string> = {
  "1D": "Payments today",
  "1W": "Payments this week",
  "1M": "Payments this month",
  "3M": "Payments last 3M",
  "6M": "Payments last 6M",
  "1Y": "Payments last 1Y",
};

const TOTAL: Record<Range, number> = {
  "1D": 1284.5,
  "1W": 8420.75,
  "1M": 32918.4,
  "3M": 96204.1,
  "6M": 184377.65,
  "1Y": 352910.3,
};

/* Running totals, as the product charts them, each the same number of points
   so one line can morph into the next. Shifts close on Friday and Saturday
   nights, so payouts climb in steps. */
const POINTS = 20;
const SHAPE: Record<Range, (t: number) => number> = {
  "1D": (t) => Math.pow(t, 1.8),
  "1W": (t) => t + 0.035 * Math.sin(t * 9),
  "1M": (t) => Math.pow(t, 0.92),
  "3M": (t) => t * 0.85 + 0.15 * Math.pow(t, 2.5),
  "6M": (t) => Math.pow(t, 1.1) + 0.02 * Math.sin(t * 7),
  "1Y": (t) => Math.pow(t, 1.25),
};

/* The card is 327pt wide with a 1pt border each side, so the chart is
   drawn at exactly its 325pt, and the line stops short of the edge by the
   end dot's radius and stroke so the dot sits whole on the line's end. */
const WIDTH = 325;
const HEIGHT = 168;
const END = WIDTH - 9;
const TOP = 10;
const BOTTOM = 6;

function series(range: Range) {
  const values = Array.from({ length: POINTS }, (_, i) =>
    SHAPE[range](i / (POINTS - 1)),
  );
  // Running totals never fall.
  for (let i = 1; i < values.length; i++)
    values[i] = Math.max(values[i]!, values[i - 1]!);
  const min = values[0]!;
  const max = values[values.length - 1]!;
  return values.map((value, i) => ({
    x: (i / (POINTS - 1)) * END,
    y: TOP + (1 - (value - min) / (max - min || 1)) * (HEIGHT - TOP - BOTTOM),
  }));
}

type Point = { x: number; y: number };

/** A smooth line through the points (Catmull–Rom as cubic Béziers). */
function line(points: Point[]) {
  const at = (i: number): Point =>
    points[Math.min(Math.max(i, 0), points.length - 1)]!;
  let d = `M${at(0).x},${at(0).y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 8;
    const c1y = p1.y + (p2.y - p0.y) / 8;
    const c2x = p2.x - (p3.x - p1.x) / 8;
    const c2y = p2.y - (p3.y - p1.y) / 8;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const MORPH = { type: "spring", duration: 0.7, bounce: 0 } as const;
const STROKE = "#7055ff";

/**
 * The payments card on the portal's home (payments-content.tsx with
 * payments-graph.tsx): what went out over the range, as a running total, and
 * the range pills under it. Choosing a range rolls the total and morphs the
 * line into the new one, where the product redraws it; left alone, the card
 * steps through the ranges itself.
 */
export function PortalPaymentsChart() {
  const [range, setRange] = useState<Range>("1W");
  const root = useRef<HTMLDivElement>(null);
  const gradient = useId();
  const pill = useId();

  useAutoplay(
    root,
    () =>
      setRange((current) => {
        const order: Range[] = ["1W", "1M", "3M", "1Y", "1D"];
        return order[(order.indexOf(current) + 1) % order.length] ?? "1W";
      }),
    { interval: 3400, delay: 1200 },
  );

  const points = series(range);
  const stroke = line(points);
  const area = `${stroke} L${END},${HEIGHT} L0,${HEIGHT} Z`;
  const end = points[points.length - 1]!;

  return (
    <FitStage className="anyday-portal" gutter={24}>
      <div
        className="overflow-hidden rounded-[var(--radius-6)] border border-black/[0.08] bg-[var(--bg-base)]"
        ref={root}
        style={{
          boxShadow:
            "0 1px 2px 0 rgba(0, 0, 0, 0.01), 0 4px 12px 0 rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="flex flex-col px-5 pt-5">
          <div className="relative h-5">
            <AnimatePresence initial={false} mode="popLayout">
              <m.span
                key={range}
                className="absolute top-0 left-0 font-normal whitespace-nowrap text-[var(--label-secondary)]"
                initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{
                  fontSize: "0.9375rem",
                  lineHeight: "1.25rem",
                  letterSpacing: "-0.015rem",
                }}
              >
                {LABEL[range]}
              </m.span>
            </AnimatePresence>
          </div>
          <div
            className="font-medium text-[var(--label-primary)]"
            style={{
              fontSize: "28px",
              lineHeight: "32px",
              letterSpacing: "-0.39px",
              marginTop: "-3px",
            }}
          >
            <AnimatedAmount value={TOTAL[range]} />
          </div>
        </div>

        <svg
          aria-hidden="true"
          className="mt-4 block"
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width={WIDTH}
          overflow="visible"
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={STROKE} stopOpacity="0.12" />
              <stop offset="100%" stopColor={STROKE} stopOpacity="0" />
            </linearGradient>
          </defs>
          <m.path
            animate={{ d: area }}
            fill={`url(#${gradient})`}
            initial={false}
            transition={MORPH}
          />
          <m.path
            animate={{ d: stroke }}
            fill="none"
            initial={false}
            stroke={STROKE}
            strokeLinecap="round"
            strokeWidth={2}
            transition={MORPH}
          />
          <m.circle
            animate={{ cx: end.x, cy: end.y }}
            fill="white"
            initial={false}
            r={4}
            stroke={STROKE}
            strokeWidth={3}
            transition={MORPH}
          />
        </svg>

        <div
          aria-label="Time range"
          className="flex items-center justify-center gap-4 px-5 pt-3 pb-4"
          role="radiogroup"
        >
          {RANGES.map((period) => {
            const active = period === range;
            return (
              <button
                key={period}
                aria-checked={active}
                className="relative flex cursor-pointer items-center rounded-[8px] px-2 py-1"
                onClick={() => setRange(period)}
                role="radio"
                type="button"
              >
                {active && (
                  <m.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[8px] bg-[var(--bg-shade)]"
                    layoutId={pill}
                    transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                  />
                )}
                <span
                  className="relative text-center font-medium transition-colors duration-200"
                  style={{
                    fontSize: "13px",
                    lineHeight: "18px",
                    letterSpacing: "-0.08px",
                    color: active ? "var(--label-link)" : "var(--label-faint)",
                  }}
                >
                  {period}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </FitStage>
  );
}
