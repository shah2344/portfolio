"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  animate,
  m,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { GradientAvatar } from "@outpacelabs/avatars";

import { characterBackgroundColors } from "../../../character/backgrounds";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

/** Gradient profiles from the character's curated palettes, drawn in P3. */
const AVATARS = [30, 8, 4, 20, 36, 41, 5, 29, 44, 10, 42];

/**
 * Each slide's width. The product's carousel uses 8rem slides of 7rem
 * avatars; both are larger here, so the neighbours sit out at the card's
 * edges and blur into them.
 */
const SLIDE = 156;
/**
 * The product's tween: Embla's `TWEEN_FACTOR_BASE * snap count` over a scroll
 * progress that runs 0 to 1 across the snaps, so per slide of distance from
 * the centre it falls by 0.52 × count / (count − 1).
 */
const TWEEN_PER_SLIDE = (0.52 * AVATARS.length) / (AVATARS.length - 1);
/**
 * The edge blur: a stack of backdrop blurs over each side of the row, each
 * masked to a band, so it climbs geometrically from nothing at 120pt in to
 * about 12px at the card's edge. Each band runs `EDGE_OVERHANG` past the
 * card, because a backdrop blur repeats the pixels at its own boundary,
 * which draws a hard line of an avatar's colour; out there the card's clip
 * hides it.
 */
const EDGE_OVERHANG = 40;
const EDGE_WIDTH = `${120 + EDGE_OVERHANG}px`;
const EDGE_BLURS = [0.5, 1, 2, 4, 8, 12, 16];
/** Embla's settle (`duration: 25`) is a quick, unbouncy glide. */
const SNAP = { type: "spring", duration: 0.5, bounce: 0 } as const;
/** The row speeds, in points a second, the ring is full under and gone over. */
const RING_CALM = 200;
const RING_RUSH = 600;
/** Critically damped and quick, so it smooths without trailing the row. */
const RING_SPRING = { stiffness: 900, damping: 60 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * One slide. Its scale and opacity follow its live distance from the centre,
 * as the product's tweenScale does on every scroll frame: 0.7 to 1 and 0.4
 * to 1, so slides grow in from the edges as they're dragged towards the
 * middle and shrink away as they leave it.
 */
function Slide({
  index,
  seed,
  x,
  isCenter,
  dragging,
  onSelect,
}: {
  index: number;
  seed: number;
  x: MotionValue<number>;
  isCenter: boolean;
  dragging: boolean;
  onSelect: () => void;
}) {
  const tween = useTransform(
    x,
    (value) => 1 - Math.abs((value + index * SLIDE) / SLIDE) * TWEEN_PER_SLIDE,
  );
  const scale = useTransform(tween, (value) => clamp(value, 0.7, 1));
  const opacity = useTransform(tween, (value) => clamp(value, 0.4, 1));

  return (
    <div
      className="flex min-w-0 items-center justify-center"
      style={{ flex: `0 0 ${SLIDE}px` }}
    >
      <m.div className="avatar-slide-inner" style={{ scale, opacity }}>
        <m.button
          aria-checked={isCenter}
          aria-label={`Avatar ${index + 1}`}
          className="relative cursor-pointer"
          onClick={onSelect}
          role="radio"
          style={{ width: "9rem", height: "9rem" }}
          tabIndex={isCenter ? 0 : -1}
          type="button"
          whileTap={dragging ? undefined : { scale: 0.95 }}
        >
          <GradientAvatar
            colors={characterBackgroundColors(seed)}
            p3
            seed={seed}
            size={144}
            style={{
              display: "block",
              backgroundColor: "var(--fills-tertiary)",
              boxShadow: "0 0 0 0.5px rgba(255, 255, 255, 0.15)",
            }}
          />
        </m.button>
      </m.div>
    </div>
  );
}

/**
 * The chosen avatar's ring. It stays put in the middle of the row at one size;
 * only its stroke changes. It runs off the nearest avatar's own scale tween,
 * on the same spring-driven row, and squares it, so the stroke drops away
 * as soon as an avatar starts to leave and draws in over the last of the
 * arriving one's settle, landing as it does. It also waits for the row to
 * slow: scrubbing or flicking past several avatars sweeps each through the
 * middle, which would otherwise flicker the stroke on and off, so it stays
 * out until the row is calm enough to be landing. A stiff, unbouncy spring
 * smooths the pointer's jittery speed. Drawn as a circle so the stroke thins
 * about its own centreline.
 */
function CenterRing({ x }: { x: MotionValue<number> }) {
  const velocity = useVelocity(x);
  const target = useTransform(() => {
    // The nearest avatar's progress from its smallest (0) to full size (1).
    const offset = -x.get() / SLIDE;
    const distance = Math.abs(offset - Math.round(offset));
    const scale = clamp(1 - distance * TWEEN_PER_SLIDE, 0.7, 1);
    const arrival = ((scale - 0.7) / 0.3) ** 2;
    // Full under RING_CALM points a second, gone by RING_RUSH.
    const speed = Math.abs(velocity.get());
    const calm = clamp((RING_RUSH - speed) / (RING_RUSH - RING_CALM), 0, 1);
    return arrival * calm;
  });
  const progress = useSpring(target, RING_SPRING);
  const strokeWidth = useTransform(
    progress,
    (value) => clamp(value, 0, 1) * 3.5,
  );
  const opacity = useTransform(progress, (value) => clamp(value, 0, 1) * 0.6);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 overflow-visible"
      height={156}
      style={{ marginTop: -78, marginLeft: -78 }}
      viewBox="0 0 156 156"
      width={156}
    >
      <m.circle
        cx={78}
        cy={78}
        fill="none"
        r={76.75}
        stroke="#3898ff"
        style={{ strokeWidth, opacity }}
      />
    </svg>
  );
}

