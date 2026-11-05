"use client";

import {
  generatePath,
  getLayoutSize,
  observeResize,
  requestMeasure,
} from "@lisse/core";
import type { EffectsConfig, SmoothCornerOptions } from "@lisse/core";
import { useSmoothCorners } from "@lisse/react";
import {
  type RefObject,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
  type ReactNode,
} from "react";

/** One explicit curve for every surface; never rely on library/browser defaults. */
export const SURFACE_SMOOTHING = 0.6;

let nearObserver: IntersectionObserver | undefined;
const waitingForNear = new Map<Element, () => void>();

/**
 * Calls back once the element is within a screen of the viewport. A page
 * mounts dozens of surfaces, and each one's geometry — measuring, a second
 * render, its clip and edge paths — landed on the click that opened it.
 * Those a screen or more away keep their CSS corners until they come near.
 */
function whenNear(element: Element, callback: () => void) {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight;
  if (
    (rect.bottom > -height && rect.top < height * 2) ||
    typeof IntersectionObserver !== "function"
  ) {
    callback();
    return () => {};
  }
  nearObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const near = waitingForNear.get(entry.target);
        waitingForNear.delete(entry.target);
        nearObserver?.unobserve(entry.target);
        near?.();
      }
    },
    { rootMargin: "100% 0px" },
  );
  waitingForNear.set(element, callback);
  nearObserver.observe(element);
  return () => {
    waitingForNear.delete(element);
    nearObserver?.unobserve(element);
  };
}

/** Lisse's clip and effects, bound once the surface is near. */
function SmoothCornersBinding({
  target,
  corners,
  effects,
}: {
  target: RefObject<HTMLElement | null>;
  corners: SmoothCornerOptions;
  effects?: EffectsConfig;
}) {
  useSmoothCorners(target, corners, { autoEffects: false, effects });
  return null;
}

/**
 * Keep the original element, layout, event handlers and ref. CSS owns the radius
 * and live stroke colors; Lisse owns the geometry and shared resize observer.
 * Shadows and keyboard outlines belong on the unclipped parent, as recommended
 * in Lisse's Limitations guide. Auto-effects would freeze theme colors at mount.
 */
export function SmoothSurface({
  as = "div",
  children,
  ref: externalRef,
  accentInset = 0,
  borderInset = 0,
  effects,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "span" | "section";
  accentInset?: number;
  borderInset?: number;
  effects?: EffectsConfig;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useImperativeHandle(externalRef, () => ref.current!, []);
  // Stable, so a re-render never detaches the element: Lisse's binding reads
  // it in a layout effect that runs before an inline ref would reattach.
  const attach = useCallback((element: HTMLElement | null) => {
    ref.current = element;
  }, []);
  const [near, setNear] = useState(false);
  const [box, setBox] = useState({
    width: 0,
    height: 0,
    radius: 0,
    borderX: 0,
    borderY: 0,
    edgeScale: 1,
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (element) return whenNear(element, () => setNear(true));
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !near) return;
    const measure = (size?: { width: number; height: number }) => {
      if (!size || size.width <= 0 || size.height <= 0) return;
      const style = getComputedStyle(element);
      const borderX = parseFloat(style.borderLeftWidth) || 0;
      const borderY = parseFloat(style.borderTopWidth) || 0;
      // An opened playground card is magnified by `scale`; dividing by its
      // eased edge scale keeps the corner at its in-page size on screen.
      const edgeScale =
        parseFloat(style.getPropertyValue("--pg-edge-scale")) || 1;
      const radius =
        (parseFloat(style.getPropertyValue("--lisse-radius")) || 0) / edgeScale;
      setBox((previous) =>
        previous.width === size.width &&
        previous.height === size.height &&
        previous.radius === radius &&
        previous.borderX === borderX &&
        previous.borderY === borderY &&
        previous.edgeScale === edgeScale
          ? previous
          : { ...size, radius, borderX, borderY, edgeScale },
      );
    };
    // Resolve the CSS radius and untransformed size before the first paint.
    // Waiting for ResizeObserver lets Lisse briefly publish a radius-zero clip.
    // The layout-effect update also commits the matching SVG edges before paint.
    measure(getLayoutSize(element));
    const unobserve = observeResize(element, measure);
    const refresh = () => requestMeasure(element);
    window.addEventListener("resize", refresh);
    return () => {
      unobserve();
      window.removeEventListener("resize", refresh);
    };
  }, [near]);

  const corners = {
    radius: box.radius,
    smoothing: SURFACE_SMOOTHING,
    preserveSmoothing: true,
  };
  const path =
    box.width > 0 && box.height > 0
      ? generatePath(box.width, box.height, corners)
      : undefined;

  // An inset centreline keeps thin strokes wholly inside the clip instead of
  // rasterising a doubled stroke directly on its antialiased boundary.
  // Match the stroke's inverse scale when its card is enlarged.
  const scaledBorderInset = borderInset / box.edgeScale;
  const borderPath =
    path && scaledBorderInset > 0
      ? generatePath(
          Math.max(0, box.width - 2 * scaledBorderInset),
          Math.max(0, box.height - 2 * scaledBorderInset),
          { ...corners, radius: Math.max(0, box.radius - scaledBorderInset) },
        )
      : path;

  const accentPath =
    path && accentInset > 0
      ? generatePath(
          Math.max(0, box.width - 2 * accentInset),
          Math.max(0, box.height - 2 * accentInset),
          { ...corners, radius: Math.max(0, box.radius - accentInset) },
        )
      : path;

  const Element = as;
  return (
    <Element
      {...props}
      ref={attach}
      data-lisse-surface=""
      data-lisse-geometry={path ? "ready" : undefined}
    >
      {children}
      {near && (
        <SmoothCornersBinding
          corners={corners}
          effects={effects}
          target={ref}
        />
      )}
      <svg
        aria-hidden="true"
        focusable="false"
        className="lisse-surface-edge"
        width={box.width || "100%"}
        height={box.height || "100%"}
        style={{ left: -box.borderX, top: -box.borderY }}
      >
        <path
          d={borderPath}
          transform={
            scaledBorderInset
              ? `translate(${scaledBorderInset} ${scaledBorderInset})`
              : undefined
          }
          className="lisse-surface-edge__line"
        />
        <path
          d={accentPath}
          transform={
            accentInset ? `translate(${accentInset} ${accentInset})` : undefined
          }
          className="lisse-surface-edge__accent"
        />
      </svg>
    </Element>
  );
}
