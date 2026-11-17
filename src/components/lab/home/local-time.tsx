"use client";

import { useSyncExternalStore } from "react";

const format = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  hour: "numeric",
  minute: "2-digit",
});

function subscribe(onChange: () => void) {
  const interval = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(interval);
}

/** The time in Toronto, filled in once the page is running in a browser. */
export function LocalTime({ fallback }: { fallback: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () => format.format(new Date()),
    () => null,
  );
  return <>{time ? `${time} in Toronto` : fallback}</>;
}
