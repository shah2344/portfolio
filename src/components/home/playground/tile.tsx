"use client";

import { SmoothSurface } from "@/components/ui/smooth-surface";
import { requestMeasure } from "@lisse/core";

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
  marginX: number,
) {
  const insetX = Math.min(64, Math.max(OPEN_INSET_X, window.innerWidth * 0.04));
  const insetY = Math.min(
    64,
    Math.max(OPEN_INSET_Y, window.innerHeight * 0.05),
  );
  const room = Math.min(
    (window.innerWidth - insetX * 2) / (from.width * (1 + marginX * 2)),
    (window.innerHeight - insetY * 2 - captionAllowance) / from.height,
  );

  return Math.max(0, Math.min(room, maxScale));
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
 * Hands the card back to the grid: out of the top layer, out of its flight
 * geometry, and back into the slot it was always holding open.
 */
function settle(frame: HTMLDialogElement) {
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
  label,
  interactiveContent = false,
  maxScale = OPEN_MAX_SCALE,
  openMarginX = 0,
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
  label?: string;
  /** Let media handle dragging while clicks toggle the card and a transparent button supports keyboard access. */
  interactiveContent?: boolean;
  /** Raise the enlargement limit for small, high-resolution thumbnails. */
  maxScale?: number;
  /** Room kept beside the enlarged card for content that hangs past its
   *  edges, such as margin notes, as a fraction of the card's width. */
  openMarginX?: number;
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
      const captionAllowance = figcaption
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
        openMarginX,
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
      frame.style.setProperty("--pg-open-scale", scale.toFixed(3));
      frame.style.scale = scale.toFixed(3);
      frame.style.translate = `${Math.round(flightX)}px ${Math.round(flightY)}px`;
      stopEdges.current?.();
      stopEdges.current = followEdges(frame);
      setEnlarged(true);
      onOpenChange?.(true);
    },
    [maxScale, onOpenChange, openMarginX],
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
      onOpenChange?.(false);
    }, FLIGHT_DURATION);
  }, [onOpenChange]);

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
        onClick={(event) => {
          // A click that lands on the dialog itself came from the scrim.
          if (event.target === frameRef.current) close();
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
            interactiveContent
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
