"use client";

import { m, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { MotionBoundary } from "@/components/motion/motion-boundary";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { SmoothSurface } from "@/components/ui/smooth-surface";
import { VideoSources } from "@/components/ui/video-sources";

import styles from "./portal-carousel.module.css";

type PortalClip = {
  /** The one-line note shown in the controller. */
  caption: string;
  ground: string;
  src: string;
  title: string;
};

const CLIPS: readonly PortalClip[] = [
  {
    ground: "#f8f8f8",
    src: "/media/anyday/client-portal-01.mp4",
    title: "Exporting client payments",
    caption: "Improved filtering",
  },
  {
    ground: "#f8f8f8",
    src: "/media/anyday/client-portal-02.mp4",
    title: "Funding and reviewing client wallets",
    caption: "Pin your most relevant locations",
  },
  {
    ground: "#f5f5f5",
    src: "/media/anyday/client-portal-03.mp4",
    title: "Reviewing a location wallet",
    caption: "Responsive on all hardware",
  },
  {
    ground: "#f8f8f8",
    src: "/media/anyday/client-portal-04.mp4",
    title: "Setting up a location wallet",
    caption: "Funding alerts",
  },
];

/*
 * A clip that finishes hands over with a plain crossfade, so the reel reads
 * as one film. A pill the visitor picks blurs through a slight scale instead,
 * so the jump reads as theirs.
 */
const SHOWN = { opacity: 1, filter: "blur(0px)", scale: 1 };
const HIDDEN_AUTO = { opacity: 0, filter: "blur(0px)", scale: 1 };
const HIDDEN_PICKED = { opacity: 0, filter: "blur(12px)", scale: 1.03 };
const AUTO_EASE = { duration: 0.6, ease: [0.4, 0, 0.2, 1] } as const;
const PICKED_EASE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * The client portal's four walkthroughs in one card, played in turn. The pills
 * beneath fill with the clip that is playing and switch to any other, which
 * always starts from its first frame.
 */
export function AnyDayPortalCarousel({ describedBy }: { describedBy: string }) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  /* Only the clip on show and the one after it have sources, so the reel
     downloads as it plays rather than all at once. */
  const [armed, setArmed] = useState<readonly number[]>([0, 1]);
  const loadedRef = useRef(new WeakSet<HTMLVideoElement>());
  // Sources go in once the card is within a screen of the viewport.
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  // Motion is opt-in for reduced-motion visitors: the first frame waits
  // until they pick a clip.
  const [pickedAny, setPickedAny] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const playing = !blocked && (pickedAny || !reducedMotion);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        nearObserver.disconnect();
        setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    const viewObserver = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    nearObserver.observe(root);
    viewObserver.observe(root);
    return () => {
      nearObserver.disconnect();
      viewObserver.disconnect();
    };
  }, []);

  // Sources added after mount are only picked up by an explicit `load()`.
  useEffect(() => {
    if (!near) return;
    armed.forEach((i) => {
      const video = videosRef.current[i];
      if (!video || loadedRef.current.has(video)) return;
      loadedRef.current.add(video);
      video.load();
    });
  }, [near, armed]);

  // Every clip opens on its first frame, whichever way it was reached.
  useEffect(() => {
    const video = videosRef.current[index];
    if (video && video.currentTime > 0) video.currentTime = 0;
    controllerRef.current?.style.setProperty("--clip-progress", "0");
  }, [index]);

  useEffect(() => {
    videosRef.current.forEach((video, i) => {
      if (!video) return;
      if (i === index && playing && inView && near) {
        void video.play().catch(() => setBlocked(true));
      } else if (!video.paused) {
        // `pause()` on an idle clip starts loading it, so leave those alone.
        video.pause();
      }
    });
  }, [index, playing, inView, near]);

  // `timeupdate` lands a few times a second; the fill reads the clip each frame.
  useEffect(() => {
    if (!playing || !inView) return;
    let frame = 0;
    const tick = () => {
      const video = videosRef.current[index];
      if (video && video.duration > 0) {
        controllerRef.current?.style.setProperty(
          "--clip-progress",
          String(Math.min(1, video.currentTime / video.duration)),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, playing, inView]);

  const show = useCallback((next: number, byVisitor: boolean) => {
    setPicked(byVisitor);
    setIndex(next);
    setArmed((current) => {
      const after = (next + 1) % CLIPS.length;
      return current.includes(next) && current.includes(after)
        ? current
        : [...new Set([...current, next, after])];
    });
  }, []);

  const pick = (next: number) => {
    setPickedAny(true);
    setBlocked(false);
    if (next === index) {
      const video = videosRef.current[index];
      if (video) video.currentTime = 0;
      return;
    }
    show(next, true);
  };

  const hidden = picked && !reducedMotion ? HIDDEN_PICKED : HIDDEN_AUTO;
  const transition = picked && !reducedMotion ? PICKED_EASE : AUTO_EASE;

  return (
    <MotionBoundary>
      <div
        aria-describedby={describedBy}
        aria-label="Client portal walkthroughs"
        aria-roledescription="carousel"
        className={styles.carousel}
        ref={rootRef}
        role="region"
      >
        <SmoothSurface
          as="div"
          className={styles.card}
          style={{ "--clip-ground": CLIPS[index]?.ground } as CSSProperties}
        >
          {CLIPS.map((clip, i) => {
            const active = i === index;
            return (
              <m.div
                animate={active ? SHOWN : hidden}
                aria-hidden={!active}
                aria-label={`${i + 1} of ${CLIPS.length}: ${clip.title}`}
                aria-roledescription="slide"
                className={styles.slide}
                data-active={active || undefined}
                initial={false}
                key={clip.src}
                role="group"
                style={{ backgroundColor: clip.ground }}
                transition={transition}
              >
                <video
                  aria-label={clip.title}
                  className={styles.video}
                  muted
                  onEnded={
                    active
                      ? () => show((index + 1) % CLIPS.length, false)
                      : undefined
                  }
                  playsInline
                  preload="auto"
                  ref={(video) => {
                    videosRef.current[i] = video;
                  }}
                >
                  {near && armed.includes(i) ? (
                    <VideoSources src={clip.src} />
                  ) : null}
                </video>
              </m.div>
            );
          })}

          {/* The controller sits on the film's own grey: a blur ramp softens
              the footage beneath it and a wash of that grey settles it. */}
          <ProgressiveBlur
            blurLevels={[0.5, 1, 2, 4, 8, 16]}
            className={styles.blur}
            height="40%"
          />
          <div aria-hidden className={styles.wash} />

          <div className={styles.controller} ref={controllerRef}>
            <p className={styles.caption}>
              <m.span
                animate={{ opacity: 1, filter: "blur(0px)" }}
                className={styles.captionText}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                key={index}
                transition={PICKED_EASE}
              >
                {CLIPS[index]?.caption}
              </m.span>
            </p>
            <div
              className={styles.pills}
              role="group"
              aria-label="Choose a clip"
            >
              {CLIPS.map((clip, i) => (
                <button
                  aria-current={i === index ? "true" : undefined}
                  aria-label={`Play ${clip.caption}`}
                  className={styles.pill}
                  data-state={
                    i === index ? "active" : i < index ? "done" : "upcoming"
                  }
                  key={clip.src}
                  onClick={() => pick(i)}
                  type="button"
                >
                  <SmoothSurface as="span" className={styles.track}>
                    <span className={styles.fill} />
                  </SmoothSurface>
                </button>
              ))}
            </div>
          </div>
        </SmoothSurface>
      </div>
    </MotionBoundary>
  );
}
