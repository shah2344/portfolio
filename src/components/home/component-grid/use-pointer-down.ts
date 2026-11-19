"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Listens for `pointerdown` on the element itself. A feed card's frame stops
 * `pointerdown` from bubbling (so a press inside never reaches the page), and
 * React listens at the root, so a JSX `onPointerDown` inside a card never fires.
 * Move, up and cancel still bubble and can stay as JSX handlers.
 */
export function usePointerDown<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: PointerEvent) => void,
) {
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = (event: PointerEvent) => latest.current(event);
    element.addEventListener("pointerdown", listener);
    return () => element.removeEventListener("pointerdown", listener);
  }, [ref]);
}
