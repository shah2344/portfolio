"use client";

import { useEffect, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { AnimatePresence, m } from "motion/react";

import { FitStage } from "../../fit-stage";
import { SlideButton } from "../ui/slide-button";
import "../app-product.css";

type Status = "idle" | "sending" | "sent";

/** How long the knob reads "Sending…" before the transfer lands. */
const SENDING_MS = 1600;
/** How long "Transfer sent" holds before the slide comes back. */
const SENT_MS = 3200;

const LOTTIE = "/media/craft/components/app/lottie/checkmark-green.lottie";
/** The check's visible size; the Lottie canvas runs past it on every side. */
const MARK = 76;
const CANVAS = 124;
/**
 * dotLottie sizes its canvas from the transformed box (this card's fit
 * scale, the 0.8 rest scale) at a reduced pixel ratio, and never re-measures
 * when a transform grows it. A fixed high ratio keeps the check sharp at
 * full size and in an opened card; the canvas is small enough not to matter.
 */
const RENDER = { devicePixelRatio: 4 } as const;

const SPRING = { type: "spring", duration: 0.3, bounce: 0 } as const;
const EASE = [0.2, 0, 0, 1] as const;
/** Strong ease-out for the check and its label leaving. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** The slide settles back with a touch of overshoot, once the check goes. */
const RETURN = {
  type: "spring",
  duration: 0.45,
  bounce: 0.12,
  delay: 0.12,
} as const;

/**
 * Slide to send on its own. Sliding confirms (the knob reads
 * "Sending…"), then the slide steps back and the green check scales in
 * out of a blur with "Transfer sent" under it. A few seconds later the
 * check blurs away and a fresh slide settles back in its place. The Lottie
 * loads with the card and waits, so the check plays the moment the
 * transfer lands.
 */
export function SlideToSendPrimitive() {
  const [status, setStatus] = useState<Status>("idle");
  const [transfers, setTransfers] = useState(0);
  /** Bumped on each return, so the slide comes back as a fresh button. */
  const [round, setRound] = useState(0);
  const [lottie, setLottie] = useState<DotLottie | null>(null);
  const sent = status === "sent";

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(
      () => {
        if (status === "sending") {
          setTransfers((count) => count + 1);
          return setStatus("sent");
        }
        setRound((count) => count + 1);
        setStatus("idle");
      },
      status === "sending" ? SENDING_MS : SENT_MS,
    );
    return () => clearTimeout(timer);
  }, [status]);

  // Play the check from its first frame each time a transfer lands.
  useEffect(() => {
    if (!lottie) return;
    if (!sent) {
      lottie.stop();
      return;
    }
    const play = () => {
      lottie.stop();
      lottie.play();
    };
    if (lottie.isLoaded) play();
    else lottie.addEventListener("load", play);
    return () => lottie.removeEventListener("load", play);
  }, [lottie, sent]);

  return (
    <FitStage className="anyday-app" gutter={40}>
      <div
        className="grid place-items-center"
        style={{ fontFamily: "var(--font-inter)", minHeight: MARK + 40 }}
      >
        {/* The slide: steps back once the transfer lands, and returns as a
            fresh button that settles in as the check leaves. */}
        <AnimatePresence initial={false}>
          {!sent && (
            <m.div
              animate={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                transitionEnd: { filter: "none" },
              }}
              className="w-full"
              exit={{
                opacity: 0,
                scale: 0.96,
                filter: "blur(4px)",
                transition: { duration: 0.2, ease: EASE },
              }}
              initial={{ opacity: 0, scale: 0.95, filter: "blur(6px)" }}
              key={round}
              style={{ gridArea: "1 / 1" }}
              transition={{
                default: RETURN,
                opacity: { duration: 0.25, ease: EASE_OUT, delay: 0.12 },
              }}
            >
              <SlideButton
                className="w-full"
                initialKnobScale={0.92}
                label="Slide to send"
                onSlideComplete={() => setStatus("sending")}
              />
            </m.div>
          )}
        </AnimatePresence>

        {/* Transfer sent: the check, then its label centred beneath. */}
        <div
          aria-live="polite"
          className="flex flex-col items-center"
          style={{ gridArea: "1 / 1", pointerEvents: "none" }}
        >
          <m.div
            animate={
              sent
                ? {
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    // A leftover blur(0px) keeps the canvas on a filtered
                    // layer, rasterised soft; drop it once the check lands.
                    transitionEnd: { filter: "none" },
                  }
                : { opacity: 0, scale: 0.9, filter: "blur(4px)" }
            }
            className="relative"
            initial={false}
            // Re-measure the canvas at full size: it was sized at the rest
            // scale and never re-measures as the spring grows it.
            onAnimationComplete={() => {
              if (sent) lottie?.resize();
            }}
            style={{ width: MARK, height: MARK }}
            transition={sent ? SPRING : { duration: 0.3, ease: EASE_OUT }}
          >
            <DotLottieReact
              autoplay={false}
              dotLottieRefCallback={setLottie}
              loop={false}
              renderConfig={RENDER}
              src={LOTTIE}
              style={{
                position: "absolute",
                left: (MARK - CANVAS) / 2,
                top: (MARK - CANVAS) / 2,
                width: CANVAS,
                height: CANVAS,
              }}
            />
          </m.div>
          <AnimatePresence>
            {sent && (
              <m.p
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="m-0 mt-3 text-center font-semibold text-[var(--labels-primary)]"
                exit={{
                  opacity: 0,
                  y: -2,
                  filter: "blur(4px)",
                  transition: { duration: 0.16, ease: EASE_OUT },
                }}
                initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                key={transfers}
                style={{
                  fontSize: "1.0625rem",
                  lineHeight: "1.375rem",
                  letterSpacing: "var(--letter-spacing-17)",
                }}
                transition={{ ...SPRING, delay: 0.12 }}
              >
                Transfer sent
              </m.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FitStage>
  );
}
