"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

import { MotionBoundary } from "@/components/motion/motion-boundary";
import { GlassMaterial } from "@/components/ui/glass-material";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

import { useMobileTocPresence } from "./mobile-toc-presence";

/**
 * One rail entry. A row with `sections` is a group: it opens those rows while
 * it is the one being read, and scrolls to the first of them. A row without
 * them scrolls to its own id, which is how a flat list still behaves.
 */
export type TocSection = {
  readonly id: string;
  readonly label: string;
  readonly sections?: readonly {
    readonly id: string;
    readonly label: string;
  }[];
};

/**
 * How far below the anchor line a heading still counts as arrived. Scroll
 * containers snap `scrollTop` to whole pixels, so a tapped section routinely
 * settles a fraction short of the line; without this band the row the reader
 * just tapped would fail its own test and leave the marker behind.
 */
const SECTION_ARRIVAL_SLACK = 12;

/** Anchor line while the rail is hidden and has no first row to measure. */
const FALLBACK_ANCHOR = 112;
const INTRODUCTION_ID = "toc-introduction";
const MOBILE_TOC_BLUR_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2.5, 4];

/**
 * How the marker reads a sub-section rather than a top-level one: stepped in
 * toward the indented row and a size smaller, so the dot says which level of
 * the rail it is on without the rail needing a second marker for it.
 */
const DOT_CHILD_INSET = 14;
const DOT_CHILD_SCALE = 0.72;

/**
 * The marker's travel. Bounce is kept very low because overshoot scales with
 * distance: what reads as life across one row reads as a lurch across the
 * height of an open group, which is the longest move the rail ever makes.
 */
const DOT_SPRING = {
  bounce: 0.05,
  /* The first measurement is a placement, not a move: the marker belongs on
     the active row the moment the rail mounts. */
  skipInitialAnimation: true,
  visualDuration: 0.42,
} as const;

/**
 * How long the marker travels at its top-level size before stepping in. Set
 * inside the spring's own duration, so the step in starts while the marker is
 * still settling vertically and the two read as one arc rather than two moves.
 */
const DOT_STEP_IN_DELAY_MS = 200;

const STANDARD_EASE: [number, number, number, number] = [0.2, 0, 0, 1];

/**
 * A group opens and closes by clipping its own height, and its rows carry
 * nothing but opacity and a short lift. Both are composited, and neither is
 * measured: the marker reads the row boxes, which stay put while the buttons
 * inside them move. Closing runs shorter than opening — a group the reader has
 * left should be gone before the one they moved to arrives.
 */
const CHILD_OPEN = {
  height: { duration: 0.32, ease: STANDARD_EASE },
  opacity: { duration: 0.26, delay: 0.04, ease: STANDARD_EASE },
  y: { duration: 0.32, ease: STANDARD_EASE },
} as const;

const CHILD_CLOSE = {
  height: { duration: 0.24, ease: STANDARD_EASE },
  opacity: { duration: 0.14, ease: STANDARD_EASE },
  y: { duration: 0.24, ease: STANDARD_EASE },
} as const;

const CHILD_HIDDEN = { opacity: 0, y: -6 };
const CHILD_VISIBLE = { opacity: 1, y: 0 };

/**
 * The visual start of a section: its first heading or lead paragraph, so the
 * scroll target and the active-state test both key off the same line rather
 * than a wrapper whose padding differs section to section.
 */
function getSectionHeading(section: HTMLElement | null): HTMLElement | null {
  if (!section) return null;
  return section.querySelector<HTMLElement>("h1, h2, h3, p") ?? section;
}

/**
 * The line the reader perceives as a section's start. Home section headings
 * carry a large top padding, so the element's box top sits well above the
 * visible label; snapping that box top to the rail would leave the label
 * resting the padding's worth too low. Adding the heading's own top padding
 * lands the label itself on the line, and case-study dividers — whose padding
 * sits on the wrapper rather than the heading — are unaffected.
 *
 * The padding is read separately from the position, because the two change on
 * completely different clocks. Where a section sits changes on every frame of
 * a scroll; how much padding it carries changes only when the layout does. Read
 * together — a `getComputedStyle` and a `getBoundingClientRect` per section per
 * frame, style query and layout query interleaved — they made the rail force a
 * fresh style resolution and a fresh layout several times per frame, all to
 * answer a question whose answer almost never changed.
 */
