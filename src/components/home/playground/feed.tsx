"use client";

import {
  m,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionStyle,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MotionBoundary } from "@/components/motion/motion-boundary";

import { nearestScroller } from "./grid";

/**
 * Where the feed moves at all. Resizing on scroll is itself the motion, so a
 * reader who has asked for less of it gets the plain column as the finished
 * state.
 */
const FEED_LIVE = "(prefers-reduced-motion: no-preference)";

/** Wide screens grow into view; narrow screens settle down to the column. */
const FEED_WIDE = "(min-width: 781px)";

/** Keep the oversized mobile entrance 8px clear of the screen edges. */
const FEED_NARROW_INSET = 8;

/**
 * The growth runs across the feed's approach: from its top edge crossing the
 * middle of the screen to it reaching the top quarter. Short enough that the
 * first card has finished arriving by the time it is being read.
 */
const PROGRESS_FROM = 0.5;
const PROGRESS_TO = 0.25;

/** Settle to reading size between entering the viewport and its midpoint. */
const NARROW_PROGRESS_FROM = 1;
const NARROW_PROGRESS_TO = 0.5;

/**
 * The same growth run backwards on the way out, on a wide screen only: from
 * the feed's bottom edge rising past the lower quarter of the screen, as the
 * next section comes into view, to it reaching the middle.
 */
const EXIT_FROM = 0.5;
const EXIT_TO = 0.75;

/**
 * Scroll left over once the feed has finished shrinking, as a share of the
 * screen. When the page below the feed is too short for its bottom edge to
 * reach the middle, the exit is moved down to end this far short of where the
 * page runs out, so the feed always lands fully settled before the footer.
 */
const EXIT_SLACK = 0.1;

/**
 * Stiff and heavily damped, so the feed trails the scroll by a beat and then
 * settles without overshoot — it reads as the page catching up with the
 * reader rather than bouncing.
 */
const FEED_SPRING = { stiffness: 900, damping: 100, mass: 1 };

function clampToUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

/**
 * The snippet feed, laid out wider than the column it sits in and scaled
 * down to fit it. As the reader scrolls into it, the scale springs back to 1
 * and the cards open out past the column's edges.
 *
 * The feed is laid out at its full width the whole time, so growing it is one
 * transform on one element: nothing reflows, and the cards' own hover and
 * enlarge behaviour measure the box they are actually drawn in.
 */
