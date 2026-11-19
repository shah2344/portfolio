"use client";

import { AnimatePresence, m } from "motion/react";
import { useRef, useState } from "react";

import { FitStage } from "../fit-stage";
import { useAutoplay } from "../use-autoplay";
import { UnderlineTabs } from "./primitives/tabs";
import { Button } from "./ui/button";
import { ICON_BASE } from "./ui/cn";

const CODE = "418027";
// Six keystrokes, a beat to read it, then it clears for the next code.
const CYCLE = 12;
const POP = { type: "spring", duration: 0.3, bounce: 0 } as const;

function Chevron() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M9 5l7 7-7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

function IconButton({ label, icon }: { label: string; icon: string }) {
  return (
    <Button
      aria-label={label}
      className="h-[2.125rem] w-[2.125rem] justify-center px-0"
      size="regular"
      variant="secondary"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="h-5 w-5" src={`${ICON_BASE}/${icon}`} />
    </Button>
  );
}

function Slot({
  char,
  active,
  first,
  last,
}: {
  char?: string;
  active: boolean;
  first: boolean;
  last: boolean;
}) {
  return (
    <span
      className={[
        "relative flex h-11 w-11 items-center justify-center border-y border-r border-[var(--border-heavy)] bg-[var(--bg-base)] text-[17px] font-medium text-[var(--label-primary)] tabular-nums transition-[border-color,box-shadow] duration-150",
        first ? "rounded-l-[var(--radius-4)] border-l" : "",
        last ? "rounded-r-[var(--radius-4)]" : "",
        active
          ? "z-10 border-[1.5px] border-[var(--icon-branda)] shadow-[0_0_0_3px_rgba(92,97,255,0.15)]"
          : "",
      ].join(" ")}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {char ? (
          <m.span
            key={char}
            initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            transition={POP}
          >
            {char}
          </m.span>
        ) : null}
      </AnimatePresence>
      {active && !char ? (
        <m.span
          aria-hidden="true"
          className="absolute h-4 w-px bg-[var(--label-primary)]"
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            times: [0, 0.5, 0.5, 1],
          }}
        />
      ) : null}
    </span>
  );
}

/**
 * The sign-in code from the portal's two-step login: two groups of three
 * joined slots, the next one ringed in the brand indigo with a caret. Left
 * alone it fills a digit at a time, holds the code, and clears.
 */
function CodeInput() {
  const [tick, setTick] = useState(3);
  const root = useRef<HTMLDivElement>(null);
  useAutoplay(root, () => setTick((value) => (value + 1) % CYCLE), {
    interval: 380,
    delay: 1200,
  });
  const filled = Math.min(tick, CODE.length);

  const group = (start: number) => (
    <span className="flex">
      {[0, 1, 2].map((offset) => {
        const index = start + offset;
        return (
          <Slot
            active={index === filled}
            char={index < filled ? CODE[index] : undefined}
            first={offset === 0}
            key={index}
            last={offset === 2}
          />
        );
      })}
    </span>
  );

  return (
    <div
      aria-label="Six-digit sign-in code"
      className="flex items-center gap-2"
      ref={root}
      role="img"
    >
      {group(0)}
      <span
        aria-hidden="true"
        className="h-px w-2.5 bg-[var(--border-heavy)]"
      />
      {group(3)}
    </div>
  );
}

/**
 * The portal's building blocks on their own, set as one centred column on
 * a single rhythm: the wallet page's underline tabs, whose underline glides
 * between them on its own; the step buttons and icon buttons as the
 * wallet and bulk payout pair them; then the sign-in code, filling itself.
 */
export function PortalControls() {
  return (
    <FitStage className="anyday-portal" gutter={16}>
      <div className="flex flex-col items-center gap-6">
        <UnderlineTabs autoplay className="w-auto" />

        <div className="flex items-center gap-2">
          <Button size="regular" variant="secondary">
            Back
          </Button>
          <Button rightIcon={<Chevron />} size="regular" variant="primary">
            Continue
          </Button>
          <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-black/10" />
          <IconButton icon="Add.svg" label="Add funds" />
          <IconButton icon="transfer.svg" label="Transfer" />
        </div>

        <CodeInput />
      </div>
    </FitStage>
  );
}
