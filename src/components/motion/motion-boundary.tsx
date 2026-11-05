"use client";

import type { ReactNode } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

export interface MotionBoundaryProps {
  children: ReactNode;
  reducedMotion?: "user" | "always" | "never";
}

export function MotionBoundary({
  children,
  reducedMotion = "user",
}: MotionBoundaryProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
