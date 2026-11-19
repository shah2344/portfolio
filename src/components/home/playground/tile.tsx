"use client";

import { SmoothSurface } from "@/components/ui/smooth-surface";
import { requestMeasure } from "@lisse/core";
import {
  PULL_LOCK_DISTANCE,
  PULL_VELOCITY_SAMPLES,
  pullAxis,
  pullTransform,
  pullTravel,
  pullVelocity,
  shouldDismiss,
  springEasing,
  type PullSample,
} from "./pull";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * Room kept between the enlarged card and the left/right edges of the window,
 * in px.
 */
const OPEN_INSET_X = 16;

/**
 * Room kept above the card and below its caption, in px. The whole region —
 * card plus the subtitle that hangs beneath it — is centred inside this inset,
 * so a keyboard or pointer open always breathes at least this much top and
 * bottom rather than the caption crowding the window's lower edge.
 */
const OPEN_INSET_Y = 32;

/** Gap between the enlarged card's bottom edge and its caption, in px. Kept in
 *  step with the open-state `figcaption` margin so the reserved region matches
 *  the paint. */
const CAPTION_GAP = 24;

/** The caption tops out at 17px from a 15px base once opened; the reserve is
 *  measured at rest, so it is grown by the same ratio to match the open size. */
const CAPTION_SCALE = 17 / 15;

/**
 * The most a card may be enlarged by. Past this the assets stop repaying the
 * space: a small tile becomes a wall of soft pixels rather than a closer look.
 */
const OPEN_MAX_SCALE = 3.2;

/**
 * How long the card takes to fly out and back.
 */
const FLIGHT_DURATION = 520;

/** How long a released pull takes to spring back. Kept in step with the
 *  `[data-pg-snap]` transition in globals.css. */
const SNAP_DURATION = 300;

/** Only pointer samples this recent count towards a release flick, in ms, so
 *  a pull held still before letting go reads as still. */
const FLICK_WINDOW = 100;

/**
 * How big this card can be shown, given the window it has to fit inside. The
 * card keeps its own proportions — it is the same frame, nearer, not a
 * differently shaped one. A card already bigger than the window, as a feed
 * card on a short screen is, comes down to fit it rather than opening with its
 * edges off-screen.
 */
function enlargedScale(
  from: DOMRect,
  captionAllowance: number,
  maxScale: number,
  margin: { x: number; y: number },
  compact: boolean,
) {
  /* A feed card opens image-only, so it can afford a tighter frame. */
  const insetX = compact
    ? Math.min(48, Math.max(12, window.innerWidth * 0.03))
    : Math.min(64, Math.max(OPEN_INSET_X, window.innerWidth * 0.04));
  const insetY = compact
    ? Math.min(48, Math.max(24, window.innerHeight * 0.03))
    : Math.min(64, Math.max(OPEN_INSET_Y, window.innerHeight * 0.05));
  const room = Math.min(
    (window.innerWidth - insetX * 2) / (from.width * (1 + margin.x * 2)),
    (window.innerHeight - insetY * 2 - captionAllowance) /
      (from.height * (1 + margin.y * 2)),
  );

  return Math.max(0, Math.min(room, maxScale));
}

/**
 * How far the card's content hangs past its edges, as fractions of its width
 * and height. Anything marked `data-pg-overhang` — a case study's margin
 * notes, say — is drawn outside the frame, and the opened card keeps that
 * much room on each side so it stays in the window. Measured rather than
 * declared, because where a note hangs changes with the layout.
 */
function overhang(frame: HTMLElement, from: DOMRect) {
  let x = 0;
  let y = 0;
  frame.querySelectorAll<HTMLElement>("[data-pg-overhang]").forEach((item) => {
    const box = item.getBoundingClientRect();
    if (!box.width || !box.height) return;
    x = Math.max(x, from.left - box.left, box.right - from.right);
    y = Math.max(y, from.top - box.top, box.bottom - from.bottom);
  });
  return { x: x / from.width, y: y / from.height };
}

