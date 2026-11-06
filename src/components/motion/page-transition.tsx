"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

import { currentWipe } from "./page-wipe";
import { observeSectionEntrances } from "./section-entrances";
import { observeCaseStudyLineInk } from "./case-study-line-ink";

const visited = new Set<string>();

/**
 * First arrivals play the case-study entrance; revisits and deep links settle
 * before paint.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const firstArrival = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    const page = document.querySelector<HTMLElement>(".case-study-page");
    if (page) return observeCaseStudyLineInk(page);
  }, []);
  useLayoutEffect(() => {
    const page = document.querySelector<HTMLElement>(".case-study-page");
    if (!page) return;
    const path = window.location.pathname;
    // Keep Strict Mode's effect replay from mistaking the first mount for a return.
    firstArrival.current ??= !visited.has(path);
    visited.add(path);
    if (!firstArrival.current || window.location.hash) {
      page.dataset.caseArrival = "done";
      return;
    }
    const stopSections = observeSectionEntrances(page);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const openingMedia = page.querySelector(".humi-story-intro + *");
    const settleArrival = () => {
      page.dataset.caseArrival = "done";
    };
    // Release the intro's animation declarations after the last opening beat,
    // allowing its scroll color timeline to take over without a second entrance.
    const onEnd = (event: AnimationEvent) => {
      if (
        event.animationName === "site-load-enter" &&
        event.target === openingMedia
      )
        settleArrival();
    };
    const onReduced = () => {
      if (reduced.matches) settleArrival();
    };
    // The zoom is this page's entrance. A second one inside its picture left
    // the screen nearly empty once the old page had gone.
    if (reduced.matches || !openingMedia || currentWipe()) settleArrival();
    page.addEventListener("animationend", onEnd);
    reduced.addEventListener("change", onReduced);
    return () => {
      stopSections();
      page.removeEventListener("animationend", onEnd);
      reduced.removeEventListener("change", onReduced);
    };
  }, []);
  return children;
}
