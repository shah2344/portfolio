"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { nearestToCentre, SNAP_MODE } from "./snap";

/**
 * How far ahead of the grid the scroller is told to snap. A full screen either
 * side is the whole point: the snap is armed while the first card is still a
 * viewport away, so turning `scroll-snap-type` on never has a snap position
 * within reach to tug a scroll that is already in flight.
 */
const ARM_MARGIN = "100% 0px 100% 0px";

/**
 * The tile whose laid-out box holds the point, or null when the point sits in
 * a gutter or off the grid. Hit-testing by rect rather than `elementFromPoint`
 * is what lets the grid answer "which tile is under the pointer" while a card's
 * modal is still covering the page in the top layer.
 */
function tileAt(grid: HTMLElement, x: number, y: number) {
  for (const tile of grid.querySelectorAll<HTMLElement>(".pg-tile")) {
    const rect = tile.getBoundingClientRect();
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return tile;
    }
  }
  return null;
}

/**
 * The element this grid actually scrolls inside, or null when that is the
 * document. Walking up to the first ancestor whose `overflow-y` is `auto` or
 * `scroll` finds the box really doing the scrolling, and callers fall back to
 * the window when there is none, as on the homepage. That keeps the grid from
 * having to know which route it was rendered into.
 */
export function nearestScroller(element: HTMLElement) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/** Names the tile in front, which raises it and reveals its caption. */
function applyFocus(grid: HTMLElement, focus: HTMLElement) {
  for (const tile of grid.querySelectorAll<HTMLElement>(".pg-tile")) {
    tile.toggleAttribute("data-pg-focus", tile === focus);
  }
}

function releaseFocus(grid: HTMLElement) {
  for (const tile of grid.querySelectorAll<HTMLElement>("[data-pg-focus]")) {
    tile.removeAttribute("data-pg-focus");
  }
}

/**
 * The playground grid, aware of which tile is in front.
 *
 * Which tile that is has two answers. With a pointer it is the tile under the
 * cursor; on a phone there is no cursor, so it is the card the reader has
 * scrolled to the middle of the screen. Both answers end in the same place —
 * `applyFocus` writing `data-pg-focus` — so the stylesheet only ever has one
 * idea of what being in front looks like: raised, with its caption showing.
 */
