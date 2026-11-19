"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Runs `step` every `interval` ms while the element is on screen, so a card
 * quietly shows what its component does. It holds still for anyone who asks
 * the system for reduced motion, while the pointer is over the card, while
 * focus is inside it, and for a while after a press, so it never moves under
 * someone using it. `delay` staggers neighbouring cards.
 */
export function useAutoplay<T extends HTMLElement>(
  ref: RefObject<T | null>,
  step: () => void,
  { interval, delay = 0 }: { interval: number; delay?: number },
) {
  const latest = useRef(step);

  useEffect(() => {
    latest.current = step;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The card the component sits on owns hover and focus.
    const card = element.closest<HTMLElement>("[role=group]") ?? element;

    let visible = false;
    let hovered = false;
    let focused = false;
    let restUntil = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (wait: number) => {
      clearTimeout(timer);
      timer = setTimeout(tick, wait);
    };
    const tick = () => {
      if (!visible) return;
      const idle =
        !reduce.matches &&
        !hovered &&
        !focused &&
        !document.hidden &&
        Date.now() >= restUntil;
      if (idle) latest.current();
      schedule(interval);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = entry?.isIntersecting ?? false;
        if (next === visible) return;
        visible = next;
        if (visible) schedule(delay + interval * 0.6);
        else clearTimeout(timer);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);

    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);
    const onFocusIn = () => (focused = true);
    const onFocusOut = () => (focused = false);
    // A press inside a feed card doesn't bubble, so listen on the card.
    const onDown = () => (restUntil = Date.now() + interval * 3);
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);
    card.addEventListener("focusin", onFocusIn);
    card.addEventListener("focusout", onFocusOut);
    card.addEventListener("pointerdown", onDown);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      card.removeEventListener("focusin", onFocusIn);
      card.removeEventListener("focusout", onFocusOut);
      card.removeEventListener("pointerdown", onDown);
    };
  }, [ref, interval, delay]);
}
