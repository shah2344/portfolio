"use client";

import { AnimatePresence, m } from "motion/react";
import * as React from "react";

import { FitStage } from "../fit-stage";
import { BulkPayoutToolbar } from "./bulk-payout-toolbar";
import { Button } from "./ui/button";
import { ICON_BASE, cn } from "./ui/cn";
import { Input } from "./ui/input";
import { LoaderIcon } from "./ui/loader-icon";
import { NumberFlow } from "./ui/number-flow";
import { useTableSearch } from "./ui/use-table-search";

/*
 * The "Enter amounts" step of app/bulk-payout/page.tsx: the wallet heading
 * and balance, the search / Import header (TableFilterGroup), the member rows
 * with AmountInputCell, the bottom toolbar, and the sending / sent overlay.
 *
 * Steps 2 (details) and 3 (review) are skipped: Continue goes straight to the
 * sending overlay. The page's `fixed` overlay is `absolute` over the page,
 * and its `fixed` toolbar closes the page instead. The page's padding is
 * tightened from pt-12 / pb-24 and the table's gaps are dropped, and amounts
 * are right-aligned.
 */

type Member = {
  id: string;
  name: string;
  mobile_number_code: string;
  mobile_number: string;
  wallet_id: string;
};

const WALLET = {
  id: "w1",
  name: "Downtown",
  currentBalance: 2480,
};

const members: Member[] = [
  {
    id: "m1",
    name: "Maya Chen",
    mobile_number_code: "1",
    mobile_number: "5550100142",
    wallet_id: "w1",
  },
  {
    id: "m2",
    name: "Diego Alvarez",
    mobile_number_code: "1",
    mobile_number: "5550100187",
    wallet_id: "w1",
  },
  {
    id: "m3",
    name: "Priya Nair",
    mobile_number_code: "1",
    mobile_number: "5550100263",
    wallet_id: "w1",
  },
  {
    id: "m4",
    name: "Sam Okafor",
    mobile_number_code: "1",
    mobile_number: "5550100319",
    wallet_id: "w1",
  },
];

const INITIAL_AMOUNTS: Record<string, string> = {
  m1: "120.00",
  m2: "85.50",
};