/**
 * Re-measures the card's smooth-cornered surfaces on every frame of a flight.
 * Their radius divides by `--pg-edge-scale`, which eases with the card's
 * `scale`, but a transform never resizes them, so Lisse would not redraw the
 * corner on its own. Returns a stop function.
 */
function followEdges(frame: HTMLElement) {
  const surfaces = frame.querySelectorAll<HTMLElement>("[data-lisse-surface]");
  const until = performance.now() + FLIGHT_DURATION + 50;
  let id = 0;
  const tick = (now: number) => {
    surfaces.forEach(requestMeasure);
    if (now < until) id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

/**
 * The scrim behind an open card: one element on the body, shared by every
 * card and created the first time one opens, outside the grid's transformed
 * ancestors. It sits on the page rather than fixed to the window, so iOS
 * Safari never turns its toolbars solid (see `.pg-scrim` in globals.css).
 */
function scrim() {
  let element = document.querySelector<HTMLElement>("body > .pg-scrim");
  if (!element) {
    element = document.createElement("div");
    element.className = "pg-scrim";
    element.setAttribute("aria-hidden", "true");
    element.hidden = true;
    document.body.append(element);
  }
  return element;
}

/** Puts the scrim up behind `frame`, or takes it down. */
function showScrim(frame: HTMLElement, open: boolean) {
  const element = scrim();
  if (!open) {
    delete element.dataset.open;
    return;
  }
  // Over the window the page is about to be held still in.
  element.style.top = `${window.scrollY}px`;
  if (element.hidden) {
    element.hidden = false;
    // Commit the faded-out state first, so the fade in is transitioned.
    element.getBoundingClientRect();
  }
  element.dataset.open = "";
  // AnyDay's shot reel drops the blur when motion is reduced.
  element.toggleAttribute(
    "data-flat",
    frame.closest(".anyday-shots__zoom") !== null,
  );
}

/**
 * Hands the card back to the grid: out of the top layer, out of its flight
 * geometry, and back into the slot it was always holding open.
 */
function settle(frame: HTMLDialogElement) {
  showScrim(frame, false);
  scrim().hidden = true;
  frame.close();
  frame.removeAttribute("data-pg-enlarged");
  frame.removeAttribute("data-pg-open");
  frame.style.cssText = "";

  /*
   * The card is home and the scrim is gone. Ask the grid to read where the
   * pointer is actually resting now and settle the hover to match: a card that
   * closed under a still pointer stays in front, one closed with the pointer
   * over a different card hands the focus there, and one closed with the pointer off
   * the grid lets go — none of which waits for a fresh pointer move to trigger.
   */
  frame.dispatchEvent(new CustomEvent("pg-resync", { bubbles: true }));
}

/**
 * A playground card that can be opened for a closer look.
 *
 * The frame is a `<dialog>`, so opening it promotes the card *itself* into the
 * top layer rather than animating a stand-in: the same element, with the same
 * video still playing mid-frame, escapes the transformed and paint-contained
 * ancestors it is nested in without a portal, and comes back to exactly the
 * slot it left. The flight is a transform from the slot it occupies to the
 * middle of the window, so nothing reflows while it travels.
 */
export function PlaygroundTile({
  asContainer = false,
  borderInset = 0,
  caption,
  children,
  className = "",
  expandable = true,
  label,
  interactiveContent = false,
  maxScale = OPEN_MAX_SCALE,
  onOpenChange,
  style,
  subtitle,
  year,
}: {
  /** Use a div when the tile lives inside an existing figure. */
  asContainer?: boolean;
  borderInset?: number;
  caption?: string;
  children: ReactNode;
  className?: string;
  /** False for a card that is used where it sits and never opens. */
  expandable?: boolean;
  label?: string;
  /** Let media handle dragging while clicks toggle the card and a transparent button supports keyboard access. */
  interactiveContent?: boolean;
  /** Raise the enlargement limit for small, high-resolution thumbnails. */
  maxScale?: number;
  onOpenChange?: (open: boolean) => void;
  style?: CSSProperties;
  /** A second, quieter line under the caption, which then reads as a title. */
  subtitle?: string;
  /** Set after the subtitle on its quieter line. */
  year?: number;
}) {
  const figureRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDialogElement>(null);
  const returnFrame = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const stopEdges = useRef<() => void>(undefined);
  /** Where the opened card rests, so a pull can be measured from it and
   *  spring back to it. */
  const pose = useRef<{
    left: number;
    scale: number;
    top: number;
    x: number;
    y: number;
  }>(undefined);
  const closeRef = useRef<() => void>(undefined);
  /** Set when a tap outside the card closes it, so the focus the dialog
   *  hands back on landing can be let go rather than drawn as a ring. */
  const closedByTap = useRef(false);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const containPointer = (event: PointerEvent) => {
      if (frame.open) event.stopPropagation();
    };
    frame.addEventListener("pointerdown", containPointer);
    return () => {
      frame.removeEventListener("pointerdown", containPointer);
      if (frame.open) {
        showScrim(frame, false);
        scrim().hidden = true;
      }
      window.clearTimeout(settleTimer.current);
      if (returnFrame.current !== undefined)
        cancelAnimationFrame(returnFrame.current);
      stopEdges.current?.();
    };
  }, []);

  const open = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const figure = figureRef.current;
      const frame = frameRef.current;
      if (!figure || !frame) return;

      // Clicked again while it was still flying home: hand it back to the grid
      // now, so it takes off from the slot it is actually about to occupy.
      window.clearTimeout(settleTimer.current);
      if (returnFrame.current !== undefined)
        cancelAnimationFrame(returnFrame.current);
      if (frame.open) settle(frame);

      /*
       * The figure is the one box in the tile that is never transformed, and the
       * frame fills it exactly — so it, not the frame's own rect, is where the
       * card is actually parked and where it has to land on the way back.
       */
      const from = figure.getBoundingClientRect();

      /*
       * The caption hangs below the card and has to clear the window's edge with
       * it, so the space it will take once opened is reserved before the scale is
       * chosen. It is measured at rest and grown to its open size; a tile without
       * a caption reserves nothing.
       */
      const figcaption = frame.querySelector<HTMLElement>("figcaption");
      /* Feed cards drop their caption once opened (see `.pg-grid--feed` in
         globals.css), so they reserve no room for it. */
      const imageOnly = figure.closest(".pg-grid--feed") !== null;
      const captionAllowance =
        figcaption && !imageOnly
          ? CAPTION_GAP + figcaption.offsetHeight * CAPTION_SCALE
          : 0;

      frame.style.left = `${from.left}px`;
      frame.style.top = `${from.top}px`;
      frame.style.width = `${from.width}px`;
      frame.style.height = `${from.height}px`;
      frame.style.scale = "1";
      frame.style.translate = "0px 0px";
      /*
       * The caption's size and gap are written differently inside a scaled feed
       * and in the top layer, though they draw the same. Left to transition, it
       * would ease across that difference and start the flight oversized.
       */
      if (figcaption) figcaption.style.transition = "none";
      frame.dataset.pgEnlarged = "";

      /*
       * `showModal` hands focus to this button, and WebKit reports that focus as
       * keyboard-reached — so a tap would open the card wearing the keyboard ring
       * and the rest of the focused-tile treatment. A click carries a non-zero
       * `detail`; only an activation without one was genuinely reached by
       * keyboard, so a pointer open marks the tile and the focus-visible rules
       * stand aside until that focus is given up. Marked here rather than on the
       * way in, because the `settle` above closes the dialog and so blurs the
       * button, which is what clears the mark.
       */
      if (event.detail > 0) figure.dataset.pgTap = "";
      else delete figure.dataset.pgTap;

      frame.showModal();

      const scale = enlargedScale(
        from,
        captionAllowance,
        maxScale,
        overhang(frame, from),
        imageOnly,
      );
      const flightX = window.innerWidth / 2 - (from.left + from.width / 2);
      /*
       * Centre the whole region — card and caption — rather than the card alone,
       * so lifting the card up by half the caption's reserve leaves an equal
       * inset above the card and below the caption.
       */
      const flightY =
        window.innerHeight / 2 -
        captionAllowance / 2 -
        (from.top + from.height / 2);

      /*
       * Flushing layout here commits the take-off values, so the assignments
       * below read as a transition from them rather than replacing them.
       */
      frame.getBoundingClientRect();

      figcaption?.style.removeProperty("transition");
      frame.dataset.pgOpen = "";
      showScrim(frame, true);
      frame.style.setProperty("--pg-open-scale", scale.toFixed(3));
      frame.style.scale = scale.toFixed(3);
      frame.style.translate = `${Math.round(flightX)}px ${Math.round(flightY)}px`;
      pose.current = {
        left: from.left,
        top: from.top,
        scale: Number(scale.toFixed(3)),
        x: Math.round(flightX),
        y: Math.round(flightY),
      };
      stopEdges.current?.();
      stopEdges.current = followEdges(frame);
      setEnlarged(true);
      onOpenChange?.(true);
    },
    [maxScale, onOpenChange],
  );

  const close = useCallback(() => {
    const frame = frameRef.current;
    const figure = figureRef.current;
    if (!frame?.open || !figure || !frame.hasAttribute("data-pg-open")) return;

    const destination = figure.getBoundingClientRect();
    const originLeft = parseFloat(frame.style.left);
    const originTop = parseFloat(frame.style.top);

    // Keep the return flight attached to the live slot. Updating left/top
    // follows scroll immediately without restarting the scale/translate easing.
    const followSlot = () => {
      const slot = figure.getBoundingClientRect();
      frame.style.left = `${originLeft + slot.left - destination.left}px`;
      frame.style.top = `${originTop + slot.top - destination.top}px`;
      returnFrame.current = requestAnimationFrame(followSlot);
    };
    returnFrame.current = requestAnimationFrame(followSlot);

    frame.removeAttribute("data-pg-open");
    showScrim(frame, false);
    frame.style.scale = "1";
    frame.style.translate = `${destination.left - originLeft}px ${destination.top - originTop}px`;
    stopEdges.current?.();
    stopEdges.current = followEdges(frame);
    setEnlarged(false);

    /*
     * The grid keeps whatever it was holding in front while the card flies
     * home — the scrim is still up, so none of it shows — and `settle` resyncs
     * the hover to the pointer's real position the moment the card lands. That
     * keeps the return seamless: nothing eases back and re-triggers under a
     * resting pointer, so the card settles straight back into place.
     *
     * The card is only handed back to the grid once it has finished flying
     * home, so the slot it returns to is the slot it appears to land in.
     */
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (returnFrame.current !== undefined)
        cancelAnimationFrame(returnFrame.current);
      returnFrame.current = undefined;
      settle(frame);
      if (closedByTap.current) {
        /* The dialog hands focus back to the card's button as it closes,
           and WebKit draws that focus as keyboard focus. A tap needs no
           focus parked on the card, so let it go — now and once more on the
           next frame, in case the hand-back lands late. */
        const release = () => {
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            figureRef.current?.contains(active)
          )
            active.blur();
        };
        release();
        requestAnimationFrame(release);
      }
      closedByTap.current = false;
      onOpenChange?.(false);
    }, FLIGHT_DURATION);
  }, [onOpenChange]);

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  /*
   * Pull to dismiss. An opened card can be dragged up or down: while the
   * pointer is down it is the pointer, following with resistance, shrinking a
   * little and thinning the scrim in step. On release a spring seeded with the
   * pointer's speed either carries it home through the usual `close` flight —
   * pulled far enough, or flicked — or snaps it back to rest. The card can be
   * caught mid-flight (opening, springing back or flying home) and dragged
   * from wherever it is. Escape, the scrim and the card itself still close it,
   * so the gesture is a shortcut, never the only way out.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let drag:
      | {
          axis: ReturnType<typeof pullAxis>;
          /** Where the card was, relative to rest, when the pointer took it. */
          base: { scale: number; x: number; y: number };
          /** Raw travel that position already counts as. */
          travel: number;
          dy: number;
          id: number;
          samples: PullSample[];
          x0: number;
          y0: number;
        }
      | undefined;
    let swallowClick = false;
    let swallowTimer = 0;
    let snapTimer = 0;
    const springs = CSS.supports("transition-timing-function", "linear(0, 1)");

    /* Transform writes only: no inherited custom property changes per move,
       so a drag never restyles the card's contents. */
    const pin = (scale: number, x: number, y: number) => {
      frame.style.scale = scale.toFixed(3);
      frame.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    };

    /** Thins the scrim with the pull, written straight to its opacity. */
    const thin = (progress: number) => {
      scrim().style.opacity = (1 - progress * 0.5).toFixed(3);
    };

    /** Where the card is drawn right now, mid-transition included,
     *  relative to where it rests open. */
    const drawnAt = (rest: NonNullable<typeof pose.current>) => {
      const style = getComputedStyle(frame);
      const [tx = 0, ty = 0] =
        style.translate === "none"
          ? []
          : style.translate.split(" ").map(parseFloat);
      const scale =
        style.scale === "none" ? 1 : parseFloat(style.scale.split(" ")[0]!);
      return {
        scale,
        x: parseFloat(frame.style.left) + tx - rest.left - rest.x,
        y: parseFloat(frame.style.top) + ty - rest.top - rest.y,
      };
    };

    const inFlight = () =>
      frame
        .getAnimations()
        .some(
          (animation) =>
            "transitionProperty" in animation &&
            (animation.transitionProperty === "translate" ||
              animation.transitionProperty === "scale"),
        );

    const engage = (id: number) => {
      window.clearTimeout(snapTimer);
      delete frame.dataset.pgSnap;
      frame.style.removeProperty("transition-timing-function");
      frame.dataset.pgPulling = "";
      const veil = scrim();
      delete veil.dataset.snap;
      veil.dataset.pulling = "";
      try {
        frame.setPointerCapture(id);
      } catch {
        // The pointer is already gone; the pull still ends on its pointerup.
      }
    };

    const onDown = (event: PointerEvent) => {
      if (drag && event.pointerId !== drag.id) {
        // A second finger means a pinch, not a pull: put the card back.
        release(event, true);
        return;
      }
      swallowClick = false;
      const rest = pose.current;
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        !rest ||
        !frame.open ||
        !frame.hasAttribute("data-pg-enlarged")
      )
        return;
      const target = event.target as Element;
      if (
        target.closest("a, input, select, textarea, [data-pg-no-pull]") ||
        (target.closest("button") && !target.closest(".pg-open"))
      )
        return;

      const opened = frame.hasAttribute("data-pg-open");
      const moving = inFlight();
      if (!opened && !moving) return;

      const base = moving ? drawnAt(rest) : { scale: rest.scale, x: 0, y: 0 };
      drag = {
        axis: moving ? "vertical" : "none",
        base,
        travel: pullTravel(base.y),
        dy: 0,
        id: event.pointerId,
        samples: [{ t: event.timeStamp, y: event.clientY }],
        x0: event.clientX,
        y0: event.clientY,
      };
      if (!moving) return;

      /*
       * Caught mid-flight: freeze it where it is drawn and hand it straight to
       * the pointer. A card caught flying home is taken back out of that
       * flight, so letting go short of dismissing returns it to rest.
       */
      engage(event.pointerId);
      if (!opened) {
        window.clearTimeout(settleTimer.current);
        if (returnFrame.current !== undefined)
          cancelAnimationFrame(returnFrame.current);
        returnFrame.current = undefined;
        frame.style.left = `${rest.left}px`;
        frame.style.top = `${rest.top}px`;
        frame.dataset.pgOpen = "";
        showScrim(frame, true);
        setEnlarged(true);
      }
      pin(base.scale, rest.x + base.x, rest.y + base.y);
      thin(pullTransform(0, drag.travel).progress);
    };

    const onMove = (event: PointerEvent) => {
      const rest = pose.current;
      if (!drag || event.pointerId !== drag.id || !rest) return;
      const dx = event.clientX - drag.x0;
      const dy = event.clientY - drag.y0;

      if (drag.axis === "none") {
        drag.axis = pullAxis(dx, dy);
        if (drag.axis === "none") return;
        // A sideways drag belongs to the media, such as a carousel.
        if (drag.axis === "horizontal") {
          drag = undefined;
          return;
        }
        engage(event.pointerId);
      }

      event.preventDefault();
      drag.dy = dy;
      drag.samples.push({ t: event.timeStamp, y: event.clientY });
      if (drag.samples.length > PULL_VELOCITY_SAMPLES) drag.samples.shift();

      const { base } = drag;
      const pull = pullTransform(dx, dy);
      pin(
        base.scale * pull.scale,
        rest.x + base.x + pull.x,
        rest.y + base.y + pull.y,
      );
      // The scrim reads the same progress, so it is always exactly as faded
      // as the card is pulled — including when the pointer reverses.
      thin(pullTransform(0, drag.travel + dy).progress);
    };

    /** A spring easing that leaves at `speed` (px/s) towards a target
     *  `distance` px away, over `duration` ms. */
    const seeded = (
      speed: number,
      distance: number,
      duration: number,
      damping: number,
      floor: number,
    ) => {
      const velocity = (speed * duration) / 1000 / Math.max(distance, 1);
      return springEasing(Math.min(Math.max(velocity, floor), 4), damping);
    };

    function release(event: PointerEvent, cancelled: boolean) {
      const rest = pose.current;
      if (!drag || !frame || !rest) return;
      const { axis, dy, id, samples, travel } = drag;
      drag = undefined;
      if (axis !== "vertical") return;

      // The pointer lifting off the card would otherwise read as a click on
      // it, and close the card the pull just put back.
      swallowClick = true;
      window.clearTimeout(swallowTimer);
      swallowTimer = window.setTimeout(() => {
        swallowClick = false;
      }, 300);

      if (frame.hasPointerCapture(id)) frame.releasePointerCapture(id);
      const at = drawnAt(rest);
      delete frame.dataset.pgPulling;
      const veil = scrim();
      delete veil.dataset.pulling;
      veil.style.removeProperty("opacity");

      /* A caught card skips the axis lock, so a few pixels of jitter between
         two close events could read as a fast flick. A flick has to travel. */
      const velocity =
        Math.abs(dy) < PULL_LOCK_DISTANCE
          ? 0
          : pullVelocity(
              samples.filter(
                (sample) => event.timeStamp - sample.t <= FLICK_WINDOW,
              ),
            );

      if (!cancelled && shouldDismiss(travel + dy, velocity)) {
        /*
         * Home is the slot it came from. The flight leaves at the speed the
         * pointer did when it was already heading that way, and lands without
         * a bounce: it is settling into the grid, not hitting a wall.
         */
        const slot = figureRef.current?.getBoundingClientRect();
        const card = frame.getBoundingClientRect();
        if (springs && slot) {
          const gapX =
            slot.left + slot.width / 2 - (card.left + card.width / 2);
          const gapY =
            slot.top + slot.height / 2 - (card.top + card.height / 2);
          const gap = Math.hypot(gapX, gapY);
          if (gap > 1 && velocity * gapY > 0)
            frame.style.transitionTimingFunction = seeded(
              (velocity * gapY) / gap,
              gap,
              FLIGHT_DURATION,
              1,
              0,
            );
        }
        closeRef.current?.();
        return;
      }

      /* Snapping back is quick and keeps the release speed, with the small
         bounce a drag has earned. */
      frame.dataset.pgSnap = "";
      veil.dataset.snap = "";
      if (springs) {
        const gap = Math.hypot(at.x, at.y);
        frame.style.transitionTimingFunction = seeded(
          gap > 1 ? (-velocity * at.y) / gap : 0,
          gap,
          SNAP_DURATION,
          0.8,
          -1,
        );
      }
      pin(rest.scale, rest.x, rest.y);
      snapTimer = window.setTimeout(() => {
        delete frame.dataset.pgSnap;
        delete veil.dataset.snap;
        frame.style.removeProperty("transition-timing-function");
      }, SNAP_DURATION);
    }

    const onUp = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.id) release(event, false);
    };
    const onCancel = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.id) release(event, true);
    };
    const onClick = (event: Event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    /* With no backdrop, a tap outside the open card lands on the page, which
       the dialog has made inert, and reaches the document. It closes the card
       — unless it is the tail of a pull, which already decided. */
    const onPageClick = (event: Event) => {
      if (!frame.hasAttribute("data-pg-open")) return;
      if (frame.contains(event.target as Node)) return;
      if (swallowClick) {
        swallowClick = false;
        return;
      }
      /* Once the card lands, the focus the dialog hands back is let go, or
         WebKit draws it as keyboard focus. */
      // Keyboard activation targets the focused button inside the dialog, so
      // a click out here is always a pointer.
      closedByTap.current = true;
      closeRef.current?.();
    };

    frame.addEventListener("pointerdown", onDown);
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerup", onUp);
    frame.addEventListener("pointercancel", onCancel);
    frame.addEventListener("click", onClick, true);
    document.addEventListener("click", onPageClick);
    return () => {
      document.removeEventListener("click", onPageClick);
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerup", onUp);
      frame.removeEventListener("pointercancel", onCancel);
      frame.removeEventListener("click", onClick, true);
      window.clearTimeout(swallowTimer);
      window.clearTimeout(snapTimer);
    };
  }, []);

  const openLabel = label ?? caption ?? "this playground detail";
  const Clip = className.includes("anyday-shots__zoom") ? "div" : SmoothSurface;
  const Tile = asContainer ? "div" : "figure";

  return (
    <Tile
      className={`pg-tile ${interactiveContent ? "pg-tile--interactive" : ""} ${className}`.trim()}
      ref={(node) => {
        figureRef.current = node;
      }}
      style={style}
    >
      {/*
       * The frame is the dialog, so it is the thing that flies out. Its media
       * is clipped by an inner `pg-frame__clip` rather than by the frame itself,
       * which frees the frame to overflow — so the caption, a child of the
       * frame, can hang below the card, scale up with it, and ride the same
       * element into the top layer when the card opens. The frame still carries
       * the border, radius and background.
       */}
      <dialog
        aria-label={label}
        className="pg-frame"
        onCancel={(event) => {
          // Escape closes it, but through the flight rather than instantly.
          event.preventDefault();
          close();
        }}
        onKeyDown={(event) => {
          // Keep Escape scoped to this top-layer card when it is nested inside
          // another dismissible surface, such as another dialog.
          if (event.key === "Escape") event.stopPropagation();
        }}
        ref={frameRef}
      >
        <Clip
          {...(Clip === SmoothSurface ? { borderInset } : {})}
          className="pg-frame__clip"
          onClick={
            expandable && interactiveContent
              ? (event) => {
                  if (
                    (event.target as Element).closest(
                      "button, a, input, select, textarea",
                    )
                  )
                    return;
                  if (enlarged) close();
                  else open(event);
                }
              : undefined
          }
        >
          {children}

          {expandable ? (
            <button
              aria-label={
                enlarged ? `Close ${openLabel}` : `Enlarge ${openLabel}`
              }
              className="pg-open"
              data-home-tip={enlarged ? undefined : "Enlarge"}
              data-home-tip-focus-only
              onBlur={() => {
                // The tapped focus is over, so the next one is judged afresh.
                delete figureRef.current?.dataset.pgTap;
              }}
              onClick={enlarged ? close : open}
              type="button"
            />
          ) : null}
        </Clip>

        {caption ? (
          <figcaption>
            {subtitle ? (
              <span>
                <span className="pg-caption__title">{caption}</span>
                <span className="pg-caption__subtitle">
                  {subtitle}
                  {year ? (
                    <>
                      {" \u00b7 "}
                      <time dateTime={String(year)}>{year}</time>
                    </>
                  ) : null}
                </span>
              </span>
            ) : (
              <span>{caption}</span>
            )}
          </figcaption>
        ) : null}
      </dialog>
    </Tile>
  );
}
