const STEPS = 32;
const LEAD_REM = 2;
/** Headings start in full ink, so the same fade reads sooner on them. */
const HEADING_DELAY_REM = 2;
const PREFIX = "case-study-line-ink";
const SOURCE = "--case-study-line-source";
const TEXT_BLOCK = "h1, h2, h3, h4, p, li, figcaption, blockquote, dt, dd";
const EXCLUDED =
  ".section-toc, .mobile-toc, .sr-only, [hidden], [data-pg-enlarged], button, .home-footer__rule";

type InkLine = {
  top: number;
  height: number;
  ranges: Range[];
  step: number;
  delay: number;
  anchor: { element: Element; offset: number };
};

type InkViewport = {
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  innerHeight: number;
  pixelRatio: number;
};
type InkZoom = { viewport: InkViewport; scale: number };
type InkPointer = {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
};
const ZOOM_CACHE = "portfolio-case-study-zoom-v1";
let zoomState: InkZoom | undefined;
let savedZoom: string | null | undefined;

/** Screen/client deltas measure actual magnification without DPI assumptions. */
export function lineInkPointerScale(before: InkPointer, after: InkPointer) {
  const dx = after.clientX - before.clientX;
  const dy = after.clientY - before.clientY;
  const sx = after.screenX - before.screenX;
  const sy = after.screenY - before.screenY;
  const distance = dx * dx + dy * dy;
  if (distance < 80 * 80) return;
  const scale = (sx * dx + sy * dy) / distance;
  if (
    !Number.isFinite(scale) ||
    scale < 0.25 ||
    scale > 5 ||
    Math.hypot(sx - scale * dx, sy - scale * dy) > 2
  )
    return;
  const rounded = Math.round(scale * 100) / 100;
  return Math.abs(rounded - 1) <= 0.02 ? 1 : rounded;
}

function readViewport(): InkViewport {
  return {
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
  };
}

/** Never infer zoom from a window's shape or its initial display density. */
export function advanceLineInkZoom(
  previous: InkZoom | undefined,
  viewport: InkViewport,
  restoring = false,
): InkZoom {
  if (!previous) return { viewport, scale: 1 };
  const before = previous.viewport;
  const ratio = viewport.pixelRatio / before.pixelRatio;
  let scale = previous.scale;
  if (Math.abs(ratio - 1) > 0.001) {
    const unchangedWindow =
      Math.abs(viewport.outerWidth - before.outerWidth) < 2 &&
      Math.abs(viewport.outerHeight - before.outerHeight) < 2;
    const matchingReflow =
      Math.abs(before.innerWidth / viewport.innerWidth - ratio) <
        ratio * 0.01 &&
      Math.abs(before.innerHeight / viewport.innerHeight - ratio) <
        ratio * 0.01;
    if (unchangedWindow && matchingReflow) scale *= ratio;
    // Returning to the calibrated density always restores the original timing.
    else if (
      Math.abs(viewport.pixelRatio - before.pixelRatio / previous.scale) < 0.001
    )
      scale = 1;
    // A new display does not imply zoom. An uncorroborated restored session
    // gets the safe default rather than applying an old monitor's calibration.
    else if (restoring) scale = 1;
  }
  return {
    viewport,
    scale: Number.isFinite(scale) && scale >= 0.25 && scale <= 5 ? scale : 1,
  };
}

function updatePageScale(restoring: boolean) {
  if (window.self !== window.top) return 1;
  if (savedZoom === undefined) {
    savedZoom = null;
    try {
      savedZoom = sessionStorage.getItem(ZOOM_CACHE);
      const stored: InkZoom | null = savedZoom ? JSON.parse(savedZoom) : null;
      if (
        stored?.viewport &&
        [
          stored.viewport.outerWidth,
          stored.viewport.outerHeight,
          stored.viewport.innerWidth,
          stored.viewport.innerHeight,
          stored.viewport.pixelRatio,
        ].every(
          (value) =>
            typeof value === "number" && Number.isFinite(value) && value > 0,
        ) &&
        Number.isFinite(stored.scale) &&
        stored.scale >= 0.25 &&
        stored.scale <= 5
      )
        zoomState = stored;
    } catch {
      // Storage can be unavailable; live zoom tracking still works.
    }
  }
  zoomState = advanceLineInkZoom(zoomState, readViewport(), restoring);
  const next =
    Math.abs(zoomState.scale - 1) < 0.001 ? null : JSON.stringify(zoomState);
  if (next !== savedZoom) {
    savedZoom = next;
    try {
      if (next) sessionStorage.setItem(ZOOM_CACHE, next);
      else sessionStorage.removeItem(ZOOM_CACHE);
    } catch {
      // Calibration remains available for this document without storage.
    }
  }
  return Math.max(1, zoomState.scale);
}

