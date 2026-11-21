"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
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
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { FitStage } from "../../fit-stage";
import "../app-product.css";
import { PrimaryButton } from "../ui/primary-button";
import styles from "./row-configs.module.css";
import { ToggleSwitch } from "./toggle-switch";

const ICONS = "/media/craft/components/app/icons/rows";

/** Configurations are one height, as the activity rows below are; only
    wrapped text sets its own. */
const ROW_HEIGHT = 72;
/** Room under the row for the leader and its label. */
const NOTE_SLOT = 52;
/** How long each step of a family stays before the next, and how long the
    last one holds before the next family, a beat longer. */
const STEP = 2400;
const INTERVAL = 3200;
/** The row's side inset when no leading part sets its own. */
const INSET = 20;
/** The row's gap between its parts. */
const GAP = 12;
/** The selection's space around the part it marks. */
const PAD = 2;
/** The readout's distance under the row. */
const NOTE_GAP = 10;

/** The activity rows' own card shadow. */
const ROW_SHADOW =
  "0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)";
/** Figma's category swatch (#32ADE6), in Display P3. */
const CATEGORY = "color(display-p3 0.35 0.669 0.881)";
/** Figma's person colour (#5F5AFA), apart from the product's own purple. */
const PERSON = "#5f5afa";
/** The overlay's ink: an inspector blue, apart from the product's own. */
const INK = "color(display-p3 0.2 0.45 1)";
/** Lifts the row a few points above the card's middle, where it reads as
    centred: the eye puts the middle a little higher than the geometry. */
const OPTICAL_LIFT = 4;

/** A family arrives with a spring and leaves quicker and smaller. */
const ENTER = { type: "spring", duration: 0.4, bounce: 0 } as const;
const EXIT = { duration: 0.15, ease: "easeOut" } as const;
const SETTLE = { type: "spring", duration: 0.3, bounce: 0 } as const;
/** Within a family the row reshapes around what changes: slots open and
    close, the row grows, and the selection follows. */
const MORPH = { type: "spring", duration: 0.45, bounce: 0 } as const;
const FOLLOW = { visualDuration: 0.4, bounce: 0 } as const;
const INSTANT = { duration: 0 } as const;
// The scrubber swells quickly under a press and settles back with a small
// give on release, since a finger has just pushed on it.
const PRESS_SCALE = 1.1;
// The scrubber's dot and the current variant's pill, in px.
const DOT = 6;
const PILL = 20;
/** Extra room between one family's dots and the next. */
const FAMILY_GAP = 10;
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

/** The Services category avatar: its cube on a wash of the same colour.
    The badge pops on and off, so the avatar under it can stay put. */
