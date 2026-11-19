"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The beat of dots before a message lands, scaled a little by its length. */
function typingMs(message: HTMLElement) {
  const length = message.textContent?.length ?? 0;
  return Math.min(900, Math.max(480, length * 7));
}

/** Where a message counts as reached: past the lowest sixth of the window. */
const REACHED = "0px 0px -15% 0px";

/**
 * Plays study 04 as a conversation. Every `[data-message]` is rendered unread
 * by the server; the first time one is reached it types for a beat and is
 * delivered, in reading order. The character (`[data-figure]`) sits beside
 * the latest message reached, its foot level with the bubble's, so it drops
 * from one to the next as you read down and climbs back as you scroll up.
 * With reduced motion every message is delivered at once; without scripting,
 * CSS shows every message and the character stays at the top.
 */
export function HostStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const messages = [...host.querySelectorAll<HTMLElement>("[data-message]")];
    const bubbles = messages.filter((m) => !m.hasAttribute("data-attachment"));
    const figure = host.querySelector<HTMLElement>("[data-figure]");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });

    /* --- Where the character stands ------------------------------------- */

    let current: HTMLElement | null = null;
    /** The latest bubble that has started talking and is not below you. */
    const follow = () => {
      const latest = bubbles.findLast(
        (bubble) => passed.has(bubble) && bubble.dataset.state !== "unread",
      );
      if (latest && latest !== current) {
        current = latest;
        place();
      }
    };
    const place = () => {
      const track = figure?.parentElement;
      if (!figure || !track || !current) return;
      const y =
        current.getBoundingClientRect().bottom -
        track.getBoundingClientRect().top -
        figure.offsetHeight;
      figure.style.setProperty("--host-y", `${Math.max(0, y)}px`);
    };
    const resize = new ResizeObserver(place);
    resize.observe(host);

    /* --- Delivery ------------------------------------------------------- */

    const inView = new Set<Element>();
    const passed = new Set<HTMLElement>();
    const queue: HTMLElement[] = [];
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      while (queue.length && !cancelled) {
        const message = queue.shift()!;
        if (message.dataset.state !== "unread") continue;
        // One you have already scrolled past is simply there when you return.
        if (calm || !inView.has(message)) {
          message.dataset.state = "delivered";
          follow();
          continue;
        }
        if (message.hasAttribute("data-attachment")) {
          message.dataset.state = "delivered";
          await wait(90);
          continue;
        }
        message.dataset.state = "typing";
        follow();
        await wait(typingMs(message));
        if (cancelled) break;
        message.dataset.state = "delivered";
        await wait(160);
      }
      running = false;
    };

    if (calm)
      for (const message of messages) message.dataset.state = "delivered";

    const reader = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const message = entry.target as HTMLElement;
          const above =
            !entry.isIntersecting &&
            entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
          if (entry.isIntersecting) inView.add(message);
          else inView.delete(message);
          if (entry.isIntersecting || above) passed.add(message);
          else passed.delete(message);
          if (
            entry.isIntersecting &&
            message.dataset.state === "unread" &&
            !queue.includes(message)
          )
            queue.push(message);
        }
        queue.sort((a, b) => messages.indexOf(a) - messages.indexOf(b));
        void run();

        follow();
      },
      { rootMargin: REACHED },
    );
    for (const message of messages) reader.observe(message);

    return () => {
      cancelled = true;
      // A bubble caught mid-beat types again from the start next time.
      for (const message of messages)
        if (message.dataset.state === "typing")
          message.dataset.state = "unread";
      for (const timer of timers) window.clearTimeout(timer);
      reader.disconnect();
      resize.disconnect();
      figure?.style.removeProperty("--host-y");
    };
  }, []);

  return (
    <div className={className} ref={root}>
      {children}
    </div>
  );
}
