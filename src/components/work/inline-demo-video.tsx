"use client";

import type { EffectsConfig } from "@lisse/core";

import { SmoothSurface } from "@/components/ui/smooth-surface";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import pauseIcon from "remixicon/icons/Media/pause-large-fill.svg";
import playIcon from "remixicon/icons/Media/play-large-fill.svg";

import { MotionBoundary } from "@/components/motion/motion-boundary";
import { currentWipe } from "@/components/motion/page-wipe";
import { useAfterWipe } from "@/components/motion/use-after-wipe";
import { RemixIcon } from "@/components/ui/remix-icon";
import { VideoSources } from "@/components/ui/video-sources";

import {
  advanceLoopTime,
  LOOP_START,
  LOOP_TAIL,
  LOOP_BLEND,
} from "./video-loop-clock";

// The tap icon arrives with a little more presence than it leaves with.
const glyphEnter = { type: "spring", duration: 0.3, bounce: 0 } as const;
const glyphExit = { type: "spring", duration: 0.3, bounce: 0 } as const;

interface InlineDemoVideoProps {
  /** Use the story lead frame's corner treatment. */
  cardRadius?: boolean;
  /**
   * A still behind the clip that stands in for it until the first frame lands,
   * in place of the grey skeleton a waiting clip otherwise shows.
   */
  backdrop?: ReactNode;
  /** Uses the tighter corner treatment for videos grouped inside one card. */
  compact?: boolean;
  /** Blend the end into the opening frame; disable for a direct native loop. */
  crossfadeLoop?: boolean;
  /**
   * Starts loading as soon as the page is live rather than when it nears the
   * viewport: the clip on the first screen.
   */
  eager?: boolean;
  /** Shows the play/pause surface and timeline. */
  controls?: boolean;
  describedBy: string;
  /** Lisse borders and shadows drawn on the clip's own smoothed outline. */
  effects?: EffectsConfig;
  /** Drops the frame's lift shadow, for a clip that should sit on the page. */
  flat?: boolean;
  /** Match the frame and loading surface to the film's own background. */
  ground?: string;
  /** Draws a light hairline around the frame, for a clip that sits on the page
   *  without a plate behind it. */
  hairline?: boolean;
  height: number;
  /** Shows the seek timeline while keeping play/pause available. */
  scrubbable?: boolean;
  src: string;
  title: string;
  width: number;
}

/** False while rendering on the server and hydrating, true after. */
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * How many seconds before the crossfade the loop buffer starts loading. By
 * then the primary layer has fetched the clip, so the buffer is served out of
 * the HTTP cache instead of downloading the same file alongside it.
 */
const BUFFER_LEAD = 3;

