"use client";

import { useLayoutEffect } from "react";

import {
  HOME_CHARACTER_TIMING,
  homeCharacterArrival,
  setHomeCharacterDeparture,
} from "./character/timing";
import {
  homeCharacterDissolveFrames,
  homeCharacterEntranceFrames,
} from "./character/entrance";

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
    return () => rememberHomeScroll(window.scrollY);
  }, []);

  useLayoutEffect(() => {
    const targets = [
      ...document.querySelectorAll<HTMLElement>("[data-home-enter]"),
    ];
    if (targets.length === 0) return;

    const finish = (target: HTMLElement) => {
      target.dataset.homeEnter = "done";
    };
    // Read while the masthead is idle: the CSS waiting state ends with it.
    const { waitedMs, waitingAt } = homeCharacterArrival();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const character = document.querySelector<HTMLElement>(
      ".home-masthead__character",
    );
    // A link to a section skips the opening, which is composed for the top of
    // the page. A refresh partway down still greets, then dissolves in place
    // when the masthead is out of view.
    const displaced = Boolean(window.location.hash);
    if (
      isReturnVisit() ||
      displaced ||
      document.hidden ||
      reduced.matches ||
      !character?.animate ||
      typeof IntersectionObserver !== "function"
    ) {
      // Any waiting character still has to leave the centre of the screen.
      const homing =
        displaced &&
        waitingAt &&
        character?.animate &&
        !isReturnVisit() &&
        !document.hidden &&
        !reduced.matches
          ? character
          : undefined;
      for (const target of targets) if (target !== homing) finish(target);
      return homing && waitingAt
        ? sendCharacterHome(homing, waitingAt)
        : undefined;
    }

    // A slow load already showed the arrival in CSS; continue it from where
    // it is rather than replaying it, however long the character waited.
    const elapsed = Math.min(waitedMs, HOME_CHARACTER_TIMING.arrivalMs);
    const contentDelayMs = HOME_CHARACTER_TIMING.contentDelayMs - elapsed;
    const home = document.querySelector<HTMLElement>(".home");
    home?.style.setProperty(
      "--home-character-content-delay",
      `${contentDelayMs}ms`,
    );
    // Measure the untransformed resting slot. Only the character moves; the
    // document retains its final layout throughout the opening.
    const slot = character.getBoundingClientRect();
    const viewport = window.visualViewport;
    const centerX =
      waitingAt?.x ??
      (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) / 2;
    const centerY =
      waitingAt?.y ??
      (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) / 2;
    const slotHidden = slot.bottom <= 0 || slot.top >= window.innerHeight;
    const arrival = character.animate(
      (slotHidden ? homeCharacterDissolveFrames : homeCharacterEntranceFrames)(
        centerX - slot.left - slot.width / 2,
        centerY - slot.top - slot.height / 2,
      ),
      { duration: HOME_CHARACTER_TIMING.entranceMs, fill: "both" },
    );
    arrival.currentTime = elapsed;
    setHomeCharacterDeparture(
      performance.now() + HOME_CHARACTER_TIMING.travelDelayMs - elapsed,
    );
    let disposed = false;
    const settleCharacter = () => {
      finish(character);
      arrival.cancel();
      setHomeCharacterDeparture(undefined);
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

    const openingAt = performance.now() - elapsed;
    const abort = new AbortController();
    const skipOpening = () => {
      if (
        performance.now() - openingAt >
        HOME_CHARACTER_TIMING.contentDelayMs + 750
      )
        return;
      settleCharacter();
      home?.style.setProperty("--home-character-content-delay", "0ms");
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

    const cleanupSections = home
      ? observeSectionEntrances(home, contentDelayMs)
      : undefined;

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
      setHomeCharacterDeparture(undefined);
      observer.disconnect();
      cleanupSections?.();
      home?.style.removeProperty("--home-character-content-delay");
      for (const target of targets) {
        target.removeEventListener("animationend", onAnimationEnd);
      }
    };
  }, [rootMargin]);

  return null;
}

/**
 * The CSS waiting state was on screen, but a link landed partway down.
 * The character takes the opening's trip from where it waits, without the hold
 * or greeting: it lands in the masthead if that is in view, and otherwise
 * rises out of view toward it. A character that had barely appeared fades.
 */
function sendCharacterHome(
  character: HTMLElement,
  waiting: { ms: number; x: number; y: number },
) {
  const slot = character.getBoundingClientRect();
  const root = character.querySelector<HTMLElement>("[data-character-root]");
  const slotHidden = slot.bottom <= 0 || slot.top >= window.innerHeight;
  let animation: Animation;
  if (root && slotHidden && waiting.ms < HOME_CHARACTER_TIMING.arrivalMs) {
    // Still idle, so it fades where the CSS state holds it.
    animation = root.animate(
      [{ opacity: getComputedStyle(root).opacity }, { opacity: 0 }],
      { duration: 160, easing: "ease-out", fill: "forwards" },
    );
  } else {
    animation = character.animate(
      homeCharacterEntranceFrames(
        waiting.x - slot.left - slot.width / 2,
        waiting.y - slot.top - slot.height / 2,
      ),
      { duration: HOME_CHARACTER_TIMING.entranceMs, fill: "both" },
    );
    animation.currentTime = HOME_CHARACTER_TIMING.travelDelayMs;
    character.dataset.homeEnter = "shown";
  }
  void animation.finished.then(
    () => {
      character.dataset.homeEnter = "done";
      animation.cancel();
    },
    () => {},
  );
  return () => animation.cancel();
}
