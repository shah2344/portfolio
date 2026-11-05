"use client";

import { useEffect } from "react";

import { nearestScroller } from "./playground/grid";

/** Keep homepage controls in DOM order even with Safari's limited Tab mode. */
export function HomeKeyboardFocus() {
  useEffect(() => {
    const home = document.querySelector<HTMLElement>(".editorial-page");
    if (!home) return;

    let frame = 0;
    const cancelCenter = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const tab = (event: KeyboardEvent) => {
      if (
        event.key !== "Tab" ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector("dialog:modal")
      ) {
        return;
      }

      const active = document.activeElement;
      const starting =
        active === document.body || active === document.documentElement;
      if (!starting && (!active || !home.contains(active))) return;
      if (starting && event.shiftKey) return;

      const controls = Array.from(
        home.querySelectorAll<HTMLElement>(
          "a[href], button, input, select, textarea, [tabindex]",
        ),
      ).filter(
        (control) =>
          control.tabIndex >= 0 &&
          !control.matches(":disabled") &&
          !control.closest("[inert], [hidden]") &&
          control.getClientRects().length > 0 &&
          getComputedStyle(control).visibility === "visible",
      );
      const index = starting ? -1 : controls.indexOf(active as HTMLElement);
      // Let the browser leave the page at either end; this is not a focus trap.
      const next = controls[index + (event.shiftKey ? -1 : 1)];
      if (!next || (!starting && index === -1)) return;

      event.preventDefault();
      // Feed cards are centered once their reading scale has been painted.
      next.focus({ preventScroll: !!next.closest(".pg-grid--feed") });
    };

    const center = (event: FocusEvent) => {
      cancelCenter();
      const control = event.target;
      if (
        !(control instanceof HTMLElement) ||
        !control.matches(":focus-visible") ||
        control.closest("dialog:modal")
      ) {
        return;
      }
      const tile = control.closest<HTMLElement>(".pg-grid--feed .pg-tile");
      if (!tile) return;

      // Motion paints the scale and scale-compensated heading spacing on
      // successive frames. Recenter briefly as both land, without following
      // later manual scrolling or keeping an animation loop alive.
      let passes = 0;
      const settle = () => {
        frame = 0;
        if (
          document.activeElement !== control ||
          control.closest("dialog:modal")
        )
          return;
        // The caption is positioned outside the tile's box. Center the
        // complete visible card, rather than only its media rectangle.
        const bounds = tile.getBoundingClientRect();
        const caption = tile
          .querySelector("figcaption")
          ?.getBoundingClientRect();
        const top = Math.min(bounds.top, caption?.top ?? bounds.top);
        const bottom = Math.max(
          bounds.bottom,
          caption?.bottom ?? bounds.bottom,
        );
        const scroller = nearestScroller(tile);
        const viewportTop = scroller
          ? scroller.getBoundingClientRect().top + scroller.clientTop
          : 0;
        const viewportHeight = scroller?.clientHeight ?? window.innerHeight;
        const delta = (top + bottom) / 2 - (viewportTop + viewportHeight / 2);
        (scroller ?? window).scrollBy({ top: delta, behavior: "instant" });
        if (++passes < 3) frame = requestAnimationFrame(settle);
      };
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(settle);
      });
    };

    document.addEventListener("keydown", tab);
    home.addEventListener("focusin", center);
    home.addEventListener("focusout", cancelCenter);
    window.addEventListener("pointerdown", cancelCenter);
    window.addEventListener("wheel", cancelCenter, { passive: true });
    window.addEventListener("touchstart", cancelCenter, { passive: true });
    return () => {
      cancelCenter();
      document.removeEventListener("keydown", tab);
      home.removeEventListener("focusin", center);
      home.removeEventListener("focusout", cancelCenter);
      window.removeEventListener("pointerdown", cancelCenter);
      window.removeEventListener("wheel", cancelCenter);
      window.removeEventListener("touchstart", cancelCenter);
    };
  }, []);

  return null;
}
