"use client";

import { generatePath, getLayoutSize, observeResize } from "@lisse/core";
import { cancelFrame, frame } from "motion/react";
import { useId, useLayoutEffect, useRef, type RefObject } from "react";

import styles from "./glass-material.module.css";

/** Decorative glass only: the semantic host keeps its focus ring and shadow.
 * Lisse's capsule is a smoothed rectangle whose radius is half its short side.
 * A single update commits the fill, inset edges and rim before Motion paints. */
export function GlassMaterial({
  syncRef,
}: {
  syncRef?: RefObject<(() => void) | null>;
}) {
  const layer = useRef<HTMLSpanElement>(null);
  const id = `glass-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useLayoutEffect(() => {
    const element = layer.current;
    const host = element?.parentElement;
    const svg = element?.querySelector("svg");
    const fill = element?.querySelector<HTMLElement>("[data-glass-fill]");
    const gradient = svg?.querySelector("linearGradient");
    if (!element || !host || !svg || !fill || !gradient) return;
    const outlines = svg.querySelectorAll("[data-glass-outline]");
    const rims = svg.querySelectorAll("[data-glass-rim]");
    const masks = svg.querySelectorAll("mask");
    let previous = "";

    const update = () => {
      const cs = getComputedStyle(host);
      const { width, height } = getLayoutSize(host, cs);
      if (width <= 2 || height <= 2) return;
      const radius = Math.min(
        Number.parseFloat(cs.borderTopLeftRadius) || 0,
        width / 2,
        height / 2,
      );
      const key = `${width},${height},${radius}`;
      if (key === previous) return;
      previous = key;
      const options = { radius, smoothing: 0.6, preserveSmoothing: true };
      const outline = generatePath(width, height, options);
      const rim = generatePath(width - 2, height - 2, {
        ...options,
        radius: Math.max(0, radius - 1),
      });
      const clip = `path('${outline}')`;
      fill.style.clipPath = clip;
      host.style.setProperty("--glass-clip", clip);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      outlines.forEach((path) => path.setAttribute("d", outline));
      rims.forEach((path) => path.setAttribute("d", rim));
      masks.forEach((mask) => {
        mask.setAttribute("width", String(width));
        mask.setAttribute("height", String(height));
      });
      gradient.setAttribute("y2", String((height - 2) * 1.0208));
      host.dataset.glassMaterialReady = "true";
    };
    const schedule = () => frame.postRender(update);
    // Border radius is a short CSS transition; size is driven by Motion.
    const transition = (event: TransitionEvent) => {
      if (event.target !== host || !event.propertyName.endsWith("radius"))
        return;
      if (event.type === "transitionrun") frame.postRender(update, true);
      else {
        cancelFrame(update);
        update();
      }
    };
    if (syncRef) syncRef.current = schedule;
    update();
    const unobserve = observeResize(host, update);
    host.addEventListener("transitionrun", transition);
    host.addEventListener("transitionend", transition);
    host.addEventListener("transitioncancel", transition);
    return () => {
      unobserve();
      cancelFrame(update);
      if (syncRef) syncRef.current = null;
      delete host.dataset.glassMaterialReady;
      host.style.removeProperty("--glass-clip");
      host.removeEventListener("transitionrun", transition);
      host.removeEventListener("transitionend", transition);
      host.removeEventListener("transitioncancel", transition);
    };
  }, [syncRef]);

  return (
    <span ref={layer} aria-hidden="true" className={styles.layer}>
      <span data-glass-fill="" className={styles.fill} />
      <svg className={styles.edges} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`${id}-outline`}>
            <path data-glass-outline="" />
          </clipPath>
          <clipPath id={`${id}-rim`}>
            <path data-glass-rim="" />
          </clipPath>
          {[
            [1, 0],
            [-1, 0],
            [0, -1],
          ].map(([x, y], index) => (
            <mask
              key={index}
              id={`${id}-edge-${index}`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              style={{ maskType: "luminance" }}
            >
              <path data-glass-outline="" fill="white" />
              <path
                data-glass-outline=""
                fill="black"
                transform={`translate(${x} ${y})`}
              />
            </mask>
          ))}
          <linearGradient
            id={`${id}-gradient`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
          >
            <stop offset="0" stopColor="var(--glass-rim-top)" />
            <stop offset={0.2512 / 1.0208} stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="var(--glass-rim-bottom)" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((index) => (
          <rect
            key={index}
            width="100%"
            height="100%"
            fill="black"
            opacity={`var(--glass-inset-${index === 2 ? "bottom" : "side"})`}
            mask={`url(#${id}-edge-${index})`}
          />
        ))}
        <path
          data-glass-outline=""
          fill="none"
          stroke="black"
          strokeWidth="2"
          opacity="var(--glass-inset-around, var(--glass-inset-side))"
          clipPath={`url(#${id}-outline)`}
        />
        <g transform="translate(1 1)">
          <path
            data-glass-rim=""
            fill="none"
            stroke={`url(#${id}-gradient)`}
            strokeWidth="2"
            clipPath={`url(#${id}-rim)`}
          />
        </g>
      </svg>
    </span>
  );
}