/** Start each line's fade a little below the header's blur. */
export function lineInkStep(
  top: number,
  height: number,
  header: number,
  lead = 16 * LEAD_REM,
) {
  const progress = (header + lead - top) / (lead + height / 2);
  return Math.round(Math.max(0, Math.min(1, progress)) * STEPS);
}

/** Find line boundaries in existing text; never wrap or replace React's nodes. */
function textLines(node: Text) {
  const fragments: { range: Range; rect: DOMRect }[] = [];
  const probe = document.createRange();
  probe.selectNodeContents(node);
  const rects = [...probe.getClientRects()];
  const [firstRect] = rects;
  if (!firstRect) return fragments;
  if (rects.every((rect) => Math.abs(rect.top - firstRect.top) < 1)) {
    if (firstRect.width && firstRect.height)
      fragments.push({ range: probe, rect: probe.getBoundingClientRect() });
    return fragments;
  }

  let start = 0;
  const rectAt = (offset: number) => {
    probe.setStart(node, offset);
    probe.setEnd(node, offset + 1);
    return probe.getBoundingClientRect();
  };
  while (start < node.length) {
    const first = rectAt(start);
    let low = start + 1;
    let high = node.length;
    // Text runs advance down the page, so each wrap takes only a binary search.
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rectAt(middle).top > first.top + 1) high = middle;
      else low = middle + 1;
    }
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, low);
    const rect = range.getBoundingClientRect();
    if (rect.width && rect.height) fragments.push({ range, rect });
    start = low;
  }
  return fragments;
}