function getHeadingPadding(heading: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(heading).paddingTop) || 0;
}

function getHeadingLine(heading: HTMLElement, paddingTop: number): number {
  return heading.getBoundingClientRect().top + paddingTop;
}

/**
 * The y-coordinate of an element's first text baseline. A zero-size inline
 * block aligned to the baseline sits exactly on it, so one is slipped in ahead
 * of the first text and taken straight back out. Only read on a tap, never on
 * the scroll path.
 */
function getFirstBaseline(element: HTMLElement): number | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent?.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP,
  });
  const text = walker.nextNode();
  if (!text?.parentNode) return null;

  const probe = document.createElement("span");
  probe.style.cssText =
    "display:inline-block;width:0;height:0;vertical-align:baseline";
  text.parentNode.insertBefore(probe, text);
  const baseline = probe.getBoundingClientRect().top;
  probe.remove();
  return baseline;
}

/**
 * The page may scroll in the document or inside a container. The case studies
 * scroll the document; a selector names a container for a rail that lives in
 * one. Reading position off the element while listening on the matching
 * target covers both.
 */
function resolveScroller(selector?: string) {
  const container = selector
    ? document.querySelector<HTMLElement>(selector)
    : null;
  if (container) {
    return {
      contained: true,
      element: container,
      target: container as EventTarget,
    };
  }

  const element = (document.scrollingElement ??
    document.documentElement) as HTMLElement;
  return { contained: false, element, target: window as EventTarget };
}

/**
 * The y-coordinate the active section heading should snap to — the first rail
 * row while the rail is mounted, otherwise a fixed inset below the top of the
 * surface being scrolled.
 */
function getAnchorLine(
  firstRow: HTMLElement | null,
  scroller: { contained: boolean; element: HTMLElement },
): number {
  if (firstRow?.getClientRects().length)
    return firstRow.getBoundingClientRect().top;

  const surfaceTop = scroller.contained
    ? scroller.element.getBoundingClientRect().top
    : 0;
  return surfaceTop + FALLBACK_ANCHOR;
}

/**
 * The contents rail: fixed beside the reading column, out of the way over the
 * opening screen, then arriving as the first section reaches its line and
 * tracking the reader from there. One component for every case study.
 */
type SectionTocProps = {
  /** The scrolling element. Omitted, the document scrolls. */
  scrollSelector?: string;
  sections: readonly TocSection[];
};

export function SectionToc(props: SectionTocProps) {
  return (
    <MotionBoundary>
      <SectionTocContent {...props} />
    </MotionBoundary>
  );
}