function FeedStage({ children }: { children: ReactNode }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"grow" | "settle" | null>(null);
  const live = mode !== null;

  const progress = useMotionValue(0);
  const settled = useSpring(progress, FEED_SPRING);
  /* Desktop grows from the column; mobile settles from near the screen edges.
     Both modes land at the viewport-limited reading size. */
  const rest = useMotionValue(1);
  const target = useMotionValue(1);
  const scale = useTransform(() => {
    const from = rest.get();
    return from + (target.get() - from) * settled.get();
  });

  useEffect(() => {
    const motion = window.matchMedia(FEED_LIVE);
    const wide = window.matchMedia(FEED_WIDE);
    const read = () =>
      setMode(motion.matches ? (wide.matches ? "grow" : "settle") : null);

    read();
    motion.addEventListener("change", read);
    wide.addEventListener("change", read);
    return () => {
      motion.removeEventListener("change", read);
      wide.removeEventListener("change", read);
    };
  }, []);

  /*
   * A layout effect, so the first live frame is already scaled down to the
   * column rather than painting once at its full width.
   */
  useLayoutEffect(() => {
    const feed = feedRef.current;
    const column = feed?.parentElement;
    if (!mode || !feed || !column) return;

    const scroller = nearestScroller(feed);
    const listener: EventTarget = scroller ?? window;

    /* Each card's place in the feed, which the stylesheet uses to hold the
       space between cards steady as the feed scales. */
    const tiles = feed.querySelectorAll<HTMLElement>(
      ".pg-grid--feed > .pg-tile",
    );
    feed.style.setProperty("--pg-feed-count", String(tiles.length));
    tiles.forEach((tile, index) => {
      tile.style.setProperty("--pg-feed-before", String(index));
    });

    let keyboardFocused = false;
    let padTop = 0;
    let padBottom = 0;

    const measure = () => {
      const style = getComputedStyle(column);
      padTop = parseFloat(style.paddingBlockStart);
      padBottom = parseFloat(style.paddingBlockEnd);

      if (mode === "settle") {
        const screen =
          document.documentElement.clientWidth - FEED_NARROW_INSET * 2;
        rest.set(Math.max(1, screen / feed.offsetWidth));
        target.set(1);
        return;
      }

      const inner =
        column.clientWidth -
        parseFloat(style.paddingInlineStart) -
        parseFloat(style.paddingInlineEnd);
      rest.set(Math.min(1, inner / feed.offsetWidth));
      target.set(1);
    };

    const track = () => {
      const view = scroller?.getBoundingClientRect() ?? {
        top: 0,
        height: window.innerHeight,
      };
      /* Where the feed is laid out, read off the column around it rather than
         the feed itself: the feed's own box is drawn scaled, and shrinking it
         towards its bottom edge moves its drawn top down by a large share of
         its height. Tracking that would feed the scale back into the progress
         that sets it, and the feed would shudder instead of settling. */
      const box = column.getBoundingClientRect();
      const top = box.top - view.top + padTop;
      const bottom = box.bottom - view.top - padBottom;
      const from = mode === "settle" ? NARROW_PROGRESS_FROM : PROGRESS_FROM;
      const to = mode === "settle" ? NARROW_PROGRESS_TO : PROGRESS_TO;
      const entering = clampToUnit(
        (view.height * from - top) / (view.height * (from - to)),
      );
      /* The highest the feed's bottom edge can rise: where it sits once the
         page is scrolled to its end. The exit has to finish above that. */
      const remaining = scroller
        ? scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
        : document.documentElement.scrollHeight -
          window.innerHeight -
          window.scrollY;
      const lowest = bottom - Math.max(0, remaining);
      const exitEnd = Math.max(
        view.height * EXIT_FROM,
        lowest + view.height * EXIT_SLACK,
      );
      const leaving = clampToUnit(
        (bottom - exitEnd) / (view.height * (EXIT_TO - EXIT_FROM)),
      );
      // Keyboard reading needs a stable box: native focus scrolling cannot
      // center a card while its ancestor is still changing scale and origin.
      // Mobile stays at reading size as the next section approaches.
      progress.set(
        keyboardFocused
          ? 1
          : mode === "settle"
            ? entering
            : Math.min(entering, leaving),
      );

      /*
       * Pinned by whichever edge is nearer the reader's section: the top on
       * the way in, so the cards open out under the heading; the bottom on the
       * way out, so they close up against the section below instead of
       * leaving a gap above it. The feed is taller than the screen, so the
       * swap happens while it is at full size and the origin makes no
       * difference to what is drawn.
       */
      const midpoint = top + feed.offsetHeight / 2;
      const leavingEdge = mode === "grow" && midpoint < view.height / 2;
      if (leavingEdge !== (feed.dataset.pgFeedLeaving !== undefined)) {
        if (leavingEdge) feed.dataset.pgFeedLeaving = "";
        else delete feed.dataset.pgFeedLeaving;
      }
    };

    const syncFocus = (event: FocusEvent) => {
      const active =
        event.type === "focusout" ? event.relatedTarget : event.target;
      const next =
        active instanceof HTMLElement &&
        feed.contains(active) &&
        active.matches(":focus-visible");
      if (next === keyboardFocused) return;
      keyboardFocused = next;
      track();
      // Land at the reading scale before the homepage centers the new card.
      if (keyboardFocused) settled.jump(progress.get());
    };

    const resize = () => {
      measure();
      track();
    };

    keyboardFocused =
      document.activeElement instanceof HTMLElement &&
      feed.contains(document.activeElement) &&
      document.activeElement.matches(":focus-visible");
    measure();
    track();
    // Arriving mid-page, the feed starts where the scroll already has it.
    settled.jump(progress.get());

    feed.addEventListener("focusin", syncFocus);
    feed.addEventListener("focusout", syncFocus);
    listener.addEventListener("scroll", track, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      feed.removeEventListener("focusin", syncFocus);
      feed.removeEventListener("focusout", syncFocus);
      listener.removeEventListener("scroll", track);
      window.removeEventListener("resize", resize);
      delete feed.dataset.pgFeedLeaving;
      feed.style.removeProperty("--pg-feed-count");
      tiles.forEach((tile) => tile.style.removeProperty("--pg-feed-before"));
    };
  }, [mode, progress, rest, settled, target]);

  /*
   * Always a scale, so enabling reduced motion hands back 1 rather than
   * leaving the last spring value painted on the feed. The same
   * value is handed to the captions as a custom property, which they divide
   * back out; Motion writes custom properties but does not type them.
   */
  const feedScale = live ? scale : 1;
  const style = {
    scale: feedScale,
    "--pg-feed-scale": feedScale,
  } as MotionStyle;

  return (
    <m.div
      className="pg-feed"
      data-pg-feed-live={mode ?? undefined}
      ref={feedRef}
      style={style}
    >
      {children}
    </m.div>
  );
}

export function PlaygroundFeed({ children }: { children: ReactNode }) {
  return (
    <MotionBoundary>
      <FeedStage>{children}</FeedStage>
    </MotionBoundary>
  );
}