/** lib/utils/currency.ts */
function formatCurrencyNumber(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyValue(amount: number) {
  return `$${formatCurrencyNumber(amount)}`;
}

function formatCurrencyInput(value: string): string {
  const cleanValue = value.replace(/[^\d.]/g, "");
  const parts = cleanValue.split(".");
  if (parts.length > 2) return value;
  if (parts[1] && parts[1].length > 2) return value;
  if (cleanValue === "" || cleanValue === ".") return cleanValue;
  const [integerPart = "", decimalPart] = parts;
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger;
}

/** lib/utils/phone.ts */
function formatPhoneNumber(code: string, number: string): string {
  const cleanedNumber = number.replace(/\D/g, "");
  const cleanedCode = String(code).replace(/\D/g, "");
  if (cleanedCode === "1" && cleanedNumber.length === 10) {
    return `+${cleanedCode}\u202F(${cleanedNumber.slice(0, 3)}) ${cleanedNumber.slice(3, 6)}-${cleanedNumber.slice(6)}`;
  }
  return `+${cleanedCode} ${cleanedNumber}`;
}

function isAmountInput(value: string) {
  if (/[^\d.,]/.test(value)) return false;
  const [whole = "", decimals, extra] = value.split(".");
  if (extra !== undefined) return false;
  if (decimals !== undefined && decimals.length > 2) return false;
  const digits = whole.replace(/,/g, "");
  return !(digits.length > 1 && digits.startsWith("0"));
}

// AmountInputCell - Completely uncontrolled, uses refs to prevent ANY re-renders
const AmountInputCell = React.memo(
  function AmountInputCell({
    member,
    inputErrorsRef,
    onAmountChange,
    onAmountBlur,
    onEnter,
    inputRefsMap,
    memberAmountsRef,
  }: {
    member: { id: string; wallet_id: string };
    inputErrorsRef: React.RefObject<{ [memberId: string]: boolean }>;
    onAmountChange: (memberId: string, value: string) => void;
    onAmountBlur: (memberId: string) => void;
    onEnter: () => void;
    inputRefsMap: React.RefObject<Map<string, HTMLInputElement>>;
    memberAmountsRef: React.RefObject<{ [memberId: string]: string }>;
  }) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const errorDisplayRef = React.useRef<HTMLParagraphElement>(null);
    const initializedRef = React.useRef(false);

    // Register input in map - runs once
    React.useEffect(() => {
      const map = inputRefsMap.current;
      if (inputRef.current) {
        map.set(member.id, inputRef.current);
        const currentValue = memberAmountsRef.current[member.id] || "";
        if (currentValue && !initializedRef.current) {
          inputRef.current.value = currentValue;
          initializedRef.current = true;
        }
      }
      return () => {
        map.delete(member.id);
      };
    }, [member.id, inputRefsMap, memberAmountsRef]);

    // Update error display without re-rendering component
    React.useEffect(() => {
      const updateErrorDisplay = () => {
        const error = inputErrorsRef.current[member.id] || false;
        if (errorDisplayRef.current) {
          errorDisplayRef.current.style.display = error ? "block" : "none";
        }
        if (inputRef.current) {
          inputRef.current.setAttribute("data-error", error ? "true" : "false");
        }
      };

      updateErrorDisplay();
      const interval = setInterval(updateErrorDisplay, 100);
      return () => clearInterval(interval);
    }, [member.id, inputErrorsRef]);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // The page's rules (digits and commas, one point, two decimals, no
        // leading zero) also hold in the field itself: a keystroke that
        // breaks them is undone rather than shown.
        if (!isAmountInput(value)) {
          e.target.value = memberAmountsRef.current[member.id] || "";
          return;
        }
        memberAmountsRef.current[member.id] = value;
        onAmountChange(member.id, value);
      },
      [member.id, onAmountChange, memberAmountsRef],
    );

    const handleBlur = React.useCallback(() => {
      onAmountBlur(member.id);
    }, [member.id, onAmountBlur]);

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="w-[104px]">
          <Input
            type="text"
            placeholder="0.00"
            aria-label={`Amount for ${member.id}`}
            inputMode="decimal"
            ref={inputRef}
            className="pl-[21px]"
            prefix="$"
            prefixStyle={{
              transform: "translateY(-50%)",
            }}
            data-member-id={member.id}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const currentInput = e.target as HTMLInputElement;
                const allAmountInputs = Array.from(
                  inputRefsMap.current.values(),
                );
                const currentIndex = allAmountInputs.indexOf(currentInput);

                if (currentIndex < allAmountInputs.length - 1) {
                  allAmountInputs[currentIndex + 1]?.focus();
                } else {
                  onEnter();
                }
              }
            }}
          />
        </div>
        <p
          ref={errorDisplayRef}
          className="text-small-default text-left whitespace-nowrap text-[#ef4444]"
          style={{ display: "none" }}
        >
          Exceeds wallet balance
        </p>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.member.id === nextProps.member.id,
);

