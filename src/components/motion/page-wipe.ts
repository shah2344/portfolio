/**
 * Snapshot animations: the theme reveal, and the case-study page change
 * between home and a case study. Both capture one viewport-sized picture of
 * the document; other routes navigate without capturing the page.
 */
export type WipeDirection = "forward" | "back";
export type ZoomDirection = "open" | "close";
type WipeOrigin = { x: number; y: number };
let wiping: Promise<void> | null = null;
let activeTransition: ViewTransition | null = null;
let queuedTheme: (() => void) | undefined;

/** Media only waits while a theme snapshot is being composited. */
export function currentWipe() {
  return wiping;
}

/** A navigation interrupts theme capture without delaying the destination. */
export function navigateToPage(navigate: () => void) {
  queuedTheme = undefined;
  activeTransition?.skipTransition();
  navigate();
}

function canCapture() {
  return (
    typeof document.startViewTransition === "function" &&
    document.visibilityState === "visible" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Resolves once the routed page is in the DOM, or gives up after a beat. */
function arrival(arrived: () => boolean) {
  return new Promise<void>((resolve) => {
    if (arrived()) return resolve();
    const done = () => {
      observer.disconnect();
      clearTimeout(timeout);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (arrived()) done();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = setTimeout(done, 1500);
  });
}

/**
 * Opens a case study from home, or closes it back. The whole viewport is the
 * only snapshot: the old page eases away and the new one settles in with a
 * light scale, blur and fade, all in CSS (`data-page-zoom` in `globals.css`),
 * so no per-frame work runs while the page arrives.
 */
export function navigateWithZoom(
  navigate: () => void,
  direction: ZoomDirection,
  arrived: () => boolean,
) {
  queuedTheme = undefined;
  activeTransition?.skipTransition();
  if (wiping || !canCapture()) {
    navigate();
    return;
  }
  const root = document.documentElement;
  root.dataset.pageWipe = direction;
  root.dataset.pageZoom = direction;
  let captured = false;
  const transition = document.startViewTransition(async () => {
    captured = true;
    navigate();
    await arrival(arrived);
  });
  activeTransition = transition;
  // A page that isn't drawing frames (an occluded window) can hold the old
  // picture's capture, and the click with it; navigate without the motion.
  const stalled = setTimeout(() => {
    if (!captured) transition.skipTransition();
  }, 250);
  void transition.ready.catch(() => {});
  const finished = transition.finished.then(
    () => {},
    () => {},
  );
  wiping = finished;
  void finished.then(() => {
    clearTimeout(stalled);
    if (wiping === finished) wiping = null;
    if (activeTransition === transition) activeTransition = null;
    delete root.dataset.pageWipe;
    delete root.dataset.pageZoom;
  });
}

/** Theme changes alone use the existing button-origin reveal. */
export function updateWithWipe(
  update: () => void,
  direction: WipeDirection,
  origin?: WipeOrigin,
) {
  if (wiping) {
    queuedTheme = () => updateWithWipe(update, direction, origin);
    return;
  }
  if (!canCapture()) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.pageWipe = direction;
  if (origin) {
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );
    root.dataset.wipeOrigin = "button";
    root.style.setProperty("--theme-wipe-x", `${origin.x}px`);
    root.style.setProperty("--theme-wipe-y", `${origin.y}px`);
    root.style.setProperty("--theme-wipe-end", `${Math.ceil(radius)}px`);
    root.style.setProperty(
      "--theme-wipe-feather",
      `${Math.ceil(radius * 0.65)}px`,
    );
  }
  const playing = Array.from(document.querySelectorAll("video")).filter(
    (video) => !video.paused,
  );
  playing.forEach((video) => video.pause());
  const transition = document.startViewTransition(update);
  activeTransition = transition;
  void transition.ready.catch(() => {});
  const finished = transition.finished.then(
    () => {},
    () => {},
  );
  wiping = finished;
  void finished.then(() => {
    if (wiping === finished) wiping = null;
    if (activeTransition === transition) activeTransition = null;
    delete root.dataset.pageWipe;
    delete root.dataset.wipeOrigin;
    for (const property of [
      "--theme-wipe-x",
      "--theme-wipe-y",
      "--theme-wipe-end",
      "--theme-wipe-feather",
    ]) {
      root.style.removeProperty(property);
    }
    playing.forEach((video) => {
      if (video.isConnected && video.paused) void video.play().catch(() => {});
    });
    const queued = queuedTheme;
    queuedTheme = undefined;
    queued?.();
  });
}
