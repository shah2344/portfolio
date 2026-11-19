"use client";

import { useRef, useState } from "react";
import { m } from "motion/react";
import NumberFlow, { continuous } from "@number-flow/react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

const ICONS = "/media/craft/components/app/icons/wallet";

function WalletBalanceDisplay({ displayAmount }: { displayAmount: number }) {
  return (
    <div
      className="flex w-full flex-col items-center pb-8"
      style={{
        paddingTop: "0.75rem",
      }}
    >
      <div
        className="price flex items-baseline justify-center leading-none text-[var(--labels-primary)]"
        style={{
          fontSize: "var(--large-amount)",
          lineHeight: "var(--large-amount)",
          letterSpacing: "var(--letter-spacing-large-amount)",
          fontFamily: "var(--font-inter)",
          fontWeight: 650,
          minHeight: "var(--large-amount)",
          width: "100%",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            fontFamily: "var(--font-inter)",
            fontWeight: 650,
            letterSpacing: "var(--letter-spacing-large-amount)",
            color: "var(--labels-primary)",
          }}
        >
          {/* One flow for the whole amount, so the dollar sign and the
              point slide with the digits instead of jumping. The product
              writes the sign and point as plain text between two flows. */}
          <NumberFlow
            value={Math.round(displayAmount * 100) / 100}
            plugins={[continuous]}
            format={{
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
          />
        </span>
      </div>
      <p
        className="-mt-1.5 text-[15px] text-[var(--labels-secondary)]"
        style={{ fontWeight: 500, height: "20px", lineHeight: "20px" }}
      >
        Available balance
      </p>
    </div>
  );
}

/**
 * The wallet home's balance over its action row (components/ui/wallet-controls
 * .tsx): Receive, Send and Zelle. Here receiving adds money and sending takes
 * it away, so the balance's digits roll the way they do when money moves.
 * Left alone, it presses them itself now and then: a tip comes in, a
 * transfer goes out.
 */
const SCRIPT = ["Receive", "Send", "Receive", "Zelle"];

export function AmountPrimitive() {
  const [balance, setBalance] = useState(1248.5);
  const [pressed, setPressed] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const beat = useRef(0);

  const actions = [
    {
      label: "Receive",
      icon: "receive",
      primary: false,
      change: 64.25,
    },
    { label: "Send", icon: "send", primary: true, change: -48 },
    { label: "Zelle", icon: "zelle", primary: false, change: -100 },
  ];

  const apply = (change: number) =>
    setBalance((current) =>
      Math.max(0, Math.round((current + change) * 100) / 100),
    );

  useAutoplay(
    root,
    () => {
      const label = SCRIPT[beat.current++ % SCRIPT.length] ?? "Receive";
      const action = actions.find((item) => item.label === label);
      if (!action) return;
      setPressed(label);
      setTimeout(() => {
        setPressed(null);
        apply(action.change);
      }, 180);
    },
    { interval: 3200 },
  );

  return (
    <FitStage className="anyday-app" gutter={36}>
      <div ref={root}>
        <WalletBalanceDisplay displayAmount={balance} />
        <div className="flex items-center justify-center gap-8">
          {actions.map((action) => (
            <div key={action.label} className="icon-button-circle">
              <m.button
                type="button"
                animate={{ scale: pressed === action.label ? 0.92 : 1 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => apply(action.change)}
                className={
                  action.primary
                    ? "icon-button-circle-btn-primary"
                    : "icon-button-circle-btn"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ICONS}/${action.icon}.svg`}
                  alt=""
                  className={
                    action.primary
                      ? "primary-button-icon flex-shrink-0"
                      : "flex-shrink-0"
                  }
                  style={{ width: "1.875rem", height: "1.875rem" }}
                />
              </m.button>
              <span className="icon-button-circle-label">{action.label}</span>
            </div>
          ))}
        </div>
      </div>
    </FitStage>
  );
}
