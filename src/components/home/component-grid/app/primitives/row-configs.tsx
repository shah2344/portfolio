"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

import { FitStage } from "../../fit-stage";
import "../app-product.css";
import { PrimaryButton } from "../ui/primary-button";
import styles from "./row-configs.module.css";
import { ToggleSwitch } from "./toggle-switch";

const ICONS = "/media/craft/components/app/icons/rows";

/** Every configuration is one height, as the activity rows below are. */
const ROW_HEIGHT = 72;
/** Room under the row for the leader and its label. */
const NOTE_SLOT = 52;
/** How long each variant stays before the next. */
const INTERVAL = 3200;

/** The activity rows' own card shadow. */
const ROW_SHADOW =
  "0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)";
/** Figma's category swatch (#32ADE6), in Display P3. */
const CATEGORY = "color(display-p3 0.35 0.669 0.881)";
/** The overlay's ink: an inspector blue, apart from the product's own. */
const INK = "color(display-p3 0.2 0.45 1)";
/** Lifts the row a few points above the card's middle, where it reads as
    centred: the eye puts the middle a little higher than the geometry. */
const OPTICAL_LIFT = 4;

/** A variant arrives with a spring and leaves quicker and smaller. */
const ENTER = { type: "spring", duration: 0.4, bounce: 0 } as const;
const EXIT = { duration: 0.15, ease: "easeOut" } as const;
const SETTLE = { type: "spring", duration: 0.3, bounce: 0 } as const;
// The scrubber swells quickly under a press and settles back with a small
// give on release, since a finger has just pushed on it.
const PRESS_SCALE = 1.1;
// The scrubber's dot and the current variant's pill, in px.
const DOT = 6;
const PILL = 20;
const PRESS = { type: "spring", duration: 0.2, bounce: 0 } as const;
const RELEASE = { type: "spring", duration: 0.4, bounce: 0.2 } as const;

/** An icon with its own colour, drawn at the size Figma gives it. */
function Glyph({ name, size = 24 }: { name: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className="block shrink-0"
      draggable={false}
      height={size}
      src={`${ICONS}/${name}.svg`}
      width={size}
    />
  );
}

/** The Services category avatar: its cube on a wash of the same colour. */
function Category({ badge = false }: { badge?: boolean }) {
  return (
    <span className="relative flex shrink-0">
      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full">
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-15"
          style={{ backgroundColor: CATEGORY }}
        />
        <Glyph name="cube" />
      </span>
      {badge && (
        <span className="absolute -top-0.5 -left-0.5 flex h-5 w-5 items-center justify-center">
          <Glyph name="clock-badge" size={22.6667} />
        </span>
      )}
    </span>
  );
}