export function PlaygroundGrid({
  children,
  className,
  mobileSnap = true,
}: {
  children: ReactNode;
  className?: string;
  mobileSnap?: boolean;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  /* The card the scroll last put in front, kept so a band that momentarily
     holds nothing — or a card flying home from its modal — has something to
     settle back onto. */
  const snapFocus = useRef<HTMLElement | null>(null);
  const [viewportSnapMode, setViewportSnapMode] = useState(false);
  const snapMode = mobileSnap && viewportSnapMode;

  useEffect(() => {
    if (!mobileSnap) return;

    const query = window.matchMedia(SNAP_MODE);
    const read = () => setViewportSnapMode(query.matches);

    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, [mobileSnap]);

  /*
   * A card's modal captures the pointer while it is open, so the grid stops
   * hearing where the pointer goes. Tracking it on the window keeps a fresh
   * reading, and when a closing card asks the grid to resync, the hover settles
   * onto whatever tile the pointer is genuinely resting on — the same one, a
   * different one, or none — without waiting for the next move to trigger it.
   * Scrolled rather than hovered, there is no pointer to consult: the card the
   * reader is still parked on is the one that was in front, so it is handed
   * straight back.
   */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const resync = () => {
      if (snapMode) {
        const held = snapFocus.current;
        if (held) applyFocus(grid, held);
        return;
      }

      const point = pointer.current;
      const tile = point ? tileAt(grid, point.x, point.y) : null;
      if (tile && point) {
        applyFocus(grid, tile);
      } else {
        releaseFocus(grid);
      }
    };

    const trackPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };

    grid.addEventListener("pg-resync", resync);
    if (!snapMode) window.addEventListener("pointermove", trackPointer);

    return () => {
      grid.removeEventListener("pg-resync", resync);
      window.removeEventListener("pointermove", trackPointer);
    };
  }, [snapMode]);

  /*
   * The scrolled half of the same effect. One observer arms the scroller well
   * before the section arrives; a second narrows the field to the cards
   * actually on screen; and the scroll itself decides which of those is in
   * front, handing it to the very same `applyFocus` the pointer uses.
   */
  useEffect(() => {
    const grid = gridRef.current;
    if (!snapMode || !grid || typeof IntersectionObserver !== "function")
      return;

    const scroller = nearestScroller(grid);
    const root = scroller ?? null;
    /* The document's scroller has no element of its own to mark, so the root
       element stands in for it. */
    const armed = scroller ?? document.scrollingElement;
    const listener: EventTarget = scroller ?? window;

    const onScreen = new Set<HTMLElement>();
    let frame = 0;

    /*
     * Which card is in front has to change at the moment two of them are
     * equally far from the middle of the screen, which is not a moment any
     * observer fires on — so it is measured here, once a frame at most, over
     * the two or three cards the observer says are on screen. `applyFocus`
     * measures the whole grid, so it is only called when the answer actually
     * changes.
     */
    const settle = () => {
      frame = 0;

      const rect = root?.getBoundingClientRect();
      const centre = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

      const nearest = nearestToCentre(
        Array.from(onScreen, (tile) => {
          const box = tile.getBoundingClientRect();
          return { tile, top: box.top, bottom: box.bottom };
        }),
        centre,
      );

      // Nothing on screen yet: hold the card already in front rather than
      // flashing the section back to flat mid-scroll.
      if (!nearest || nearest === snapFocus.current) return;

      snapFocus.current = nearest;
      applyFocus(grid, nearest);
    };

    const requestSettle = () => {
      if (!frame) frame = requestAnimationFrame(settle);
    };

    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const tile = entry.target as HTMLElement;
          if (entry.isIntersecting) onScreen.add(tile);
          else onScreen.delete(tile);
        }
        requestSettle();
      },
      { root, threshold: 0 },
    );

    for (const tile of grid.querySelectorAll<HTMLElement>(".pg-tile")) {
      visibility.observe(tile);
    }

    const release = () => {
      armed?.removeAttribute("data-pg-snap");
      snapFocus.current = null;
      releaseFocus(grid);
    };

    /*
     * Arming and releasing happen a full viewport clear of the section, so the
     * scroll listener is only attached while the snippets are near, and
     * `scroll-snap-type` is never switched on with a snap position close
     * enough to pull a scroll already in flight.
     */
    const arming = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            armed?.setAttribute("data-pg-snap", "");
            listener.addEventListener("scroll", requestSettle, {
              passive: true,
            });
            requestSettle();
          } else {
            listener.removeEventListener("scroll", requestSettle);
            release();
          }
        }
      },
      { root, rootMargin: ARM_MARGIN, threshold: 0 },
    );
    arming.observe(grid);

    window.addEventListener("resize", requestSettle);

    return () => {
      visibility.disconnect();
      arming.disconnect();
      listener.removeEventListener("scroll", requestSettle);
      window.removeEventListener("resize", requestSettle);
      if (frame) cancelAnimationFrame(frame);
      release();
    };
  }, [snapMode]);

  const focusTile = useCallback(
    (target: EventTarget | null) => {
      const grid = gridRef.current;
      // Scrolled rather than hovered, the band owns which card is in front —
      // a tap must not take it, or the card last touched would keep the
      // caption the reader has since scrolled away from.
      if (!grid || snapMode) return;

      const tile =
        target instanceof Element
          ? target.closest<HTMLElement>(".pg-tile")
          : null;

      /*
       * A pointer crossing the gap between two tiles is still travelling towards
       * one of them. Holding the last tile until the pointer leaves the grid
       * keeps that crossing from flashing the whole grid back to sharp.
       */
      if (tile) applyFocus(grid, tile);
    },
    [snapMode],
  );

  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const focused = event.target;
      const tile = focused.closest<HTMLElement>(".pg-tile");
      // The tile is a figure around a control, so the ring lands on the
      // control and it is the control that reports how it was reached.
      if (tile && focused.matches(":focus-visible")) focusTile(tile);
    },
    [focusTile],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const grid = gridRef.current;
      if (!grid || snapMode) return;
      if (!event.relatedTarget || !grid.contains(event.relatedTarget)) {
        releaseFocus(grid);
      }
    },
    [snapMode],
  );

  return (
    <div
      className={className ? `pg-grid ${className}` : "pg-grid"}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onPointerLeave={() => {
        if (gridRef.current && !snapMode) releaseFocus(gridRef.current);
      }}
      onPointerOver={(event) => focusTile(event.target)}
      ref={gridRef}
    >
      {children}
    </div>
  );
}
