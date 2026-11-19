"use client";

import React, { useMemo } from "react";

import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  style?: React.CSSProperties;
};

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
  style,
}: TextShimmerProps) {
  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  // The product's `dark:` base colours are left out: this port is light only.
  const mergedClassName = cn(
    "relative inline-block bg-clip-text text-transparent",
    "[--base-color:#a1a1aa] [--base-gradient-color:#000]",
    className,
  );

  const mergedStyle = {
    "--spread": `${dynamicSpread}px`,
    "--text-shimmer-duration": `${duration}s`,
    backgroundImage:
      "linear-gradient(90deg,transparent calc(50% - var(--spread)),var(--base-gradient-color),transparent calc(50% + var(--spread))),linear-gradient(var(--base-color),var(--base-color))",
    backgroundSize: "250% 100%, auto",
    backgroundRepeat: "no-repeat, no-repeat",
    animation:
      "text-shimmer-bg-pos var(--text-shimmer-duration,3s) linear infinite",
    ...style,
  } as React.CSSProperties;

  return React.createElement(
    Component,
    { className: mergedClassName, style: mergedStyle },
    children,
  );
}

export const TextShimmer = React.memo(TextShimmerComponent);
