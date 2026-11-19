"use client";

import { AnimatePresence, m, useAnimationControls } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";

import { DemoCursor, useDemo } from "../demo";
import { FitStage } from "../fit-stage";
import { Input } from "./ui/input";
import { cn } from "./ui/cn";

/*
 * The bulk payout amount field (AmountInputCell and its change and blur
 * handlers): its states above, the last few keystrokes and the rule each
 * one hit below.
 */

const BALANCE = 2480;
const HOME = { x: 300, y: 210 };
const POSTER = "1,248.50";

type Tone = "ok" | "note" | "warn" | "reject";
type Entry = {
  id: number;
  key: string;
  shows: string;
  rule: string;
  tone: Tone;
};

const POSTER_TRACE: Entry[] = [
  {
    id: -3,
    key: ".",
    shows: "1,248.",
    rule: "One decimal point",
    tone: "reject",
  },
  { id: -2, key: "5", shows: "1,248.5", rule: "", tone: "ok" },
  { id: -1, key: "blur", shows: POSTER, rule: "Padded on blur", tone: "note" },
];

const STATES = ["Empty", "Focused", "Typing", "Invalid", "Committed"] as const;
type State = (typeof STATES)[number];

const toNumber = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;

/** lib/utils/currency.ts formatCurrencyInput */
function group(clean: string) {
  const [whole = "", decimals] = clean.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals !== undefined ? `${grouped}.${decimals}` : grouped;
}

/** The page's change handler: what a raw edit becomes, and which rule said so. */
function edit(
  previous: string,
  raw: string,
): { value: string; rule: string; tone: Tone } {
  const keep = (rule: string) => ({
    value: previous,
    rule,
    tone: "reject" as const,
  });
  if (/[^\d.,]/.test(raw)) return keep("Digits only");
  const clean = raw.replace(/,/g, "");
  const [whole = "", decimals, extra] = clean.split(".");
  if (extra !== undefined) return keep("One decimal point");
  if (decimals !== undefined && decimals.length > 2)
    return keep("Two decimals max");
  if (previous === "0." && clean === "0")
    return { value: "", rule: "", tone: "ok" };
  if (clean === "0") return { value: "0.", rule: "0 becomes 0.", tone: "note" };
  if (whole.length > 1 && whole.startsWith("0"))
    return keep("No leading zeros");
  if (clean === "") return { value: "", rule: "", tone: "ok" };

  const value = group(clean);
  const over = toNumber(value) > BALANCE;
  const wasOver = toNumber(previous) > BALANCE;
  if (over && !wasOver) return { value, rule: "Over balance", tone: "warn" };
  if (!over && wasOver) return { value, rule: "Within balance", tone: "ok" };
  const commas = (text: string) => text.split(",").length;
  if (commas(value) > commas(previous))
    return { value, rule: "Grouped thousands", tone: "note" };
  return { value, rule: "", tone: "ok" };
}

/** The page's blur handler: whole amounts and one decimal get two. */
function pad(value: string) {
  if (!value) return null;
  const [whole = "", decimals = ""] = value.split(".");
  if (value.includes(".") && decimals.length === 2) return null;
  return `${whole}.${decimals.padEnd(2, "0")}`;
}

/** The key a raw edit stands for: the character it added, or a delete. */
function keyFor(previous: string, raw: string) {
  if (raw.length < previous.length) return "⌫";
  let index = 0;
  while (index < previous.length && previous[index] === raw[index]) index++;
  return raw.slice(index, index + raw.length - previous.length) || "⌫";
}

