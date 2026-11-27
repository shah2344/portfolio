/*
 * Custom events for Umami (see `docs/maintaining.md`, "Tracking"). The
 * tracker script is only on the production site, so every call here is a
 * no-op in development, in previews, and before the script has loaded.
 */

type EventData = Record<string, string>;

declare global {
  interface Window {
    umami?: { track(event: string, data?: EventData): void };
  }
}

export function track(event: string, data?: EventData) {
  try {
    window.umami?.track(event, data);
  } catch {
    // Analytics must never break the page.
  }
}

/**
 * Reads an event from an element marked up as
 * `data-track="contact" data-track-channel="email"`, returning
 * `{ event: "contact", data: { channel: "email" } }`.
 *
 * Umami's own `data-umami-event` attributes are not used: on a same-tab link
 * the tracker cancels the click and sets `location.href` itself, which would
 * turn client-side navigations (and the case-study sheet) into full reloads.
 */
export function readTrackedEvent(
  dataset: DOMStringMap,
): { event: string; data?: EventData } | null {
  const event = dataset.track;
  if (!event) return null;

  const data: EventData = {};
  for (const [key, value] of Object.entries(dataset)) {
    if (key === "track" || !key.startsWith("track") || value === undefined) {
      continue;
    }
    const name = key.slice("track".length);
    data[name.charAt(0).toLowerCase() + name.slice(1)] = value;
  }

  return Object.keys(data).length > 0 ? { event, data } : { event };
}

/** A same-origin URL as its path, so events group by file, not by host. */
export function assetPath(src: string, origin: string): string {
  try {
    const url = new URL(src, origin);
    const path = url.origin === origin ? url.pathname + url.search : url.href;
    return path.slice(0, 500);
  } catch {
    return src.slice(0, 500);
  }
}
