"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { GradientAvatar } from "@outpacelabs/avatars";

import { characterBackgroundColors } from "../../../character/backgrounds";
import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

const BASE = "/media/craft/components/app/merchants";
const ZELLE = "/media/craft/components/app/icons/brands/zelle.svg";
const GREEN = "color(display-p3 0.204 0.78 0.345)";

export type Avatar =
  | { kind: "logo"; src: string }
  | { kind: "payout" }
  | { kind: "zelle" }
  /** Another user: a gradient profile seed from the character palettes. */
  | { kind: "contact"; seed: number };

type Entry = {
  avatar: Avatar;
  title: string;
  amount: string;
  credit?: boolean;
};

const logo = (src: string): Avatar => ({
  kind: "logo",
  src: `${BASE}/${src}.svg`,
});

/* A server's week in the wallet: the tips paid out after each shift, a
   coworker's share sent on, money from friends over Zelle, a refund, and
   the coffee, rides and groceries in between. */
const ENTRIES: Entry[] = [
  { avatar: logo("starbucks"), title: "Starbucks", amount: "$6.45" },
  {
    avatar: { kind: "payout" },
    title: "Tips payout",
    amount: "+$184.00",
    credit: true,
  },
  {
    avatar: { kind: "contact", seed: 36 },
    title: "Tip out to Alex",
    amount: "$25.00",
  },
  { avatar: logo("uber"), title: "Uber", amount: "$18.20" },
  {
    avatar: { kind: "zelle" },
    title: "Zelle from Jordan",
    amount: "+$40.00",
    credit: true,
  },
  {
    avatar: logo("categories/grocery"),
    title: "Whole Foods",
    amount: "$61.08",
  },
  {
    avatar: logo("categories/reversal"),
    title: "DoorDash refund",
    amount: "+$12.99",
    credit: true,
  },
  {
    avatar: { kind: "payout" },
    title: "Tips payout",
    amount: "+$212.40",
    credit: true,
  },
  { avatar: logo("lyft"), title: "Lyft", amount: "$12.75" },
  {
    avatar: { kind: "contact", seed: 22 },
    title: "Tip out from Sam",
    amount: "+$30.00",
    credit: true,
  },
  { avatar: logo("categories/atm"), title: "ATM withdrawal", amount: "$60.00" },
];

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const MONTH_DAYS = [30, 31, 31, 28, 31, 30];

/* Time only moves forward: about two entries a day from Nov 14, however
   many times the list wraps. Formatted by hand so server and browser agree. */
function stamp(step: number) {
  let day = 14 + Math.floor(step / 2);
  let month = 0;
  while (day > (MONTH_DAYS[month % MONTH_DAYS.length] ?? 30)) {
    day -= MONTH_DAYS[month % MONTH_DAYS.length] ?? 30;
    month++;
  }
  return `${MONTHS[month % MONTHS.length]} ${day}`;
}

export function EntryAvatar({ avatar }: { avatar: Avatar }) {
  const ring = { boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.2)" };
  if (avatar.kind === "logo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-10 w-10 shrink-0 rounded-full"
        src={avatar.src}
        style={{ outline: "1px solid rgba(0, 0, 0, 0.06)", outlineOffset: -1 }}
      />
    );
  }
  if (avatar.kind === "payout") {
    return (
      <svg className="h-10 w-10 shrink-0" fill="none" viewBox="0 0 40 40">
        <circle cx="20" cy="20" fill="#fff" r="20" />
        <path
          clipRule="evenodd"
          d="M0 20C0 8.954 8.954 0 20 0s20 8.954 20 20-8.954 20-20 20S0 31.046 0 20M20 7a2 2 0 0 1 2 2v1.247c1.608.407 3.027 1.302 3.952 2.581a2 2 0 0 1-3.242 2.344C22.276 14.57 21.307 14 20 14h-.556C17.654 14 17 15.09 17 15.556v.152c0 .395.298 1.057 1.305 1.46l4.875 1.95c2.134.854 3.82 2.76 3.82 5.174 0 2.946-2.354 4.937-5 5.526V31a2 2 0 1 1-4 0v-1.247c-1.608-.407-3.027-1.302-3.952-2.581a2 2 0 0 1 3.242-2.344C17.724 25.429 18.693 26 20 26h.365C22.26 26 23 24.842 23 24.292c0-.395-.298-1.057-1.305-1.46l-4.875-1.95c-2.134-.854-3.82-2.76-3.82-5.174v-.152c0-2.928 2.379-4.878 5-5.41V9a2 2 0 0 1 2-2"
          fill={GREEN}
          fillRule="evenodd"
        />
      </svg>
    );
  }
  if (avatar.kind === "zelle") {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "#6D1ED4", ...ring }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-6 w-6"
          src={ZELLE}
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </span>
    );
  }
  return (
    <GradientAvatar
      className="shrink-0"
      colors={characterBackgroundColors(avatar.seed)}
      p3
      seed={avatar.seed}
      size={40}
      style={{
        display: "block",
        outline: "1px solid rgba(0, 0, 0, 0.06)",
        outlineOffset: -1,
      }}
    />
  );
}

