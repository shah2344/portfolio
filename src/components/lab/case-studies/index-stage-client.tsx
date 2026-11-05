"use client";

import { useState, type ReactNode } from "react";

/**
 * Which row the stage is showing. It follows the pointer and keyboard focus,
 * and stays on the last row visited rather than snapping back when the
 * pointer leaves — the stage is a view, not a hover effect.
 */
export function IndexStageFrame({
  children,
  className,
  slides,
  stageClassName,
}: {
  children: ReactNode;
  className?: string;
  slides: readonly ReactNode[];
  stageClassName?: string;
}) {
  const [active, setActive] = useState(0);

  function pick(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>("[data-index]");
    if (row) setActive(Number(row.dataset.index));
  }

  return (
    <div
      className={className}
      onFocus={(event) => pick(event.target)}
      onPointerOver={(event) => {
        if (event.pointerType === "mouse") pick(event.target);
      }}
    >
      <div aria-hidden="true" className={stageClassName}>
        {slides.map((slide, index) => (
          <div data-on={active === index || undefined} key={index}>
            {slide}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
