"use client";

import { useLayoutEffect } from "react";

import { homeCharacterArrival } from "./character/timing";
import { homeCharacterEntranceFrames } from "./character/entrance";
import { isHomeResume, rememberHomeResume } from "./resume";

import { observeSectionEntrances } from "@/components/motion/section-entrances";

import {
  isReturnVisit,
  rememberHomeScroll,
  takeHomeScroll,
} from "@/components/motion/return-visit";

/** Plays first-visit entrances and restores home without replaying them. */
export function HomeEntranceRoot({
  rootMargin = "0px 0px -6% 0px",
}: {
  rootMargin?: string;
}) {
  // Restore before paint, so returning readers keep their place.
  useLayoutEffect(() => {
    if (isReturnVisit()) {
      window.scrollTo({ top: takeHomeScroll() ?? 0, behavior: "instant" });
    }
    const forgetResume = rememberHomeResume();
    return () => {
      forgetResume();
      rememberHomeScroll(window.scrollY);
    };
  }, []);

  useLayoutEffect(() => {
    const targets = [
      ...document.querySelectorAll<HTMLElement>("[data-home-enter]"),
    ];
    if (targets.length === 0) return;

    const finish = (target: HTMLElement) => {
      target.dataset.homeEnter = "done";
    };
    const { timing } = homeCharacterArrival();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const character = document.querySelector<HTMLElement>(
      ".home-masthead__character",
    );
    // The opening is composed for the top of the page. A refresh or history
    // visit partway down, or a link to a section, lands on the finished page:
    // the stylesheet already painted it that way (see `resume.ts`). A section
    // link followed inside the app arrives here without that mark.
    if (
      isReturnVisit() ||
      isHomeResume() ||
      window.location.hash ||
      document.hidden ||
      reduced.matches ||
      !character?.animate ||
      typeof IntersectionObserver !== "function"
    ) {
      for (const target of targets) finish(target);
      return;
    }

    // The character is the stagger's first beat (step 0, no delay), released
    // in the same commit as the copy; its own spring sets it apart from text.
    const home = document.querySelector<HTMLElement>(".home");
    const arrival = character.animate(homeCharacterEntranceFrames(), {
      duration: timing.entranceMs,
      fill: "both",
    });
    let disposed = false;
    const settleCharacter = () => {
      finish(character);
      arrival.cancel();
    };
    void arrival.finished.then(
      () => {
        if (!disposed) settleCharacter();
      },
      () => {},
    );

    character.dataset.homeEnter = "shown";
    // Release every opening chunk in the same commit; CSS delays then share
    // one clock, including the two independent intro paragraphs.
    for (const target of targets) {
      if (target.hasAttribute("data-home-load")) {
        target.dataset.homeEnter = "shown";
      }
    }

    const openingAt = performance.now();
    const abort = new AbortController();
    const skipOpening = () => {
      if (performance.now() - openingAt > timing.entranceMs + 750) return;
      settleCharacter();
      for (const target of targets) {
        if (target.hasAttribute("data-home-load")) finish(target);
      }
      // Release any section already queued on the opening clock as well.
      home
        ?.querySelectorAll<HTMLElement>('[data-section-enter="shown"]')
        .forEach((target) => {
          target.dataset.sectionEnter = "done";
          if (target.hasAttribute("data-home-enter")) finish(target);
        });
    };
    const listener = { signal: abort.signal };
    document.addEventListener("keydown", skipOpening, {
      ...listener,
      capture: true,
    });
    document.addEventListener("focusin", skipOpening, listener);
    document.addEventListener("pointerdown", skipOpening, listener);
    window.addEventListener("wheel", skipOpening, {
      ...listener,
      passive: true,
    });
    window.addEventListener("touchstart", skipOpening, {
      ...listener,
      passive: true,
    });
    // Partway down, the browser's scroll restoration and the feed's snapping
    // move the page on their own; wheel, touch and keys still skip it there.
    if (window.scrollY === 0)
      window.addEventListener("scroll", skipOpening, {
        ...listener,
        passive: true,
      });
    window.addEventListener("resize", skipOpening, listener);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) skipOpening();
      },
      listener,
    );
    reduced.addEventListener(
      "change",
      () => {
        if (reduced.matches) skipOpening();
      },
      listener,
    );

    const cleanupSections = home ? observeSectionEntrances(home) : undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          observer.unobserve(target);
          target.dataset.homeEnter = "shown";
        }
      },
      { rootMargin, threshold: 0.08 },
    );

    const onAnimationEnd = (event: AnimationEvent) => {
      const target = event.currentTarget as HTMLElement;
      // Chunks' own ends bubble up here; only the target's own entrance counts.
      if (event.target !== target || target.dataset.homeEnter !== "shown") {
        return;
      }
      const kind = target.dataset.homeEnterKind;
      const finishingAnimation =
        target.hasAttribute("data-home-load") || kind === "chrome"
          ? "site-load-enter"
          : kind === "heading"
            ? "home-heading-rule-enter"
            : kind === "surface"
              ? "home-surface-enter"
              : "home-section-enter";
      if (event.animationName !== finishingAnimation) return;
      /* Chunks inside the target stagger in past its own entrance, and
         finishing now would cut them off partway; settle once they land. */
      const chunks = target
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith("home-"),
        );
      void Promise.allSettled(chunks.map(({ finished }) => finished)).then(() =>
        finish(target),
      );
    };

    for (const target of targets) {
      if (target.hasAttribute("data-section-enter")) continue;
      target.addEventListener("animationend", onAnimationEnd);
      if (target.dataset.homeEnter === "idle") observer.observe(target);
    }

    return () => {
      disposed = true;
      abort.abort();
      arrival.cancel();
      observer.disconnect();
      cleanupSections?.();
      for (const target of targets) {
        target.removeEventListener("animationend", onAnimationEnd);
      }
    };
  }, [rootMargin]);

  return null;
}
