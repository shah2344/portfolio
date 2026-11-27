/*
 * Runs once before the app hydrates (Next's client instrumentation file).
 * Two document-level listeners feed Umami; neither touches the page.
 */
import { assetPath, readTrackedEvent, track } from "@/lib/analytics";

// Clicks on anything marked `data-track` (see `readTrackedEvent`). Passive, so
// the link or button behaves exactly as it would without it.
document.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest<HTMLElement>("[data-track]");
    if (!element) return;
    const tracked = readTrackedEvent(element.dataset);
    if (tracked) track(tracked.event, tracked.data);
  },
  { capture: true, passive: true },
);

// Images and films that fail to load. Umami's error tracking only sees script
// exceptions; a failed load fires a non-bubbling `error` on the element, so
// it is caught on the way down.
window.addEventListener(
  "error",
  (event) => {
    const element = event.target;
    if (!(
      element instanceof HTMLImageElement ||
      element instanceof HTMLMediaElement ||
      element instanceof HTMLSourceElement
    )) {
      return;
    }
    const src =
      ("currentSrc" in element && element.currentSrc) ||
      element.getAttribute("src") ||
      "";
    track("asset-failed", {
      kind: element.tagName.toLowerCase(),
      src: assetPath(src, window.location.origin),
    });
  },
  true,
);
