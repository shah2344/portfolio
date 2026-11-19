"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import NumberFlow from "@number-flow/react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

type Pocket = {
  name: string;
  tile: { kind: "emoji"; emoji: string } | { kind: "photo"; src: string };
  goal: number;
  /** The share of each autosave this pocket takes while it has room. */
  share: number;
};

/* As designed (Figma 112:4040): the car pocket about a quarter of the way
   to its goal, Christmas already met. */
const POCKETS: Pocket[] = [
  {
    name: "Car payment",
    tile: { kind: "emoji", emoji: "\u{1F698}" },
    goal: 562.5,
    share: 0.6,
  },
  {
    name: "Christmas 2026",
    tile: {
      kind: "photo",
      src: "/media/craft/components/app/pockets/christmas.webp",
    },
    goal: 50,
    share: 0.4,
  },
];

const START = [160.11, 50];
/** Every pocket's balance, the two shown included. */
const POCKETS_TOTAL = 500;
/** The wallet's spending money, as the balance card opens on. */
const SPENDABLE = 1248.5;
/** Each shift's tips, paid out one after another. */
const PAYOUTS = [184, 212.4, 168.2, 196.75, 225.3];
/** The part of every payout that autosave moves into pockets. */
const AUTOSAVE = 0.1;

const SPRING = { type: "spring", duration: 0.45, bounce: 0 } as const;
const EASE = [0.2, 0, 0, 1] as const;
/** Money on the move: the saved share, the arrow, what each pocket gains. */
const FLOW = "var(--blue)";
const CURRENCY = {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;
const CARD_SHADOW = "0 0 20px rgba(0, 0, 0, 0.02)";
const RAISED =
  "0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.05)";
const T13 = { fontSize: "0.8125rem", lineHeight: "1.125rem" };
const T17 = { fontSize: "1.0625rem", lineHeight: "1.375rem" };

const cents = (value: number) => Math.round(value * 100) / 100;
const money = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Splits one autosave across the pockets; a full pocket passes its share
    on to the ones that still have room. */
function split(balances: number[], saved: number) {
  const open = POCKETS.map((pocket, index) => balances[index]! < pocket.goal);
  const weight = POCKETS.reduce(
    (sum, pocket, index) => sum + (open[index] ? pocket.share : 0),
    0,
  );
  return POCKETS.map((pocket, index) => {
    if (!open[index] || weight === 0) return 0;
    const room = pocket.goal - balances[index]!;
    return cents(Math.min(room, (saved * pocket.share) / weight));
  });
}

/** A delta that rises off the figure it adds to, then fades. */
function Gain({
  amount,
  beat,
  align = "end",
}: {
  amount: number;
  beat: number;
  align?: "start" | "end";
}) {
  return (
    <AnimatePresence>
      {beat > 0 && amount > 0 && (
        <m.span
          animate={{
            opacity: [0, 1, 1, 0],
            y: [6, 0, 0, -4],
            filter: ["blur(4px)", "blur(0px)", "blur(0px)", "blur(2px)"],
          }}
          className={`pointer-events-none absolute font-semibold whitespace-nowrap tabular-nums ${align === "end" ? "right-0" : "left-0"}`}
          key={beat}
          style={{ ...T13, bottom: "100%", marginBottom: 2, color: FLOW }}
          transition={{ duration: 2.2, times: [0, 0.15, 0.75, 1], ease: EASE }}
        >
          +{money(amount)}
        </m.span>
      )}
    </AnimatePresence>
  );
}

const ICONS = "/media/craft/components/app/icons";

/** A white icon cut from one of the app's SVGs, at its own 24px size. */
function MaskIcon({ src, rotate = 0 }: { src: string; rotate?: number }) {
  return (
    <span
      aria-hidden
      className="block h-6 w-6"
      style={{
        backgroundColor: "currentColor",
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
    />
  );
}

function JarIcon() {
  return (
    <svg aria-hidden fill="none" height="24" viewBox="0 0 24 24" width="24">
      <path
        d="M8 3h8M9 3v2.5L6.6 8.4A3 3 0 0 0 6 10.2V18a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-7.8a3 3 0 0 0-.6-1.8L15 5.5V3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 11.5v5M10 14h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/* The diagram's frame, in points: the payout over the autosave hub, which
   sends its two shares out to either side. */
const W = 320;
const NODE = 48;
const TOP = { x: W / 2, y: 26 };
const HUB = { x: W / 2, y: 142 };
const LEFT = { x: 58, y: HUB.y };
const RIGHT = { x: W - 58, y: HUB.y };
const DOTS = "var(--fills-primary)";

function Node({
  at,
  fill,
  color,
  ring = false,
  children,
}: {
  at: { x: number; y: number };
  fill: string;
  color: string;
  ring?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className="absolute flex items-center justify-center rounded-full"
      style={{
        left: at.x - NODE / 2,
        top: at.y - NODE / 2,
        width: NODE,
        height: NODE,
        backgroundColor: fill,
        color,
        boxShadow: ring
          ? "0 0 0 1px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.06)"
          : "inset 0 0 0 0.5px rgba(255, 255, 255, 0.2)",
      }}
    >
      {children}
    </span>
  );
}

/** A node's white label pill, tucked under its circle as in the reference. */
function Tag({
  at,
  children,
}: {
  at: { x: number; y: number };
  children: React.ReactNode;
}) {
  return (
    <span
      className="absolute flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold whitespace-nowrap text-[var(--labels-primary)] uppercase"
      style={{
        ...T13,
        left: at.x,
        top: at.y + NODE / 2 - 6,
        letterSpacing: "0.02em",
        boxShadow: RAISED,
      }}
    >
      {children}
    </span>
  );
}

/** Money moving along a dotted path, once per payout. */
function Travel({
  from,
  to,
  color,
  delay,
  beat,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  delay: number;
  beat: number;
}) {
  if (beat === 0) return null;
  return (
    <m.span
      animate={{
        x: [0, to.x - from.x],
        y: [0, to.y - from.y],
        opacity: [0, 1, 1, 0],
        scale: [0.6, 1, 1, 0.6],
      }}
      aria-hidden
      className="absolute h-2 w-2 rounded-full"
      key={beat}
      style={{ left: from.x - 4, top: from.y - 4, backgroundColor: color }}
      transition={{
        duration: 0.7,
        delay,
        ease: EASE,
        opacity: { duration: 0.7, delay, times: [0, 0.15, 0.85, 1] },
        scale: { duration: 0.7, delay, times: [0, 0.15, 0.85, 1] },
      }}
    />
  );
}

/** A share's running total under its tag, with what this payout added. */
function Total({
  at,
  value,
  added,
  beat,
}: {
  at: { x: number; y: number };
  value: number;
  added: number;
  beat: number;
}) {
  return (
    <span
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{ left: at.x, top: at.y + NODE / 2 + 30 }}
    >
      <span className="relative">
        <Gain amount={added} beat={beat} />
        <span
          className="font-semibold text-[var(--labels-primary)]"
          style={T17}
        >
          <NumberFlow format={CURRENCY} value={cents(value)} />
        </span>
      </span>
    </span>
  );
}

/** Where a payout goes: down to autosave, then out to each share. */
function SplitDiagram({
  payout,
  kept,
  saved,
  spendable,
  pockets,
  beat,
}: {
  payout: number;
  kept: number;
  saved: number;
  spendable: number;
  pockets: number;
  beat: number;
}) {
  const below = (at: { x: number; y: number }) => at.y + NODE / 2 + 20;
  return (
    <div
      aria-label={`A ${money(payout)} tips payout: ${money(kept)} stays spendable, ${money(saved)} goes to pockets`}
      className="relative shrink-0"
      role="img"
      style={{ width: W, height: 248 }}
    >
      <svg
        aria-hidden
        className="absolute inset-0"
        fill="none"
        height="248"
        viewBox={`0 0 ${W} 248`}
        width={W}
      >
        <g
          stroke={DOTS}
          strokeDasharray="0.1 6"
          strokeLinecap="round"
          strokeWidth="2.5"
        >
          <path d={`M${TOP.x} ${below(TOP)}V${HUB.y - NODE / 2 - 8}`} />
          <path
            d={`M${HUB.x - NODE / 2 - 8} ${HUB.y}H${LEFT.x + NODE / 2 + 8}`}
          />
          <path
            d={`M${HUB.x + NODE / 2 + 8} ${HUB.y}H${RIGHT.x - NODE / 2 - 8}`}
          />
        </g>
      </svg>

      <Travel
        beat={beat}
        color="var(--green)"
        delay={0.25}
        from={{ x: TOP.x, y: below(TOP) }}
        to={{ x: HUB.x, y: HUB.y - NODE / 2 - 8 }}
      />
      <Travel
        beat={beat}
        color="var(--labels-primary)"
        delay={0.9}
        from={{ x: HUB.x - NODE / 2 - 8, y: HUB.y }}
        to={{ x: LEFT.x + NODE / 2 + 8, y: LEFT.y }}
      />
      <Travel
        beat={beat}
        color={FLOW}
        delay={0.9}
        from={{ x: HUB.x + NODE / 2 + 8, y: HUB.y }}
        to={{ x: RIGHT.x - NODE / 2 - 8, y: RIGHT.y }}
      />

      <Node at={TOP} color="#fff" fill="var(--green)">
        <MaskIcon src={`${ICONS}/nav/wallet-active.svg`} />
      </Node>
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={{ opacity: 1, filter: "blur(0px)" }}
          className="absolute inset-x-0"
          exit={{
            opacity: 0,
            filter: "blur(4px)",
            transition: { duration: 0.15 },
          }}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          key={beat}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <Tag at={TOP}>
            Tips payout
            <span
              className="tabular-nums"
              style={{ color: "var(--color-green-amount)" }}
            >
              +{money(payout)}
            </span>
          </Tag>
        </m.span>
      </AnimatePresence>

      <Node at={HUB} color="var(--labels-primary)" fill="#fff" ring>
        <MaskIcon rotate={180} src={`${ICONS}/wallet/send.svg`} />
      </Node>

      <Node at={LEFT} color="#fff" fill="var(--labels-primary)">
        <MaskIcon src={`${ICONS}/nav/card-active.svg`} />
      </Node>
      <Tag at={LEFT}>Spendable 90%</Tag>
      <Total added={kept} at={LEFT} beat={beat} value={spendable} />

      <Node at={RIGHT} color="#fff" fill={FLOW}>
        <JarIcon />
      </Node>
      <Tag at={RIGHT}>Pockets 10%</Tag>
      <Total added={saved} at={RIGHT} beat={beat} value={pockets} />

      {/* The pockets' tenth carried on to the card beside. */}
      <svg
        aria-hidden
        className="pockets-arrow absolute"
        fill="none"
        height="12"
        style={{ left: RIGHT.x + NODE / 2 + 8, top: RIGHT.y - 6 }}
        viewBox="0 0 28 12"
        width="28"
      >
        <path
          d="M1 6h24"
          stroke={FLOW}
          strokeDasharray="0.1 5"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <path
          d="m22 2.5 3.5 3.5-3.5 3.5"
          stroke={FLOW}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

/**
 * Where a tips payout goes with autosave on, drawn as a little map: the
 * payout drops into the autosave hub, which sends nine tenths out to
 * spendable and one tenth to pockets, a dot of money travelling each dotted
 * path. An arrow carries that tenth on to the pockets card (Figma 112:4040),
 * where it divides between the goals and their amounts and bars climb. A
 * pocket that meets its goal hands its share to the others. Left alone, a
 * payout lands every few seconds; once every goal is met the pockets start
 * over.
 */
export function PocketsPrimitive() {
  const root = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [balances, setBalances] = useState(START);
  const [gains, setGains] = useState<number[]>([0, 0]);
  const [spendable, setSpendable] = useState(SPENDABLE);

  const payout = PAYOUTS[beat % PAYOUTS.length]!;
  const saved = cents(payout * AUTOSAVE);
  const kept = cents(payout - saved);
  const pockets =
    POCKETS_TOTAL +
    balances.reduce((sum, value, index) => sum + value - START[index]!, 0);

  useAutoplay(
    root,
    () => {
      const next = beat + 1;
      const amount = PAYOUTS[next % PAYOUTS.length]!;
      const toPockets = cents(amount * AUTOSAVE);
      const from = POCKETS.every(
        (pocket, index) => balances[index]! >= pocket.goal,
      )
        ? START
        : balances;
      const added = split(from, toPockets);
      setBeat(next);
      setGains(added);
      setBalances(from.map((value, index) => cents(value + added[index]!)));
      setSpendable((value) => cents(value + amount - toPockets));
    },
    { interval: 3200, delay: 1400 },
  );

  return (
    <div className="pockets-canvas">
      <FitStage className="anyday-app" gutter={28} inset={28}>
        <div
          className="flex flex-wrap items-center justify-center gap-x-9 gap-y-8"
          ref={root}
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <SplitDiagram
            beat={beat}
            kept={kept}
            payout={payout}
            pockets={pockets}
            saved={saved}
            spendable={spendable}
          />

          {/* The pockets themselves, as designed. */}
          <section
            aria-label="Pockets"
            className="flex w-[345px] max-w-full shrink-0 flex-col overflow-hidden rounded-[20px] bg-white"
            style={{ border: "2px solid #ffffff", boxShadow: CARD_SHADOW }}
          >
            <h3 className="m-0 px-5 pt-5" style={T17}>
              <span
                className="text-[var(--labels-primary)]"
                style={{ fontWeight: 700, letterSpacing: "-0.01375rem" }}
              >
                Pockets
              </span>
              <span
                className="text-[var(--labels-secondary)]"
                style={{ fontWeight: 500 }}
              >
                <span aria-hidden className="mx-1.5">
                  •
                </span>
                <NumberFlow format={CURRENCY} value={cents(pockets)} />
              </span>
            </h3>
            <ul className="m-0 flex list-none flex-col gap-5 p-5">
              {POCKETS.map((pocket, index) => {
                const balance = balances[index]!;
                const progress = Math.min(1, balance / pocket.goal);
                return (
                  <li className="flex items-center gap-4" key={pocket.name}>
                    {pocket.tile.kind === "emoji" ? (
                      <span
                        aria-hidden
                        className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
                        style={{
                          backgroundColor: "var(--fills-tertiary)",
                          fontSize: "1.375rem",
                          lineHeight: 1,
                        }}
                      >
                        {/* The emoji's own colour, blurred, glows behind it. */}
                        <span
                          className="absolute"
                          style={{ filter: "blur(10px)", opacity: 0.4 }}
                        >
                          {pocket.tile.emoji}
                        </span>
                        <span className="relative">{pocket.tile.emoji}</span>
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-[12px] object-cover"
                        draggable={false}
                        src={pocket.tile.src}
                      />
                    )}
                    <span
                      className="min-w-0 flex-1 truncate font-medium text-[var(--labels-primary)]"
                      style={{ ...T17, letterSpacing: "-0.01375rem" }}
                    >
                      {pocket.name}
                    </span>
                    <div className="relative flex shrink-0 flex-col items-end gap-1">
                      <Gain amount={gains[index]!} beat={beat} />
                      <span
                        className="font-semibold text-[var(--labels-primary)]"
                        style={T17}
                      >
                        <NumberFlow format={CURRENCY} value={balance} />
                      </span>
                      <span
                        aria-label={`${Math.round(progress * 100)}% of goal`}
                        className="block h-1 w-10 overflow-hidden rounded-full"
                        role="img"
                        style={{ backgroundColor: "var(--fills-tertiary)" }}
                      >
                        <m.span
                          animate={{ scaleX: progress }}
                          className="block h-full w-full rounded-full"
                          initial={false}
                          style={{
                            backgroundColor: "var(--green)",
                            transformOrigin: "left center",
                          }}
                          transition={SPRING}
                        />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </FitStage>
    </div>
  );
}