function SectionTocContent({ scrollSelector, sections }: SectionTocProps) {
  const reduceMotion = useReducedMotion();

  /*
   * The rows as rendered: one per top-level entry, each carrying the children
   * it opens. A flat list produces one row per section and no children, which
   * is the shape the shorter case studies pass.
   */
  const rows = useMemo(
    () =>
      sections.map((section, index) => {
        const children = section.sections ?? [];
        return {
          children,
          key: `toc-row-${index}`,
          label: section.label,
          targetId: children[0]?.id ?? section.id,
        };
      }),
    [sections],
  );

  /*
   * The sections scroll position is actually measured against: the leaves of
   * the list, in page order. A group is never a leaf — its children are, so
   * the rail can say which part of a group the reader is in.
   */
  const leaves = useMemo(
    () =>
      rows.flatMap((row) =>
        row.children.length
          ? row.children.map((child) => ({
              id: child.id,
              isChild: true,
              markerKey: child.id,
              rowKey: row.key,
            }))
          : [
              {
                id: row.targetId,
                isChild: false,
                markerKey: row.key,
                rowKey: row.key,
              },
            ],
      ),
    [rows],
  );

  const [activeId, setActiveId] = useState<string>(leaves[0]?.id ?? "");
  /*
   * The active row, mirrored for the scroll path. `update` ran on every frame
   * and called `setActiveId` unconditionally — React bails out on an identical
   * value, but only after the call has been made and the update scheduled.
   * Comparing here keeps a scroll through one long section from touching React
   * at all.
   */
  const activeIdRef = useRef(activeId);
  const [scrolledIn, setScrolledIn] = useState(false);
  const [inIntroduction, setInIntroduction] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  // The group the marker has finished travelling to, and so stepped in under.
  const [steppedInRowKey, setSteppedInRowKey] = useState<string | null>(null);
  // Deterministic mirror of the reveal for the rAF loop, plus a flag that pins
  // the rail open from a tap until the programmatic scroll ends.
  const visibleRef = useRef(false);
  const pinnedRef = useRef(false);
  const mobileScrollRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const cancelScroll = () => {
      mobileScrollRef.current?.stop();
      mobileScrollRef.current = null;
    };
    const cancelWithKey = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
          "Escape",
        ].includes(event.key)
      )
        cancelScroll();
    };
    window.addEventListener("wheel", cancelScroll, { passive: true });
    window.addEventListener("touchstart", cancelScroll, { passive: true });
    window.addEventListener("pointerdown", cancelScroll, { passive: true });
    window.addEventListener("keydown", cancelWithKey);
    return () => {
      cancelScroll();
      window.removeEventListener("wheel", cancelScroll);
      window.removeEventListener("touchstart", cancelScroll);
      window.removeEventListener("pointerdown", cancelScroll);
      window.removeEventListener("keydown", cancelWithKey);
    };
  }, []);

  /*
   * The marker's position is a motion value rather than state. A group opening
   * resizes the list on every frame of its animation, and each of those frames
   * re-measures: as state that would re-render the whole rail thirty times
   * across a 0.3s expand, which is most of where the rail's jank came from.
   */
  const measuredY = useMotionValue(0);
  const springY = useSpring(measuredY, DOT_SPRING);
  const markerY = reduceMotion ? measuredY : springY;

  const activeLeaf = leaves.find((leaf) => leaf.id === activeId) ?? leaves[0];
  const activeRowKey = activeLeaf?.rowKey ?? "";
  const activeMarkerKey = activeLeaf?.markerKey ?? "";
  const isOnChild = activeLeaf?.isChild ?? false;
  const isSteppedIn = isOnChild && steppedInRowKey === activeRowKey;

  /*
   * Measured against the nav the dot is positioned in, rather than walked up
   * an `offsetTop` chain: a row inside an open group sits two levels down, and
   * which of those levels counts as its offset parent is not worth relying on.
   */
  const measureMarker = useCallback(() => {
    const nav = navRef.current;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-toc-marker="${activeMarkerKey}"]`,
    );
    if (!nav || !row) return;

    const navTop = nav.getBoundingClientRect().top;
    const rowRect = row.getBoundingClientRect();
    measuredY.set(rowRect.top - navTop + rowRect.height / 2);
  }, [activeMarkerKey, measuredY]);

  useLayoutEffect(() => {
    measureMarker();
  }, [measureMarker, scrolledIn]);

  /*
   * Changing group sends the marker back out to the rail's spine at full size
   * for the length of the travel, then steps it in to the sub-section it
   * landed on: the group it has stepped in under is state, and stepping out is
   * simply that key no longer matching. Moving between sections of the group
   * already open is a slide rather than a round trip, which is why this is
   * keyed on the group and not on the section.
   */
  useEffect(() => {
    if (!isOnChild || steppedInRowKey === activeRowKey) return;

    const steppingIn = setTimeout(
      () => setSteppedInRowKey(activeRowKey),
      reduceMotion ? 0 : DOT_STEP_IN_DELAY_MS,
    );
    return () => clearTimeout(steppingIn);
  }, [activeRowKey, isOnChild, reduceMotion, steppedInRowKey]);

  /*
   * Opening a group moves every row below it, so one measurement taken as the
   * active row changes would read the layout the expand is about to leave.
   * Each group's own list is what gets watched, not just the outer one: when
   * one group closes as another opens, the outer list keeps its height the
   * whole way and would never report a thing.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new ResizeObserver(() => measureMarker());
    observer.observe(list);
    for (const group of list.querySelectorAll("ul")) observer.observe(group);
    return () => observer.disconnect();
  }, [measureMarker]);

  useEffect(() => {
    const scroller = resolveScroller(scrollSelector);
    let animationFrame = 0;

    /*
     * What the scroll path needs to know about the page, resolved once rather
     * than re-derived every frame: which element marks each section, how much
     * top padding it carries, and which row is the rail's anchor. None of it
     * changes while the reader scrolls — only where these boxes sit does — so
     * the frame path is left with one `getBoundingClientRect` per section and
     * no style resolution at all.
     */
    let measured: {
      element: HTMLElement;
      leaf: (typeof leaves)[number];
      paddingTop: number;
    }[] = [];
    let anchorRow: HTMLElement | null = null;

    const remeasure = () => {
      measured = [];
      for (const leaf of leaves) {
        const element = getSectionHeading(document.getElementById(leaf.id));
        if (!element) continue;
        measured.push({
          element,
          leaf,
          paddingTop: getHeadingPadding(element),
        });
      }
      anchorRow = navRef.current?.querySelector("li") ?? null;
    };

    /* The rail re-renders as the reader moves through it, and the sheet's own
       content can arrive after the first pass, so a cache holding an element
       that has since left the document is rebuilt rather than trusted. */
    const cacheIsStale = () =>
      measured.length === 0 ||
      !measured.every((entry) => entry.element.isConnected) ||
      (anchorRow !== null && !anchorRow.isConnected);

    const setActive = (id: string) => {
      if (id === activeIdRef.current) return;
      activeIdRef.current = id;
      setActiveId(id);
    };

    const update = () => {
      animationFrame = 0;
      if (cacheIsStale()) remeasure();
      const activationLine = getAnchorLine(anchorRow, scroller);
      const first = measured[0];
      if (!first) return;

      // Hysteresis: reveal as the first heading nears the line, then keep the
      // rail up through a much larger buffer on the way back so scrolling up
      // (or landing a tap on the line) never trips the exit stagger. While a
      // tap-driven scroll is settling the rail is pinned open outright.
      const headingTop = getHeadingLine(first.element, first.paddingTop);
      const isAtStart = scroller.element.scrollTop <= 1;
      setInIntroduction(
        isAtStart || headingTop > activationLine + SECTION_ARRIVAL_SLACK,
      );
      if (isAtStart) pinnedRef.current = false;

      const nextVisible = isAtStart
        ? false
        : pinnedRef.current
          ? true
          : visibleRef.current
            ? headingTop <= activationLine + 260
            : headingTop <= activationLine + 40;

      if (nextVisible !== visibleRef.current) {
        visibleRef.current = nextVisible;
        setScrolledIn(nextVisible);
      }

      if (!nextVisible) return;

      // A tap owns the active row until its scroll settles, so the headings
      // sweeping past the line on the way there never flicker the marker.
      if (pinnedRef.current) return;

      // At the end of the scroll range the last section can no longer reach
      // the line, so arriving at the bottom is what marks it read.
      const lastLeaf = leaves[leaves.length - 1];
      const remaining =
        scroller.element.scrollHeight -
        scroller.element.clientHeight -
        scroller.element.scrollTop;
      if (lastLeaf && remaining <= 2) {
        setActive(lastLeaf.id);
        return;
      }

      let active = first.leaf;
      for (const entry of measured) {
        if (
          getHeadingLine(entry.element, entry.paddingTop) <=
          activationLine + SECTION_ARRIVAL_SLACK
        ) {
          active = entry.leaf;
        }
      }
      setActive(active.id);
    };

    const requestUpdate = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(update);
    };

    const releasePin = () => {
      pinnedRef.current = false;
      requestUpdate();
    };

    /* A resize is the one thing that can change the padding and the anchor row
       under the cache, so it is what rebuilds it. */
    const onResize = () => {
      remeasure();
      requestUpdate();
    };

    remeasure();
    requestUpdate();
    scroller.target.addEventListener("scroll", requestUpdate, {
      passive: true,
    });
    scroller.target.addEventListener("scrollend", releasePin);
    window.addEventListener("resize", onResize);

    return () => {
      scroller.target.removeEventListener("scroll", requestUpdate);
      scroller.target.removeEventListener("scrollend", releasePin);
      window.removeEventListener("resize", onResize);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [leaves, scrollSelector]);

  function scrollToSection(id: string, mobile = false) {
    const scroller = resolveScroller(scrollSelector);
    const isIntroduction = mobile && id === INTRODUCTION_ID;
    const heading = getSectionHeading(document.getElementById(id));
    if (!heading && !isIntroduction) return;

    // Land the section heading on the same line as the first rail row: on its
    // baseline while the rail is showing, since the heading is set larger than
    // the row and matching box tops leaves it reading low. The container only
    // scrolls in whole pixels, so a fractional delta would leave the heading
    // resting a fraction below the line — visibly short of the row that points
    // at it. Round the landing up instead.
    const anchorRow = navRef.current?.querySelector("li") ?? null;
    const headingBaseline = heading ? getFirstBaseline(heading) : null;
    const rowBaseline = anchorRow?.getClientRects().length
      ? getFirstBaseline(anchorRow)
      : null;
    const delta = !heading
      ? 0
      : headingBaseline !== null && rowBaseline !== null
        ? headingBaseline - rowBaseline
        : getHeadingLine(heading, getHeadingPadding(heading)) -
          getAnchorLine(anchorRow, scroller);
    const top = isIntroduction
      ? 0
      : Math.ceil(scroller.element.scrollTop + delta);

    // Keep the rail open while the smooth scroll runs (released on scrollend),
    // so arriving at a section never reads as an exit. The tap also sets the
    // active row outright: the reader asked for this section, so it should
    // read as current immediately rather than after the scroll lands.
    visibleRef.current = true;
    setScrolledIn(true);
    activeIdRef.current = id;
    setActiveId(id);
    if (Math.abs(top - scroller.element.scrollTop) > 1)
      pinnedRef.current = true;

    const scrollTarget = scroller.contained ? scroller.element : window;
    mobileScrollRef.current?.stop();
    if (mobile && !reduceMotion) {
      // Drive the position directly: native smooth scroll can be cancelled
      // while the focused disclosure collapses in WebKit.
      const destination = Math.max(
        0,
        Math.min(
          top,
          scroller.element.scrollHeight - scroller.element.clientHeight,
        ),
      );
      mobileScrollRef.current = animate(
        scroller.element.scrollTop,
        destination,
        {
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (position) =>
            scrollTarget.scrollTo({ top: position, behavior: "instant" }),
          onComplete: () => {
            mobileScrollRef.current = null;
          },
        },
      );
    } else {
      scrollTarget.scrollTo({
        behavior: reduceMotion ? "instant" : "smooth",
        top,
      });
    }
  }

  return (
    <>
      <MobileSectionToc
        activeId={inIntroduction ? INTRODUCTION_ID : activeId}
        onSelect={(id) => scrollToSection(id, true)}
        sections={sections}
      />
      <m.nav
        ref={navRef}
        aria-label="Page sections"
        aria-hidden={!scrolledIn}
        animate={{ filter: scrolledIn ? "blur(0px)" : "blur(6px)" }}
        className={`section-toc ${scrolledIn ? "section-toc--visible" : ""}`}
        initial={false}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.28, ease: STANDARD_EASE }
        }
      >
        <m.span
          aria-hidden="true"
          className="section-toc__dot"
          animate={{
            opacity: scrolledIn ? 1 : 0,
            scale: isSteppedIn ? DOT_CHILD_SCALE : 1,
            x: isSteppedIn ? DOT_CHILD_INSET : 0,
          }}
          initial={false}
          style={{ y: markerY }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: STANDARD_EASE }
          }
        />

        <m.ol
          ref={listRef}
          animate={scrolledIn ? "visible" : "hidden"}
          initial="hidden"
          variants={{
            hidden: {
              transition: reduceMotion
                ? { duration: 0 }
                : { staggerChildren: 0.05, staggerDirection: -1 },
            },
            visible: {
              transition: reduceMotion
                ? { duration: 0 }
                : { staggerChildren: 0.05, delayChildren: 0.06 },
            },
          }}
        >
          {rows.map((row) => {
            const isActive = activeRowKey === row.key;
            const hasChildren = row.children.length > 0;

            return (
              <m.li
                key={row.key}
                data-toc-marker={hasChildren ? undefined : row.key}
                variants={{
                  hidden: { opacity: 0, x: -8, filter: "blur(4px)" },
                  visible: { opacity: 1, x: 0, filter: "blur(0px)" },
                }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.32, ease: STANDARD_EASE }
                }
              >
                <button
                  aria-current={isActive ? "location" : undefined}
                  aria-expanded={hasChildren ? isActive : undefined}
                  onClick={() => scrollToSection(row.targetId)}
                  tabIndex={scrolledIn ? 0 : -1}
                  type="button"
                >
                  <span aria-hidden="true" className="section-toc__marker" />
                  <m.span
                    animate={{
                      fontWeight: isActive ? 540 : 450,
                    }}
                    initial={false}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.28, ease: STANDARD_EASE }
                    }
                  >
                    {row.label}
                  </m.span>
                </button>

                {hasChildren ? (
                  <m.ul
                    animate={{ height: isActive ? "auto" : 0 }}
                    aria-hidden={!isActive}
                    className="section-toc__children"
                    initial={false}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : isActive
                          ? CHILD_OPEN.height
                          : CHILD_CLOSE.height
                    }
                  >
                    {/*
                     * The row keeps its own geometry and the button carries the
                     * motion: the marker measures these rows, and a transformed
                     * row would hand it the position mid-animation.
                     */}
                    {row.children.map((child) => (
                      <li key={child.id} data-toc-marker={child.id}>
                        <m.button
                          animate={isActive ? CHILD_VISIBLE : CHILD_HIDDEN}
                          aria-current={
                            activeId === child.id ? "location" : undefined
                          }
                          initial={false}
                          onClick={() => scrollToSection(child.id)}
                          tabIndex={scrolledIn && isActive ? 0 : -1}
                          /*
                           * No per-row delay. The rail re-renders whenever the
                           * active section changes, and a delayed animation
                           * restarts with it — so a staggered row could sit at
                           * its start value, invisible, for as long as the
                           * scroll lasted. The group's own clip carries the
                           * sequence instead.
                           */
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : isActive
                                ? CHILD_OPEN
                                : CHILD_CLOSE
                          }
                          type="button"
                        >
                          {child.label}
                        </m.button>
                      </li>
                    ))}
                  </m.ul>
                ) : null}
              </m.li>
            );
          })}
        </m.ol>
      </m.nav>
    </>
  );
}

/** A bottom-anchored disclosure: the same surface grows upward from its button. */
function MobileSectionToc({
  activeId,
  onSelect,
  sections,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  sections: readonly TocSection[];
}) {
  const [open, setOpen] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState(320);
  const [collapsedWidth, setCollapsedWidth] = useState<number | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const spring = {
    type: "spring",
    visualDuration: 0.18,
    bounce: 0,
  } as const;
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const navRef = useRef<HTMLElement>(null);
  const glassSync = useRef<(() => void) | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusOnOpenRef = useRef(false);

  useMobileTocPresence(navRef);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const page = nav?.closest(".case-study-page");
    const landing = page?.querySelector<HTMLElement>(".mobile-toc-landing");
    if (!nav || !landing) return;

    let restingBottom = 16;

    // Dock in document coordinates when the closing row reaches the button.
    // An absolute control then follows native rubber-banding with the page.
    const update = () => {
      // Above the breakpoint the landing is gone; hold the last position
      // while the button slides away.
      if (!landing.getClientRects().length) return;
      const shell = nav;
      const landingRect = landing.getBoundingClientRect();
      // Read the resolved fixed inset above the viewport edge.
      // Once docked, bottom is auto; retain the last viewport inset.
      if (shell.dataset.docked !== "true") {
        restingBottom = Number.parseFloat(getComputedStyle(shell).bottom) || 16;
      }
      const docked = landingRect.bottom <= window.innerHeight - restingBottom;
      shell.dataset.docked = String(docked);
      if (docked) {
        const parent = shell.offsetParent as HTMLElement | null;
        const parentRect = parent?.getBoundingClientRect();
        shell.style.setProperty(
          "--toc-docked-top",
          landingRect.bottom -
            (parentRect?.top ?? 0) -
            shell.offsetHeight +
            "px",
        );
        shell.style.setProperty(
          "--toc-docked-left",
          landingRect.left - (parentRect?.left ?? 0) + "px",
        );
      }
      const scroller = document.scrollingElement ?? document.documentElement;
      const maxScroll = Math.max(0, scroller.scrollHeight - window.innerHeight);
      const overscroll =
        window.scrollY < 0
          ? window.scrollY
          : Math.max(0, window.scrollY - maxScroll);
      shell.style.setProperty("--toc-overscroll-y", -overscroll + "px");
      const endingTop =
        landing.closest(".humi-story-ending")?.getBoundingClientRect().top ?? 0;
      const distance = endingTop - window.innerHeight;
      shell.dataset.ending = String(distance <= 0);
      shell.style.setProperty(
        "--toc-shadow-opacity",
        String(Math.min(1, Math.max(0, distance / 96))),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    observer.observe(nav);
    observer.observe(landing);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useLayoutEffect(() => {
    const label = labelRef.current;
    const resize = () => {
      const styles = navRef.current && getComputedStyle(navRef.current);
      const safeLeft =
        Number.parseFloat(styles?.getPropertyValue("--toc-safe-left") ?? "") ||
        0;
      const safeRight =
        Number.parseFloat(styles?.getPropertyValue("--toc-safe-right") ?? "") ||
        0;
      setExpandedWidth(
        Math.min(
          320,
          document.documentElement.clientWidth - 48 - safeLeft - safeRight,
        ),
      );
      const toggle = toggleRef.current;
      const icon = toggle?.querySelector<HTMLElement>(".mobile-toc__icon");
      const toggleStyles = toggle ? getComputedStyle(toggle) : null;
      const labelWidth = label
        ? Number.parseFloat(getComputedStyle(label).width)
        : 0;
      if (labelWidth > 0 && toggleStyles) {
        // Size the closed pill from the current icon, gap, and horizontal padding.
        const buttonWidth =
          labelWidth +
          (icon?.getBoundingClientRect().width ?? 0) +
          (Number.parseFloat(toggleStyles.columnGap) || 0) +
          // Keep the closed pill measurement stable while Close has no padding.
          1.75 *
            Number.parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            );
        setCollapsedWidth(buttonWidth);
        navRef.current
          ?.closest(".case-study-page")
          ?.querySelector<HTMLElement>(".mobile-toc-landing")
          ?.style.setProperty("--toc-collapsed-width", buttonWidth + "px");
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (label) observer.observe(label);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    // offsetHeight stays in layout pixels while the outer shell is pressed.
    // Measuring an "auto" animation through that scale underestimates its
    // destination, then jumps when Motion restores the natural height.
    const measure = () => setPanelHeight(scroll.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const scroll = scrollRef.current;
    const current = scroll?.querySelector<HTMLButtonElement>(
      'button[aria-current="location"]',
    );
    // Reopen around the current section, including after the reader scrolls
    // elsewhere with the sheet closed. The list keeps its final width while
    // the shell expands, so row wrapping does not change during the morph.
    if (scroll && current)
      scroll.scrollTop = Math.max(
        0,
        current.offsetTop -
          scroll.offsetTop -
          (scroll.clientHeight - current.offsetHeight) / 2,
      );
    if (focusOnOpenRef.current) {
      (current ?? scroll?.querySelector<HTMLButtonElement>("button"))?.focus({
        preventScroll: true,
      });
      focusOnOpenRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !navRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    };
    const desktop = window.matchMedia("(min-width: 80.001rem)");
    const dismissOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape, true);
    desktop.addEventListener("change", dismissOnDesktop);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape, true);
      desktop.removeEventListener("change", dismissOnDesktop);
    };
  }, [open]);

  function selectSection(id: string) {
    toggleRef.current?.focus({ preventScroll: true });
    setOpen(false);
    onSelect(id);
  }

  return (
    <>
      <div aria-hidden="true" className="mobile-toc-backdrop" data-open={open}>
        <ProgressiveBlur height="100%" blurLevels={MOBILE_TOC_BLUR_LEVELS} />
      </div>
      <m.nav
        animate={{
          width: open
            ? expandedWidth
            : collapsedWidth === null
              ? "max-content"
              : Math.min(collapsedWidth, expandedWidth),
        }}
        initial={false}
        transition={
          reduceMotion ? { duration: 0, delay: open ? 0 : 0.15 } : spring
        }
        ref={navRef}
        aria-label="Case study contents"
        className="mobile-toc"
        onUpdate={() => glassSync.current?.()}
        data-open={open}
        onBlur={(event) => {
          // Touch/Safari can clear focus before dispatching a row's click.
          // A null target also occurs when tapping non-focusable sheet padding.
          // Outside pointer taps are handled separately by dismissOutside.
          if (
            event.relatedTarget instanceof Node &&
            !event.currentTarget.contains(event.relatedTarget)
          )
            setOpen(false);
        }}
      >
        <GlassMaterial syncRef={glassSync} />
        <div className="mobile-toc__content">
          <m.div
            onUpdate={() => glassSync.current?.()}
            animate={{ height: open ? panelHeight : 0, opacity: open ? 1 : 0 }}
            aria-hidden={!open}
            className="mobile-toc__panel"
            id={panelId}
            inert={!open}
            initial={false}
            transition={
              reduceMotion
                ? {
                    height: { duration: 0, delay: open ? 0 : 0.15 },
                    opacity: { duration: 0.15, ease: STANDARD_EASE },
                  }
                : {
                    height: spring,
                    opacity: {
                      duration: open ? 0.14 : 0.12,
                      ease: STANDARD_EASE,
                    },
                  }
            }
          >
            <m.div
              ref={scrollRef}
              className="mobile-toc__scroll"
              style={{ width: expandedWidth }}
              initial={false}
              animate={{ y: reduceMotion || open ? 0 : 6 }}
              transition={reduceMotion ? { duration: 0 } : spring}
            >
              <ol>
                {[
                  { id: INTRODUCTION_ID, label: "Introduction" },
                  ...sections,
                ].map((section: TocSection) => {
                  const children = section.sections ?? [];
                  const targetId = children[0]?.id ?? section.id;
                  const isActive = children.length
                    ? children.some((child) => child.id === activeId)
                    : activeId === section.id;

                  return (
                    <li key={section.id}>
                      <button
                        aria-current={
                          !children.length && isActive ? "location" : undefined
                        }
                        className="mobile-toc__section"
                        data-active={isActive}
                        onClick={() => selectSection(targetId)}
                        tabIndex={open ? 0 : -1}
                        type="button"
                      >
                        {section.label}
                      </button>
                      {children.length ? (
                        <ul>
                          {children.map((child) => (
                            <li key={child.id}>
                              <button
                                aria-current={
                                  activeId === child.id ? "location" : undefined
                                }
                                onClick={() => selectSection(child.id)}
                                tabIndex={open ? 0 : -1}
                                type="button"
                              >
                                {child.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </m.div>
          </m.div>
          <button
            ref={toggleRef}
            aria-label={open ? "Close contents" : "Contents"}
            aria-controls={panelId}
            aria-expanded={open}
            className="mobile-toc__toggle"
            onClick={(event) => {
              focusOnOpenRef.current = !open && event.detail === 0;
              setOpen((current) => !current);
            }}
            type="button"
          >
            <span aria-hidden="true" className="mobile-toc__icon">
              <svg
                className="mobile-toc__contents-icon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6ZM2 12C2 11.4477 2.44772 11 3 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H3C2.44772 13 2 12.5523 2 12ZM2 18C2 17.4477 2.44772 17 3 17H11C11.5523 17 12 17.4477 12 18C12 18.5523 11.5523 19 11 19H3C2.44772 19 2 18.5523 2 18Z"
                  fill="currentColor"
                />
              </svg>
              <svg
                className="mobile-toc__close-icon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span aria-hidden="true" className="mobile-toc__label">
              <span ref={labelRef} className="mobile-toc__contents-label">
                Contents
              </span>
              <span className="mobile-toc__close-label">Close</span>
            </span>
          </button>
        </div>
      </m.nav>
    </>
  );
}
