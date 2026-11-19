"use client";

import { AnimatePresence, m } from "motion/react";
import { useId, useRef, useState, type ReactNode } from "react";

import { FitStage } from "@/components/home/component-grid/fit-stage";
import { useAutoplay } from "@/components/home/component-grid/use-autoplay";
import {
  EntryAvatar,
  type Avatar,
} from "@/components/home/component-grid/app/primitives/activity";
import { ToggleSwitch } from "@/components/home/component-grid/app/primitives/toggle-switch";
import "@/components/home/component-grid/app/app-product.css";

/* --- Shared data and parts ---------------------------------------------- */

type Category = "Payout" | "Purchase" | "Zelle" | "Tip out";

type Entry = {
  avatar: Avatar;
  title: string;
  date: string;
  amount: string;
  category: Category;
  credit?: boolean;
};

const M = "/media/craft/components/app/merchants";
const logo = (src: string): Avatar => ({
  kind: "logo",
  src: `${M}/${src}.svg`,
});

const ENTRIES: Entry[] = [
  {
    avatar: logo("starbucks"),
    title: "Starbucks",
    date: "Nov 22",
    amount: "$6.45",
    category: "Purchase",
  },
  {
    avatar: { kind: "payout" },
    title: "Tips payout",
    date: "Nov 22",
    amount: "+$184.00",
    category: "Payout",
    credit: true,
  },
  {
    avatar: { kind: "contact", seed: 36 },
    title: "Tip out to Alex",
    date: "Nov 21",
    amount: "$25.00",
    category: "Tip out",
  },
  {
    avatar: { kind: "zelle" },
    title: "Zelle from Jordan",
    date: "Nov 21",
    amount: "+$40.00",
    category: "Zelle",
    credit: true,
  },
  {
    avatar: logo("uber"),
    title: "Uber",
    date: "Nov 21",
    amount: "$18.20",
    category: "Purchase",
  },
  {
    avatar: { kind: "contact", seed: 22 },
    title: "Tip out from Sam",
    date: "Nov 20",
    amount: "+$30.00",
    category: "Tip out",
    credit: true,
  },
  {
    avatar: { kind: "payout" },
    title: "Tips payout",
    date: "Nov 20",
    amount: "+$212.40",
    category: "Payout",
    credit: true,
  },
  {
    avatar: logo("categories/grocery"),
    title: "Whole Foods",
    date: "Nov 19",
    amount: "$61.08",
    category: "Purchase",
  },
  {
    avatar: { kind: "zelle" },
    title: "Zelle to Priya",
    date: "Nov 19",
    amount: "$35.00",
    category: "Zelle",
  },
  {
    avatar: { kind: "contact", seed: 44 },
    title: "Tip out to Riley",
    date: "Nov 18",
    amount: "$20.00",
    category: "Tip out",
  },
  {
    avatar: { kind: "payout" },
    title: "Tips payout",
    date: "Nov 18",
    amount: "+$168.20",
    category: "Payout",
    credit: true,
  },
  {
    avatar: logo("lyft"),
    title: "Lyft",
    date: "Nov 17",
    amount: "$12.75",
    category: "Purchase",
  },
  {
    avatar: { kind: "zelle" },
    title: "Zelle from Casey",
    date: "Nov 16",
    amount: "+$60.00",
    category: "Zelle",
    credit: true,
  },
];

const TYPES: { label: string; value: Category | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Payouts", value: "Payout" },
  { label: "Purchases", value: "Purchase" },
  { label: "Zelle", value: "Zelle" },
  { label: "Tip outs", value: "Tip out" },
];

const SPRING = { type: "spring", duration: 0.3, bounce: 0 } as const;
const T13 = { fontSize: "0.8125rem", lineHeight: "1.125rem" };
const T15 = { fontSize: "0.9375rem", lineHeight: "1.25rem" };
const T17 = { fontSize: "1.0625rem", lineHeight: "1.375rem" };
const FONT = { fontFamily: "var(--font-inter)" };
const RAISED =
  "0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)";
const GREEN_TEXT = "color(display-p3 0.204 0.68 0.345)";

type PillTone = "tint" | "ink";

/** A filter pill. `tint` is the product's blue; `ink` is solid black when on,
    white with a hairline when off, for pills that sit straight on the grey. */
