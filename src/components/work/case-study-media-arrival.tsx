"use client";

import { m, useMotionValue, useSpring } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import { MotionBoundary } from "@/components/motion/motion-boundary";

// The home feed's damped spring, with a much smaller range for reading.
const ARRIVAL_SPRING = { stiffness: 900, damping: 100, mass: 1 };

function ArrivalStage({ children }: { children: ReactNode }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const target = useMotionValue(1);
  const scale = useSpring(target, ARRIVAL_SPRING);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot || typeof IntersectionObserver !== "function") return;

    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let cleanup = () => {};

    const sync = () => {
      cleanup();
      target.set(1);
      scale.jump(1);
      if (!motion.matches) return;

      let frame = 0;

      const requestTrack = () => {
        if (!frame) frame = requestAnimationFrame(track);
      };

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting) {
            window.addEventListener("scroll", requestTrack, { passive: true });
            requestTrack();
          } else {
            window.removeEventListener("scroll", requestTrack);
          }
        },
        { rootMargin: "100% 0px" },
      );

      cleanup = () => {
        observer.disconnect();
        window.removeEventListener("scroll", requestTrack);
        window.removeEventListener("resize", requestTrack);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      };

      function track() {
        frame = 0;
        if (!slot) return;
        // Measure the unscaled slot, so the transform never feeds back into
        // its own progress. Scale up as it arrives, then down as it leaves above.
        const { top, height: slotHeight } = slot.getBoundingClientRect();
        const height = window.innerHeight;
        const arrival = Math.max(
          0,
          Math.min(1, (height * 0.95 - top) / (height * 0.35)),
        );
        const departure = Math.max(
          0,
          Math.min(1, -(top + slotHeight) / (height * 0.35)),
        );
        const rest = window.innerWidth <= 640 ? 0.97 : 0.95;
        const exit = window.innerWidth <= 640 ? 0.95 : 0.93;
        const easedArrival = 1 - (1 - arrival) ** 3;
        const easedDeparture = 1 - (1 - departure) ** 3;
        target.set(
          departure > 0
            ? 1 - (1 - exit) * easedDeparture
            : rest + (1 - rest) * easedArrival,
        );
      }

      track();
      // Restored scroll positions start at their correct size immediately.
      scale.jump(target.get());
      observer.observe(slot);
      window.addEventListener("resize", requestTrack);
    };

    sync();
    motion.addEventListener("change", sync);
    return () => {
      cleanup();
      motion.removeEventListener("change", sync);
    };
  }, [scale, target]);

  return (
    <div ref={slotRef}>
      <m.div className="humi-story-media__arrival-visual" style={{ scale }}>
        {children}
      </m.div>
    </div>
  );
}

/** A brief arrival for opted-in media; captions stay outside the transform. */
export function CaseStudyMediaArrival({ children }: { children: ReactNode }) {
  return (
    <MotionBoundary>
      <ArrivalStage>{children}</ArrivalStage>
    </MotionBoundary>
  );
}
