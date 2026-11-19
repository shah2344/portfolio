"use client";

import { m, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

import { cn } from "./cn";

/* components/ui/number-flow.tsx (the product's spring counter), verbatim. */

interface NumberFlowProps {
  value: number;
  className?: string;
}

export function NumberFlow({ value, className = "" }: NumberFlowProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
  });

  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <m.span
      className={cn("tabular-nums", className)}
      style={{
        display: "inline-block",
        minWidth: "1ch",
      }}
    >
      {display}
    </m.span>
  );
}
