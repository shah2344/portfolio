"use client";

import { useEffect, useRef, useState } from "react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import { cn } from "../ui/cn";

/*
 * The product's underline tabs (components/ui/tabs.tsx, `variant="underline"`,
 * with its animated TabsUnderline) as the wallet page uses them. Radix Tabs is
 * not installed, so the trigger is a plain `role="tab"` button carrying the
 * same `data-state` the classes key off.
 */

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "linked-accounts", label: "Accounts" },
  { value: "pad-float", label: "PAD & Float" },
];

export function UnderlineTabs({
  className,
  autoplay = false,
}: {
  className?: string;
  /** Step through the tabs on its own, so the underline shows its glide. */
  autoplay?: boolean;
} = {}) {
  const [activeTab, setActiveTab] = useState("overview");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const list = useRef<HTMLDivElement>(null);

  useAutoplay(
    list,
    () => {
      if (!autoplay) return;
      setActiveTab((current) => {
        const index = TABS.findIndex((tab) => tab.value === current);
        return TABS[(index + 1) % TABS.length]?.value ?? "overview";
      });
    },
    { interval: 2600, delay: 1400 },
  );
  const [position, setPosition] = useState<{
    left: number;
    right: number;
  } | null>(null);

  // TabsUnderline: measure the active trigger, then slide to it. The bar spans
  // the list and a clip-path inset reveals the active stretch, so the glide
  // never animates layout.
  useEffect(() => {
    const element = refs.current[activeTab];
    const tablist = list.current;
    if (!element || !tablist) return;
    const frame = requestAnimationFrame(() => {
      setPosition({
        left: element.offsetLeft,
        right: tablist.clientWidth - element.offsetLeft - element.offsetWidth,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  return (
    <div
      ref={list}
      role="tablist"
      className={cn(
        "relative inline-flex w-full items-center justify-center justify-start gap-6 rounded-none border-b border-[var(--border-default)] bg-transparent p-0",
        className,
      )}
    >
      {TABS.map((tab) => {
        const state = activeTab === tab.value ? "active" : "inactive";
        return (
          <button
            key={tab.value}
            ref={(element) => {
              refs.current[tab.value] = element;
            }}
            type="button"
            role="tab"
            aria-selected={state === "active"}
            data-state={state}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "ring-offset-background inline-flex items-center justify-center font-medium whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
              "relative cursor-pointer rounded-none border-none bg-transparent px-0 py-3 shadow-none transition-colors duration-200 outline-none data-[state=active]:bg-transparent data-[state=active]:text-[var(--label-primary)] data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--label-secondary)] data-[state=inactive]:hover:text-[var(--label-primary)]",
            )}
            style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
          >
            {tab.label}
          </button>
        );
      })}
      {position && (
        <div
          className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--control-brand)]"
          style={{
            clipPath: `inset(0 ${position.right}px 0 ${position.left}px round var(--radius-4))`,
            transition: "clip-path 200ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      )}
    </div>
  );
}

export function PortalTabs() {
  return (
    <FitStage inset={38} gutter={32} className="anyday-portal">
      <UnderlineTabs />
    </FitStage>
  );
}
