"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { FitStage } from "../fit-stage";
import { ICON_BASE } from "./ui/cn";
import { AnimatedAmount } from "./ui/animated-amount";
import { Button } from "./ui/button";

/*
 * components/features/wallets/wallet-combined-card.tsx. Same markup and
 * classes, with the product's responsive variants resolved for a phone
 * (below `sm`): one column, icon-only Add and Transfer, and the location
 * details section hidden, as the product hides it below `xl`. The PAD and transfer
 * drawers are not ported, so "Add", "Transfer" and the PAD line do nothing.
 */

function formatWalletDisplayId(walletId: string) {
  const numericId = Number(walletId);

  if (Number.isInteger(numericId) && numericId >= 0) {
    return numericId.toString().padStart(6, "0");
  }

  return walletId;
}

const details = {
  line_1: "214 Maple Street",
  line_2: "",
  city: "Springfield",
  state: "ON",
  zip_code: "K1A 0B1",
};

function WalletCombinedCard({
  balance,
  isLoading = false,
  walletId,
  padEnabled = false,
  padFloatAmount = null,
  padNextLoadDate = null,
  memberCount,
  onCopied,
  onAdd,
  onTransfer,
}: {
  balance: number;
  isLoading?: boolean;
  walletId: string;
  padEnabled?: boolean;
  padFloatAmount?: number | null;
  padNextLoadDate?: string | null;
  memberCount: number;
  onCopied: () => void;
  onAdd: () => void;
  onTransfer: () => void;
}) {
  const displayWalletId = formatWalletDisplayId(walletId);

  // Determine balance state for styling and button display
  const isFunded = balance > 0;
  const isNegative = balance < 0;

  // Fallback minimum balance (used when padFloatAmount not available)
  const minimumBalance = 24000;

  const handleCopyWalletId = async () => {
    try {
      await navigator.clipboard.writeText(walletId);
    } catch {
      // Clipboard can be blocked; the product's toast still shows.
    }
    onCopied();
  };

  const formatAddress = () => {
    const line1 =
      [details.line_1, details.line_2].filter(Boolean).join(" ") || "—";
    const line2 =
      [details.city, details.state, details.zip_code]
        .filter(Boolean)
        .join(", ") || "";
    return { line1, line2 };
  };

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--radius-6)] border border-black/[0.08] bg-[var(--bg-base)]"
      style={{
        boxShadow:
          "0 1px 2px 0 rgba(0, 0, 0, 0.01), 0 4px 12px 0 rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Left Section: Overview */}
      <div className="flex flex-1 flex-col gap-4 px-6 pt-6 pb-6">
        {/* Header: Available balance label and action buttons */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span
              className="font-normal text-[var(--label-secondary)]"
              style={{
                fontSize: "0.9375rem",
                lineHeight: "1.25rem",
                letterSpacing: "-0.015rem",
              }}
            >
              Available balance
            </span>
            <span
              className={`font-medium ${
                isNegative
                  ? "text-[var(--label-critical)]"
                  : "text-[var(--label-primary)]"
              }`}
              style={{
                fontSize: "1.75rem",
                lineHeight: "2rem",
                letterSpacing: "-0.024375rem",
                marginTop: "-0.125rem",
              }}
            >
              <AnimatedAmount
                value={Math.abs(balance)}
                isLoading={isLoading}
                animateOnLoad={true}
                numericVariant="proportional"
              />
            </span>
          </div>
          <div className="flex items-start gap-2">
            {isFunded ? (
              <Button
                variant="secondary"
                size="regular"
                aria-label="Add funds"
                onClick={onAdd}
                className="h-[2.125rem] w-[2.125rem] justify-center px-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-5 w-5"
                  src={`${ICON_BASE}/Add.svg`}
                  style={{ width: "1.25rem", height: "1.25rem" }}
                />
                <span className="text-regular-plus hidden">Add</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="regular"
                className="h-[2.125rem]"
                onClick={onAdd}
                leftIcon={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-5 w-5"
                    src={`${ICON_BASE}/Add.svg`}
                    style={{
                      filter: "brightness(0) invert(1)",
                      strokeWidth: "2px",
                    }}
                  />
                }
              >
                <span className="text-regular-plus">Add funds</span>
              </Button>
            )}
            {/* Transfer arrows button */}
            <Button
              variant="secondary"
              size="regular"
              aria-label="Transfer between wallets"
              onClick={onTransfer}
              className="h-[2.125rem] w-[2.125rem] justify-center px-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-5 w-5"
                src={`${ICON_BASE}/transfer.svg`}
                style={{ width: "20px", height: "20px" }}
              />
              <span className="text-regular-plus hidden">Transfer</span>
            </Button>
          </div>
        </div>

        {/* The product's 240px card pushes the PAD line to its foot with a
            flexible spacer; here that room is a fixed band, so the balance
            and the PAD line read as two sections. */}
        <div className="h-12" />

        {/* Divider above PAD Section */}
        <div className="h-px w-full bg-black/[0.08]" />

        {/* PAD Section */}
        <div className="flex flex-col gap-0">
          {padEnabled ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ICON_BASE}/pad_wallet.svg`}
                alt=""
                className="h-8 w-8"
              />
              <div className="flex flex-col gap-0">
                <span className="text-regular-plus text-[var(--label-primary)]">
                  Minimum balance set at{" "}
                  <span className="font-medium">
                    $
                    {(padFloatAmount || minimumBalance).toLocaleString("en-US")}
                  </span>
                  <span className="ml-1">›</span>
                </span>
                <span className="text-small-default text-[var(--label-secondary)]">
                  {padNextLoadDate
                    ? `Next load: ${new Date(padNextLoadDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "Next load: Tomorrow"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ICON_BASE}/pad_wallet.svg`}
                alt=""
                className="h-8 w-8"
              />
              <div className="flex flex-col gap-0">
                <button
                  type="button"
                  className="text-regular-plus flex items-center gap-0.5 text-left text-[var(--label-link)] hover:underline"
                >
                  Set up a PAD
                  <span className="ml-0.5">›</span>
                </button>
                <span className="text-small-default text-[var(--label-secondary)]">
                  Automate deposits to ensure you never miss a payment
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider - full height */}
      <div className="hidden w-px self-stretch bg-black/[0.08]" />

      {/* Right Section: Location Details */}
      <div
        className="hidden flex-1 flex-col px-5 pt-5 pb-5"
        style={{ gap: "20px" }}
      >
        {/* Header */}
        <div>
          <span className="text-regular-heavy text-[var(--label-primary)]">
            Location details
          </span>
        </div>

        {/* Details List */}
        <div className="flex flex-col gap-5">
          {/* Wallet ID */}
          <div className="flex items-center">
            <span
              className="text-regular-default text-[var(--label-secondary)]"
              style={{ minWidth: "8.75rem" }}
            >
              Wallet ID
            </span>
            <div
              className="flex items-center gap-1.5"
              style={{ marginLeft: "1.25rem" }}
            >
              <span className="text-regular-plus font-mono text-black">
                {displayWalletId}
              </span>
              <button
                type="button"
                onClick={handleCopyWalletId}
                className="flex h-4 w-4 items-center justify-center transition-opacity hover:opacity-70"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Copy"
                  className="h-4 w-4"
                  src={`${ICON_BASE}/copy.svg`}
                  style={{
                    filter:
                      "brightness(0) saturate(100%) invert(71%) sepia(0%) saturate(0%) hue-rotate(175deg) brightness(94%) contrast(91%)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="flex items-center">
            <span
              className="text-regular-default text-[var(--label-secondary)]"
              style={{ minWidth: "8.75rem" }}
            >
              Members
            </span>
            <div style={{ marginLeft: "1.25rem" }}>
              <span className="text-regular-plus text-black">
                {memberCount}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start">
            <span
              className="text-regular-default text-[var(--label-secondary)]"
              style={{ minWidth: "8.75rem" }}
            >
              Address
            </span>
            <div
              className="flex flex-col items-start gap-0.5 text-left"
              style={{ marginLeft: "1.25rem" }}
            >
              <span className="text-regular-plus text-black">
                {formatAddress().line1}
              </span>
              {formatAddress().line2 && (
                <span className="text-regular-plus text-black">
                  {formatAddress().line2}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The product's `toast.success(...)` through its Sonner overrides
 * (app/globals.css, components/ui/sonner.tsx). Sonner is not installed, so
 * this is a local toast with the same box, type and success icon; it
 * enters from below and leaves after Sonner's default 4s.
 */
function WalletToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <m.div
          key={message}
          data-sonner-toast=""
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, x: "-50%", y: "100%" }}
          animate={{ opacity: 1, x: "-50%", y: 0 }}
          exit={{ opacity: 0, x: "-50%", y: "50%" }}
          transition={{ duration: 0.4, ease: [0.21, 1.02, 0.73, 1] }}
        >
          <div data-icon="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              height="20"
              width="20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div data-title="">{message}</div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function WalletBalance() {
  // The product opens the add and transfer drawers; here they move money
  // straight away, so the balance rolls.
  const [balance, setBalance] = useState(18420.5);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const showToast = () => {
    if (timer.current) clearTimeout(timer.current);
    setToast("Wallet ID copied to clipboard");
    timer.current = setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="relative">
      <WalletCombinedCard
        balance={balance}
        onAdd={() => setBalance((value) => value + 2500)}
        onTransfer={() => setBalance((value) => value - 1250)}
        walletId="1042"
        padEnabled
        padFloatAmount={null}
        padNextLoadDate={null}
        memberCount={14}
        onCopied={showToast}
      />
      <WalletToast message={toast} />
    </div>
  );
}

export function PortalWalletBalance() {
  return (
    <FitStage gutter={16} className="anyday-portal">
      <WalletBalance />
    </FitStage>
  );
}