function startLineInk(root: HTMLElement) {
  const style = document.createElement("style");
  const highlights = Array.from({ length: STEPS }, (_, index) => {
    const name = `${PREFIX}-${index + 1}`;
    const highlight = new Highlight();
    CSS.highlights.set(name, highlight);
    return { name, highlight };
  });
  // Use the originating text's measured color: currentColor in color-mix()
  // resolves differently through highlight inheritance in Chromium and WebKit.
  style.textContent = highlights
    .map(
      ({ name }, index) =>
        `.case-study-page ::highlight(${name}) { color: color-mix(in srgb, var(${SOURCE}) ${100 - ((index + 1) / STEPS) * 100}%, var(--palette-tertiary-label)); }`,
    )
    .join("\n");
  document.head.append(style);

  const sources = new Map<HTMLElement, { value: string; priority: string }>();
  let lines: InkLine[] = [];
  let header = 0;
  let lead = 16 * LEAD_REM;
  let pageScale = 1;
  let restoringZoom = true;
  let frame = 0;
  let needsMeasure = true;
  let disposed = false;

  const restoreSources = () => {
    for (const [element, { value, priority }] of sources) {
      if (value) element.style.setProperty(SOURCE, value, priority);
      else element.style.removeProperty(SOURCE);
    }
    sources.clear();
  };

  const measure = () => {
    for (const { highlight } of highlights) highlight.clear();
    restoreSources();
    const scroll = window.scrollY;
    header =
      root.querySelector(".case-study-page__blur")?.getBoundingClientRect()
        .height ?? 0;
    const rem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    lead = rem * LEAD_REM;
    const headingDelay = rem * HEADING_DELAY_REM;
    pageScale = updatePageScale(restoringZoom);
    restoringZoom = false;
    const groups = new Map<Element, InkLine[]>();
    const colors = new Map<HTMLElement, string>();
    const blockTops = new Map<Element, number>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const parent = node.parentElement;
      const block = parent?.closest(TEXT_BLOCK);
      if (
        !parent ||
        !block ||
        !root.contains(block) ||
        parent.closest(EXCLUDED) ||
        !block.closest("main, .case-study-footer")
      )
        continue;
      if (!colors.has(parent))
        colors.set(parent, getComputedStyle(parent).color);
      const rows = groups.get(block) ?? [];
      groups.set(block, rows);
      let blockTop = blockTops.get(block);
      if (blockTop === undefined) {
        blockTop = block.getBoundingClientRect().top + scroll;
        blockTops.set(block, blockTop);
      }
      for (const { range, rect } of textLines(node as Text)) {
        // Key the fade to the glyphs, not the line box: a heading's looser
        // leading would otherwise carry it past the fade line before body copy.
        const top = scroll + rect.top;
        const center = top + rect.height / 2;
        const row = rows.find(
          (line) => Math.abs(line.top + line.height / 2 - center) < 2,
        );
        if (row) row.ranges.push(range);
        else
          rows.push({
            top,
            height: rect.height,
            ranges: [range],
            step: 0,
            delay: block.matches("h1, h2, h3, h4") ? headingDelay : 0,
            anchor: { element: block, offset: top - blockTop },
          });
      }
    }
    // Finish all layout reads before writing the color custom properties.
    for (const [element, color] of colors) {
      sources.set(element, {
        value: element.style.getPropertyValue(SOURCE),
        priority: element.style.getPropertyPriority(SOURCE),
      });
      element.style.setProperty(SOURCE, color);
    }
    lines = [...groups.values()].flat();
  };

  const paint = () => {
    // Read each text block once before any highlight writes. Keeping line
    // offsets local avoids stale document positions after zoom, font loading,
    // entrances, scroll restoration, and the footer's sticky movement.
    const anchors = new Map<Element, number>();
    for (const line of lines) {
      const { element } = line.anchor;
      if (!anchors.has(element))
        anchors.set(element, element.getBoundingClientRect().top);
    }
    for (const line of lines) {
      const top = (anchors.get(line.anchor.element) ?? 0) + line.anchor.offset;
      const next = lineInkStep(
        (top + line.delay) * pageScale,
        line.height,
        header,
        lead,
      );
      if (next === line.step) continue;
      for (const range of line.ranges) {
        if (line.step) highlights[line.step - 1]?.highlight.delete(range);
        if (next) highlights[next - 1]?.highlight.add(range);
      }
      line.step = next;
    }
  };

  const schedule = (measureAgain = false) => {
    if (disposed) return;
    needsMeasure ||= measureAgain;
    if (frame || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (needsMeasure) {
        needsMeasure = false;
        measure();
      }
      paint();
    });
  };
  const onScroll = () => schedule();
  const onLayout = () => schedule(true);
  let pointer: { point: InkPointer; viewport: InkViewport } | undefined;
  const onPointer = (event: PointerEvent) => {
    if (
      !event.isTrusted ||
      event.pointerType !== "mouse" ||
      window.self !== window.top
    )
      return;
    const viewport = readViewport();
    const point = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX - window.screenX,
      screenY: event.screenY - window.screenY,
    };
    const previous = pointer;
    if (
      !previous ||
      (Object.keys(viewport) as (keyof InkViewport)[]).some(
        (key) => viewport[key] !== previous.viewport[key],
      )
    ) {
      pointer = { point, viewport };
      return;
    }
    const measured = lineInkPointerScale(previous.point, point);
    if (measured === undefined) return;
    pointer = { point, viewport };
    // Pinch magnification is separate from tab zoom and must not be saved as
    // a desktop zoom calibration. No pointer or zoom action is intercepted.
    const scale = measured / (window.visualViewport?.scale || 1);
    if (Math.abs(scale - (zoomState?.scale ?? 1)) > 0.02) {
      zoomState = { viewport, scale };
      onLayout();
    }
  };
  const onArrival = (event: AnimationEvent) => {
    if (event.animationName === "site-load-enter") onLayout();
  };
  let resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const onResolution = () => {
    resolution.removeEventListener("change", onResolution);
    resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    resolution.addEventListener("change", onResolution);
    onLayout();
  };
  resolution.addEventListener("change", onResolution);
  const resize = new ResizeObserver(onLayout);
  resize.observe(root);
  const content = new MutationObserver(onLayout);
  content.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-pg-enlarged"],
  });
  const theme = new MutationObserver(onLayout);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const appearance = matchMedia("(prefers-color-scheme: dark)");
  appearance.addEventListener("change", onLayout);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", onLayout);
  window.visualViewport?.addEventListener("resize", onLayout);
  window.visualViewport?.addEventListener("scroll", onScroll);
  document.addEventListener("visibilitychange", onLayout);
  document.fonts.addEventListener("loadingdone", onLayout);
  root.addEventListener("animationend", onArrival);
  void document.fonts.ready.then(onLayout);
  schedule(true);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    content.disconnect();
    theme.disconnect();
    appearance.removeEventListener("change", onLayout);
    resolution.removeEventListener("change", onResolution);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("resize", onLayout);
    window.visualViewport?.removeEventListener("resize", onLayout);
    window.visualViewport?.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onLayout);
    document.fonts.removeEventListener("loadingdone", onLayout);
    root.removeEventListener("animationend", onArrival);
    for (const { name, highlight } of highlights) {
      if (CSS.highlights.get(name) === highlight) CSS.highlights.delete(name);
    }
    restoreSources();
    style.remove();
  };
}

/** Static, semantic text remains the fallback for reduced motion and old browsers. */
export function observeCaseStudyLineInk(root: HTMLElement) {
  if (
    typeof Highlight === "undefined" ||
    !CSS.highlights ||
    !CSS.supports("color", "color-mix(in srgb, black, white)") ||
    !CSS.supports("selector(::highlight(case-study-line-ink))")
  )
    return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let stop: (() => void) | undefined;
  const sync = () => {
    stop?.();
    stop = reduced.matches ? undefined : startLineInk(root);
  };
  sync();
  reduced.addEventListener("change", sync);
  return () => {
    reduced.removeEventListener("change", sync);
    stop?.();
  };
}
