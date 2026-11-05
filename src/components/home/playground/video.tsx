"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";

import { useAfterWipe } from "@/components/motion/use-after-wipe";
import { VideoSources } from "@/components/ui/video-sources";

/**
 * How far ahead of the viewport a tile starts fetching. Far enough that the
 * first frame is decoded by the time the tile is read, close enough that a
 * visitor who never reaches the playground never pays for it.
 */
const PREFETCH_MARGIN = "300px 0px";

/**
 * A playground clip that costs nothing until it is nearly on screen.
 *
 * The element renders with no source at all, so the page's first load fetches
 * none of the several megabytes of footage the grid holds. The source is
 * attached on approach, playback follows the tile in and out of view, and a
 * backgrounded tab stops decoding entirely. Reduced motion never attaches a
 * source, which leaves the still as the finished state.
 *
 * The still is an image under the clip rather than the clip's `poster`: a
 * poster is fetched as soon as the element exists, at full size, so the grid
 * several screens down downloaded every one of its stills with the first
 * screen. As an image it loads lazily, at the width its tile is drawn, and
 * holds a blurred preview from the first paint. The clip has nothing to draw
 * until its first frame, so the still shows through until then.
 */
export function PlaygroundVideo({
  alt,
  poster,
  sizes = "(max-width: 780px) 100vw, 864px",
  src,
}: {
  alt: string;
  poster: StaticImageData;
  sizes?: string;
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScreen = useRef(false);
  const [attached, setAttached] = useState(false);
  // Nothing is fetched or decoded under a theme reveal; see `useAfterWipe`.
  const settled = useAfterWipe();
  const sourced = attached && settled;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const resume = () => {
      if (!onScreen.current || document.hidden || !video.currentSrc) return;
      void video.play().catch(() => {});
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen.current = entries[0]?.isIntersecting ?? false;
        if (onScreen.current) {
          setAttached(true);
          resume();
        } else {
          video.pause();
        }
      },
      { rootMargin: PREFETCH_MARGIN, threshold: 0.01 },
    );
    observer.observe(video);

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else resume();
    };

    document.addEventListener("visibilitychange", onVisibility);
    video.addEventListener("canplay", resume);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("canplay", resume);
    };
  }, []);

  // The element was created without a source, so it needs telling that one has
  // arrived before it will fetch anything.
  useEffect(() => {
    if (sourced) videoRef.current?.load();
  }, [sourced]);

  return (
    <>
      <Image
        alt=""
        className="pg-media"
        fill
        placeholder="blur"
        sizes={sizes}
        src={poster}
      />
      <video
        aria-label={alt}
        className="pg-media"
        disablePictureInPicture
        loop
        muted
        playsInline
        preload="none"
        ref={videoRef}
      >
        {sourced ? <VideoSources src={src} /> : null}
      </video>
    </>
  );
}
