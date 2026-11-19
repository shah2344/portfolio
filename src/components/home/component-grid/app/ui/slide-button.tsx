"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  m,
  useAnimation,
  animate,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from "motion/react";

/** The knob's resting width; it only grows from here as it's dragged. */
const KNOB_MIN = 80;
/**
 * How far the knob may squash under its rest width as the release spring
 * overshoots home: a soft cap, so a long drag still only jiggles slightly.
 */
const SETTLE_SQUASH = 3;
import { Spinner } from "./spinner";
import { TextShimmer } from "./text-shimmer";
import { cn } from "@/lib/utils";

const triggerHaptic = () => {};

interface SlideButtonProps {
  label: string;
  releaseLabel?: string;
  /** Shown in the track after release while awaiting async work (default “Sending…”). */
  postReleaseConfirmingLabel?: string;
  onSlideComplete: () => void;
  disabled?: boolean;
  className?: string;
  initialKnobScale?: number;
  gateActive?: boolean;
  gateLabel?: string;
  gateIconSrc?: string;
}

export interface SlideButtonRef {
  reset: () => Promise<void>;
}

const SlideButtonComponent = forwardRef<SlideButtonRef, SlideButtonProps>(
  (
    {
      label,
      releaseLabel,
      postReleaseConfirmingLabel,
      onSlideComplete,
      disabled = false,
      className,
      initialKnobScale = 1,
      gateActive = false,
      gateLabel,
      gateIconSrc,
    },
    ref,
  ) => {
    const releaseResolved = releaseLabel ?? "Release to confirm";
    const postReleaseResolved = postReleaseConfirmingLabel ?? "Sending…";
    const [isDragAtEnd, setIsDragAtEnd] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isPostReleaseConfirming, setIsPostReleaseConfirming] =
      useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [dragProgress, setDragProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const constraintsRef = useRef<HTMLDivElement>(null);
    const dragButtonRef = useRef<HTMLButtonElement>(null);
    const controls = useAnimation();
    // The product's haptics and dark mode are left out of this port.
    const isDarkMode = false;
    const prevShowSpinnerRef = useRef(false);
    const isMountedRef = useRef(true);
    const [shouldHideProcessing, setShouldHideProcessing] = useState(false);
    const canDrag = !disabled && !gateActive;

    // While dragging horizontally we don't lock the body — `touch-action: pan-x`
    // on the button plus framer-motion's `dragDirectionLock` already prevent
    // the page from scrolling vertically. Locking the body with
    // `position: fixed` causes layout jumps (page snaps to top, sticky headers
    // disappear) so we avoid it entirely.
    const setBodyScrollLock = useCallback((locked: boolean) => {
      void locked;
      // Intentional no-op. Kept for API stability with existing call sites.
    }, []);

    // Use motion value for button x position to keep progress in sync
    const x = useMotionValue(0);

    const containerWidthRef = useRef(0);
    const baseButtonWidthRef = useRef(KNOB_MIN);
    const maxOffsetRef = useRef(0);

    const updateDimensions = useCallback(() => {
      if (constraintsRef.current && dragButtonRef.current) {
        const container = constraintsRef.current;
        containerWidthRef.current = container.offsetWidth;
        // The knob's real resting width, so it follows the finger from the
        // first point of a drag instead of waiting out the difference.
        baseButtonWidthRef.current = KNOB_MIN;
        maxOffsetRef.current =
          container.offsetWidth - baseButtonWidthRef.current;
      }
    }, []);

    useEffect(() => {
      updateDimensions();
      let timeoutId: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateDimensions, 100); // Debounce resize
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        clearTimeout(timeoutId);
      };
    }, [updateDimensions]);

    // Cleanup: Hide processing text immediately when component unmounts
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        // Immediately hide processing states on unmount
        setShowSpinner(false);
        setIsConfirming(false);
        setShouldHideProcessing(true);
      };
    }, []);

    const progressAt = (latestX: number) => {
      const containerWidth = containerWidthRef.current;
      const baseWidth = baseButtonWidthRef.current;
      if (containerWidth <= 0) return 0;
      const newWidth = (baseWidth + latestX) / containerWidth;
      return Math.max(0, Math.min(1, newWidth));
    };
    const progressFromX = useTransform(x, progressAt);
    const scaleX = useTransform(progressFromX, (p) => p);
    const fillOpacity = useTransform(progressFromX, (p) => p);
    // The knob grows 1:1 with the drag, never under its rest width (the
    // track reads 0 wide until it's first measured). Past rest (the release spring
    // overshooting home) it squashes a few points on a soft cap, so it
    // jiggles as it settles rather than stopping dead at its rest width.
    const buttonWidth = useTransform(x, (latestX) =>
      latestX >= 0
        ? `max(${progressAt(latestX) * 100}%, ${KNOB_MIN}px)`
        : `${KNOB_MIN + SETTLE_SQUASH * Math.tanh(latestX / 8)}px`,
    );
    const reduceMotion = useReducedMotion();

    // Set initial position and reset when disabled
    useEffect(() => {
      controls.set({ x: 0 });
      x.set(0);
      if (disabled || gateActive) {
        const rafId = requestAnimationFrame(() => {
          setDragProgress(0);
          setIsDragAtEnd(false);
          setIsConfirming(false);
          setIsPostReleaseConfirming(false);
          setShowSpinner(false);
          setIsDragging(false);
          setBodyScrollLock(false);
        });
        return () => cancelAnimationFrame(rafId);
      }
    }, [controls, disabled, gateActive, x, setBodyScrollLock]);

    // Cleanup: restore body scroll on unmount
    useEffect(() => {
      return () => {
        setBodyScrollLock(false);
      };
    }, [setBodyScrollLock]);

    const handleDragStart = useCallback(() => {
      if (!canDrag) return;
      triggerHaptic();
      setIsDragging(true);
      setBodyScrollLock(true);
    }, [canDrag, setBodyScrollLock]);

    const handleInteractionCancel = useCallback(() => {
      setIsDragging(false);
      setBodyScrollLock(false);
    }, [setBodyScrollLock]);

    useEffect(() => {
      const unsubscribe = progressFromX.on("change", (latest) => {
        setDragProgress(latest);
      });
      return unsubscribe;
    }, [progressFromX]);

    // Update confirming state based on progress (separate effect to avoid dependency issues)
    useEffect(() => {
      if (showSpinner) return; // Don't update confirming state while spinner is showing

      const shouldShowConfirming = dragProgress >= 0.98;
      if (shouldShowConfirming !== isConfirming) {
        const rafId = requestAnimationFrame(() =>
          setIsConfirming(shouldShowConfirming),
        );
        return () => cancelAnimationFrame(rafId);
      }
    }, [dragProgress, isConfirming, showSpinner]);

    const handleDrag = useCallback(
      (_: unknown, info: { offset: { x: number } }) => {
        if (!constraintsRef.current || !dragButtonRef.current || !canDrag)
          return;

        // Update dimensions if needed (first drag or if not initialized)
        if (containerWidthRef.current === 0 || maxOffsetRef.current === 0) {
          updateDimensions();
        }

        const containerWidth = containerWidthRef.current;
        const maxOffset = maxOffsetRef.current;

        if (maxOffset <= 0 || containerWidth <= 0) return;

        // Clamp translation to valid range (matching source code pattern)
        // Translation represents how far the user has dragged
        const clampedTranslation = Math.max(
          0,
          Math.min(info.offset.x, maxOffset),
        );

        // Update x motion value to track drag progress
        // This is used to calculate progress, even though button stays at x=0 visually
        x.set(clampedTranslation);

        // Check if at end (with small threshold)
        const isAtEnd = clampedTranslation >= maxOffset - 5;

        if (isAtEnd && !isDragAtEnd) {
          setIsDragAtEnd(true);
        } else if (!isAtEnd && isDragAtEnd) {
          setIsDragAtEnd(false);
        }
      },
      [isDragAtEnd, canDrag, x, updateDimensions],
    );

    const getButtonStyles = useMemo(() => {
      if (disabled) {
        return {
          backgroundColor: "var(--background-secondary)",
          color: "var(--labels-tertiary)",
        };
      }
      // Match the CSS background colors exactly to prevent flash
      return {
        backgroundColor: isDarkMode ? "transparent" : "#0A0A0A",
        color: isDarkMode ? "#1f1f1f" : "var(--background)",
      };
    }, [disabled, isDarkMode]);

    const springTransition = useMemo(
      () => ({
        type: "spring" as const,
        bounce: 0.2,
        duration: 0.45,
      }),
      [],
    );
    const labelSwapTransition = useMemo(
      () => ({
        opacity: { duration: 0.14, ease: "easeOut" as const },
        y: { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.45 },
        scale: {
          type: "spring" as const,
          stiffness: 520,
          damping: 36,
          mass: 0.45,
        },
      }),
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        reset: async () => {
          if (showSpinner || isConfirming || isPostReleaseConfirming) {
            setShowSpinner(false);
            setIsConfirming(false);
            setIsPostReleaseConfirming(false);
            await animate(x, 0, {
              type: "spring",
              bounce: 0.2,
              duration: 0.45,
            });

            // Sync controls with x position
            await controls.start({
              x: 0,
              transition: springTransition,
            });
          }
        },
      }),
      [
        showSpinner,
        isConfirming,
        isPostReleaseConfirming,
        controls,
        springTransition,
        x,
      ],
    );

    // Animate back to left when spinner transitions from true to false
    useEffect(() => {
      // Only animate back when transitioning from spinner state to no spinner
      if (
        prevShowSpinnerRef.current &&
        !showSpinner &&
        !isDragging &&
        !disabled
      ) {
        // Animate x motion value back to 0 - progress updates automatically via transform
        animate(x, 0, {
          type: "spring",
          bounce: 0.2,
          duration: 0.45,
        });

        // Sync controls with x position
        controls.start({
          x: 0,
          transition: springTransition,
        });
      }
      prevShowSpinnerRef.current = showSpinner;
    }, [showSpinner, isDragging, disabled, controls, springTransition, x]);

    const handleDragEnd = useCallback(() => {
      if (!canDrag) return;

      // Restore body scroll
      setIsDragging(false);
      setBodyScrollLock(false);

      if (isDragAtEnd) {
        // Show "Sending…" after release
        setIsConfirming(false); // Clear "Release to confirm" state
        setIsPostReleaseConfirming(true); // Show "Sending…" state
        setIsDragAtEnd(false);
        triggerHaptic();
        onSlideComplete();
        const maxOffset =
          maxOffsetRef.current ||
          (() => {
            if (constraintsRef.current && dragButtonRef.current) {
              const container = constraintsRef.current;
              const button = dragButtonRef.current;
              const calculated = container.offsetWidth - button.offsetWidth;
              maxOffsetRef.current = calculated;
              return calculated;
            }
            return 0;
          })();

        if (maxOffset > 0) {
          animate(x, maxOffset, {
            type: "spring",
            stiffness: 300,
            damping: 25,
            bounce: 0.3,
          });
          // Sync controls
          controls.start({
            x: maxOffset,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 25,
              bounce: 0.3,
            },
          });
        }
      } else {
        setShowSpinner(false);
        setIsConfirming(false);
        setIsPostReleaseConfirming(false);
        // Spring home with a little overshoot, read as a soft settle.
        animate(x, 0, {
          type: "spring",
          bounce: reduceMotion ? 0 : 0.45,
          duration: reduceMotion ? 0.3 : 0.6,
        });
        // Sync controls
        controls.start({
          x: 0,
          transition: springTransition,
        });
      }
    }, [
      isDragAtEnd,
      onSlideComplete,
      controls,
      springTransition,
      canDrag,
      x,
      setBodyScrollLock,
      reduceMotion,
    ]);

    return (
      <div
        className={cn("rounded-full p-1", disabled && "opacity-50", className)}
        style={{
          backgroundColor: "var(--fills-tertiary)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          // Allow vertical scroll (page rubber-banding) while enabling horizontal drag.
          touchAction: "pan-y",
        }}
      >
        <div
          ref={constraintsRef}
          className="relative h-16 w-full"
          style={{ touchAction: "pan-y" }}
        >
          <AnimatePresence initial={false}>
            {gateActive && gateLabel && !showSpinner && (
              <m.span
                key="gate-label"
                initial={{ opacity: 0, y: 4, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.995 }}
                transition={labelSwapTransition}
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 3 }}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <TextShimmer
                    as="span"
                    duration={2}
                    spread={3}
                    className="text-[1.0625rem] font-semibold select-none [--base-color:var(--labels-secondary)] [--base-gradient-color:var(--labels-primary)]"
                  >
                    {gateLabel}
                  </TextShimmer>
                  {gateIconSrc && (
                    <span
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        maskImage: `url(${gateIconSrc})`,
                        WebkitMaskImage: `url(${gateIconSrc})`,
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        backgroundColor: "var(--labels-secondary)",
                      }}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </m.span>
            )}
            {!gateActive && !isConfirming && !showSpinner && (
              <m.span
                key="label"
                initial={{ opacity: 0, y: 4, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.995 }}
                transition={labelSwapTransition}
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 0 }}
              >
                {disabled ? (
                  <span className="text-[1.0625rem] font-semibold text-[var(--labels-primary)] select-none">
                    {label}
                  </span>
                ) : (
                  <TextShimmer
                    as="span"
                    duration={2}
                    spread={3}
                    className={cn(
                      "text-[1.0625rem] font-semibold select-none",
                      isDarkMode
                        ? "[--base-color:rgba(255,255,255,0.6)] [--base-gradient-color:rgba(255,255,255,0.9)]"
                        : "[--base-color:var(--labels-secondary)] [--base-gradient-color:var(--labels-primary)]",
                    )}
                  >
                    {label}
                  </TextShimmer>
                )}
              </m.span>
            )}
            {showSpinner && !shouldHideProcessing && (
              <m.span
                key="processing"
                initial={{ opacity: 0, y: 5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.98 }}
                transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 30,
                  mass: 0.4,
                  bounce: 0.2,
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[1.0625rem] font-semibold text-[var(--labels-primary)] select-none"
                style={{ zIndex: 1 }}
              >
                Sending…
              </m.span>
            )}
          </AnimatePresence>
          <m.div
            className="absolute top-1/2 h-16 -translate-y-1/2 rounded-full"
            style={{
              width: "100%",
              left: 0,
              transformOrigin: "left center",
              scaleX: scaleX,
              opacity: gateActive ? 0 : fillOpacity,
              backgroundColor: isDarkMode ? "#1F1F1F" : "#f7f7f7",
              zIndex: 0,
              willChange: "transform, opacity",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          />
          <m.button
            ref={dragButtonRef}
            initial={{
              opacity: gateActive ? 0 : 1,
              scale: gateActive ? initialKnobScale : 1,
            }}
            drag={canDrag ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }} // Constrain to x=0 so left edge stays fixed
            dragElastic={0}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onPointerCancel={handleInteractionCancel}
            onTouchCancel={handleInteractionCancel}
            animate={{
              ...getButtonStyles,
              opacity: gateActive ? 0 : 1,
              x: 0, // Always keep button at x=0, left edge stays fixed
              scale: gateActive ? initialKnobScale : 1,
            }}
            style={{
              width: buttonWidth,
              height: "64px",
              fontFamily: "var(--font-inter)",
              willChange: "width, background-color, color, box-shadow",
              position: "relative",
              zIndex: gateActive ? 1 : 2,
              transformOrigin: "center center",
              pointerEvents: canDrag ? "auto" : "none",
              touchAction: "pan-x",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            disabled={disabled || gateActive}
            className={cn(
              "primary-button relative flex items-center justify-end rounded-full",
              canDrag && "hover:cursor-grab active:cursor-grabbing",
              disabled && "primary-button-disabled cursor-not-allowed",
            )}
            transition={{
              backgroundColor: {
                type: "tween",
                duration: 0.3,
                ease: "easeOut",
              },
              color: {
                type: "tween",
                duration: 0.3,
                ease: "easeOut",
              },
              opacity: {
                duration: 0.12,
                ease: "easeOut",
              },
              x: {
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.5,
              },
              width: {
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.5,
              },
              scale: {
                type: "spring",
                stiffness: 420,
                damping: 32,
                mass: 0.5,
              },
            }}
          >
            <AnimatePresence mode="wait">
              {/* Arrow - swaps to spinner in place */}
              {!showSpinner && !isPostReleaseConfirming && (
                <m.div
                  key="arrow"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: dragProgress < 0.1 ? 0 : undefined,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    opacity: { duration: 0.2, ease: "easeOut" },
                    scale: {
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      mass: 0.5,
                    },
                  }}
                  className={dragProgress < 0.1 ? "absolute" : "relative"}
                  style={{
                    maskImage:
                      "url(/media/craft/components/app/icons/actions/slide-arrow.svg)",
                    WebkitMaskImage:
                      "url(/media/craft/components/app/icons/actions/slide-arrow.svg)",
                    backgroundColor: isDarkMode ? "#1f1f1f" : "#ffffff",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    width: "1.75rem",
                    height: "1.75rem",
                    ...(dragProgress < 0.1
                      ? {
                          left: "calc(50% - 1rem)",
                          transform: "translateX(-50%)",
                        }
                      : { marginRight: "1.6rem" }),
                  }}
                />
              )}
              {showSpinner && !shouldHideProcessing && (
                <m.div
                  key="spinner"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{
                    opacity: { duration: 0.2, ease: "easeOut" },
                    filter: { duration: 0.2, ease: "easeOut" },
                    scale: {
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      mass: 0.5,
                    },
                  }}
                  className="relative"
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isDarkMode ? "#1f1f1f" : "#ffffff",
                    marginRight: "1.6rem",
                  }}
                >
                  <Spinner
                    className="size-7"
                    style={{ color: isDarkMode ? "#1f1f1f" : "#ffffff" }}
                  />
                </m.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {isConfirming && !isPostReleaseConfirming && !showSpinner && (
                <m.span
                  key="release"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.15,
                    ease: "easeOut",
                  }}
                  className="absolute left-1/2 -translate-x-1/2 text-[1.0625rem] font-semibold whitespace-nowrap select-none"
                  style={{
                    color: isDarkMode ? "#1f1f1f" : "#ffffff",
                  }}
                >
                  {releaseResolved}
                </m.span>
              )}
              {isPostReleaseConfirming && !showSpinner && (
                <>
                  <m.div
                    key="ios-spinner"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      mass: 0.5,
                    }}
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      marginRight: "1.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Spinner
                      className="size-7"
                      style={{ color: isDarkMode ? "#1f1f1f" : "#ffffff" }}
                    />
                  </m.div>
                  <m.span
                    key="confirming"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 600,
                      damping: 30,
                      mass: 0.4,
                      bounce: 0.2,
                    }}
                    className="absolute left-1/2 -translate-x-1/2 text-[1.0625rem] font-semibold select-none"
                    style={{
                      color: isDarkMode ? "#1f1f1f" : "#ffffff",
                    }}
                  >
                    {postReleaseResolved}
                  </m.span>
                </>
              )}
            </AnimatePresence>
          </m.button>
        </div>
      </div>
    );
  },
);

SlideButtonComponent.displayName = "SlideButton";

export const SlideButton = React.memo(SlideButtonComponent);