function Pill({
  on,
  tone = "tint",
  onClick,
  children,
}: {
  on: boolean;
  tone?: PillTone;
  onClick: () => void;
  children: ReactNode;
}) {
  const colors =
    tone === "tint"
      ? {
          backgroundColor: on
            ? "rgba(56, 152, 255, 0.08)"
            : "var(--fills-tertiary)",
          color: on ? "var(--color-blue)" : "var(--labels-primary)",
          boxShadow: on
            ? "inset 0 0 0 1px var(--color-blue)"
            : "inset 0 0 0 1px rgba(0, 0, 0, 0)",
        }
      : {
          backgroundColor: on ? "#1f1f1f" : "#ffffff",
          color: on ? "#ffffff" : "var(--labels-primary)",
          boxShadow: on
            ? "inset 0 0 0 1px rgba(0, 0, 0, 0)"
            : "inset 0 0 0 1px rgba(0, 0, 0, 0.06)",
        };
  return (
    <m.button
      animate={colors}
      aria-pressed={on}
      className="shrink-0 cursor-pointer rounded-full px-4 py-2 font-medium whitespace-nowrap"
      initial={false}
      onClick={onClick}
      style={T15}
      transition={SPRING}
      type="button"
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </m.button>
  );
}

/** One type at a time: the activity list can only show one. */
function TypePills({
  value,
  onChange,
  tone,
  wrap = true,
}: {
  value: Category | "all";
  onChange: (value: Category | "all") => void;
  tone?: PillTone;
  wrap?: boolean;
}) {
  return (
    <div
      aria-label="Transaction type"
      className={wrap ? "flex flex-wrap gap-2" : "flex gap-2"}
      role="group"
    >
      {TYPES.map((type) => (
        <Pill
          key={type.value}
          on={value === type.value}
          onClick={() => onChange(type.value)}
          tone={tone}
        >
          {type.label}
        </Pill>
      ))}
    </div>
  );
}