const VISIBLE = 3;
const ROW_HEIGHT = 72;
const GAP = 8;
// No bounce: the arrival scales up out of a blur and settles, the leaver
// scales down into one, softer and quicker than the entrance, drifting down
// with the cards behind it so the one taking its slot never lands on it.
const ENTER = { type: "spring", duration: 0.4, bounce: 0 } as const;
const LEAVE = { duration: 0.2, ease: "easeOut" } as const;

/**
 * The wallet's recent activity (components/ui/transaction-row.tsx): its
 * avatar (a merchant, a payout, Zelle, a coworker), what it was, the date,
 * and the amount, each on its own white card. Left alone, a new one scales
 * in at the top now and then and carries the cards below it down; the oldest
 * scales away at the foot.
 */
export function ActivityPrimitive() {
  const [head, setHead] = useState(0);
  const root = useRef<HTMLUListElement>(null);

  useAutoplay(root, () => setHead((index) => index + 1), {
    interval: 2200,
    delay: 1200,
  });

  // The newest first: each arrival is the next entry, and the keys stay
  // unique as the list wraps.
  const rows = Array.from({ length: VISIBLE }, (_, offset) => {
    const step = head - offset;
    const index = ((step % ENTRIES.length) + ENTRIES.length) % ENTRIES.length;
    return {
      key: step,
      entry: ENTRIES[index] ?? ENTRIES[0]!,
      date: stamp(step),
    };
  });

  return (
    <FitStage className="anyday-app" gutter={36}>
      <ul
        className="relative m-0 flex list-none flex-col p-0"
        ref={root}
        style={{
          fontFamily: "var(--font-inter)",
          gap: GAP,
          height: VISIBLE * ROW_HEIGHT + (VISIBLE - 1) * GAP,
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map(({ key, entry, date }) => (
            <m.li
              key={key}
              layout="position"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.94,
                filter: "blur(4px)",
                transition: LEAVE,
              }}
              transition={ENTER}
              className="flex shrink-0 items-center gap-3 rounded-[20px] px-4"
              style={{
                height: ROW_HEIGHT,
                backgroundColor: "var(--card-background)",
                boxShadow:
                  "0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)",
              }}
            >
              <EntryAvatar avatar={entry.avatar} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className="truncate text-[var(--labels-primary)]"
                  style={{
                    fontSize: "1.0625rem",
                    lineHeight: "1.375rem",
                    letterSpacing: "-0.01375rem",
                    fontWeight: 500,
                  }}
                >
                  {entry.title}
                </span>
                <span
                  className="truncate text-[var(--labels-secondary)]"
                  style={{ fontSize: "0.9375rem", lineHeight: "1.25rem" }}
                >
                  {date}
                </span>
              </div>
              <span
                className="font-inter-amounts shrink-0"
                style={{
                  fontSize: "1.0625rem",
                  lineHeight: "1.375rem",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: entry.credit
                    ? "color(display-p3 0.204 0.68 0.345)"
                    : "var(--labels-primary)",
                }}
              >
                {entry.amount}
              </span>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </FitStage>
  );
}
