"use client";

import { cn } from "@/lib/utils";

const DEFAULT_BLUR_LEVELS = [0.25, 0.5, 1, 2, 4, 6];

export interface ProgressiveBlurProps {
  className?: string;
  height?: string;
  position?: "top" | "bottom";
  blurLevels?: number[];
}

// Each layer is masked to an overlapping band rather than a full fade, so the
// backdrop filters compose into a geometric blur ramp instead of stacking to a
// single uniform value across the whole surface.
function createBandMask(direction: string, index: number, layerCount: number) {
  const step = 100 / (layerCount + 1);
  const [fadeIn, holdStart, holdEnd, fadeOut] = [0, 1, 2, 3].map((offset) =>
    Math.min(100, (index + offset) * step),
  );

  return `linear-gradient(${direction}, transparent ${fadeIn}%, #000 ${holdStart}%, #000 ${holdEnd}%, transparent ${fadeOut}%)`;
}

export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = DEFAULT_BLUR_LEVELS,
}: ProgressiveBlurProps) {
  const direction = position === "top" ? "to top" : "to bottom";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      style={{ height }}
    >
      {blurLevels.map((blur, index) => {
        const mask = createBandMask(direction, index, blurLevels.length);
        // Routed through a custom property so an ancestor can suspend the whole
        // stack in CSS. A backdrop filter keeps costing while its surface is
        // merely faded out, so one that is hidden — the closed mobile contents
        // backdrop — needs to be able to switch them off without `!important`.
        const blurValue = `var(--progressive-blur-override, blur(${blur}px))`;

        return (
          <div
            className="absolute inset-0"
            key={`${blur}-${index}`}
            style={{
              backdropFilter: blurValue,
              maskImage: mask,
              WebkitBackdropFilter: blurValue,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}