function Category({ badge = false }: { badge?: boolean }) {
  const reduce = useReducedMotion();
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
      <AnimatePresence initial={false}>
        {badge && (
          <m.span
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-0.5 -left-0.5 flex h-5 w-5 items-center justify-center"
            exit={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
            transition={reduce ? EXIT : MORPH}
          >
            <Glyph name="clock-badge" size={22.6667} />
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** A white glyph on a rounded tile of colour. */
function Tile({ color, icon }: { color: string; icon: string }) {
  return (
    <span
      className="flex rounded-[10px] p-1.5"
      style={{ backgroundColor: color }}
    >
      <Glyph name={icon} />
    </span>
  );
}

/** A person's initials on a wash of their colour, with a country flag. */
function Person({ initials }: { initials: string }) {
  return (
    <span className="relative flex shrink-0">
      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full">
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-16"
          style={{ backgroundColor: PERSON }}
        />
        <span
          className="relative text-[17px] leading-[22px] font-bold"
          style={{ color: PERSON }}
        >
          {initials}
        </span>
      </span>
      <span className="absolute -top-0.5 -left-0.5 flex h-5 w-5 items-center justify-center">
        <Glyph name="flag-india" size={18.1818} />
      </span>
    </span>
  );
}

/** An amount; as a credit its sign slides in and it turns green, while
    the figure itself holds still. */
function Amount({
  value,
  credit = false,
}: {
  value: string;
  credit?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <span
      className="font-inter-amounts relative flex text-[17px] leading-[22px] font-semibold tabular-nums transition-colors duration-300 ease-out"
      style={{ color: credit ? "var(--green)" : "var(--labels-primary)" }}
    >
      <AnimatePresence anchorX="right" initial={false} mode="popLayout">
        {credit && (
          <m.span
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : 6 }}
            initial={{ opacity: 0, x: reduce ? 0 : 6 }}
            transition={reduce ? EXIT : MORPH}
          >
            +
          </m.span>
        )}
      </AnimatePresence>
      <span>{value}</span>
    </span>
  );
}

function LocalToggle({ label }: { label: string }) {
  const [on, setOn] = useState(true);
  return <ToggleSwitch checked={on} label={label} onChange={setOn} />;
}

type Slot = "Leading" | "Trailing" | "Subtitle";

/** A leading or trailing part. Steps that share an id share the element,
    so it stays where it is while the rest of the row changes around it. */
type Piece = {
  id: string;
  node: ReactNode;
  /** A leading part's height, so the row's left inset can match the space
      above and below it. */
  size?: number;
};

type Variant = {
  /** Which part of the row the variant is about, and what it is. */
  slot: Slot;
  type: string;
  /** Plain text morphs from step to step; anything else holds still. */
  title: ReactNode;
  subtitle?: string;
  /** The subtitle's size: Footnote (13/19) unless Subheadline (15/20). */
  subheadline?: boolean;
  /** Lets the subtitle wrap over lines instead of truncating. */
  wrap?: boolean;
  /** A row taller than the rest, for wrapped text. */
  height?: number;
  leading?: Piece;
  trailing?: Piece;
};

/** The help question, its last word picked out as a link. */
function AvailablePay() {
  return (
    // A touch tighter, so the whole question fits the card's narrower row.
    <span className="font-normal tracking-[-0.02em]">
      Why don’t I have more available{" "}
      <span className="font-medium" style={{ color: "var(--blue)" }}>
        pay
      </span>
      ?
    </span>
  );
}

const chevron: Piece = {
  id: "chevron",
  node: <Glyph name="chevron-right" size={16} />,
};

/**
 * Every configuration of the wallet's list row, from its Figma component,
 * in families that each tell one row's story: every step changes one part,
 * and whatever else stays holds still, its text morphing where it has to
 * read differently. The content is the wallet's own.
 */
const FAMILIES: Variant[][] = [
  // The card's trailing accessory: a button, then an icon.
  [
    {
      slot: "Trailing",
      type: "Button",
      title: "Your card",
      subtitle: "•••• 4821",
      trailing: {
        id: "button",
        node: (
          <PrimaryButton className="h-[38px] px-4" tabIndex={-1}>
            Activate
          </PrimaryButton>
        ),
      },
    },
    {
      slot: "Trailing",
      type: "Icon",
      title: "Card details",
      subtitle: "•••• 4821",
      trailing: { id: "copy", node: <Glyph name="copy" /> },
    },
  ],
  // A settings row built up around its toggle: a subtitle, then an icon.
  [
    {
      slot: "Trailing",
      type: "Toggle",
      title: "Face ID",
      trailing: { id: "toggle", node: <LocalToggle label="Face ID" /> },
    },
    {
      slot: "Subtitle",
      type: "One line",
      title: "Face ID",
      subtitle: "Unlock with a glance",
      trailing: { id: "toggle", node: <LocalToggle label="Face ID" /> },
    },
    {
      slot: "Leading",
      type: "Icon",
      title: "Face ID",
      subtitle: "Unlock with a glance",
      leading: {
        id: "face-id",
        node: <Tile color="var(--green)" icon="face-id" />,
        size: 36,
      },
      trailing: { id: "toggle", node: <LocalToggle label="Face ID" /> },
    },
  ],
  // One payment settling: pending, then credited.
  [
    {
      slot: "Leading",
      type: "Icon with badge",
      title: "Riverside Grill",
      subtitle: "Tip-out · Pending",
      leading: { id: "category", node: <Category badge />, size: 44 },
      trailing: { id: "amount", node: <Amount value="$50" /> },
    },
    {
      slot: "Trailing",
      type: "Amount",
      title: "Riverside Grill",
      subtitle: "Tip-out",
      leading: { id: "category", node: <Category />, size: 44 },
      trailing: { id: "amount", node: <Amount credit value="$50" /> },
    },
  ],
  // A navigation row, its leading part swapped.
  [
    {
      slot: "Leading",
      type: "Logo",
      title: "Deposit cash",
      subtitle: "Add cash to your account",
      subheadline: true,
      leading: {
        id: "logo",
        node: <Glyph name="fey-logo" size={44} />,
        size: 44,
      },
      trailing: chevron,
    },
    {
      slot: "Leading",
      type: "Avatar with flag",
      title: "Priya Sharma",
      subtitle: "Account ending in ･･8923",
      subheadline: true,
      leading: { id: "person", node: <Person initials="PS" />, size: 44 },
      trailing: chevron,
    },
  ],
  // The same long subtitle, cut to one line, then wrapped in full as the
  // row grows to hold it.
  [
    {
      slot: "Subtitle",
      type: "Truncated",
      title: <AvailablePay />,
      subtitle:
        "There could be a few reasons for this. One of the following may apply to your situation…",
      subheadline: true,
    },
    {
      slot: "Subtitle",
      type: "Multiline",
      title: <AvailablePay />,
      subtitle:
        "There could be a few reasons for this. One of the following may apply to your situation…",
      subheadline: true,
      wrap: true,
      height: 104,
    },
  ],
];

type Step = Variant & { family: number; first: boolean; last: boolean };

const VARIANTS: Step[] = FAMILIES.flatMap((steps, family) =>
  steps.map((variant, i) => ({
    ...variant,
    family,
    first: i === 0,
    last: i === steps.length - 1,
  })),
);

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

/**
 * Sizes `slot` to fit `inner` on one axis, plus `extra` while it holds
 * anything. The first reading lands outright, so a slot that mounts at its
 * size doesn't animate into it; later changes ease. It writes the style
 * itself: under the card's lazily loaded Motion features, a value given to
 * an `m` element before they load is never applied, which left the first
 * row's subtitle and accessory slots stuck at 0.
 */
function useFit(
  slot: RefObject<HTMLElement | null>,
  inner: RefObject<HTMLElement | null>,
  axis: "width" | "height",
  reduce: boolean,
  extra = 0,
) {
  const size = useMotionValue(0);

  useLayoutEffect(() => {
    const outer = slot.current;
    const element = inner.current;
    if (!outer || !element) return;
    const read = () => {
      const value =
        axis === "width" ? element.offsetWidth : element.offsetHeight;
      return value ? value + extra : 0;
    };
    const write = (value: number) => {
      outer.style.setProperty(axis, `${value}px`);
    };
    const unsubscribe = size.on("change", write);
    let run: ReturnType<typeof animate> | undefined;
    let last = read();
    size.jump(last);
    write(last);
    const observer = new ResizeObserver(() => {
      const value = read();
      if (value === last) return;
      last = value;
      run?.stop();
      if (reduce) size.jump(value);
      else run = animate(size, value, MORPH);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      run?.stop();
      unsubscribe();
    };
  }, [slot, inner, axis, reduce, extra, size]);
}

/** How a part enters and leaves its slot. */
function swap(reduce: boolean, shift: { x?: number; y?: number }) {
  const away = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.92, filter: "blur(3px)", ...shift };
  return {
    initial: away,
    animate: { opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)" },
    exit: { ...away, transition: EXIT },
    transition: reduce ? EXIT : { ...MORPH, delay: 0.06 },
  } as const;
}

/**
 * A leading or trailing slot. It opens and closes to fit what it holds, gap
 * included, so the text beside it slides over rather than jumping; a new
 * part fades in as the old one leaves, and a kept one doesn't move.
 */
function Side({
  piece,
  side,
  annotate,
  reduce,
}: {
  piece?: Piece;
  side: "leading" | "trailing";
  annotate?: number;
  reduce: boolean;
}) {
  const slot = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useFit(slot, inner, "width", reduce, GAP);

  return (
    <span
      className={`flex shrink-0 items-center ${
        side === "trailing" ? "justify-end" : ""
      }`}
      ref={slot}
    >
      <span className="relative flex shrink-0 items-center" ref={inner}>
        {/* A leaving part keeps to its own edge while the slot resizes. */}
        <AnimatePresence
          anchorX={side === "trailing" ? "right" : "left"}
          initial={false}
          mode="popLayout"
        >
          {piece && (
            <m.span
              key={piece.id}
              className="flex"
              data-annotate={annotate}
              {...swap(reduce, { x: side === "leading" ? -6 : 6 })}
            >
              {piece.node}
            </m.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}

/** Where two strings stop agreeing, pulled back to the start of a word so
    letters don't regroup mid-word, unless one simply runs on from the other. */
function sharedPrefix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  if (n === a.length || n === b.length) return n;
  const space = a.lastIndexOf(" ", n - 1);
  return space < 0 ? 0 : space + 1;
}

const FADE_OUT = { duration: 0.18, ease: "easeOut" } as const;
const FADE_IN = { duration: 0.3, ease: "easeOut", delay: 0.06 } as const;

/**
 * Text that morphs rather than swapping: what the old and new strings share
 * stays exactly where it is, and only the rest crossfades. The old text
 * fades out over the new, its shared start hidden so nothing doubles up.
 */
function MorphText({
  text,
  truncate,
  reduce,
}: {
  text: string;
  truncate: boolean;
  reduce: boolean;
}) {
  const [morph, setMorph] = useState({
    text,
    from: null as string | null,
    id: 0,
  });
  if (morph.text !== text)
    setMorph({ text, from: morph.text, id: morph.id + 1 });

  const { from, id } = morph;
  const animated = from !== null && from !== text && !reduce;
  const kept = animated ? sharedPrefix(from, text) : text.length;

  return (
    <span className={`relative block ${truncate ? "truncate" : ""}`}>
      {text.slice(0, kept)}
      {kept < text.length && (
        <m.span
          key={`in-${id}`}
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          transition={FADE_IN}
        >
          {text.slice(kept)}
        </m.span>
      )}
      {animated && (
        <m.span
          key={`out-${id}`}
          animate={{ opacity: 0 }}
          aria-hidden="true"
          className={`pointer-events-none absolute top-0 left-0 ${
            truncate ? "whitespace-nowrap" : "right-0"
          }`}
          initial={{ opacity: 1 }}
          transition={FADE_OUT}
        >
          <span className="invisible">{from.slice(0, kept)}</span>
          {from.slice(kept)}
        </m.span>
      )}
    </span>
  );
}

/** How a line of text appears or goes: no scale, so it reads as the same
    line settling rather than a new one bouncing in. */
function fade(reduce: boolean) {
  const away = reduce
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(2px)", y: 2 };
  return {
    initial: away,
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { ...away, transition: EXIT },
    transition: reduce ? EXIT : { ...MORPH, delay: 0.06 },
  } as const;
}

/** The subtitle, its height easing open, closed, or onto more lines. */
function Subtitle({
  variant,
  annotate,
  reduce,
}: {
  variant: Variant;
  annotate?: number;
  reduce: boolean;
}) {
  const slot = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useFit(slot, inner, "height", reduce);
  const { subtitle, subheadline, wrap } = variant;

  return (
    <span className="flex flex-col" ref={slot}>
      <span className="relative flex flex-col" ref={inner}>
        <AnimatePresence initial={false} mode="popLayout">
          {subtitle && (
            <m.span
              key="subtitle"
              className={`mt-px max-w-full self-start text-[var(--labels-secondary)] ${
                subheadline
                  ? "text-[15px] leading-[20px]"
                  : "text-[13px] leading-[19px]"
              }`}
              data-annotate={annotate}
              {...fade(reduce)}
            >
              <MorphText reduce={reduce} text={subtitle} truncate={!wrap} />
            </m.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}

function Row({
  variant,
  step,
  height,
  reduce,
}: {
  variant: Variant;
  step: number;
  height: MotionValue<number>;
  reduce: boolean;
}) {
  const { slot, title, leading, trailing } = variant;
  const mark = (part: Slot) => (slot === part ? step : undefined);
  // A leading part sits as far from the left edge as from the top and
  // bottom; without one, the text keeps the row's usual inset.
  const inset = leading?.size ? (ROW_HEIGHT - leading.size) / 2 : INSET;

  return (
    <m.div
      className="flex items-center rounded-[20px] transition-[padding] duration-[450ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
      data-row=""
      style={{
        height,
        paddingLeft: inset,
        paddingRight: INSET,
        backgroundColor: "var(--card-background)",
        boxShadow: ROW_SHADOW,
      }}
    >
      <Side
        annotate={mark("Leading")}
        piece={leading}
        reduce={reduce}
        side="leading"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-spec-17 font-medium text-[var(--labels-primary)]">
          {typeof title === "string" ? (
            <MorphText reduce={reduce} text={title} truncate />
          ) : (
            <span className="block truncate">{title}</span>
          )}
        </span>
        <Subtitle
          annotate={mark("Subtitle")}
          reduce={reduce}
          variant={variant}
        />
      </span>
      <Side
        annotate={mark("Trailing")}
        piece={trailing}
        reduce={reduce}
        side="trailing"
      />
    </m.div>
  );
}

type Box = { x: number; y: number; width: number; height: number };
type BoxValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: MotionValue<number>;
  height: MotionValue<number>;
};

/**
 * The marked part's box: `place` it as the part is measured, and read the
 * `shown` box, which springs after it, so the selection glides from one
 * part to the next. The first placement lands without a glide.
 */
function useSelection(reduce: boolean) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const sx = useSpring(x, FOLLOW);
  const sy = useSpring(y, FOLLOW);
  const sWidth = useSpring(width, FOLLOW);
  const sHeight = useSpring(height, FOLLOW);

  return useMemo(() => {
    const raw = [x, y, width, height] as const;
    const springs = [sx, sy, sWidth, sHeight] as const;
    return {
      shown: reduce
        ? { x, y, width, height }
        : { x: sx, y: sy, width: sWidth, height: sHeight },
      place(box: Box, jump: boolean) {
        const values = [box.x, box.y, box.width, box.height];
        raw.forEach((value, i) => value.set(values[i]!));
        if (jump) springs.forEach((value, i) => value.jump(values[i]!));
      },
    };
  }, [reduce, x, y, width, height, sx, sy, sWidth, sHeight]);
}

/**
 * An inspector's overlay on the part of the row that makes it this
 * variant: a hairline bounding box with crop marks, a leader, and a mono
 * readout of the slot, its type and its size. Within a family it travels
 * with the change, resizing onto the next part as its size counts over.
 * It sits over the product rather than in it, so none of it borrows the
 * product's type or surfaces.
 */
function Note({
  variant,
  box,
  rowHeight,
}: {
  variant: Variant;
  box: BoxValues;
  rowHeight: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const label = useRef<HTMLSpanElement>(null);
  const labelHalf = useMotionValue(0);
  const stageWidth = useMotionValue(Infinity);

  // The readout centres on the leader, kept inside the stage.
  useLayoutEffect(() => {
    const element = label.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      labelHalf.set(element.offsetWidth / 2);
      stageWidth.set(parent.offsetWidth);
    });
    observer.observe(element);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [labelHalf, stageWidth]);

  const left = useTransform(box.x, (v) => v - PAD);
  const top = useTransform(box.y, (v) => v - PAD);
  const width = useTransform(box.width, (v) => v + PAD * 2);
  const height = useTransform(box.height, (v) => v + PAD * 2);
  const centre = useTransform(() => box.x.get() + box.width.get() / 2);
  const labelTop = useTransform(rowHeight, (v) => v + NOTE_GAP);
  const leaderTop = useTransform(
    () => box.y.get() + box.height.get() + PAD + 2,
  );
  const leaderHeight = useTransform(() =>
    Math.max(0, labelTop.get() - leaderTop.get() - 4),
  );
  const dotTop = useTransform(labelTop, (v) => v - 4);
  const readoutTop = useTransform(labelTop, (v) => v + 2);
  const labelLeft = useTransform(() => {
    const half = labelHalf.get();
    return Math.min(
      Math.max(centre.get(), half),
      Math.max(half, stageWidth.get() - half),
    );
  });
  const shownWidth = useTransform(box.width, (v) => Math.round(v));
  const shownHeight = useTransform(box.height, (v) => Math.round(v));

  const mark = "absolute h-[5px] w-[5px]";
  const edge = `1px solid ${INK}`;
  const name = `${variant.slot}/${variant.type}`;

  return (
    <m.div
      animate={{ opacity: 1 }}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      style={{ fontFamily: "var(--site-font-mono)" }}
      transition={{ duration: 0.15, ease: "easeOut", delay: 0.18 }}
    >
      <m.span className="absolute" style={{ left, top, width, height }}>
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
        className="absolute w-px -translate-x-1/2"
        style={{
          left: centre,
          top: leaderTop,
          height: leaderHeight,
          backgroundColor: INK,
          opacity: 0.6,
        }}
      />
      <m.span
        className="absolute h-[3px] w-[3px] -translate-x-1/2"
        style={{ left: centre, top: dotTop, backgroundColor: INK }}
      />
      <m.span
        className="absolute flex -translate-x-1/2 items-baseline gap-1.5 text-[11px] leading-[14px] tracking-[0.06em] whitespace-nowrap uppercase"
        ref={label}
        style={{ left: labelLeft, top: readoutTop, color: INK }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={name}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -3 }}
            initial={{ opacity: 0, y: reduce ? 0 : 3 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {variant.slot}
            <span style={{ opacity: 0.45 }}> / </span>
            {variant.type}
          </m.span>
        </AnimatePresence>
        <span className="tabular-nums" style={{ opacity: 0.5 }}>
          <m.span>{shownWidth}</m.span>×<m.span>{shownHeight}</m.span>
        </span>
      </m.span>
    </m.div>
  );
}

/**
 * One family's row and its overlay. The row stays mounted through the
 * family's steps; the overlay finds the marked part each frame while the
 * row reshapes, so it tracks the part as it moves.
 */
function Frame({ variant, step }: { variant: Step; step: number }) {
  const reduce = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const target = variant.height ?? ROW_HEIGHT;
  const rowHeight = useMotionValue(target);
  // A taller row grows out from the stage's middle, lifted a touch.
  const y = useTransform(
    rowHeight,
    (v) => NOTE_SLOT - OPTICAL_LIFT - (v - ROW_HEIGHT) / 2,
  );
  const frameHeight = useTransform(rowHeight, (v) => v + NOTE_SLOT);
  const selection = useSelection(reduce);
  const placed = useRef(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const run = animate(rowHeight, target, reduce ? INSTANT : MORPH);
    return () => run.stop();
  }, [rowHeight, target, reduce]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const until = performance.now() + 900;
    const track = () => {
      const part = element.querySelector<HTMLElement>(
        `[data-annotate="${step}"]`,
      );
      if (part) {
        selection.place(boxWithin(part, element), !placed.current);
        if (!placed.current) {
          placed.current = true;
          setShown(true);
        }
      }
      if (performance.now() < until) frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [step, selection]);

  return (
    <m.div className="relative" ref={root} style={{ y, height: frameHeight }}>
      <Row height={rowHeight} reduce={reduce} step={step} variant={variant} />
      {shown && (
        <Note box={selection.shown} rowHeight={rowHeight} variant={variant} />
      )}
    </m.div>
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
 * A segmented scrubber pinned to the card's foot, one dot per variant, set
 * in groups by family; the current dot stretches into a black pill and its neighbours make room.
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

  // The dot nearest the finger is the one shown. Growing into the pill
  // only pushes its neighbours further from the finger, so the choice
  // holds steady while the dots resize, family gaps and all.
  const pick = (event: PointerEvent<HTMLDivElement>) => {
    let next = 0;
    let nearest = Infinity;
    Array.from(event.currentTarget.children).forEach((dot, i) => {
      const box = dot.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (box.left + box.width / 2));
      if (distance < nearest) {
        nearest = distance;
        next = i;
      }
    });
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
          style={item.first && i > 0 ? { marginLeft: FAMILY_GAP } : undefined}
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
 * The wallet's list row in each of its configurations, a family at a time:
 * within a family the row stays and reshapes around the part that changes,
 * an inspector's overlay following that part; between families one row
 * arrives out of a blur as the last leaves. A scrubber at the foot moves
 * between them.
 */
export function RowConfigsPrimitive() {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const playing = usePlaying(root);
  const fill = useMotionValue(1);
  const shown = useRef(index);

  // Playing, the current pill fills over the step and then moves on; a
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
    const duration = (VARIANTS[index]!.last ? INTERVAL : STEP) / 1000;
    let stopped = false;
    let run = animate(fill, 0, {
      duration: fill.get() > 0 ? 0.25 : 0,
      ease: "easeOut",
    });
    run.then(() => {
      if (stopped) return;
      run = animate(fill, 1, {
        duration,
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
              key={variant.family}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="absolute inset-x-0 top-0"
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
              transition={ENTER}
            >
              <Frame step={index} variant={variant} />
            </m.div>
          </AnimatePresence>
        </div>
      </FitStage>
      <Scrubber fill={fill} index={index} onSelect={setIndex} />
    </div>
  );
}