function Amount({
  children,
  credit = false,
}: {
  children: string;
  credit?: boolean;
}) {
  return (
    <span
      className="font-inter-amounts text-[17px] leading-[22px] font-semibold tabular-nums"
      style={{ color: credit ? "var(--green)" : "var(--labels-primary)" }}
    >
      {children}
    </span>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
    >
      <path
        d="M5.5 12.5l4.2 4.5 8.8-10"
        stroke="var(--blue)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function LocalToggle({ label }: { label: string }) {
  const [on, setOn] = useState(true);
  return <ToggleSwitch checked={on} label={label} onChange={setOn} />;
}

type Slot = "Leading" | "Trailing" | "Subtitle";

type Variant = {
  /** Which part of the row the variant is about, and what it is. */
  slot: Slot;
  type: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing: ReactNode;
  /** The selection's corner radius, to hug round parts. */
  round?: boolean;
};

/**
 * Every configuration of the wallet's list row, from its Figma component:
 * a title with or without a subtitle, an optional leading image, and one
 * trailing accessory. The content is the wallet's own.
 */
const VARIANTS: Variant[] = [
  {
    slot: "Trailing",
    type: "Copy",
    title: "Account number",
    subtitle: "•••• 4821",
    trailing: <Glyph name="copy" />,
  },
  {
    slot: "Trailing",
    type: "Amount",
    title: "Daily limit",
    trailing: <Amount>$500</Amount>,
  },
  {
    slot: "Leading",
    type: "Icon",
    title: "Add bank account",
    subtitle: "Instant to your bank",
    leading: (
      // Figma's extra 4pt after the icon, as margin so the icon's own box
      // is what gets selected.
      <span className="mr-1 flex">
        <Glyph name="plus" />
      </span>
    ),
    trailing: <Glyph name="chevron-right" size={16} />,
  },
  {
    slot: "Trailing",
    type: "Button",
    title: "Your card",
    subtitle: "Arrived today",
    round: true,
    trailing: (
      <PrimaryButton className="h-[38px] px-4" tabIndex={-1}>
        Activate
      </PrimaryButton>
    ),
  },
  {
    slot: "Trailing",
    type: "Toggle",
    title: "Lock card",
    round: true,
    trailing: <LocalToggle label="Lock card" />,
  },
  {
    slot: "Subtitle",
    type: "With toggle",
    title: "Autosave",
    subtitle: "10% of every payout",
    trailing: <LocalToggle label="Autosave" />,
  },
  {
    slot: "Leading",
    type: "Icon tile",
    title: "New pocket",
    subtitle: "Save toward a goal",
    leading: (
      <span
        className="flex rounded-[10px] p-1.5"
        style={{ backgroundColor: "var(--blue)" }}
      >
        <Glyph name="plus-white" />
      </span>
    ),
    trailing: <Glyph name="info" />,
  },
  {
    slot: "Leading",
    type: "Badge",
    title: "Riverside Grill",
    subtitle: "Tip-out · Pending",
    round: true,
    leading: <Category badge />,
    trailing: <Amount>$50</Amount>,
  },
  {
    slot: "Trailing",
    type: "Credit",
    title: "Riverside Grill",
    subtitle: "Tip-out",
    leading: <Category />,
    trailing: <Amount credit>+$50</Amount>,
  },
  {
    slot: "Leading",
    type: "Avatar",
    title: "Shift pool",
    subtitle: "Code RG-2048",
    round: true,
    leading: <Category />,
    trailing: <Glyph name="copy" />,
  },
  {
    slot: "Trailing",
    type: "Selected",
    title: "Pay out weekly",
    trailing: <Check />,
  },
];

/** Where `element` sits inside `ancestor`, ignoring transforms. */
function boxWithin(element: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
}

function Row({ variant }: { variant: Variant }) {
  const { slot, title, subtitle, leading, trailing } = variant;
  const mark = (part: Slot) => (slot === part ? { "data-annotate": "" } : {});

  return (
    <div
      className="flex items-center gap-3 rounded-[20px] px-5"
      data-row=""
      style={{
        height: ROW_HEIGHT,
        backgroundColor: "var(--card-background)",
        boxShadow: ROW_SHADOW,
      }}
    >
      {leading && (
        <span className="flex shrink-0" {...mark("Leading")}>
          {leading}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-spec-17 truncate font-medium text-[var(--labels-primary)]">
          {title}
        </span>
        {subtitle && (
          <span
            className="max-w-full self-start truncate text-[13px] leading-[19px] text-[var(--labels-secondary)]"
            {...mark("Subtitle")}
          >
            {subtitle}
          </span>
        )}
      </span>
      <span
        className="flex shrink-0 items-center justify-end"
        {...mark("Trailing")}
      >
        {trailing}
      </span>
    </div>
  );
}

type Box = { x: number; y: number; width: number; height: number };

/**
 * An inspector's overlay on the part of the row that makes it this
 * variant: a hairline bounding box with crop marks, a leader, and a mono
 * readout of the slot, its type and its size. It sits over the product
 * rather than in it, so none of it borrows the product's type or surfaces.
 */
function Note({ variant, target }: { variant: Variant; target: Box }) {
  const reduce = useReducedMotion();
  const label = useRef<HTMLSpanElement>(null);
  const pad = 3;
  const box = {
    left: target.x - pad,
    top: target.y - pad,
    width: target.width + pad * 2,
    height: target.height + pad * 2,
  };
  const x = target.x + target.width / 2;
  const leaderTop = box.top + box.height;
  const labelTop = ROW_HEIGHT + 18;
  const [left, setLeft] = useState(x);

  // The readout centres on the leader, kept inside the stage.
  useLayoutEffect(() => {
    const element = label.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const half = element.offsetWidth / 2;
    setLeft(Math.min(Math.max(x, half), parent.offsetWidth - half));
  }, [x]);

  const fade = (delay: number) =>
    ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.15, ease: "easeOut", delay },
    }) as const;
  const mark = "absolute h-[5px] w-[5px]";
  const edge = `1px solid ${INK}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ fontFamily: "var(--site-font-mono)" }}
    >
      <m.span className="absolute" style={box} {...fade(0.18)}>
        <span
          className="absolute inset-0"
          style={{ outline: `1px dashed ${INK}`, opacity: 0.55 }}
        />
        <span
          className={`${mark} -top-px -left-px`}
          style={{ borderTop: edge, borderLeft: edge }}
        />
        <span
          className={`${mark} -top-px -right-px`}
          style={{ borderTop: edge, borderRight: edge }}
        />
        <span
          className={`${mark} -bottom-px -left-px`}
          style={{ borderBottom: edge, borderLeft: edge }}
        />
        <span
          className={`${mark} -right-px -bottom-px`}
          style={{ borderBottom: edge, borderRight: edge }}
        />
      </m.span>
      <m.span
        animate={{ scaleY: 1, opacity: 0.6 }}
        className="absolute w-px origin-top -translate-x-1/2"
        initial={reduce ? { opacity: 0 } : { scaleY: 0, opacity: 0.6 }}
        style={{
          left: x,
          top: leaderTop + 3,
          height: labelTop - leaderTop - 6,
          backgroundColor: INK,
        }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1], delay: 0.24 }}
      />
      <m.span
        className="absolute h-[3px] w-[3px] -translate-x-1/2"
        style={{ left: x, top: labelTop - 4, backgroundColor: INK }}
        {...fade(0.34)}
      />
      <m.span
        className="absolute flex -translate-x-1/2 items-baseline gap-1.5 text-[11px] leading-[14px] tracking-[0.06em] whitespace-nowrap uppercase"
        ref={label}
        style={{ left, top: labelTop + 2, color: INK }}
        {...fade(0.36)}
      >
        <span>
          {variant.slot}
          <span style={{ opacity: 0.45 }}> / </span>
          {variant.type}
        </span>
        <span className="tabular-nums" style={{ opacity: 0.5 }}>
          {Math.round(target.width)}×{Math.round(target.height)}
        </span>
      </m.span>
    </div>
  );
}

function Frame({ variant }: { variant: Variant }) {
  const root = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Box | null>(null);

  // The marked slot wraps the part; the part's own box (not the wrapper,
  // its margin or its fixed width) is what the overlay measures.
  useLayoutEffect(() => {
    const element = root.current;
    const slot = element?.querySelector<HTMLElement>("[data-annotate]");
    if (!element || !slot) return;
    const child = slot.firstElementChild;
    const part = child instanceof HTMLElement ? child : slot;
    setTarget(boxWithin(part, element));
  }, []);

  return (
    <div
      className="relative"
      ref={root}
      style={{ height: ROW_HEIGHT + NOTE_SLOT }}
    >
      <Row variant={variant} />
      {target && <Note target={target} variant={variant} />}
    </div>
  );
}

/**
 * Whether the card should play on its own: on screen, and not while the
 * pointer is over it, a finger is down on it, keyboard focus is in it, the
 * tab is hidden, or the system asks for reduced motion. A mouse click's focus
 * doesn't count, so it plays again as soon as the pointer leaves.
 */
function usePlaying(ref: RefObject<HTMLElement | null>) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The card the component sits on owns hover and focus.
    const card = element.closest<HTMLElement>("[role=group]") ?? element;
    let visible = false;
    let hovered = false;
    let pressed = false;
    let focused = false;

    const update = () =>
      setPlaying(
        visible &&
          !hovered &&
          !pressed &&
          !focused &&
          !document.hidden &&
          !reduce.matches,
      );

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        update();
      },
      { threshold: 0.6 },
    );
    observer.observe(element);

    const on = (set: () => void) => () => {
      set();
      update();
    };
    const listeners: [EventTarget, string, () => void][] = [
      [card, "pointerenter", on(() => (hovered = true))],
      [card, "pointerleave", on(() => (hovered = false))],
      [card, "pointerdown", on(() => (pressed = true))],
      [window, "pointerup", on(() => (pressed = false))],
      [window, "pointercancel", on(() => (pressed = false))],
      [
        card,
        "focusin",
        on(() => (focused = card.matches(":has(:focus-visible)"))),
      ],
      [card, "focusout", on(() => (focused = false))],
      [document, "visibilitychange", update],
      [reduce, "change", update],
    ];
    for (const [target, type, listener] of listeners)
      target.addEventListener(type, listener);

    return () => {
      observer.disconnect();
      for (const [target, type, listener] of listeners)
        target.removeEventListener(type, listener);
    };
  }, [ref]);

  return playing;
}

/**
 * A segmented scrubber pinned to the card's foot, one dot per variant; the
 * current dot stretches into a black pill and its neighbours make room.
 * Press anywhere on it and slide: the variant under the finger is the one
 * shown. Arrow keys, Home and End step through it too. Inside the current
 * pill a black dot grows to fill it as `fill` runs from 0 to 1. While a finger is
 * on it the control swells a little, the way iOS controls lift under a
 * touch, and settles back when it lets go.
 */
function Scrubber({
  fill,
  index,
  onSelect,
}: {
  fill: MotionValue<number>;
  index: number;
  onSelect: (index: number) => void;
}) {
  const reduce = useReducedMotion();
  const last = VARIANTS.length - 1;
  const dragging = useRef(false);
  const current = useRef(index);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    current.current = index;
  }, [index]);

  // The track splits evenly by variant, so the slot under the finger never
  // moves while the dots resize.
  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const track = event.currentTarget;
    const box = track.getBoundingClientRect();
    const style = getComputedStyle(track);
    const inset =
      parseFloat(style.paddingLeft) * (box.width / track.offsetWidth || 1);
    const ratio = (event.clientX - box.left - inset) / (box.width - inset * 2);
    const next = Math.min(
      last,
      Math.max(0, Math.floor(ratio * VARIANTS.length)),
    );
    if (next !== current.current) {
      current.current = next;
      onSelect(next);
    }
  };

  const press = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    setPressed(true);
    pick(event);
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

  const variant = VARIANTS[index]!;
  // From a dot at the pill's left end (0) to the whole pill (1).
  const clip = useTransform(
    fill,
    (v) => `inset(0 ${(1 - v) * (PILL - DOT)}px 0 0 round 999px)`,
  );

  return (
    <m.div
      animate={{ scale: pressed && !reduce ? PRESS_SCALE : 1 }}
      aria-label="Row variant"
      aria-valuemax={VARIANTS.length}
      aria-valuemin={1}
      aria-valuenow={index + 1}
      aria-valuetext={`${variant.slot} ${variant.type.toLowerCase()}, ${index + 1} of ${VARIANTS.length}`}
      className={styles.scrub}
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
      {VARIANTS.map((item, i) => (
        <m.span
          key={`${item.slot}-${item.type}`}
          animate={{ width: i === index ? PILL : DOT }}
          className={styles.dot}
          initial={false}
          transition={reduce ? { duration: 0 } : SETTLE}
        >
          <m.span
            animate={{ opacity: i === index ? 1 : 0 }}
            className={styles.ink}
            initial={false}
            style={i === index ? { clipPath: clip } : undefined}
            transition={reduce ? { duration: 0 } : SETTLE}
          />
        </m.span>
      ))}
    </m.div>
  );
}

/**
 * The wallet's list row in each of its configurations, one at a time: each
 * arrives out of a blur as the last one leaves, an inspector's overlay
 * names the part that makes it that variant, and a scrubber at the foot
 * moves between them.
 */
export function RowConfigsPrimitive() {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const playing = usePlaying(root);
  const fill = useMotionValue(1);
  const shown = useRef(index);

  // Playing, the current pill fills over the interval and then moves on; a
  // new pill starts from its dot. Held, it fills to full, and when let go it
  // shrinks back to the dot and starts again. Time passes linearly, so the
  // fill does too.
  useEffect(() => {
    const moved = shown.current !== index;
    shown.current = index;
    if (!playing) {
      if (moved) fill.set(1);
      const hold = animate(fill, 1, { duration: 0.2, ease: "easeOut" });
      return () => hold.stop();
    }
    if (moved) fill.set(0);
    let stopped = false;
    let run = animate(fill, 0, {
      duration: fill.get() > 0 ? 0.25 : 0,
      ease: "easeOut",
    });
    run.then(() => {
      if (stopped) return;
      run = animate(fill, 1, {
        duration: INTERVAL / 1000,
        ease: "linear",
        onComplete: () => {
          if (!stopped) setIndex((i) => (i + 1) % VARIANTS.length);
        },
      });
    });
    return () => {
      stopped = true;
      run.stop();
    };
  }, [playing, index, fill]);

  const variant = VARIANTS[index]!;

  return (
    <div className={styles.root} ref={root}>
      <FitStage className="anyday-app" gutter={12}>
        <div
          className="relative"
          style={{
            height: ROW_HEIGHT + NOTE_SLOT * 2,
            fontFamily: "var(--font-inter)",
          }}
        >
          <AnimatePresence initial={false}>
            <m.div
              key={index}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="absolute inset-x-0"
              exit={
                reduce
                  ? { opacity: 0, transition: EXIT }
                  : {
                      opacity: 0,
                      scale: 0.98,
                      filter: "blur(4px)",
                      transition: EXIT,
                    }
              }
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, filter: "blur(4px)" }
              }
              // The row's box is centred over the card, then lifted a touch.
              style={{ top: NOTE_SLOT - OPTICAL_LIFT }}
              transition={ENTER}
            >
              <Frame variant={variant} />
            </m.div>
          </AnimatePresence>
        </div>
      </FitStage>
      <Scrubber fill={fill} index={index} onSelect={setIndex} />
    </div>
  );
}