// A small, quick spring so the controls settle in rather than pop.
const controlsSpring = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.6,
} as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const roundedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainder}`;
}

function visibleRatio(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0),
  );
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
  );

  return (visibleWidth * visibleHeight) / Math.max(1, rect.width * rect.height);
}

export function InlineDemoVideo({
  backdrop,
  cardRadius = false,
  compact = false,
  crossfadeLoop = true,
  eager = false,
  controls = true,
  describedBy,
  effects,
  flat = false,
  ground,
  hairline = false,
  height,
  scrubbable = true,
  src,
  title,
  width,
}: InlineDemoVideoProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLVideoElement | null)[]>([]);
  const autoplayTimerRef = useRef<number | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const manuallyPausedRef = useRef(false);
  const startedRef = useRef(false);
  const pendingWipeRef = useRef<Promise<void> | null>(null);
  /*
   * A story mounts a couple of dozen clips at once, and each one that loads
   * starts a media pipeline, fetches its metadata, and seeks to its opening
   * frame. Doing all of that up front put a burst of work on top of first
   * paint, so a clip further down waits until it is within a screen of the
   * viewport before it loads anything.
   */
  const [near, setNear] = useState(eager);
  /*
   * No clip loads before hydration, the first-screen one included: its
   * backdrop is the page's largest paint, and a video request issued from the
   * HTML competed with it and with the page's scripts for a slow connection.
   * An `eager` clip starts the moment the page is live instead.
   */
  const hydrated = useSyncExternalStore(subscribeNever, onClient, onServer);
  /*
   * The loop buffer — the second layer the crossfade hands over to — used to
   * load with the clip, so every clip in a story was downloaded twice at once.
   * It now waits until playback is nearing the crossfade; see `BUFFER_LEAD`.
   */
  const [bufferArmed, setBufferArmed] = useState(false);
  const bufferArmedRef = useRef(false);
  /* A clip mounted during a theme reveal has no source until it is over; see
     `useAfterWipe`. Its backdrop or skeleton holds the frame meanwhile. */
  const settled = useAfterWipe();
  const sourced = settled && hydrated && near;
  const loadedLayersRef = useRef(new WeakSet<HTMLVideoElement>());
  const visibleRef = useRef(false);
  const [inView, setInView] = useState(false);
  const backgroundRef = useRef<{
    time: number;
    at: number;
    rate: number;
  } | null>(null);
  const explicitPlayRef = useRef(false);
  /* Autoplay asked for before the sources went in. A `play()` on the empty
     element is aborted by the `load()` that follows, and Safari then never
     draws a frame, so it is held and replayed after the load instead. */
  const playQueuedRef = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);

  const [manuallyPaused, setManuallyPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  // The play/pause icon that blooms in over the frame after a tap, then fades.
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const waiting = paused && (manuallyPaused || Boolean(reducedMotion));
  const controlsShown =
    controls && (controlsVisible || focusVisible || hovered || waiting);

  useEffect(() => {
    const player = playerRef.current;
    if (near || !player) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(player);
    return () => observer.disconnect();
  }, [near]);

  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    },
    [],
  );

  // `timeupdate` only fires a few times a second, so the fill and thumb read
  // the clip directly and are written outside React to glide every frame.
  const syncProgress = useCallback(() => {
    const video = videoRef.current;
    const timeline = timelineRef.current;
    if (!video || !timeline) return;
    const length = video.duration;
    const ratio =
      Number.isFinite(length) && length > 0
        ? Math.min(1, Math.max(0, video.currentTime / length))
        : 0;
    timeline.style.setProperty("--video-progress", String(ratio));
  }, []);

  useEffect(() => {
    syncProgress();
  }, [currentTime, duration, syncProgress]);

  useEffect(() => {
    if (paused || !controlsShown || !inView) return;
    let frame = 0;
    const tick = () => {
      syncProgress();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, controlsShown, inView, syncProgress]);

  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current !== null) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const playWhenVisible = useCallback(
    function playWhenVisible() {
      const video = videoRef.current;

      // The existing artwork covers the first frame. Wait until Safari has
      // finished compositing the theme reveal before decoding motion into it.
      const wipe = currentWipe();
      if (wipe) {
        if (pendingWipeRef.current !== wipe) {
          pendingWipeRef.current = wipe;
          void wipe.then(() => {
            if (pendingWipeRef.current !== wipe) return;
            pendingWipeRef.current = null;
            if (videoRef.current?.isConnected) playWhenVisible();
          });
        }
        return;
      }

      if (
        !video ||
        !visibleRef.current ||
        manuallyPausedRef.current ||
        document.hidden ||
        (!explicitPlayRef.current &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      ) {
        return;
      }

      if (!video.querySelector("source") || video.readyState < 1) {
        playQueuedRef.current = true;
        return;
      }
      playQueuedRef.current = false;
      const background = backgroundRef.current;
      if (background) {
        const elapsed =
          ((performance.now() - background.at) / 1000) * background.rate;
        video.currentTime = crossfadeLoop
          ? advanceLoopTime(background.time, elapsed, video.duration)
          : Number.isFinite(video.duration) && video.duration > 0
            ? (background.time + Math.max(0, elapsed)) % video.duration
            : background.time;
        backgroundRef.current = null;
      }
      explicitPlayRef.current = false;
      void video.play().catch(() => {
        setPaused(true);
      });
    },
    [crossfadeLoop],
  );

  // Attach and load only the layers that are actually needed. A preload hint
  // alone does not keep an explicit load() from waking every media pipeline.
  useEffect(() => {
    if (!sourced) return;
    layersRef.current.forEach((layer) => {
      if (!layer?.querySelector("source") || loadedLayersRef.current.has(layer))
        return;
      loadedLayersRef.current.add(layer);
      layer.load();
    });
    if (playQueuedRef.current) playWhenVisible();
  }, [sourced, bufferArmed, playWhenVisible]);

  const suspendPlayback = useCallback((advance = true) => {
    const video = videoRef.current;
    if (advance && video && !video.paused && !manuallyPausedRef.current) {
      backgroundRef.current ??= {
        time: video.currentTime,
        at: performance.now(),
        rate: video.playbackRate,
      };
    } else if (!advance) {
      backgroundRef.current = null;
    }
    layersRef.current.forEach((layer) => layer?.pause());
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearAutoplayTimer();
        if (!entry) return;
        visibleRef.current =
          entry.isIntersecting && entry.intersectionRatio > 0;
        setInView(visibleRef.current);
        if (!visibleRef.current) {
          suspendPlayback();
        } else if (
          !motionPreference.matches &&
          (startedRef.current || entry.intersectionRatio >= 0.6)
        ) {
          autoplayTimerRef.current = window.setTimeout(
            playWhenVisible,
            startedRef.current ? 0 : 300,
          );
        }
      },
      { threshold: [0, 0.01, 0.6] },
    );
    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        clearAutoplayTimer();
        explicitPlayRef.current = false;
        suspendPlayback(false);
      } else if (startedRef.current || visibleRatio(player) >= 0.6) {
        playWhenVisible();
      }
    };
    const handleVisibility = () => {
      if (document.hidden) suspendPlayback();
      else if (startedRef.current) playWhenVisible();
    };
    observer.observe(player);
    motionPreference.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearAutoplayTimer();
      if (controlsTimerRef.current !== null)
        window.clearTimeout(controlsTimerRef.current);
      observer.disconnect();
      motionPreference.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clearAutoplayTimer, playWhenVisible, suspendPlayback]);

  // Blend two playing frames before the exported fade-out reaches its end.
  // The incoming layer becomes the primary, so playback never seeks on screen.
  useEffect(() => {
    if (!crossfadeLoop || paused || !inView || reducedMotion) return;

    let frame = 0;
    let wake = 0;
    let incoming: HTMLVideoElement | null = null;
    const layers = layersRef.current;
    const tick = () => {
      const current = videoRef.current;
      const next = layersRef.current.find((layer) => layer !== current);
      if (
        !current ||
        !next ||
        current.paused ||
        !visibleRef.current ||
        document.hidden ||
        currentWipe()
      )
        return;
      if (incoming?.paused) incoming = null;

      const blendDuration = LOOP_BLEND;
      const loopEnd = Math.max(0, current.duration - LOOP_TAIL);
      const blendStart = loopEnd - blendDuration;
      if (
        !bufferArmedRef.current &&
        Number.isFinite(blendStart) &&
        current.currentTime >= blendStart - BUFFER_LEAD
      ) {
        bufferArmedRef.current = true;
        setBufferArmed(true);
      }
      if (Number.isFinite(loopEnd) && blendStart > 0) {
        if (current.currentTime >= blendStart && next.readyState >= 2) {
          if (!incoming) {
            incoming = next;
            next.currentTime = LOOP_START;
            next.style.zIndex = "1";
            void next.play().catch(() => {
              incoming = null;
            });
          }
          // Only reveal decoded, advancing frames from the incoming clip.
          if (!next.paused && !next.seeking && next.currentTime > 0.35) {
            const progress = Math.min(
              1,
              Math.max(0, (current.currentTime - blendStart) / blendDuration),
            );
            next.style.opacity = String(progress);
            if (progress === 1) {
              videoRef.current = next;
              next.removeAttribute("data-loop-buffer");
              next.removeAttribute("aria-hidden");
              current.setAttribute("data-loop-buffer", "true");
              current.setAttribute("aria-hidden", "true");
              current.style.opacity = "0";
              current.style.zIndex = "0";
              next.style.zIndex = "0";
              current.pause();
              current.currentTime = 0.35;
              incoming = null;
              setCurrentTime(next.currentTime);
            }
          }
        } else if (incoming) {
          incoming.pause();
          incoming.style.opacity = "0";
          incoming.currentTime = 0.35;
          incoming = null;
        }
      }
      // Sleep through normal playback. Only the brief loop blend needs RAF.
      const active = videoRef.current;
      if (!active || !Number.isFinite(active.duration)) return;
      const blendAt = active.duration - LOOP_TAIL - LOOP_BLEND;
      if (blendAt <= LOOP_START) return;
      const wakeAt = blendAt - (bufferArmedRef.current ? 0.15 : BUFFER_LEAD);
      const seconds =
        (wakeAt - active.currentTime) / Math.max(0.1, active.playbackRate);
      if (seconds > 0) wake = window.setTimeout(tick, seconds * 1000);
      else frame = requestAnimationFrame(tick);
    };
    const reschedule = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(wake);
      tick();
    };
    layers.forEach((layer) => {
      layer?.addEventListener("seeked", reschedule);
      layer?.addEventListener("ratechange", reschedule);
      layer?.addEventListener("playing", reschedule);
    });
    tick();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(wake);
      layers.forEach((layer) => {
        layer?.removeEventListener("seeked", reschedule);
        layer?.removeEventListener("ratechange", reschedule);
        layer?.removeEventListener("playing", reschedule);
      });
      layers.forEach((layer) => {
        if (layer && layer !== videoRef.current) {
          layer.pause();
          layer.style.opacity = "0";
          layer.style.zIndex = "0";
        }
      });
    };
  }, [crossfadeLoop, paused, inView, reducedMotion]);

  function handlePlay() {
    startedRef.current = true;
    setPaused(false);
  }

  function togglePlayback() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    backgroundRef.current = null;
    if (video.paused) {
      explicitPlayRef.current = true;
      setNear(true);
      manuallyPausedRef.current = false;
      setManuallyPaused(false);
      if (video.ended) {
        video.currentTime = 0;
      }
      playWhenVisible();
    } else {
      manuallyPausedRef.current = true;
      setManuallyPaused(true);
      explicitPlayRef.current = false;
      suspendPlayback(false);
    }
  }

  function handleSurfaceClick() {
    const video = videoRef.current;
    if (!video) return;
    const willPlay = video.paused;
    togglePlayback();
    setFlash(willPlay ? "play" : "pause");
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 900);
  }

  function seekTo(time: number) {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    backgroundRef.current = null;
    video.currentTime = time;
    layersRef.current.forEach((layer) => {
      if (layer && layer !== video) {
        layer.pause();
        layer.style.opacity = "0";
        layer.currentTime = 0.35;
      }
    });
    setCurrentTime(video.currentTime);
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    seekTo(Number(event.currentTarget.value));
  }

  function handleTouchControls(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") {
      return;
    }

    setControlsVisible(true);
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = window.setTimeout(
      () => setControlsVisible(false),
      3000,
    );
  }

  // A clip waiting on the viewer — paused by them, or never autoplayed for
  // reduced motion — keeps its timeline in view.

  const player = (
    <SmoothSurface
      as="div"
      className="anyday-video-player"
      effects={effects}
      data-backdrop={backdrop ? "" : undefined}
      data-controls-visible={controlsShown ? "true" : undefined}
      data-paused={paused ? "true" : "false"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusVisible(false);
        }
      }}
      onFocus={(event) => {
        setFocusVisible(event.target.matches(":focus-visible"));
      }}
      onPointerDown={handleTouchControls}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      ref={playerRef}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {backdrop}
      {(crossfadeLoop ? [0, 1] : [0]).map((layer) => (
        <video
          key={layer}
          aria-hidden={layer === 1 ? true : undefined}
          data-loop-buffer={layer === 1 ? "true" : undefined}
          aria-describedby={describedBy}
          aria-label={`${title}. Silent product walkthrough.`}
          height={height}
          loop
          muted
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(video.duration);
            video.currentTime = crossfadeLoop ? LOOP_START : 0;
            if (video === videoRef.current && playQueuedRef.current)
              playWhenVisible();
          }}
          onPause={(event) => {
            if (event.currentTarget === videoRef.current) setPaused(true);
          }}
          onPlay={(event) => {
            if (event.currentTarget === videoRef.current) handlePlay();
          }}
          onTimeUpdate={(event) => {
            if (event.currentTarget !== videoRef.current) return;
            // Safari can deliver a pause from the departing layer after the
            // resumed layer has started. Keep the control in sync with the
            // frame that is actually advancing.
            setPaused(event.currentTarget.paused);
            if (controlsShown) {
              setCurrentTime(event.currentTarget.currentTime);
              setDuration(event.currentTarget.duration);
            }
          }}
          playsInline
          /* Nothing until the page is live and any theme reveal is over, then
             metadata and the opening frame, even for the clip on the first
             screen; the rest follows as it plays. The loop buffer waits until
             the crossfade is near. */
          preload={
            sourced && (layer === 0 || bufferArmed) ? "metadata" : "none"
          }
          ref={(element) => {
            layersRef.current[layer] = element;
            if (element && !videoRef.current) videoRef.current = element;
          }}
          style={{ opacity: layer === 0 ? 1 : 0 }}
          width={width}
        >
          {sourced && (layer === 0 || bufferArmed) ? (
            <VideoSources src={src} />
          ) : null}
          Your browser does not support this product walkthrough.
        </video>
      ))}

      {controls ? (
        <div className="anyday-video-controls">
          {/* The whole frame is the play/pause control. */}
          <button
            aria-label={`${paused ? "Play" : "Pause"} ${title}`}
            className="anyday-video-surface"
            onClick={handleSurfaceClick}
            type="button"
          />
          {/* Icons share one centred grid cell, so a swap crossfades in place. */}
          <span aria-hidden="true" className="anyday-video-glyph">
            <AnimatePresence initial={false}>
              {flash ? (
                <m.span
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    transition: glyphEnter,
                  }}
                  className="anyday-video-glyph__icon"
                  exit={{
                    opacity: 0,
                    scale: reducedMotion ? 1 : 0.25,
                    filter: reducedMotion ? "blur(0px)" : "blur(4px)",
                    transition: glyphExit,
                  }}
                  initial={{
                    opacity: 0,
                    scale: reducedMotion ? 1 : 0.25,
                    filter: reducedMotion ? "blur(0px)" : "blur(4px)",
                  }}
                  key={flash}
                >
                  <RemixIcon icon={flash === "play" ? playIcon : pauseIcon} />
                </m.span>
              ) : null}
            </AnimatePresence>
          </span>
          {scrubbable ? (
            <>
              <span aria-hidden="true" className="anyday-video-scrim" />
              <m.div
                animate={{ scale: controlsShown ? 1 : 0.96 }}
                className="anyday-video-timeline"
                initial={false}
                ref={timelineRef}
                transition={controlsSpring}
              >
                <span
                  aria-hidden="true"
                  className="anyday-video-timeline__rail"
                />
                <span
                  aria-hidden="true"
                  className="anyday-video-timeline__fill"
                />
                <input
                  aria-label={`Seek ${title}`}
                  aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                  className="anyday-video-controls__timeline"
                  max={duration || 0}
                  min="0"
                  onChange={handleSeek}
                  step="0.01"
                  type="range"
                  value={Math.min(currentTime, duration || 0)}
                />
                <span
                  aria-hidden="true"
                  className="anyday-video-timeline__thumb"
                />
              </m.div>
            </>
          ) : null}
        </div>
      ) : null}
    </SmoothSurface>
  );

  return (
    <MotionBoundary>
      <div
        className={[
          "anyday-video-frame",
          compact ? "anyday-video-frame--compact" : null,
          flat ? "anyday-video-frame--flat" : null,
          cardRadius ? "anyday-video-frame--card-radius" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          ground
            ? ({
                "--anyday-plate": ground,
                background: ground,
              } as CSSProperties)
            : undefined
        }
      >
        {hairline ? (
          <div className="anyday-video-hairline">{player}</div>
        ) : (
          player
        )}
      </div>
    </MotionBoundary>
  );
}