/**
 * The profile's avatar picker in its edit mode
 * (components/ui/avatar-picker.tsx), kept to the carousel and the name under
 * it, running edge to edge across its card. The chosen avatar sits centred in
 * its indigo ring; drag the row, tap a neighbour, or use the arrow keys.
 * Embla isn't installed, so the row is a Motion drag that settles on the
 * nearest avatar (a flick can carry past several, as Embla's `skipSnaps`
 * allows); its edges blur out progressively.
 */
export function AvatarPickerPrimitive() {
  const [current, setCurrent] = useState(5);
  const x = useMotionValue(-current * SLIDE);
  const root = useRef<HTMLDivElement>(null);
  const direction = useRef(1);

  // Left alone, the row glides one avatar at a time and back, never to
  // either end, so the chosen one always has a neighbour on each side.
  useAutoplay(
    root,
    () =>
      setCurrent((index) => {
        if (index + direction.current < 1) direction.current = 1;
        if (index + direction.current > AVATARS.length - 2)
          direction.current = -1;
        return clamp(index + direction.current, 1, AVATARS.length - 2);
      }),
    { interval: 2600, delay: 900 },
  );

  useEffect(() => {
    const controls = animate(x, -current * SLIDE, SNAP);
    return () => controls.stop();
  }, [current, x]);

  const select = (index: number) =>
    setCurrent(clamp(index, 0, AVATARS.length - 1));

  // Letting go of a drag over an avatar also clicks it, which would pull the
  // row back to wherever the press began; a press that became a drag is no
  // tap, so its click is dropped and its pressed scale let go.
  const [dragging, setDragging] = useState(false);
  const dragged = useRef(false);
  const tap = (index: number) => {
    if (!dragged.current) select(index);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    const landing = x.get() + info.velocity.x * 0.2;
    const next = clamp(Math.round(-landing / SLIDE), 0, AVATARS.length - 1);
    if (next === current) animate(x, -current * SLIDE, SNAP);
    else setCurrent(next);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") select(current - 1);
    else if (event.key === "ArrowRight") select(current + 1);
    else return;
    event.preventDefault();
  };

  return (
    <FitStage className="anyday-app" gutter={36} inset={0}>
      <div className="flex flex-col items-center" ref={root}>
        <div
          className="relative w-full"
          style={{ isolation: "isolate", height: "156px" }}
        >
          {/* Taller than the row, so the blur reaches past the avatars. */}
          <ProgressiveBlur
            blurLevels={EDGE_BLURS}
            className="-inset-y-6"
            height={EDGE_WIDTH}
            position="left"
            style={{ left: -EDGE_OVERHANG }}
          />
          <ProgressiveBlur
            blurLevels={EDGE_BLURS}
            className="-inset-y-6"
            height={EDGE_WIDTH}
            position="right"
            style={{ right: -EDGE_OVERHANG }}
          />
          <div
            aria-label="Choose an avatar"
            // Unclipped, so avatars paint on under the bands' overhang for the
            // blur to sample; the card's own clip trims them.
            className="w-full"
            onKeyDown={onKeyDown}
            role="radiogroup"
          >
            <m.div
              className="flex"
              drag="x"
              dragConstraints={{
                left: -(AVATARS.length - 1) * SLIDE,
                right: 0,
              }}
              dragElastic={0.12}
              dragMomentum={false}
              onDragEnd={onDragEnd}
              onDragStart={() => {
                dragged.current = true;
                setDragging(true);
              }}
              onPointerDownCapture={() => (dragged.current = false)}
              style={{
                paddingLeft: `calc(50% - ${SLIDE / 2}px)`,
                paddingTop: "6px",
                paddingBottom: "6px",
                touchAction: "pan-y",
                x,
              }}
            >
              {AVATARS.map((seed, index) => (
                <Slide
                  key={seed}
                  index={index}
                  isCenter={index === current}
                  dragging={dragging}
                  onSelect={() => tap(index)}
                  seed={seed}
                  x={x}
                />
              ))}
            </m.div>
          </div>
          <CenterRing x={x} />
        </div>
        <div className="mt-5 text-center">
          <p
            className="m-0 text-[var(--labels-primary)]"
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "28px",
              lineHeight: "32px",
              letterSpacing: "-0.59px",
              fontWeight: 650,
            }}
          >
            Maya
          </p>
          <p
            className="text-spec-15 mt-1 text-[var(--labels-secondary)]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Server
          </p>
        </div>
      </div>
    </FitStage>
  );
}
