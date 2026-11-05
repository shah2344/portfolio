"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { currentWipe } from "@/components/motion/page-wipe";

/** Never hold a frame on its skeleton longer than this. */
const FALLBACK = 2500;

/** The frames that wait on their media: each player, and the App Store rail. */
const FRAMES = ".anyday-video-player, .anyday-shots";

/**
 * Whether a frame's media has something to show: a player's primary layer its
 * first frame, the rail any of its shots. A clip that failed counts as ready,
 * since there is nothing left to wait for. The loop buffer behind a player
 * loads on its own time and is never waited on.
 */
function hasMedia(frame: HTMLElement) {
  const video = frame.querySelector<HTMLVideoElement>(
    "video:not([data-loop-buffer])",
  );
  if (video) return video.readyState >= 2 || video.error !== null;

  const shots = Array.from(frame.querySelectorAll("img"));
  return (
    shots.length === 0 ||
    shots.some((shot) => shot.complete && shot.naturalWidth > 0)
  );
}

/**
 * Holds each frame of a set on its media ground until its own media can
 * be shown, then reveals that frame in a blur-fade. Frames resolve one at a
 * time, as their media lands: the set used to wait for its slowest clip, which
 * kept every frame beside it grey after its own media had arrived. Media that
 * comes out of the cache lands without a loading colour shift.
 *
 * Media events don't bubble, so readiness is listened for in the capture phase.
 */
export function AnyDayMediaReveal({ children }: { children: ReactNode }) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    let active = true;
    const shown = new WeakSet<HTMLElement>();

    const show = (frame: HTMLElement) => {
      if (shown.has(frame)) return;
      shown.add(frame);
      const reveal = () => {
        if (active) frame.dataset.ready = "";
      };
      // A frame is shown only once any theme reveal is over, as the waiting
      // media holds still under it (see `html[data-page-wipe]` in
      // `globals.css`).
      const wipe = currentWipe();
      if (wipe) void wipe.then(reveal);
      else reveal();
    };

    const frames = () =>
      Array.from(group.querySelectorAll<HTMLElement>(FRAMES));

    const check = () => {
      for (const frame of frames()) if (hasMedia(frame)) show(frame);
    };

    check();
    const events = ["loadeddata", "seeked", "canplay", "error", "load"];
    events.forEach((type) => group.addEventListener(type, check, true));
    const fallback = window.setTimeout(() => frames().forEach(show), FALLBACK);

    return () => {
      active = false;
      events.forEach((type) => group.removeEventListener(type, check, true));
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="anyday-reveal" ref={groupRef}>
      {/* Without script nothing would mark a frame ready, so show it as is. */}
      <noscript>
        <style>{`.anyday-reveal :is(.anyday-video-player, .anyday-shots)::after { content: none; } .anyday-reveal :is(.anyday-video-player video, .anyday-shots__track) { filter: none; }`}</style>
      </noscript>
      {children}
    </div>
  );
}
