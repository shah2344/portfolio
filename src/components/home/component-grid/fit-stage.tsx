"use client";

import { MotionConfig } from "motion/react";
import {
  createContext,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MotionBoundary } from "@/components/motion/motion-boundary";

import styles from "./component-grid.module.css";

/**
 * Every component is laid out on a 375pt phone screen, unless its grid sets
 * a wider screen with `--canvas` (a two-column grid's wider cards), so a
 * point is the same size on screen in every card of every grid.
 */
export const CANVAS = 375;

/**
 * The scale a FitStage draws its component at, for a part inside that must
 * measure something in real screen pixels, such as an inset from the card's
 * edge.
 */
export const FitScaleContext = createContext(1);

/**
 * Lays a product component out on a 375pt phone screen, `inset` points in
 * from each side, then scales the whole screen to its card's width. Every
 * card in a grid is the same width, so every component lands at the same
 * scale: a 17pt label in one card is a 17pt label in the next. The card is as
 * tall as the component plus `gutter` points above and below, measured in
 * the same points.
 *
 * Inside, Motion has every feature (drag included), and pointer positions are
 * mapped back through every scale above the component (this one, the feed's,
 * an opened card's), so a dragged control stays under the finger.
 */
export function FitStage({
  inset = 24,
  gutter = 24,
  bleed = false,
  fill,
  className,
  children,
}: {
  inset?: number;
  gutter?: number;
  /** Sit on the card's bottom edge, for a page whose footer meets it. */
  bleed?: boolean;
  /**
   * Fill the whole card, at least this many points tall: a scene that spans
   * rows grows with them rather than leaving a band of card above it.
   */
  fill?: number;
  className?: string;
  children: ReactNode;
}) {
  const cell = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{
    scale: number;
    height: number;
    canvas: number;
    inner?: number;
  } | null>(null);

  useLayoutEffect(() => {
    const outer = cell.current;
    const inner = stage.current;
    if (!outer || !inner) return;
    const measure = () => {
      const canvas =
        parseFloat(getComputedStyle(outer).getPropertyValue("--canvas")) ||
        CANVAS;
      const width = Math.max(0.1, outer.clientWidth / canvas);
      // A card with a set height (`--fit: contain`) shrinks a component that
      // doesn't fit at the shared scale; otherwise the card grows to fit it.
      const contain =
        getComputedStyle(outer).getPropertyValue("--fit").trim() ===
          "contain" && outer.clientHeight > 0;
      if (fill !== undefined) {
        const scale = contain
          ? Math.max(0.1, Math.min(width, outer.clientHeight / fill))
          : width;
        // The card's own height wins once the rows make it taller.
        const inner = Math.max(fill, outer.clientHeight / scale);
        setFit({ scale, height: contain ? 0 : fill * scale, canvas, inner });
        return;
      }
      const points = inner.offsetHeight + gutter * (bleed ? 1 : 2);
      const scale = contain
        ? Math.max(0.1, Math.min(width, outer.clientHeight / points))
        : width;
      setFit({ scale, height: contain ? 0 : points * scale, canvas });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    // A window resize can reach the card without a resize observation (an
    // emulated viewport, for one), so it measures again then too.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bleed, fill, gutter]);

  const transformPagePoint = useCallback((point: { x: number; y: number }) => {
    const element = stage.current;
    if (!element?.offsetWidth) return point;
    const scale = element.getBoundingClientRect().width / element.offsetWidth;
    return scale ? { x: point.x / scale, y: point.y / scale } : point;
  }, []);

  return (
    <div
      className={styles.fit}
      ref={cell}
      style={{ minHeight: fit?.height || undefined }}
    >
      <div
        className={`${styles.stage} ${className ?? ""}`.trim()}
        ref={stage}
        style={{
          ...(bleed
            ? {
                top: "auto",
                bottom: 0,
                translate: "-50% 0",
                transformOrigin: "bottom center",
              }
            : {}),
          width: fit?.canvas ?? CANVAS,
          height: fit?.inner,
          paddingInline: inset,
          transform: fit === null ? undefined : `scale(${fit.scale})`,
        }}
      >
        <MotionBoundary features="max">
          <MotionConfig transformPagePoint={transformPagePoint}>
            <FitScaleContext.Provider value={fit?.scale ?? 1}>
              {children}
            </FitScaleContext.Provider>
          </MotionConfig>
        </MotionBoundary>
      </div>
    </div>
  );
}
