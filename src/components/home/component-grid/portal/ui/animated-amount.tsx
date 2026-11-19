"use client";

import NumberFlow from "@number-flow/react";

import { cn } from "./cn";

/* components/animated/animated-amount.tsx, with one change: the dollar sign
   is the flow's prefix rather than a separate span, so it slides with the
   digits instead of jumping when the amount's width changes. */

interface AnimatedAmountProps {
  value: number;
  isLoading?: boolean;
  className?: string;
  format?: React.ComponentProps<typeof NumberFlow>["format"];
  showCurrency?: boolean;
  animateOnLoad?: boolean;
  letterSpacing?: string;
  numericVariant?: "tabular" | "proportional";
}

export function AnimatedAmount({
  value,
  isLoading = false,
  className,
  format = {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  showCurrency = true,
  letterSpacing,
  numericVariant = "tabular",
}: AnimatedAmountProps) {
  const loadingFormat = {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  } satisfies Intl.NumberFormatOptions;

  return (
    <span className={cn("inline-flex items-center", className)}>
      <NumberFlow
        prefix={showCurrency ? "$" : undefined}
        value={isLoading ? 0 : value}
        format={isLoading ? loadingFormat : format}
        className={cn(
          numericVariant === "proportional"
            ? "proportional-nums"
            : "tabular-nums",
          isLoading && "shimmer-text",
        )}
        style={{
          letterSpacing: letterSpacing,
        }}
      />
    </span>
  );
}