/** Many types at once, as the product's filter drawer allows. */
function MultiTypePills({
  types,
  onChange,
  tone,
  wrap = true,
}: {
  types: Category[];
  onChange: (types: Category[]) => void;
  tone?: PillTone;
  wrap?: boolean;
}) {
  return (
    <div
      aria-label="Transaction type"
      className={wrap ? "flex flex-wrap gap-2" : "flex gap-2"}
      role="group"
    >
      {TYPES.map(({ label, value }) => {
        const on = value === "all" ? types.length === 0 : types.includes(value);
        return (
          <Pill
            key={value}
            on={on}
            onClick={() => {
              if (value === "all") return onChange([]);
              onChange(
                types.includes(value)
                  ? types.filter((type) => type !== value)
                  : [...types, value],
              );
            }}
            tone={tone}
          >
            {label}
          </Pill>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  surface = "var(--fills-tertiary)",
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  surface?: string;
}) {
  const id = useId();
  return (
    <div
      aria-label={label}
      className="flex rounded-full p-1"
      role="radiogroup"
      style={{ backgroundColor: surface }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            aria-checked={on}
            className="relative flex-1 cursor-pointer rounded-full py-1.5 font-medium"
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            style={{
              ...T15,
              color: on ? "var(--labels-primary)" : "var(--labels-secondary)",
              transition: "color 0.2s",
            }}
            type="button"
          >
            {on && (
              <m.span
                className="absolute inset-0 rounded-full bg-white"
                layoutId={`${id}-thumb`}
                style={{
                  boxShadow:
                    "0 0 0 0.5px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(0, 0, 0, 0.08)",
                }}
                transition={SPRING}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          className="flex"
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          key={on ? "on" : "off"}
          transition={SPRING}
        >
          <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
            {on ? (
              <>
                <rect fill="var(--color-blue)" height="24" rx="12" width="24" />
                <path
                  d="M7.4 12.4l3.3 3.9 5.9-8.6"
                  stroke="#fff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </>
            ) : (
              <rect
                height="21.5"
                rx="10.75"
                stroke="var(--fills-primary)"
                strokeWidth="1.5"
                width="21.5"
                x="1.25"
                y="1.25"
              />
            )}
          </svg>
        </m.span>
      </AnimatePresence>
    </span>
  );
}

function FloatingField({
  label,
  value,
  onChange,
  surface = "var(--fills-tertiary)",
  leading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  surface?: string;
  leading?: ReactNode;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  const left = leading ? 48 : 16;
  return (
    <div
      className="relative h-16 w-full rounded-[20px]"
      style={{ backgroundColor: surface }}
    >
      {leading && (
        <span className="pointer-events-none absolute top-0 bottom-0 left-4 flex items-center text-[var(--labels-tertiary)]">
          {leading}
        </span>
      )}
      <label
        className="pointer-events-none absolute top-0 flex h-[1.375rem] items-center text-[var(--labels-tertiary)]"
        htmlFor={id}
        style={{
          ...T17,
          left,
          fontWeight: active ? 500 : 400,
          transformOrigin: "left top",
          transform: active
            ? "translateY(0.625rem) scale(0.765)"
            : "translateY(1.3125rem) scale(1)",
          transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {label}
      </label>
      <input
        autoComplete="off"
        className="h-full w-full bg-transparent pr-4 text-[var(--labels-primary)] outline-none"
        id={id}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        style={{
          fontSize: "1.0625rem",
          paddingLeft: left,
          paddingTop: active ? "calc(1.25rem - 1px)" : 0,
          paddingBottom: active ? "calc(0.25rem + 1px)" : 0,
          transition:
            "padding-top 0.22s cubic-bezier(0.4, 0, 0.2, 1), padding-bottom 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        value={value}
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden fill="none" height="20" viewBox="0 0 20 20" width="20">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M13.5 13.5 17 17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Row({ entry, flat = false }: { entry: Entry; flat?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 ${flat ? "py-3" : "h-[72px] rounded-[20px] px-4"}`}
      style={
        flat
          ? undefined
          : { backgroundColor: "var(--card-background)", boxShadow: RAISED }
      }
    >
      <EntryAvatar avatar={entry.avatar} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate font-medium text-[var(--labels-primary)]"
          style={{ ...T17, letterSpacing: "-0.01375rem" }}
        >
          {entry.title}
        </span>
        <span className="truncate text-[var(--labels-secondary)]" style={T15}>
          {entry.date}
        </span>
      </div>
      <span
        className="font-inter-amounts shrink-0"
        style={{
          ...T17,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: entry.credit ? GREEN_TEXT : "var(--labels-primary)",
        }}
      >
        {entry.amount}
      </span>
    </div>
  );
}

/** Rows that rearrange as the filter changes: leavers blur away, arrivals
    scale in, the rest slide into place. */
function FilteredList({
  entries,
  gap = 8,
  flat = false,
}: {
  entries: Entry[];
  gap?: number;
  flat?: boolean;
}) {
  return (
    <ul className="relative m-0 flex list-none flex-col p-0" style={{ gap }}>
      <AnimatePresence initial={false} mode="popLayout">
        {entries.map((entry) => (
          <m.li
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: 0.94,
              filter: "blur(4px)",
              transition: { duration: 0.18 },
            }}
            initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
            key={`${entry.title}-${entry.date}-${entry.amount}`}
            layout="position"
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
          >
            <Row entry={entry} flat={flat} />
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

const pick = (category: Category | "all") =>
  ENTRIES.filter((entry) => category === "all" || entry.category === category);

const ORDER: (Category | "all")[] = [
  "all",
  "Payout",
  "Purchase",
  "Zelle",
  "Tip out",
];

/** Left alone, the filter steps through each type. */
function useCycle(
  ref: React.RefObject<HTMLElement | null>,
  initial: Category | "all",
) {
  const [value, setValue] = useState(initial);
  useAutoplay(
    ref,
    () =>
      setValue(
        (current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!,
      ),
    { interval: 2400, delay: 1600 },
  );
  return [value, setValue] as const;
}

/* --- 1. Filter sheet ----------------------------------------------------- */

const TIMEFRAMES = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

/**
 * The drawer itself, on its white sheet: a header with Reset, labelled
 * groups, a segmented timeframe, and the button that applies it. The name
 * field goes; it never belonged to the filters.
 */
export function FilterSheet() {
  const [types, setTypes] = useState<Category[]>(["Purchase", "Zelle"]);
  const [range, setRange] = useState("30");
  const count = ENTRIES.filter(
    (entry) => types.length === 0 || types.includes(entry.category),
  ).length;
  return (
    <FitStage className="anyday-app" gutter={20} inset={20}>
      <div
        className="flex flex-col gap-4 rounded-[28px] p-5"
        style={{
          ...FONT,
          backgroundColor: "var(--card-background)",
          boxShadow: RAISED,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[var(--labels-primary)]"
            style={{ ...T17, fontWeight: 650 }}
          >
            Filters
          </span>
          <button
            className="cursor-pointer font-medium text-[var(--color-blue)]"
            onClick={() => {
              setTypes([]);
              setRange("7");
            }}
            style={T15}
            type="button"
          >
            Reset
          </button>
        </div>
        <MultiTypePills onChange={setTypes} types={types} />
        <Segmented
          label="Timeframe"
          onChange={setRange}
          options={TIMEFRAMES}
          value={range}
        />
        <button
          className="h-12 cursor-pointer rounded-full font-semibold text-white"
          style={{ ...T17, backgroundColor: "#1f1f1f" }}
          type="button"
        >
          Show {count} transactions
        </button>
      </div>
    </FitStage>
  );
}

/* --- 2. Search bar ------------------------------------------------------- */

/**
 * The floating field becomes the search it would really be in this screen,
 * on white so it lifts off the grey. Pills run on one line and fade off the
 * edge; the timeframe is a segmented control. One compact band, centred.
 */
export function SearchBar() {
  const [query, setQuery] = useState("Maya");
  const [type, setType] = useState<Category | "all">("all");
  const [range, setRange] = useState("30");
  return (
    <FitStage className="anyday-app" gutter={24} inset={0}>
      <div className="flex flex-col gap-4" style={FONT}>
        <div className="px-6">
          <div className="rounded-[20px]" style={{ boxShadow: RAISED }}>
            <FloatingField
              label="Search activity"
              leading={<SearchIcon />}
              onChange={setQuery}
              surface="var(--card-background)"
              value={query}
            />
          </div>
        </div>
        <div
          className="overflow-x-auto px-6"
          style={{
            scrollbarWidth: "none",
            maskImage: "linear-gradient(to right, #000 85%, transparent)",
          }}
        >
          <TypePills onChange={setType} tone="ink" value={type} wrap={false} />
        </div>
        <div className="px-6">
          <Segmented
            label="Timeframe"
            onChange={setRange}
            options={TIMEFRAMES}
            surface="rgba(120, 120, 128, 0.12)"
            value={range}
          />
        </div>
      </div>
    </FitStage>
  );
}

/* --- 3. Grouped settings ------------------------------------------------- */

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="px-4 font-medium text-[var(--labels-secondary)]"
      style={T13}
    >
      {children}
    </span>
  );
}

/**
 * Settings-style grouping: every control sits in a white group, the same
 * white-on-grey as the activity cards below, with small labels between. The
 * pieces stop floating loose on the card.
 */
export function GroupedSettings() {
  const [name, setName] = useState("Maya");
  const [types, setTypes] = useState<Category[]>(["Purchase"]);
  const [preset, setPreset] = useState("7");
  const white = {
    backgroundColor: "var(--card-background)",
    boxShadow: RAISED,
  };
  return (
    <FitStage className="anyday-app" gutter={20} inset={20}>
      <div className="flex flex-col gap-2" style={FONT}>
        <div className="rounded-[20px]" style={white}>
          <FloatingField
            label="Display name"
            onChange={setName}
            surface="transparent"
            value={name}
          />
        </div>
        <GroupLabel>Type</GroupLabel>
        <div className="rounded-[20px] p-3" style={white}>
          <MultiTypePills onChange={setTypes} types={types} />
        </div>
        <GroupLabel>Timeframe</GroupLabel>
        <div
          aria-label="Timeframe"
          className="rounded-[20px] px-4"
          role="radiogroup"
          style={white}
        >
          {[
            { label: "Last 7 days", value: "7" },
            { label: "Last 30 days", value: "30" },
          ].map((option, index) => (
            <button
              aria-checked={preset === option.value}
              className="flex h-12 w-full cursor-pointer items-center text-left"
              key={option.value}
              onClick={() => setPreset(option.value)}
              role="radio"
              style={
                index
                  ? { boxShadow: "inset 0 0.5px 0 rgba(0, 0, 0, 0.1)" }
                  : undefined
              }
              type="button"
            >
              <span
                className="flex-1 font-medium text-[var(--labels-primary)]"
                style={T15}
              >
                {option.label}
              </span>
              <Check on={preset === option.value} />
            </button>
          ))}
        </div>
      </div>
    </FitStage>
  );
}

/* --- 4. One card: filters drive the list -------------------------------- */

/**
 * The column becomes one tall card: the pills sit on top of the activity
 * and actually filter it, rows rearranging as the type changes. Left alone
 * it steps through each type. The column tells one story instead of two.
 */
export function FilteredActivity() {
  const root = useRef<HTMLDivElement>(null);
  const [type, setType] = useCycle(root, "all");
  return (
    <FitStage className="anyday-app" gutter={28} inset={0}>
      <div className="flex flex-col gap-4" ref={root} style={FONT}>
        <div className="flex items-baseline justify-between px-6">
          <span
            className="text-[var(--labels-primary)]"
            style={{
              fontSize: "1.375rem",
              lineHeight: "1.75rem",
              fontWeight: 650,
              letterSpacing: "-0.02rem",
            }}
          >
            Activity
          </span>
          <span className="font-medium text-[var(--color-blue)]" style={T15}>
            See all
          </span>
        </div>
        <div
          className="overflow-x-auto px-6"
          style={{
            scrollbarWidth: "none",
            maskImage: "linear-gradient(to right, #000 85%, transparent)",
          }}
        >
          <TypePills onChange={setType} tone="ink" value={type} wrap={false} />
        </div>
        <div className="px-6" style={{ height: 6 * 72 + 5 * 8 }}>
          <FilteredList entries={pick(type).slice(0, 6)} />
        </div>
      </div>
    </FitStage>
  );
}

/* --- 5. Profile on top, filters on the activity ------------------------- */

/**
 * The name field belongs with Maya's profile, so the top card becomes her
 * settings: the field and two switches in one white group. The type pills
 * move down onto the activity, where they filter the three rows below.
 */
export function ProfileSettings() {
  const [name, setName] = useState("Maya");
  const [alerts, setAlerts] = useState(true);
  const [instant, setInstant] = useState(false);
  const rows: {
    label: string;
    detail: string;
    on: boolean;
    set: (on: boolean) => void;
  }[] = [
    {
      label: "Payout alerts",
      detail: "When tips land",
      on: alerts,
      set: setAlerts,
    },
    {
      label: "Instant payouts",
      detail: "$1.50 per payout",
      on: instant,
      set: setInstant,
    },
  ];
  return (
    <FitStage className="anyday-app" gutter={20} inset={20}>
      <div className="flex flex-col gap-3" style={FONT}>
        <FloatingField
          label="Display name"
          onChange={setName}
          surface="var(--fills-secondary)"
          value={name}
        />
        <div
          className="rounded-[20px] px-4"
          style={{
            backgroundColor: "var(--card-background)",
            boxShadow: RAISED,
          }}
        >
          {rows.map((row, index) => (
            <div
              className="flex h-[68px] items-center gap-3"
              key={row.label}
              style={
                index
                  ? { boxShadow: "inset 0 0.5px 0 rgba(0, 0, 0, 0.1)" }
                  : undefined
              }
            >
              <div className="flex flex-1 flex-col">
                <span
                  className="font-medium text-[var(--labels-primary)]"
                  style={T17}
                >
                  {row.label}
                </span>
                <span className="text-[var(--labels-secondary)]" style={T13}>
                  {row.detail}
                </span>
              </div>
              <ToggleSwitch
                checked={row.on}
                label={row.label}
                onChange={row.set}
              />
            </div>
          ))}
        </div>
      </div>
    </FitStage>
  );
}

export function ActivityWithPills() {
  const root = useRef<HTMLDivElement>(null);
  const [type, setType] = useCycle(root, "all");
  return (
    <FitStage className="anyday-app" gutter={24} inset={0}>
      <div className="flex flex-col gap-4" ref={root} style={FONT}>
        <div
          className="overflow-x-auto px-6"
          style={{
            scrollbarWidth: "none",
            maskImage: "linear-gradient(to right, #000 85%, transparent)",
          }}
        >
          <TypePills onChange={setType} tone="ink" value={type} wrap={false} />
        </div>
        <div className="px-6" style={{ height: 3 * 72 + 2 * 8 }}>
          <FilteredList entries={pick(type).slice(0, 3)} />
        </div>
      </div>
    </FitStage>
  );
}
