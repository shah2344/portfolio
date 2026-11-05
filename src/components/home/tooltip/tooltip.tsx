"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Scritto from "@scritto/react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionStyle,
} from "motion/react";

import { GlassMaterial } from "@/components/ui/glass-material";
import { MotionBoundary } from "@/components/motion/motion-boundary";
import { currentWipe } from "@/components/motion/page-wipe";
import { homeTooltipFocusPoint, placeHomeTooltip } from "./position";
import {
  advanceTooltip,
  createTooltipMotion,
  releaseTooltip,
  showTooltip,
  type Point,
} from "./motion";
import styles from "./tooltip.module.css";

const TARGET = "[data-home-tip]";

function TooltipFollower() {
  const [content, setContent] = useState({
    label: "",
    keyboard: false,
    roll: false,
  });
  const contentRef = useRef(content);
  const anchor = useRef<HTMLSpanElement>(null);
  const glassSync = useRef<(() => void) | null>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const measuredWidth = useRef(80);
  const model = useRef(createTooltipMotion());
  const sync = useRef<() => void>(() => {});
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scaleX = useMotionValue(0.88);
  const scaleY = useMotionValue(0.88);
  const tilt = useMotionValue(0);
  const width = useSpring(80, { stiffness: 900, damping: 48 });

  useLayoutEffect(() => {
    const rolling = content.roll && !content.keyboard && !reduced;
    const read = () => {
      // Scritto already animates its own width. Follow that live size while
      // rolling instead of making the shell race it toward the final label.
      const source = rolling ? text.current : measure.current;
      measuredWidth.current = Math.min(
        Math.ceil(source ? parseFloat(getComputedStyle(source).width) : 60) +
          22,
        document.documentElement.clientWidth - 24,
      );
      if (rolling || reduced || content.keyboard || model.current.opacity === 0)
        width.jump(measuredWidth.current);
      else width.set(measuredWidth.current);
      sync.current();
    };
    read();
    const observer = new ResizeObserver(read);
    if (measure.current) observer.observe(measure.current);
    if (rolling && text.current) observer.observe(text.current);
    window.addEventListener("resize", read, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [content, reduced, width]);

  useEffect(() => {
    const element = anchor.current;
    const root = element?.closest<HTMLElement>(".editorial-page");
    if (!element || !root) return;
    const motion = model.current;
    let frame = 0;
    let inputFrame = 0;
    let lastFrame = 0;
    let keyboardTarget: HTMLElement | null = null;
    let pointer: Point | null = null;
    let velocity = { x: 0, y: 0, at: 0 };
    let current: HTMLElement | null = null;
    let dismissed: HTMLElement | null = null;

    const viewport = () => ({
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
    });
    const paint = () => {
      const bounded = placeHomeTooltip(
        motion,
        { width: width.get(), height: 30 },
        viewport(),
      );
      element.style.visibility = motion.opacity > 0 ? "visible" : "hidden";
      x.set(motion.opacity > 0 ? bounded.x : 0);
      y.set(motion.opacity > 0 ? bounded.y : 0);
      opacity.set(motion.opacity);
      const squeeze = Math.max(-0.05, Math.min(0.05, motion.squash.value));
      scaleX.set(motion.scale.value * (1 + squeeze));
      scaleY.set(motion.scale.value / (1 + squeeze));
      tilt.set(reduced ? 0 : Math.max(-2, Math.min(2, motion.vx * 0.003)));
    };
    const hide = () => {
      const half = measuredWidth.current / 2 + 12;
      releaseTooltip(
        motion,
        !keyboardTarget && performance.now() - velocity.at < 100
          ? velocity
          : { x: 0, y: 0 },
        { minX: half, maxX: viewport().width - half },
      );
      if (contentRef.current.keyboard) advanceTooltip(motion, 0, true);
    };
    const eligible = (target: EventTarget | null) => {
      const control =
        target instanceof Element ? target.closest<HTMLElement>(TARGET) : null;
      // The expanded feed card owns its top-layer keyboard interaction.
      return control &&
        root.contains(control) &&
        !control.closest("dialog[open]") &&
        !control.matches(':disabled, [aria-disabled="true"]')
        ? control
        : null;
    };
    const refresh = () => {
      const focused =
        keyboardTarget ?? (!pointer ? eligible(document.activeElement) : null);
      const keyboard =
        focused === document.activeElement && focused?.matches(":focus-visible")
          ? eligible(focused)
          : null;
      keyboardTarget = keyboard;
      // View-transition snapshots temporarily interrupt hit testing. Keep
      // the appearance tip while the pointer remains inside its live button.
      const bounds = current?.getBoundingClientRect();
      const held =
        current?.hasAttribute("data-home-tip-persist") &&
        pointer &&
        bounds &&
        pointer.x >= bounds.left &&
        pointer.x <= bounds.right &&
        pointer.y >= bounds.top &&
        pointer.y <= bounds.bottom
          ? eligible(current)
          : null;
      const pointerTarget = pointer
        ? eligible(document.elementFromPoint(pointer.x, pointer.y))
        : null;
      const target =
        keyboard ??
        held ??
        (pointerTarget?.hasAttribute("data-home-tip-focus-only")
          ? null
          : pointerTarget);
      current = target;
      if (target !== dismissed) dismissed = null;
      const pinned =
        Boolean(keyboard) || Boolean(target?.dataset.homeTipAnchor);
      const point =
        target && pinned
          ? homeTooltipFocusPoint(
              target.getBoundingClientRect(),
              viewport(),
              target.dataset.homeTipAnchor === "bottom" ? "bottom" : "top",
            )
          : pointer
            ? { x: pointer.x, y: pointer.y - 6 }
            : null;
      if (!target || target === dismissed || !point) {
        hide();
        return;
      }
      const next = {
        label: target.dataset.homeTip ?? "",
        keyboard: Boolean(keyboard),
        // Roll between visible pointer labels; first reveal and Tab stay immediate.
        roll: motion.visible && Boolean(contentRef.current.label) && !keyboard,
      };
      if (!next.label) {
        hide();
        return;
      }
      if (
        next.label !== contentRef.current.label ||
        next.keyboard !== contentRef.current.keyboard
      ) {
        contentRef.current = next;
        setContent(next);
      }
      showTooltip(
        motion,
        placeHomeTooltip(
          point,
          { width: measuredWidth.current, height: 30 },
          viewport(),
        ),
      );
    };
    const tick = (now: number) => {
      frame = 0;
      // Follow native focus scrolling and the feed's settling transform too.
      if (motion.visible) refresh();
      const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      const moving = advanceTooltip(
        motion,
        dt,
        Boolean(reduced) || contentRef.current.keyboard,
      );
      paint();
      if (moving) frame = requestAnimationFrame(tick);
      else lastFrame = 0;
    };
    const wake = () => {
      if (reduced || contentRef.current.keyboard) {
        advanceTooltip(motion, 0, true);
        paint();
      } else if (!frame) frame = requestAnimationFrame(tick);
    };
    const update = () => {
      refresh();
      wake();
    };
    sync.current = update;
    const schedule = () => {
      if (inputFrame) return;
      inputFrame = requestAnimationFrame(() => {
        inputFrame = 0;
        update();
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const now = performance.now();
      const elapsed = now - velocity.at;
      if (
        !pointer ||
        pointer.x !== event.clientX ||
        pointer.y !== event.clientY
      )
        keyboardTarget = null;
      velocity = {
        x:
          pointer && elapsed < 100
            ? ((event.clientX - pointer.x) / Math.max(8, elapsed)) * 1000
            : 0,
        y:
          pointer && elapsed < 100
            ? ((event.clientY - pointer.y) / Math.max(8, elapsed)) * 1000
            : 0,
        at: now,
      };
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const leave = (event: PointerEvent) => {
      const bounds = current?.getBoundingClientRect();
      if (
        current?.hasAttribute("data-home-tip-persist") &&
        (currentWipe() ||
          (bounds &&
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom))
      )
        return;
      pointer = null;
      if (!keyboardTarget) update();
    };
    const focus = (event: FocusEvent) => {
      const target = eligible(event.target);
      keyboardTarget = target?.matches(":focus-visible") ? target : null;
      // A mouse click on appearance keeps its parked pointer and tooltip.
      // Keyboard focus always takes precedence over a parked pointer.
      if (keyboardTarget || !target?.hasAttribute("data-home-tip-persist"))
        pointer = null;
      update();
    };
    const dismiss = () => {
      dismissed = current;
      hide();
      wake();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const focused = eligible(event.target);
        dismiss();
        if (focused?.matches(":focus-visible")) focused.blur();
      } else if (
        ["Enter", " "].includes(event.key) &&
        !eligible(event.target)?.hasAttribute("data-home-tip-persist")
      )
        dismiss();
    };
    const pointerdown = (event: PointerEvent) => {
      if (
        event.pointerType === "mouse" &&
        eligible(event.target)?.hasAttribute("data-home-tip-persist")
      ) {
        pointer = { x: event.clientX, y: event.clientY };
        keyboardTarget = null;
        dismissed = null;
        update();
        return;
      }
      if (event.pointerType !== "mouse") pointer = null;
      keyboardTarget = null;
      dismiss();
    };
    const blur = () => {
      pointer = null;
      keyboardTarget = null;
      current = null;
      hide();
      wake();
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("pointerdown", pointerdown, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", schedule);
    document.addEventListener("keydown", keydown, true);
    // A focused mobile icon can finish its entrance after native Tab scrolling.
    root.addEventListener("animationend", schedule);
    root.addEventListener("transitionend", schedule);
    window.addEventListener("scroll", schedule, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("blur", blur);
    const focused = eligible(document.activeElement);
    keyboardTarget = focused?.matches(":focus-visible") ? focused : null;
    update();
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(inputFrame);
      sync.current = () => {};
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerdown", pointerdown);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", schedule);
      document.removeEventListener("keydown", keydown, true);
      root.removeEventListener("animationend", schedule);
      root.removeEventListener("transitionend", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("blur", blur);
    };
  }, [reduced, x, y, opacity, scaleX, scaleY, tilt, width]);

  return (
    <m.span
      ref={anchor}
      className={styles.anchor}
      aria-hidden="true"
      style={{ x, y }}
    >
      <span className={styles.weightedPill}>
        <m.span
          className={styles.pill}
          onUpdate={() => glassSync.current?.()}
          style={
            {
              width,
              scaleX,
              scaleY,
              rotate: tilt,
              "--glass-opacity": opacity,
            } as MotionStyle
          }
        >
          <GlassMaterial syncRef={glassSync} />
          <m.span className={styles.contentFade} style={{ opacity }}>
            <span className={styles.content}>
              <span ref={text} className={styles.text}>
                <Scritto
                  value={content.label}
                  trend={1}
                  animated={content.roll && !reduced}
                  respectMotionPreference
                />
              </span>
              {content.keyboard ? <kbd className={styles.key}>↵</kbd> : null}
            </span>
          </m.span>
          <span ref={measure} className={styles.measure}>
            <span>{content.label}</span>
            {content.keyboard ? <kbd className={styles.key}>↵</kbd> : null}
          </span>
        </m.span>
      </span>
    </m.span>
  );
}

/** One follower connects every homepage control without extra Tab stops. */
export function HomeTooltip() {
  return (
    <MotionBoundary>
      <TooltipFollower />
    </MotionBoundary>
  );
}
