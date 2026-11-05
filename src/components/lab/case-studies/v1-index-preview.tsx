"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * The only live part of the index: which row the pointer (or focus) is on, and
 * where the pointer is. The rows and the preview images are server-rendered
 * and handed in; this just moves one layer and flips one attribute. Position
 * is written straight to CSS variables so following the cursor never renders.
 */
export function IndexPreview({
  children,
  className,
  layerClassName,
  previews,
}: {
  children: ReactNode;
  className?: string;
  layerClassName?: string;
  previews: readonly ReactNode[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  function rowIndex(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const row = target.closest<HTMLElement>("[data-index]");
    return row ? Number(row.dataset.index) : null;
  }

  function place(x: number, y: number) {
    rootRef.current?.style.setProperty("--x", `${x}px`);
    rootRef.current?.style.setProperty("--y", `${y}px`);
  }

  return (
    <div
      className={className}
      data-active={active ?? undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setActive(null);
        }
      }}
      onFocus={(event) => {
        const index = rowIndex(event.target);
        const root = rootRef.current;
        if (index === null || !root) return;
        // Keyboard focus has no pointer, so the preview parks at the row's end.
        const row = (event.target as Element).getBoundingClientRect();
        const box = root.getBoundingClientRect();
        place(box.width - 140, row.top - box.top + row.height / 2);
        setActive(index);
      }}
      onPointerLeave={() => setActive(null)}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        place(event.clientX - box.left, event.clientY - box.top);
        setActive(rowIndex(event.target));
      }}
      ref={rootRef}
    >
      {children}
      <div aria-hidden="true" className={layerClassName}>
        {previews.map((preview, index) => (
          <div data-on={active === index || undefined} key={index}>
            {preview}
          </div>
        ))}
      </div>
    </div>
  );
}