function BulkPayout() {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [sendingProgress, setSendingProgress] = React.useState({
    current: 0,
    total: 0,
  });
  const [memberAmounts, setMemberAmounts] = React.useState<{
    [memberId: string]: string;
  }>(INITIAL_AMOUNTS);
  const memberAmountsRef = React.useRef<{ [memberId: string]: string }>({
    ...INITIAL_AMOUNTS,
  });
  const inputErrorsRef = React.useRef<{ [memberId: string]: boolean }>({});
  const inputRefsMap = React.useRef(new Map<string, HTMLInputElement>());
  const [inputErrors, setInputErrors] = React.useState<{
    [memberId: string]: boolean;
  }>({});
  const timers = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [runId, setRunId] = React.useState(0);

  const {
    searchValue: searchTerm,
    setSearchValue: setSearchTerm,
    isSearchFocused,
    setIsSearchFocused,
    isFiltering,
  } = useTableSearch();

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  const recalculateAllErrors = React.useCallback(() => {
    const newErrors: { [memberId: string]: boolean } = {};

    let cumulativeTotal = 0;
    let balanceExceeded = false;

    for (const member of members) {
      const amount = memberAmounts[member.id] || "";
      const numValue = amount ? parseFloat(amount.replace(/,/g, "")) || 0 : 0;

      if (numValue > 0) {
        cumulativeTotal += numValue;
      }

      if (cumulativeTotal > WALLET.currentBalance && numValue > 0) {
        balanceExceeded = true;
      }

      newErrors[member.id] = balanceExceeded && numValue > 0;
    }

    setInputErrors(newErrors);
  }, [memberAmounts]);

  // Recalculate errors whenever memberAmounts changes - but defer to prevent blocking
  React.useEffect(() => {
    if (currentStep === 1) {
      React.startTransition(() => {
        recalculateAllErrors();
      });
    }
  }, [memberAmounts, currentStep, recalculateAllErrors]);

  React.useEffect(() => {
    memberAmountsRef.current = memberAmounts;
  }, [memberAmounts]);

  React.useEffect(() => {
    inputErrorsRef.current = inputErrors;
  }, [inputErrors]);

  const handleAmountInputChange = React.useCallback(
    (memberId: string, value: string) => {
      const cleanValue = value.replace(/[^\d.,]/g, "");

      const parts = cleanValue.split(".");
      if (parts.length > 2) {
        return;
      }

      if (parts[1] && parts[1].length > 2) {
        return;
      }

      const numericValue = cleanValue.replace(/,/g, "");
      if (
        numericValue.length > 1 &&
        numericValue.startsWith("0") &&
        !numericValue.startsWith("0.")
      ) {
        return;
      }

      // Allow deletion of decimal point from "0."
      const currentAmount = memberAmountsRef.current[memberId] || "";
      if (currentAmount === "0." && numericValue === "0") {
        memberAmountsRef.current[memberId] = "";
        React.startTransition(() => {
          setMemberAmounts((prev) => ({
            ...prev,
            [memberId]: "",
          }));
          setInputErrors((prev) => ({
            ...prev,
            [memberId]: false,
          }));
        });
        return;
      }

      // Don't allow just "0", auto-add decimal point
      if (numericValue === "0") {
        memberAmountsRef.current[memberId] = "0.";
        React.startTransition(() => {
          setMemberAmounts((prev) => ({
            ...prev,
            [memberId]: "0.",
          }));
          setInputErrors((prev) => ({
            ...prev,
            [memberId]: false,
          }));
        });
        return;
      }

      // Allow empty input
      if (numericValue === "") {
        memberAmountsRef.current[memberId] = "";
        React.startTransition(() => {
          setMemberAmounts((prev) => ({
            ...prev,
            [memberId]: "",
          }));
          setInputErrors((prev) => ({
            ...prev,
            [memberId]: false,
          }));
        });
        return;
      }

      // Format with commas
      const formattedValue = formatCurrencyInput(cleanValue);
      memberAmountsRef.current[memberId] = formattedValue;

      React.startTransition(() => {
        setMemberAmounts((prev) => ({
          ...prev,
          [memberId]: formattedValue,
        }));
      });
    },
    [],
  );

  const handleAmountInputBlur = React.useCallback((memberId: string) => {
    const currentAmount = memberAmountsRef.current[memberId] || "";

    const commit = (formattedValue: string) => {
      memberAmountsRef.current[memberId] = formattedValue;
      const input = inputRefsMap.current.get(memberId);
      if (input) {
        input.value = formattedValue;
      }
      setMemberAmounts((prev) => ({
        ...prev,
        [memberId]: formattedValue,
      }));
    };

    if (currentAmount && !String(currentAmount).includes(".")) {
      const numericValue = String(currentAmount).replace(/,/g, "");
      commit(formatCurrencyInput(`${numericValue}.00`));
    } else if (currentAmount && String(currentAmount).endsWith(".")) {
      const numericValue = String(currentAmount).replace(/,/g, "").slice(0, -1);
      commit(formatCurrencyInput(`${numericValue}.00`));
    } else if (currentAmount && String(currentAmount).includes(".")) {
      const parts = String(currentAmount).split(".");
      if (parts.length === 2) {
        const paddedDecimal = (parts[1] ?? "").padEnd(2, "0");
        commit(formatCurrencyInput(`${parts[0]}.${paddedDecimal}`));
      }
    }
  }, []);

  const totalAmount = React.useMemo(() => {
    return Object.values(memberAmounts).reduce((sum: number, amount) => {
      if (!amount || amount === "") return sum;
      const numValue = parseFloat(String(amount).replace(/,/g, "")) || 0;
      return sum + numValue;
    }, 0);
  }, [memberAmounts]);

  const hasAnyAmount = React.useMemo(() => {
    return Object.values(memberAmounts).some(
      (amount) => (parseFloat(String(amount).replace(/,/g, "")) || 0) > 0,
    );
  }, [memberAmounts]);

  // The page's four checks, reduced: every member here is active.
  const isContinueDisabled = React.useMemo(() => {
    if (currentStep !== 1) return false;
    if (!hasAnyAmount) return true;
    return Object.values(inputErrors).some((error) => error);
  }, [currentStep, hasAnyAmount, inputErrors]);

  const filteredMembers = React.useMemo(() => {
    return members.filter((member) => {
      if (!searchTerm.trim()) return true;
      return member.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [searchTerm]);

  /*
   * Stands in for handleConfirmBulkPayout: the page POSTs each payout and
   * counts up as they land, waits at least 1s, shows "Payments sent!", then
   * the summary. Here the sends are timers, and the sent screen returns to
   * the amounts.
   */
  const startSending = () => {
    const paying = members.filter(
      (member) =>
        (parseFloat((memberAmounts[member.id] || "").replace(/,/g, "")) || 0) >
        0,
    );
    const total = paying.length;
    if (total === 0) return;

    setSendingProgress({ current: 0, total });
    setCurrentStep(4);

    const each = 450;
    paying.forEach((_, index) => {
      timers.current.push(
        setTimeout(
          () => setSendingProgress({ current: index + 1, total }),
          each * (index + 1),
        ),
      );
    });
    const sent = Math.max(each * total, 1000);
    timers.current.push(setTimeout(() => setCurrentStep(5), sent));
    timers.current.push(
      setTimeout(() => {
        // Back to a fresh amounts step.
        memberAmountsRef.current = {};
        setMemberAmounts({});
        setInputErrors({});
        setSearchTerm("");
        setRunId((id) => id + 1);
        setCurrentStep(1);
      }, sent + 1800),
    );
  };

  const handleContinue = () => {
    if (isContinueDisabled) return;
    const hasErrors = Object.values(inputErrors).some((error) => error);
    if (hasErrors) return;
    startSending();
  };

  return (
    // The page's white ground is left out so the payout sits on its card's
    // grey like the other components; the sending screen covers it in the
    // same grey. The page is as tall as its content, and the toolbar, fixed
    // to the window's foot in the product, is the last thing in it, so it
    // meets the card's bottom edge.
    <div className="relative flex flex-col overflow-hidden">
      {/* Sending/Sent State Overlay - Steps 4 & 5 */}
      {(currentStep === 4 || currentStep === 5) && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 bg-[#f3f3f3]"
        >
          <AnimatePresence>
            {currentStep === 4 && (
              <m.div
                key="sending-content"
                initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(2px)", y: 4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              >
                <m.div
                  initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="mb-4"
                >
                  <svg
                    className="ios-spinner h-9 w-9"
                    viewBox="0 0 200 200"
                    style={{
                      width: "36px",
                      height: "36px",
                      color: "var(--icon-primary)",
                    }}
                  >
                    <defs>
                      <path
                        id="sending-spinner-path"
                        d="M 92.5 25 C 92.5 21.686 95.186 19 98.5 19 L 98.5 19 C 101.814 19 104.5 21.686 104.5 25 L 104.5 50 C 104.5 53.314 101.814 56 98.5 56 L 98.5 56 C 95.186 56 92.5 53.314 92.5 50 Z"
                        fill="currentColor"
                      />
                    </defs>
                    <g opacity="0.2">
                      <use
                        href="#sending-spinner-path"
                        style={{ transformOrigin: "100px 100px" }}
                      />
                    </g>
                    {[45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
                      <g
                        key={angle}
                        opacity={[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1][index]}
                      >
                        <use
                          href="#sending-spinner-path"
                          style={{
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: "100px 100px",
                          }}
                        />
                      </g>
                    ))}
                  </svg>
                </m.div>
                <m.h2
                  initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
                  className="text-large-heavy mb-3 text-[var(--label-primary)]"
                >
                  Processing payments
                </m.h2>
                <m.p
                  initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
                  className="text-regular-default text-[var(--label-secondary)]"
                >
                  Sending <NumberFlow value={sendingProgress.current} />/
                  {sendingProgress.total}
                </m.p>
              </m.div>
            )}
            {currentStep === 5 && (
              <m.div
                key="sent-content"
                initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(2px)", y: 4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              >
                <m.div
                  initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="mb-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ICON_BASE}/checkmark.circle.svg`}
                    alt=""
                    className="h-10 w-10"
                    style={{ width: "40px", height: "40px" }}
                  />
                </m.div>
                <m.h2
                  initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
                  className="text-large-heavy text-[var(--label-primary)]"
                >
                  Payments sent!
                </m.h2>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}

      {/* Main Content */}
      <div
        className={`flex ${currentStep === 4 || currentStep === 5 ? "pointer-events-none opacity-0" : ""}`}
      >
        {/* Center Column - Content */}
        <div className="flex flex-1 justify-center overflow-visible px-6 pt-8 pb-6">
          <div className="w-full max-w-[560px]">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex flex-col" style={{ gap: "4px" }}>
                <h1 className="text-large-heavy text-[var(--label-primary)]">
                  {WALLET.name}
                </h1>
                <p className="text-regular-default text-[var(--label-secondary)]">
                  Balance: {formatCurrencyValue(WALLET.currentBalance)}
                </p>
              </div>
            </div>

            {/* Amounts Table */}
            <div>
              <div>
                {/* Search and Filter Header (TableFilterGroup) */}
                <div
                  className="relative flex w-full flex-wrap items-center gap-3 rounded-t-2xl border border-[var(--border-solid)] bg-[var(--bg-shade)] pr-3 pl-4"
                  style={{ paddingTop: "12px", paddingBottom: "12px" }}
                >
                  <div
                    className="relative flex min-h-0 min-w-0 flex-[1_0_0] items-center gap-2 px-0"
                    style={{ height: "2rem" }}
                  >
                    <div className="flex h-5 w-5 items-center justify-center">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <m.div
                          key={isFiltering ? "spinner" : "search"}
                          initial={{
                            opacity: 0,
                            scale: 0.25,
                            filter: "blur(4px)",
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.25,
                            filter: "blur(4px)",
                          }}
                          transition={{
                            type: "spring",
                            duration: 0.3,
                            bounce: 0,
                          }}
                        >
                          {isFiltering ? (
                            <LoaderIcon
                              role="status"
                              aria-label="Loading"
                              className={cn(
                                "h-5 w-5 animate-spin text-[var(--label-secondary)]",
                              )}
                            />
                          ) : (
                            <svg
                              className={`h-5 w-5 transition-colors duration-200 ${
                                isSearchFocused
                                  ? "text-[var(--label-primary)]"
                                  : "text-[var(--icon-faint)]"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                              />
                            </svg>
                          )}
                        </m.div>
                      </AnimatePresence>
                    </div>
                    <input
                      type="text"
                      placeholder="Search..."
                      aria-label="Search members"
                      value={searchTerm}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      onChange={(e) => {
                        const value = e.target.value;
                        const capitalizedValue =
                          value.charAt(0).toUpperCase() + value.slice(1);
                        setSearchTerm(capitalizedValue);
                      }}
                      className="flex-1 bg-transparent text-[0.9375rem] text-[var(--label-primary)] placeholder-[var(--label-faint)] outline-none"
                    />
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {searchTerm.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="cursor-pointer text-[0.9375rem] font-medium text-[var(--label-link)] hover:underline"
                          style={{
                            lineHeight: "1.25rem",
                            letterSpacing: "-0.008125rem",
                          }}
                        >
                          Reset
                        </button>
                        <div
                          className="border-r border-[var(--border-heavy)]"
                          style={{
                            height: "1.25rem",
                            marginLeft: "0.25rem",
                            marginRight: "0.25rem",
                          }}
                        />
                      </>
                    )}
                    <Button
                      variant="secondary"
                      size="regular"
                      leftIcon={
                        <svg
                          className="h-5 w-5"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      }
                    >
                      Import
                    </Button>
                  </div>
                </div>

                {/* Table for this wallet */}
                <div
                  className="relative overflow-visible rounded-b-[var(--radius-6)] border border-solid border-[var(--border-solid)]"
                  style={{ borderTop: "none" }}
                >
                  <div
                    data-slot="table-container"
                    className="relative w-full overflow-visible"
                  >
                    <table
                      data-slot="table"
                      className="text-regular-default w-full caption-bottom"
                    >
                      <thead
                        data-slot="table-header"
                        className="[&_tr]:border-b"
                      >
                        <tr
                          data-slot="table-row"
                          className="w-full border-b border-[var(--border-solid)] bg-[var(--bg-shade)] transition-colors duration-[30ms]"
                        >
                          <th
                            data-slot="table-head"
                            className="h-10 min-w-0 px-4 py-3 text-left align-middle text-[0.875rem] leading-[1rem] font-medium whitespace-nowrap text-[var(--label-secondary)]"
                          >
                            Member
                          </th>
                          <th
                            data-slot="table-head"
                            className="h-10 w-[172px] py-3 pr-6 pl-4 text-right align-middle text-[0.875rem] leading-[1rem] font-medium whitespace-nowrap text-[var(--label-secondary)]"
                          >
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        data-slot="table-body"
                        className="w-full [&_tr:last-child]:border-0"
                      >
                        {filteredMembers.length === 0 ? (
                          <tr
                            data-slot="table-row"
                            className="w-full border-b border-[var(--border-solid)] bg-[var(--control-base)] transition-colors duration-[30ms]"
                          >
                            <td
                              data-slot="table-cell"
                              colSpan={2}
                              className="p-2 align-middle whitespace-nowrap"
                            >
                              <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                  <p className="mb-1 font-medium text-[var(--label-primary)]">
                                    No members match your search.
                                  </p>
                                  <p className="text-sm text-[var(--label-secondary)]">
                                    Try adjusting your search.
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((member, index) => {
                            const isLastRow =
                              index === filteredMembers.length - 1;
                            return (
                              <tr
                                key={`${runId}-${member.id}`}
                                data-slot="table-row"
                                className="w-full border-b border-[var(--border-solid)] bg-white transition-colors duration-[30ms] last:border-b-0 hover:bg-[var(--bg-shade)]"
                              >
                                <td
                                  data-slot="table-cell"
                                  className={`min-w-0 py-4 pr-5 pl-4 text-left align-middle whitespace-nowrap ${isLastRow ? "rounded-bl-[var(--radius-6)]" : ""}`}
                                >
                                  <div className="flex min-w-0 flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="truncate text-[1rem] font-medium text-[var(--label-primary)]"
                                        style={{
                                          lineHeight: "1.25rem",
                                          letterSpacing: "-0.015rem",
                                        }}
                                      >
                                        {member.name}
                                      </span>
                                    </div>
                                    <span
                                      className="truncate text-[14px] font-normal tracking-[-0.08px] text-[var(--label-secondary)]"
                                      style={{
                                        lineHeight: "18px",
                                        letterSpacing: "-0.08px",
                                      }}
                                    >
                                      {formatPhoneNumber(
                                        member.mobile_number_code,
                                        member.mobile_number,
                                      ) || "—"}
                                    </span>
                                  </div>
                                </td>
                                <td
                                  data-slot="table-cell"
                                  className={`py-4 pr-6 pl-4 text-right align-middle whitespace-nowrap ${isLastRow ? "rounded-br-[var(--radius-6)]" : ""}`}
                                >
                                  <AmountInputCell
                                    member={member}
                                    inputErrorsRef={inputErrorsRef}
                                    onAmountChange={handleAmountInputChange}
                                    onAmountBlur={handleAmountInputBlur}
                                    onEnter={handleContinue}
                                    inputRefsMap={inputRefsMap}
                                    memberAmountsRef={memberAmountsRef}
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Toolbar - amounts step. It stays mounted under the sending
          screen so the page keeps its height. */}
      <AnimatePresence>
        {(currentStep === 1 || currentStep === 4 || currentStep === 5) && (
          <m.div
            className="relative"
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 40,
            }}
          >
            <BulkPayoutToolbar
              totalAmount={Number(totalAmount)}
              isContinueDisabled={isContinueDisabled}
              onReviewPayout={handleContinue}
              onBack={() => {}}
              buttonText="Continue"
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PortalBulkPayout() {
  return (
    <FitStage bleed gutter={0} inset={0} className="anyday-portal">
      <BulkPayout />
    </FitStage>
  );
}