function AmountField() {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const strip = useId();
  const nextId = useRef(0);

  const [value, setValue] = useState(POSTER);
  const [focus, setFocus] = useState<"demo" | "real" | null>(null);
  const [trace, setTrace] = useState<Entry[]>(POSTER_TRACE);
  const shake = useAnimationControls();
  const [caretX, setCaretX] = useState(0);
  const valueRef = useRef(value);

  const log = (entry: Omit<Entry, "id">) => {
    setTrace((rows) => {
      const last = rows[rows.length - 1];
      if (entry.key === "⌫" && last?.key.startsWith("⌫")) {
        const count = (parseInt(last.key.slice(2), 10) || 1) + 1;
        return [...rows.slice(0, -1), { ...last, ...entry, key: `⌫×${count}` }];
      }
      return [...rows, { ...entry, id: nextId.current++ }].slice(-3);
    });
  };

  const change = (raw: string, key = keyFor(valueRef.current, raw)) => {
    const previous = valueRef.current;
    const result = edit(previous, raw);
    if (result.tone === "reject")
      void shake.start({
        x: [0, -4, 4, -2, 0],
        transition: { duration: 0.28 },
      });
    valueRef.current = result.value;
    setValue(result.value);
    log({ key, shows: result.value, rule: result.rule, tone: result.tone });
  };

  const commit = () => {
    const padded = pad(valueRef.current);
    if (padded) {
      valueRef.current = padded;
      setValue(padded);
      log({ key: "blur", shows: padded, rule: "Padded on blur", tone: "note" });
    }
  };

  const press = (key: string) => {
    const previous = valueRef.current;
    change(key === "⌫" ? previous.slice(0, -1) : previous + key, key);
  };

  const cursor = useDemo(
    root,
    async (a) => {
      await a.wait(700);
      await a.move("amount", { kind: "ibeam", ax: 0.22 });
      await a.click();
      setFocus("demo");
      await a.wait(450);
      valueRef.current = "";
      setValue("");
      log({ key: "⌘A ⌫", shows: "", rule: "", tone: "ok" });
      await a.wait(700);
      for (const key of "3200") {
        press(key);
        await a.wait(190);
      }
      await a.wait(1500);
      for (let i = 0; i < 4; i++) {
        press("⌫");
        await a.wait(80);
      }
      await a.wait(500);
      for (const key of "1248.") {
        press(key);
        await a.wait(190);
      }
      await a.wait(260);
      press(".");
      await a.wait(900);
      press("5");
      await a.wait(1100);
      await a.moveTo(HOME.x, HOME.y + 40, "pointer");
      await a.click();
      setFocus(null);
      commit();
      await a.wait(2600);
    },
    {
      home: HOME,
      interactive: true,
      reset: () => {
        valueRef.current = POSTER;
        setValue(POSTER);
        setTrace(POSTER_TRACE);
        setFocus(null);
      },
    },
  );

  const over = toNumber(value) > BALANCE;
  const state: State = over
    ? "Invalid"
    : focus
      ? value
        ? "Typing"
        : "Focused"
      : value
        ? "Committed"
        : "Empty";

  useLayoutEffect(() => {
    setCaretX(mirror.current?.offsetWidth ?? 0);
  }, [value]);

  return (
    <div className="relative flex flex-col" ref={root}>
      <DemoCursor
        kind={cursor.kind}
        pressed={cursor.pressed}
        shown={cursor.running}
        x={cursor.x}
        y={cursor.y}
      />

      <div
        aria-label={`State: ${state}`}
        className="flex self-start rounded-full bg-black/[0.045] p-[3px]"
        role="img"
      >
        {STATES.map((name) => (
          <span
            className="relative px-2.5 py-[3px]"
            key={name}
            style={{ fontSize: "12px", lineHeight: "16px" }}
          >
            {name === state && (
              <m.span
                className="absolute inset-0 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.08)]"
                layoutId={strip}
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              />
            )}
            <span
              className={cn(
                "relative font-medium transition-colors duration-200",
                name === state
                  ? name === "Invalid"
                    ? "text-[var(--label-critical)]"
                    : "text-[var(--label-primary)]"
                  : "text-[var(--label-faint)]",
              )}
            >
              {name}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-[18px] flex items-baseline justify-between">
        <label
          className="font-medium text-[#1c1c1c]"
          htmlFor={`${strip}-input`}
          style={{
            fontSize: "15px",
            lineHeight: "20px",
            letterSpacing: "-0.24px",
          }}
        >
          Amount
        </label>
        <span
          className="text-[var(--label-secondary)] tabular-nums"
          style={{ fontSize: "13px", lineHeight: "18px" }}
        >
          $2,480.00 available
        </span>
      </div>

      <m.div animate={shake} className="relative mt-2" data-demo="amount">
        <Input
          aria-describedby={`${strip}-help`}
          aria-invalid={over || undefined}
          className={cn(
            "pl-[21px] tabular-nums",
            focus === "demo" &&
              !over &&
              "border-[1.5px] border-[var(--border-brand)] shadow-[0_0_0_3px_rgba(92,97,255,0.15)]",
            focus === "demo" &&
              over &&
              "border-[1.5px] border-[var(--border-critical)] shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
          )}
          error={over}
          id={`${strip}-input`}
          inputMode="decimal"
          onBlur={() => {
            setFocus(null);
            commit();
          }}
          onChange={(event) => change(event.target.value)}
          onFocus={() => setFocus("real")}
          placeholder="0.00"
          prefix="$"
          prefixStyle={{ transform: "translateY(calc(-50% - 1px))" }}
          ref={input}
          type="text"
          value={value}
        />
        <span
          aria-hidden="true"
          className="text-medium-default invisible absolute top-0 left-[22px] whitespace-pre tabular-nums"
          ref={mirror}
        >
          {value}
        </span>
        {focus === "demo" && (
          <m.span
            animate={{ opacity: [1, 1, 0, 0] }}
            aria-hidden="true"
            className="absolute top-1/2 h-5 w-[1.5px] -translate-y-1/2 rounded-full bg-[var(--label-primary)]"
            key={value}
            style={{ left: 22 + caretX }}
            transition={{
              duration: 1.05,
              repeat: Infinity,
              times: [0, 0.5, 0.5, 1],
              ease: "linear",
            }}
          />
        )}
      </m.div>

      <div
        className="relative mt-1.5 h-[18px]"
        id={`${strip}-help`}
        style={{ fontSize: "13px", lineHeight: "18px" }}
      >
        <AnimatePresence initial={false}>
          {over && (
            <m.span
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 text-[var(--label-critical)]"
              exit={{ opacity: 0, y: -3 }}
              initial={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.2 }}
            >
              Exceeds wallet balance
            </m.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 rounded-[var(--radius-4)] bg-white/70 px-3 py-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
        <ol
          aria-label="Last keystrokes"
          className="flex h-[72px] flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,black_12px)]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {trace.map((entry) => (
              <TraceRow entry={entry} key={entry.id} />
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
}

const TONE: Record<Tone, string> = {
  ok: "text-[var(--label-faint)]",
  note: "text-[var(--label-link)]",
  warn: "text-[var(--label-critical)]",
  reject: "text-[var(--label-warning)]",
};

function TraceRow({ entry }: { entry: Entry }) {
  return (
    <m.li
      animate={{ opacity: 1, y: 0 }}
      className="grid h-6 shrink-0 grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      layout="position"
      transition={{ type: "spring", duration: 0.32, bounce: 0 }}
    >
      <span>
        <kbd
          className={cn(
            "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-[var(--bg-sub)] px-1.5 font-mono text-[var(--label-secondary)] shadow-[inset_0_-1px_0_rgba(39,39,42,0.08)]",
            entry.tone === "reject" &&
              "line-through decoration-[var(--label-warning)]",
          )}
          style={{ fontSize: "11px", lineHeight: "14px" }}
        >
          {entry.key}
        </kbd>
      </span>
      <span
        className={cn(
          "truncate font-mono tabular-nums",
          entry.tone === "reject"
            ? "text-[var(--label-faint)]"
            : "text-[var(--label-primary)]",
        )}
        style={{ fontSize: "12px", lineHeight: "16px" }}
      >
        {entry.shows ? `$${entry.shows}` : "empty"}
      </span>
      <span
        className={cn("text-right font-medium", TONE[entry.tone])}
        style={{ fontSize: "12px", lineHeight: "16px" }}
      >
        {entry.rule}
      </span>
    </m.li>
  );
}

export function PortalAmountField() {
  return (
    <FitStage className="anyday-portal" gutter={20}>
      <AmountField />
    </FitStage>
  );
}
