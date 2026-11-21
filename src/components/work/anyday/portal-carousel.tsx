"use client";

import { m, useReducedMotion } from "motion/react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
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
  /** A still holds for this long (ms) instead of playing a clip. */
  still?: number;
};

const CLIPS: readonly PortalClip[] = [
  {
    ground: "#f2f2f2",
    src: "/media/anyday/portal-onboarding.webp",
    title:
      "Two angled portal screens: the Oakville setup checklist on the Payments page, running from data collection to a first tip rule, and the “Review tip rule” step summarizing contributors, receivers, payout frequency, and services.",
    caption: "Guided setup",
    still: 6000,
  },
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
// As in the app components' scrubber: the control swells quickly under a
// press and settles back with a small give on release.
const PRESS_SCALE = 1.1;
const PRESS = { type: "spring", duration: 0.2, bounce: 0 } as const;
const RELEASE = { type: "spring", duration: 0.4, bounce: 0.2 } as const;

/**
 * The pills as one scrubber, after the app components' row configs: press
 * anywhere on it and slide, and the slide under the finger is the one shown.
 * Arrow keys, Home and End step through it too.
 */
function Scrubber({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (index: number) => void;
}) {
  const reduce = useReducedMotion();
  const last = CLIPS.length - 1;
  const dragging = useRef(false);
  const current = useRef(index);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    current.current = index;
  }, [index]);

  // The pill nearest the finger is the one shown. The current one widening
  // only pushes its neighbours further from the finger, so the choice holds.
  const pick = (event: PointerEvent<HTMLDivElement>, force = false) => {
    let next = 0;
    let nearest = Infinity;
    Array.from(event.currentTarget.children).forEach((pill, i) => {
      const box = pill.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (box.left + box.width / 2));
      if (distance < nearest) {
        nearest = distance;
        next = i;
      }
    });
    if (force || next !== current.current) {
      current.current = next;
      onSelect(next);
    }
  };

  const press = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    setPressed(true);
    // A tap on the current pill restarts it.
    pick(event, true);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) pick(event);
  };
  const release = () => {
    dragging.current = false;
    setPressed(false);
  };

  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: last,
    };
    const next = step[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(Math.min(last, Math.max(0, next)));
  };

  return (
    <m.div
      animate={{ scale: pressed && !reduce ? PRESS_SCALE : 1 }}
      aria-label="Choose a clip"
      aria-valuemax={CLIPS.length}
      aria-valuemin={1}
      aria-valuenow={index + 1}
      aria-valuetext={`${CLIPS[index]?.caption}, ${index + 1} of ${CLIPS.length}`}
      className={styles.pills}
      onKeyDown={key}
      onLostPointerCapture={release}
      onPointerCancel={release}
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={release}
      role="slider"
      tabIndex={0}
      transition={pressed ? PRESS : RELEASE}
    >
      {CLIPS.map((clip, i) => (
        <span
          className={styles.pill}
          data-state={i === index ? "active" : i < index ? "done" : "upcoming"}
          key={clip.src}
        >
          <SmoothSurface as="span" className={styles.track}>
            <span className={styles.fill} />
          </SmoothSurface>
        </span>
      ))}
    </m.div>
  );
}

/**
 * The client portal's setup still and four walkthroughs in one card, played in
 * turn. The pills beneath fill with the slide on show and switch to any other,
 * which always starts from its first frame.
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

  // How long the still on show has been on screen, paused with the reel.
  const stillElapsedRef = useRef(0);

  // Every clip opens on its first frame, whichever way it was reached.
  useEffect(() => {
    stillElapsedRef.current = 0;
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
    const still = CLIPS[index]?.still;
    let frame = 0;
    // rAF stamps the frame's start, which can precede this effect.
    let last: number | undefined;
    const tick = (now: number) => {
      const video = videosRef.current[index];
      if (still) {
        stillElapsedRef.current += now - (last ?? now);
        last = now;
        const progress = Math.min(1, stillElapsedRef.current / still);
        controllerRef.current?.style.setProperty(
          "--clip-progress",
          String(progress),
        );
        if (progress >= 1) {
          show((index + 1) % CLIPS.length, false);
          return;
        }
      } else if (video && video.duration > 0) {
        controllerRef.current?.style.setProperty(
          "--clip-progress",
          String(Math.min(1, video.currentTime / video.duration)),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, playing, inView, show]);

  const pick = (next: number) => {
    setPickedAny(true);
    setBlocked(false);
    if (next === index) {
      stillElapsedRef.current = 0;
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
                {clip.still ? (
                  <Image
                    alt={clip.title}
                    className={styles.video}
                    fill
                    sizes="(max-width: 1024px) 100vw, 960px"
                    src={clip.src}
                    unoptimized
                  />
                ) : (
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
                )}
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
            <Scrubber index={index} onSelect={pick} />
          </div>
        </SmoothSurface>
      </div>
    </MotionBoundary>
  );
}
