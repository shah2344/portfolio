"use client";

import { entranceDelayMs } from "./entrance-timing";

/** A heading leads its sibling content, all released from one viewport trigger. */
export function observeSectionEntrances(root: HTMLElement, openingDelayMs = 0) {
  const openingAt = performance.now();
  const caseStudy = root.classList.contains("case-study-page");
  const headings = [
    ...root.querySelectorAll<HTMLElement>(
      ".section-heading:not([data-home-load])",
    ),
  ];
  const groups = headings.map((heading) => {
    const elements: [HTMLElement, ...HTMLElement[]] = [heading];
    let sibling = heading.nextElementSibling;
    while (
      sibling instanceof HTMLElement &&
      !sibling.matches(".section-heading")
    ) {
      elements.push(sibling);
      if (!caseStudy) break;
      sibling = sibling.nextElementSibling;
    }
    return elements;
  });
  const originals = groups.flat().map((element) => ({
    element,
    homeEnter: element.getAttribute("data-home-enter"),
    delay: element.style.getPropertyValue("--section-enter-delay"),
  }));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const settle = (element: HTMLElement) => {
    element.dataset.sectionEnter = "done";
    if (element.hasAttribute("data-home-enter"))
      element.dataset.homeEnter = "done";
  };
  const show = (elements: HTMLElement[], immediate = false) => {
    for (const element of elements) {
      if (immediate) settle(element);
      else if (element.dataset.sectionEnter === "idle") {
        const remaining = Math.max(
          0,
          openingDelayMs - (performance.now() - openingAt),
        );
        element.style.setProperty(
          "--section-enter-delay",
          `${remaining + entranceDelayMs(elements.indexOf(element))}ms`,
        );
        element.dataset.sectionEnter = "shown";
        if (element.hasAttribute("data-home-enter"))
          element.dataset.homeEnter = "shown";
      }
    }
  };
  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const elements = groups.find((group) =>
                group.includes(entry.target as HTMLElement),
              );
              if (elements) {
                show(elements);
                elements.forEach((element) => observer?.unobserve(element));
              }
            }
          },
          { rootMargin: "0px 0px -6% 0px", threshold: 0 },
        )
      : null;

  for (const elements of groups) {
    elements.forEach((element, index) => {
      element.dataset.sectionEnter = "idle";
      element.style.setProperty(
        "--section-enter-delay",
        `${entranceDelayMs(index)}ms`,
      );
    });
    const [heading] = elements;
    // Deep links and restored scroll positions must never hide content above the viewport.
    if (
      reduced.matches ||
      document.hidden ||
      !observer ||
      heading.getBoundingClientRect().top < 0
    ) {
      show(elements, true);
    } else elements.forEach((element) => observer.observe(element));
  }

  const onEnd = (event: AnimationEvent) => {
    if (event.animationName !== "site-load-enter") return;
    const element = event.target;
    if (
      element instanceof HTMLElement &&
      element.hasAttribute("data-section-enter")
    )
      settle(element);
  };
  const onFocus = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const elements = groups.find((group) =>
      group.some((element) => element.contains(target)),
    );
    if (elements) show(elements, true);
  };
  const onReduced = () => {
    if (!reduced.matches) return;
    observer?.disconnect();
    groups.forEach((elements) => show(elements, true));
  };
  root.addEventListener("animationend", onEnd);
  root.addEventListener("focusin", onFocus);
  reduced.addEventListener("change", onReduced);

  return () => {
    observer?.disconnect();
    root.removeEventListener("animationend", onEnd);
    root.removeEventListener("focusin", onFocus);
    reduced.removeEventListener("change", onReduced);
    for (const { element, homeEnter, delay } of originals) {
      element.removeAttribute("data-section-enter");
      if (homeEnter !== null)
        element.setAttribute("data-home-enter", homeEnter);
      if (delay) element.style.setProperty("--section-enter-delay", delay);
      else element.style.removeProperty("--section-enter-delay");
    }
  };
}
