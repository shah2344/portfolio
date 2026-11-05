"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { GlassMaterial } from "@/components/ui/glass-material";

/** The dock's shared fill: hidden at rest, it fades in on the link under the
 * pointer or keyboard focus and slides between links from there, so one
 * surface travels along the row instead of one fill fading out as another
 * fades in. */
export function HomeDockTrack({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = track.current;
    const pill = highlight.current;
    if (!root || !pill) return;
    const links = Array.from(
      root.querySelectorAll<HTMLAnchorElement>(".home-dock__link"),
    );
    // The hidden fill stays on the link it last filled, so it fades out in place.
    const first = links[0];
    if (!first) return;
    let resting = first;
    let hovered: HTMLAnchorElement | null = null;
    let focused: HTMLAnchorElement | null = null;

    const place = (animate: boolean) => {
      const active = hovered ?? focused;
      // Appearing, the fill starts on its link rather than sliding in hidden.
      if (active && pill.dataset.state !== "active") animate = false;
      if (active) resting = active;
      const target = resting;
      // Measure the list item across: a pressed link scales, its item does not.
      const item = target.parentElement ?? target;
      const from = root.getBoundingClientRect();
      const to = item.getBoundingClientRect();
      if (!animate) root.dataset.highlightInstant = "";
      pill.style.setProperty(
        "--home-dock-highlight-x",
        `${to.left - from.left}px`,
      );
      pill.style.setProperty(
        "--home-dock-highlight-y",
        `${target.offsetTop}px`,
      );
      pill.style.setProperty("--home-dock-highlight-width", `${to.width}px`);
      pill.style.setProperty(
        "--home-dock-highlight-height",
        `${target.offsetHeight}px`,
      );
      pill.dataset.profile = target.dataset.profile;
      pill.dataset.state = active ? "active" : "rest";
      // The fill outlasts :hover across the gaps; give the link the same state.
      links.forEach((link) =>
        link.toggleAttribute(
          "data-highlighted",
          link === target && pill.dataset.state === "active",
        ),
      );
      if (animate) return;
      // Commit the new box before the slide transition comes back.
      void pill.offsetWidth;
      delete root.dataset.highlightInstant;
    };

    const linkFrom = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLAnchorElement>(".home-dock__link")
        : null;
    // Only keyboard focus holds the fill: a clicked link keeps focus, and
    // leaving the row would otherwise slide the fill back to it.
    const keyboardLink = (target: EventTarget | null) => {
      const link = linkFrom(target);
      return link?.matches(":focus-visible") ? link : null;
    };
    // Gaps between links keep the last link, so crossing one never dips back.
    const over = (event: PointerEvent) => {
      const link = linkFrom(event.target);
      if (!link || link === hovered) return;
      hovered = link;
      place(true);
    };
    const leave = () => {
      hovered = null;
      place(true);
    };
    const focusIn = (event: FocusEvent) => {
      focused = keyboardLink(event.target);
      place(true);
    };
    const focusOut = (event: FocusEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        root.contains(event.relatedTarget)
      )
        return;
      focused = null;
      place(true);
    };

    // Navigation and app switching can restore focus or sticky touch hover
    // without another pointerover/focusin event. Reconcile the shared fill
    // with the browser's current link state whenever the page returns.
    const restore = () => {
      hovered = links.find((link) => link.matches(":hover")) ?? null;
      const active = keyboardLink(document.activeElement);
      focused = active && root.contains(active) ? active : null;
      place(false);
    };
    const visibility = () => {
      if (document.visibilityState === "visible") restore();
    };

    restore();
    root.dataset.highlightReady = "";
    const resize = new ResizeObserver(() => place(false));
    resize.observe(root);
    links.forEach((link) => resize.observe(link));
    root.addEventListener("pointerover", over);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", restore);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      resize.disconnect();
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("focusin", focusIn);
      root.removeEventListener("focusout", focusOut);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", restore);
      document.removeEventListener("visibilitychange", visibility);
      links.forEach((link) => link.removeAttribute("data-highlighted"));
      delete root.dataset.highlightReady;
    };
  }, []);

  return (
    <div ref={track} className="home-dock__track">
      <span
        ref={highlight}
        aria-hidden="true"
        className="home-dock__highlight"
        data-profile="email"
        data-state="rest"
      >
        <GlassMaterial />
      </span>
      {children}
    </div>
  );
}
