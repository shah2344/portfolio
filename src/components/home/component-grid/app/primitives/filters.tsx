"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

const TYPES = [
  { label: "All", value: "all" },
  { label: "Payouts", value: "Payout" },
  { label: "Purchases", value: "Purchase" },
  { label: "Zelle", value: "Zelle" },
  { label: "Tip outs", value: "Card to Card" },
];

const PRESETS = [
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
];

const SPRING = { type: "spring", duration: 0.3, bounce: 0 } as const;
const NAME = "Maya";

type State = {
  focused: boolean;
  target: string;
  types: string[];
  preset: string;
};

// The poster (and the last beat of each pass): a name typed, a filter on.
const POSTER: State = {
  focused: false,
  target: NAME,
  types: ["Purchase", "Zelle"],
  preset: "last30",
};
const CLEAR: State = { focused: false, target: "", types: [], preset: "last7" };

// Each beat changes one thing, so every change on screen has a cause.
const BEATS: ((state: State) => State)[] = [
  () => CLEAR,
  (state) => ({ ...state, focused: true, target: NAME }),
  (state) => ({ ...state, focused: false }),
  (state) => ({ ...state, types: ["Purchase"] }),
  (state) => ({ ...state, types: ["Purchase", "Zelle"] }),
  (state) => ({ ...state, preset: "last30" }),
  (state) => state,
];

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
          {on ? (
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <rect fill="var(--color-blue)" height="24" rx="12" width="24" />
              <path
                d="M7.4 12.4l3.3 3.9 5.9-8.6"
                stroke="#fff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <rect
                height="21.5"
                rx="10.75"
                stroke="var(--fills-primary)"
                strokeWidth="1.5"
                width="21.5"
                x="1.25"
                y="1.25"
              />
            </svg>
          )}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * The app's form parts on their own: the floating-label input from
 * onboarding (components/ui/input.tsx), whose label shrinks up out of the
 * way as you type, and the transaction filters
 * (components/drawers/filter-drawer.tsx): type pills that tint blue when on,
 * and timeframe rows whose check scales in out of a blur. Left alone, it
 * types a name, picks two types and a timeframe, then clears.
 */
export function FiltersPrimitive() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [beat, setBeat] = useState(BEATS.length - 1);
  const [state, setState] = useState<State>(POSTER);
  const [value, setValue] = useState(NAME);
  const [focused, setFocused] = useState(false);

  useAutoplay(
    root,
    () => {
      const next = (beat + 1) % BEATS.length;
      setBeat(next);
      const after = BEATS[next]!(state);
      setState(after);
      if (after.target === "") setValue("");
    },
    { interval: 1500, delay: 2000 },
  );

  // The film types its name a key at a time.
  useEffect(() => {
    if (state.target === "" || value === state.target) return;
    if (!state.target.startsWith(value)) return;
    const timer = setTimeout(
      () => setValue(state.target.slice(0, value.length + 1)),
      110,
    );
    return () => clearTimeout(timer);
  }, [state.target, value]);

  const active = focused || state.focused || value.length > 0;
  const lit = focused || state.focused;

  const toggleType = (type: string) => {
    setState((current) => {
      if (type === "all") return { ...current, types: [] };
      const types = current.types.includes(type)
        ? current.types.filter((item) => item !== type)
        : [...current.types, type];
      return { ...current, types };
    });
  };

  return (
    <FitStage className="anyday-app" gutter={24}>
      <div
        className="flex flex-col gap-5"
        ref={root}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <div
          className="relative h-16 w-full rounded-[20px] transition-[background-color] duration-200"
          onClick={() => input.current?.focus()}
          style={{
            backgroundColor: lit
              ? "var(--fills-secondary)"
              : "var(--fills-tertiary)",
          }}
        >
          <label
            className="pointer-events-none absolute top-0 left-4 flex h-[1.375rem] items-center text-[var(--labels-tertiary)]"
            htmlFor={id}
            style={{
              fontSize: "1.0625rem",
              lineHeight: "1.375rem",
              fontWeight: active ? 500 : 400,
              transformOrigin: "left top",
              transform: active
                ? "translateY(0.625rem) scale(0.765)"
                : "translateY(1.3125rem) scale(1)",
              transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            Display name
          </label>
          <input
            autoComplete="off"
            className="h-full w-full bg-transparent px-4 text-[var(--labels-primary)] outline-none"
            id={id}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              setValue(event.target.value);
              setState((current) => ({
                ...current,
                target: event.target.value,
              }));
            }}
            onFocus={() => setFocused(true)}
            ref={input}
            style={{
              fontSize: "1.0625rem",
              // Drops the text below the floated label: the same half-rem
              // the old asymmetric padding gave, moved without relayout.
              transform: active
                ? "translateY(calc(0.5rem - 1px))"
                : "translateY(0)",
              transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              caretColor: lit ? "var(--labels-primary)" : "transparent",
            }}
            value={value}
          />
        </div>

        <div
          aria-label="Transaction type"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {TYPES.map((type) => {
            const on =
              type.value === "all"
                ? state.types.length === 0
                : state.types.includes(type.value);
            return (
              <m.button
                animate={{
                  backgroundColor: on
                    ? "rgba(56, 152, 255, 0.08)"
                    : "var(--filter-pill-default)",
                  color: on ? "var(--color-blue)" : "var(--labels-primary)",
                  borderColor: on ? "var(--color-blue)" : "rgba(0, 0, 0, 0.02)",
                }}
                aria-pressed={on}
                className="cursor-pointer rounded-full border px-4 py-2 font-medium"
                initial={false}
                key={type.value}
                onClick={() => toggleType(type.value)}
                style={{ fontSize: "0.9375rem", lineHeight: "1.25rem" }}
                transition={SPRING}
                type="button"
                whileTap={{ scale: 0.96 }}
              >
                {type.label}
              </m.button>
            );
          })}
        </div>

        <div
          aria-label="Timeframe"
          className="-mx-3 flex flex-col"
          role="radiogroup"
        >
          {PRESETS.map((preset) => {
            const on = state.preset === preset.value;
            return (
              <button
                aria-checked={on}
                className="flex cursor-pointer items-center gap-5 rounded-xl px-3 py-3 text-left hover:bg-[var(--fills-tertiary)]"
                key={preset.value}
                onClick={() =>
                  setState((current) => ({ ...current, preset: preset.value }))
                }
                role="radio"
                type="button"
              >
                <span
                  className="flex-1 font-medium text-[var(--labels-primary)]"
                  style={{ fontSize: "0.9375rem", lineHeight: "1.25rem" }}
                >
                  {preset.label}
                </span>
                <Check on={on} />
              </button>
            );
          })}
        </div>
      </div>
    </FitStage>
  );
}
