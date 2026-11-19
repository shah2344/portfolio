"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { m } from "motion/react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

type Tab = "wallet" | "card" | "account";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "wallet", label: "Wallet" },
  { tab: "card", label: "Card" },
  { tab: "account", label: "Account" },
];

const NAV = "/media/craft/components/app/icons/nav";
/** Each tab's width (5.75rem) plus the gap between tabs (gap-1.5). */
const TAB = 92;
const STEP = TAB + 6;
const GLIDE = { type: "spring", duration: 0.4, bounce: 0.12 } as const;

/**
 * The app's bottom navigation pill (BottomNav in app/layout-client.tsx):
 * Wallet, Card and Account, the active one on its grey fill, the pill
 * swelling a touch while it is pressed. Tapping a tab selects it here
 * instead of routing, and the grey fill glides across to it; the product
 * swaps it instantly. The fill is one element moved by `x`, not a shared
 * layout animation, so it glides at any scale the card is drawn at. Left
 * alone, it steps through the tabs; arrow keys move between them.
 */
export function BottomNavPrimitive() {
  const [active, setActive] = useState<Tab>("wallet");
  const [scale, setScale] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const index = TABS.findIndex(({ tab }) => tab === active);

  const select = (next: number) => {
    const tab = TABS[(next + TABS.length) % TABS.length]!.tab;
    setActive(tab);
    root.current
      ?.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)
      ?.focus();
  };

  useAutoplay(
    root,
    () => {
      setScale(1.02);
      setTimeout(() => setScale(1), 160);
      setActive(TABS[(index + 1) % TABS.length]!.tab);
    },
    { interval: 2200, delay: 600 },
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") select(index + 1);
    else if (event.key === "ArrowLeft") select(index - 1);
    else return;
    event.preventDefault();
  };

  return (
    <FitStage className="anyday-app" gutter={8} inset={8}>
      <div
        className="relative z-20 flex items-center justify-center p-7"
        ref={root}
      >
        <m.div
          animate={{ scale }}
          className="nav-pill-container-bottom nav-pill-bg-blur relative flex overflow-visible rounded-full p-0.5"
          onTap={() => setScale(1)}
          onTapCancel={() => setScale(1)}
          onKeyDown={onKeyDown}
          onTapStart={() => setScale(1.02)}
          role="tablist"
          aria-label="App sections"
          style={{
            height: "3.875rem",
            backdropFilter: "blur(2rem)",
            WebkitBackdropFilter: "blur(2rem)",
            boxShadow: "0 1.75rem 8rem 0.5rem rgba(0, 0, 0, 0.15)",
            border: "1px solid transparent",
            width: "auto",
            margin: "0 auto",
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 40,
            mass: 0.8,
          }}
        >
          <div className="relative flex flex-1 items-center justify-center gap-1.5">
            <m.span
              animate={{ x: index * STEP }}
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-0 rounded-full"
              initial={false}
              style={{
                width: TAB,
                backgroundColor: "var(--fills-secondary)",
              }}
              transition={GLIDE}
            />
            {TABS.map(({ tab, label }) => {
              const isActive = active === tab;
              return (
                <button
                  key={tab}
                  aria-label={label}
                  aria-selected={isActive}
                  data-tab={tab}
                  tabIndex={isActive ? 0 : -1}
                  className="relative z-10 flex cursor-pointer items-center justify-center rounded-full"
                  onClick={() => setActive(tab)}
                  role="tab"
                  style={{
                    paddingTop: "0.75rem",
                    paddingBottom: "0.75rem",
                    width: "5.75rem",
                  }}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className={`h-8 w-8 transition-[filter,opacity,transform] duration-200 ${isActive ? "" : "nav-icon-inactive"}`}
                    src={`${NAV}/${tab}-active.svg`}
                    style={
                      tab === "wallet" && isActive
                        ? { transform: "translateX(-0.0625rem)" }
                        : undefined
                    }
                  />
                </button>
              );
            })}
          </div>
        </m.div>
      </div>
    </FitStage>
  );
}
