"use client";

import { useLayoutEffect, type RefObject } from "react";

let departureId = 0;

/** Finish the bottom exit independently of route unmounts, including Back.
 * The copy is inert; routing and focus never wait for the decorative motion. */
export function useMobileTocPresence(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;

    return () => {
      if (
        !window.matchMedia("(max-width: 80rem)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.visibilityState !== "visible"
      )
        return;

      // Measure before React removes the page, including its docked position.
      const rect = nav.getBoundingClientRect();
      const viewportBottom = Math.max(
        window.innerHeight,
        (window.visualViewport?.height ?? 0) +
          (window.visualViewport?.offsetTop ?? 0),
      );
      if (!rect.width || rect.bottom <= 0 || rect.top >= viewportBottom) return;
      const styles = getComputedStyle(nav);
      const copy = nav.cloneNode(true) as HTMLElement;
      Object.assign(copy.style, {
        animation: "none",
        transition: "none",
        position: "fixed",
        inset: "auto",
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        maxWidth: "none",
        margin: "0",
        translate: "none",
        transform: "none",
        scale: "none",
        color: styles.color,
        font: styles.font,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        pointerEvents: "none",
      });
      copy.dataset.tocDeparting = "true";
      copy.inert = true;
      copy.setAttribute("aria-hidden", "true");

      // Keep glass SVG references unique if the next case study mounts at once.
      const suffix = `-departing-${++departureId}`;
      const ids = Array.from(copy.querySelectorAll("[id]"), (node) => node.id);
      for (const node of [copy, ...copy.querySelectorAll("*")]) {
        for (const attr of Array.from(node.attributes)) {
          let value = attr.value;
          if (attr.name === "id") value += suffix;
          else
            for (const id of ids)
              value = value.replaceAll(`#${id}`, `#${id}${suffix}`);
          if (value !== attr.value) node.setAttribute(attr.name, value);
        }
      }

      queueMicrotask(() => {
        // Strict Mode replays effects without removing their DOM.
        if (nav.isConnected) return;
        document.body.append(copy);
        const animation = copy.animate(
          [
            { transform: "translateY(0)" },
            { transform: `translateY(${viewportBottom - rect.top + 64}px)` },
          ],
          {
            duration: 200,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          },
        );
        let fallback = 0;
        const remove = () => {
          window.clearTimeout(fallback);
          document.removeEventListener("visibilitychange", remove);
          copy.remove();
        };
        void animation.finished.then(remove, remove);
        // The destination's first render can hold the main thread for longer
        // than the exit itself, so the fallback counts from the first frame
        // the exit actually plays, not from when the copy was appended.
        void animation.ready.then(() => {
          fallback = window.setTimeout(remove, 400);
        }, remove);
        // A backgrounded Safari tab may suspend its animation timeline.
        document.addEventListener("visibilitychange", remove);
      });
    };
  }, [ref]);
}
