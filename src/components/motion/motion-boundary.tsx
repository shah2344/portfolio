"use client";

import type { ReactNode } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

const loadMaxFeatures = () =>
  import("./motion-features-max").then((module) => module.default);

export interface MotionBoundaryProps {
  children: ReactNode;
  reducedMotion?: "user" | "always" | "never";
  /**
   * `"max"` adds drag and layout animation, fetched separately so pages that
   * don't need them never load them.
   */
  features?: "animation" | "max";
}

export function MotionBoundary({
  children,
  reducedMotion = "user",
  features = "animation",
}: MotionBoundaryProps) {
  return (
    <LazyMotion
      features={features === "max" ? loadMaxFeatures : domAnimation}
      strict
    >
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
