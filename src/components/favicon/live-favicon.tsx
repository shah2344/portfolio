"use client";

import { useEffect } from "react";

import {
  FAVICON_BLINK,
  FAVICON_DOZE,
  FAVICON_FRAME_DIR,
  FAVICON_FRAMES,
  FAVICON_HELLO,
  nextFaviconBlink,
  type FaviconFrame,
  type FaviconStep,
} from "./live-favicon-frames";

/*
 * The character in the tab: it blinks while the page is in view, dozes off
 * once you switch away, and says hello when you come back. The static icons
 * stay the fallback until every frame has loaded; with reduced motion it only
 * swaps between awake and asleep.
 */
export function LiveFavicon() {
  useEffect(() => {
    const links = [
      ...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'),
    ];
    if (!links.length) return;
    const originals = links.map((link) => ({
      link,
      href: link.getAttribute("href"),
      type: link.getAttribute("type"),
    }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Data URLs, so a swap never waits on the network or the favicon cache.
    const frames = new Map<FaviconFrame, string>();
    let timer = 0;
    let asleep = false;
    let started = false;
    let disposed = false;

    const show = (frame: FaviconFrame) => {
      const href = frames.get(frame);
      if (!href) return;
      for (const link of links) {
        link.type = "image/png";
        link.href = href;
      }
    };
    const play = (steps: readonly FaviconStep[], then?: () => void) => {
      window.clearTimeout(timer);
      let index = 0;
      const tick = () => {
        const [frame, hold] = steps[index++]!;
        show(frame);
        if (index < steps.length) timer = window.setTimeout(tick, hold);
        else then?.();
      };
      tick();
    };
    const idle = () => {
      window.clearTimeout(timer);
      if (reduced.matches || document.hidden) return;
      timer = window.setTimeout(
        () => play(FAVICON_BLINK, idle),
        nextFaviconBlink(Math.random()),
      );
    };
    const visibility = () => {
      if (document.hidden) {
        asleep = true;
        if (reduced.matches) {
          window.clearTimeout(timer);
          show("doze-5");
        } else play(FAVICON_DOZE);
      } else if (asleep) {
        asleep = false;
        if (reduced.matches) {
          window.clearTimeout(timer);
          show("rest");
        } else play(FAVICON_HELLO, idle);
      }
    };

    const load = async () => {
      const entries = await Promise.all(
        FAVICON_FRAMES.map(async (frame) => {
          const response = await fetch(`${FAVICON_FRAME_DIR}/${frame}.png`);
          if (!response.ok) throw new Error(`Missing favicon frame ${frame}`);
          const blob = await response.blob();
          const url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          return [frame, url] as const;
        }),
      );
      if (disposed) return;
      for (const [frame, url] of entries) frames.set(frame, url);
      started = true;
      document.addEventListener("visibilitychange", visibility);
      if (document.hidden) visibility();
      else idle();
    };
    // Frames are a nicety: fetch them once the page has settled, and keep the
    // static icon if any of them fails.
    const begin = window.setTimeout(() => {
      load().catch(() => {});
    }, 1500);

    return () => {
      disposed = true;
      window.clearTimeout(begin);
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
      if (!started) return;
      for (const { link, href, type } of originals) {
        if (type === null) link.removeAttribute("type");
        else link.setAttribute("type", type);
        if (href !== null) link.setAttribute("href", href);
      }
    };
  }, []);

  return null;
}
