"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";
import { ToggleSwitch } from "./toggle-switch";

const CARD = "/media/craft/components/app/card/anyday-card.webp";
const LOCK = "/media/craft/components/app/icons/actions/lock.svg";

const TILT = { stiffness: 260, damping: 26, mass: 0.6 } as const;

/**
 * The AnyDay Mastercard (components/ui/credit-card.tsx) over the card
 * screen's lock control. The card leans toward the pointer and, left alone,
 * catches the light now and then, as CardShine sweeps it when it's issued.
 * Locking it lays the product's dimming over the art.
 */
export function CardPrimitive() {
  const [locked, setLocked] = useState(false);
  const [sweep, setSweep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), TILT);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), TILT);

  useAutoplay(root, () => setSweep((count) => count + 1), {
    interval: 5200,
    delay: 1600,
  });

  const lean = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width - 0.5);
    py.set((event.clientY - box.top) / box.height - 0.5);
  };
  const rest = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <FitStage className="anyday-app" gutter={36}>
      <div className="flex flex-col gap-6" ref={root}>
        <div
          onPointerLeave={rest}
          onPointerMove={lean}
          style={{ perspective: "900px" }}
        >
          <m.div
            className="relative overflow-hidden"
            style={{
              rotateX,
              rotateY,
              aspectRatio: "358 / 224",
              borderRadius: "15px",
              boxShadow:
                "0 4px 12px rgba(0, 0, 0, 0.08), 0 10px 24px rgba(0, 0, 0, 0.04), 0 16px 40px rgba(0, 0, 0, 0.015)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="The AnyDay Mastercard"
              className="block h-full w-full"
              draggable={false}
              src={CARD}
            />
            <AnimatePresence>
              {sweep > 0 && !locked && (
                <m.div
                  key={sweep}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  initial={{ backgroundPosition: "130% 0" }}
                  animate={{ backgroundPosition: "-30% 0" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    // A white card can't get brighter, so the light it
                    // catches is a faint pearl sheen instead.
                    backgroundImage:
                      "linear-gradient(115deg, transparent 34%, rgba(255, 210, 236, 0.32) 44%, rgba(206, 228, 255, 0.42) 50%, rgba(214, 255, 232, 0.32) 56%, transparent 66%)",
                    backgroundSize: "250% 100%",
                  }}
                />
              )}
            </AnimatePresence>
            <m.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              animate={{ opacity: locked ? 1 : 0 }}
              initial={false}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: "inherit",
                boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.08)",
              }}
            />
          </m.div>
        </div>

        <div
          className="flex items-center gap-3 rounded-[20px] py-3 pr-3 pl-4"
          style={{ backgroundColor: "var(--card-background)" }}
        >
          <span
            aria-hidden="true"
            className="h-6 w-6 shrink-0"
            style={{
              backgroundColor: "var(--labels-primary)",
              mask: `url(${LOCK}) center / contain no-repeat`,
              WebkitMask: `url(${LOCK}) center / contain no-repeat`,
            }}
          />
          <span
            className="text-spec-17 flex-1 font-medium text-[var(--labels-primary)]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Lock card
          </span>
          <ToggleSwitch
            checked={locked}
            label="Lock card"
            onChange={setLocked}
          />
        </div>
      </div>
    </FitStage>
  );
}
