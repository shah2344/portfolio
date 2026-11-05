"use client";

import { useEffect, useRef, useState } from "react";

import { currentWipe } from "@/components/motion/page-wipe";
import { useAfterWipe } from "@/components/motion/use-after-wipe";
import { VideoSources } from "@/components/ui/video-sources";

import styles from "./anyday-film.module.css";
/** Product playback over the card's static, baked-in reflection. */
export function ReflectedFilm({
  height,
  src,
  title,
  width,
}: {
  height: number;
  src: string;
  title: string;
  width: number;
}) {
  /* The film's own first frame. */
  const [framed, setFramed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  /* Mounted during a theme reveal, the film has no source until it is over;
     its still stands in meanwhile. See `useAfterWipe`. */
  const settled = useAfterWipe();
  const deferredRef = useRef(!settled);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // A frame already decoded before hydration shows at once.
    const land = () => setFramed(true);
    if (video.readyState >= 2) land();

    // Playback, only while on screen and only without reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let waitingForWipe: Promise<void> | null = null;
    const sync = () => {
      const wipe = currentWipe();
      if (wipe) {
        video.pause();
        if (waitingForWipe !== wipe) {
          waitingForWipe = wipe;
          void wipe.then(() => {
            waitingForWipe = null;
            if (video.isConnected) sync();
          });
        }
        return;
      }
      // No sources yet, held back by a theme change (see `useAfterWipe`): the
      // effect runs again once they are in, and its observer calls back.
      if (!video.querySelector("source")) return;
      if (visible && !reduce.matches) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    reduce.addEventListener("change", sync);
    video.addEventListener("loadedmetadata", sync);
    if (video.readyState >= 1) sync();

    video.addEventListener("loadeddata", land);

    return () => {
      video.removeEventListener("loadedmetadata", sync);
      observer.disconnect();
      reduce.removeEventListener("change", sync);
      video.removeEventListener("loadeddata", land);
    };
  }, [settled, src]);

  // Sources added after mount need telling before the element fetches them.
  useEffect(() => {
    if (!settled || !deferredRef.current) return;
    deferredRef.current = false;
    videoRef.current?.load();
  }, [settled]);

  return (
    <div className={styles.film}>
      <video
        aria-label={title}
        data-waiting={framed ? undefined : ""}
        height={height}
        loop
        muted
        playsInline
        preload="none"
        ref={videoRef}
        width={width}
      >
        {settled ? <VideoSources src={src} /> : null}
      </video>
    </div>
  );
}
