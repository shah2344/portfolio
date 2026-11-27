"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

/**
 * Sends `event` once, the first time the element with `targetId` scrolls into
 * view. Renders nothing; the event carries the page's URL, so it needs no
 * other data.
 */
export function TrackOnView({
  event,
  targetId,
}: {
  event: string;
  targetId: string;
}) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      track(event);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [event, targetId]);

  return null;
}
