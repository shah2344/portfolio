"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { AnimatePresence, m } from "motion/react";

import { PrimaryButton } from "./ui/primary-button";
import { SlideButton, type SlideButtonRef } from "./ui/slide-button";

type Status = "idle" | "sending" | "sent";

/** How long the send shows "Sending…" before it lands, as on the dev page. */
const SENDING_MS = 2000;
/** How long the confirmation stays before the review comes back on its own. */
const SENT_MS = 7000;

const EASE = [0.4, 0.0, 0.2, 1] as const;
const FOOTNOTE_GAP_PX = 20;
/** The gap between one line of the sent title and the next arriving. */
const LINE_STAGGER = 0.12;

const ROW_SPRING = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.5,
} as const;
const INFO_ICON = "/media/craft/components/app/icons/status/info.svg";

type Detail = {
  label: string;
  value: string;
  info?: boolean;
  /** Leaves once the send starts, as processing time does. */
  transient?: boolean;
};

type Transfer = {
  kind: string;
  amount: string;
  recipient: { name: string; color: string };
  /** What the recipient is reached by, then how long it takes. */
  details: Detail[];
  /** The fee and the total, under the divider. */
  cost: Detail[];
  title: string;
  arrival: string;
};

/**
 * Each send is a different kind of transfer, the ways a wallet for people
 * paid in tips moves money: out to a friend, to the rest of the shift, to
 * the bank, and to a debit card when it can't wait.
 */
const TRANSFERS: Transfer[] = [
  {
    kind: "e-Transfer",
    amount: "100.00",
    recipient: { name: "Maya Chen", color: "var(--purple)" },
    details: [
      { label: "Email", value: "maya@example.com" },
      { label: "Processing time", value: "~30 minutes", transient: true },
    ],
    cost: [
      { label: "e-Transfer fee", value: "$1.50", info: true },
      { label: "Total", value: "$101.50" },
    ],
    title: "Your $100.00 transfer to Maya Chen is on its way.",
    arrival: "It should arrive within 30 minutes.",
  },
  {
    kind: "Tip out",
    amount: "48.00",
    recipient: { name: "Jordan Lee", color: "var(--teal)" },
    details: [
      { label: "Shift", value: "Friday dinner" },
      { label: "Share", value: "4% of sales", transient: true },
    ],
    cost: [
      { label: "Tip-out fee", value: "Free", info: true },
      { label: "Total", value: "$48.00" },
    ],
    title: "You tipped out Jordan Lee $48.00.",
    arrival: "It\u2019s already in their AnyDay wallet.",
  },
  {
    kind: "Bank transfer",
    amount: "250.00",
    recipient: { name: "Chequing ••4821", color: "var(--indigo)" },
    details: [
      { label: "Account", value: "Chequing ••4821" },
      {
        label: "Processing time",
        value: "1\u20132 business days",
        transient: true,
      },
    ],
    cost: [
      { label: "Transfer fee", value: "Free", info: true },
      { label: "Total", value: "$250.00" },
    ],
    title: "$250.00 is on its way to your chequing account.",
    arrival: "It should land in 1\u20132 business days.",
  },
  {
    kind: "Instant cash out",
    amount: "80.00",
    recipient: { name: "Debit ••7302", color: "var(--orange)" },
    details: [
      { label: "Card", value: "Debit ••7302" },
      { label: "Processing time", value: "Instant", transient: true },
    ],
    cost: [
      { label: "Instant fee", value: "$1.20", info: true },
      { label: "Total", value: "$81.20" },
    ],
    title: "$80.00 is on its way to your debit card.",
    arrival: "It should be there in a minute or two.",
  },
];

type Row = ({ kind: "row" } & Detail) | { kind: "divider"; key: string };

/**
 * The review step's metadata (getMetadataGroup1 plus the fee and total the
 * step adds): how the recipient is reached and how long it takes, a
 * divider, then the fee and the total. Processing time leaves once the send
 * starts, and the whole block blurs away with the amount card once it lands.
 */
function rowsFor(transfer: Transfer, status: Status): Row[] {
  return [
    ...transfer.details
      .filter((detail) => status === "idle" || !detail.transient)
      .map((detail) => ({ kind: "row" as const, ...detail })),
    { kind: "divider", key: "divider" },
    ...transfer.cost.map((detail) => ({ kind: "row" as const, ...detail })),
  ];
}

function Metadata({
  transfer,
  status,
}: {
  transfer: Transfer;
  status: Status;
}) {
  const sent = status === "sent";
  return (
    <div
      className="flex flex-col"
      style={{
        marginTop: "3rem",
        fontFamily: "var(--font-inter)",
        gap: "24px",
        overflow: "hidden",
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {rowsFor(transfer, status).map((row) =>
          row.kind === "divider" ? (
            <m.div
              key={row.key}
              layout
              animate={{
                opacity: sent ? 0 : 1,
                translateY: sent ? "-0.75rem" : 0,
                filter: sent ? "blur(4px)" : "blur(0px)",
              }}
              transition={{ layout: ROW_SPRING, duration: 0.4, ease: EASE }}
              className="w-full"
              style={{
                // The product's hairline all but vanishes on the card's
                // grey, so the break between details and cost is drawn
                // as a firmer rule.
                backgroundColor: "rgba(0, 0, 0, 0.08)",
                height: "2px",
                borderRadius: "1px",
                position: "relative",
                zIndex: 1,
              }}
            />
          ) : (
            <m.div
              key={row.label}
              layout
              initial={{ opacity: 0, translateY: "-8px", filter: "blur(5px)" }}
              animate={{
                opacity: sent ? 0 : 1,
                translateY: sent ? "-0.75rem" : 0,
                filter: sent ? "blur(4px)" : "blur(0px)",
              }}
              exit={{
                opacity: 0,
                translateY: "-0.75rem",
                filter: "blur(4px)",
                transition: ROW_SPRING,
              }}
              transition={{ layout: ROW_SPRING, default: ROW_SPRING }}
              className="flex items-center justify-between"
              style={{ position: "relative", zIndex: 1, overflow: "hidden" }}
            >
              {row.info ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-spec-17 text-[var(--labels-secondary)]">
                    {row.label}
                  </span>
                  <div
                    aria-hidden="true"
                    style={{
                      width: "1.375rem",
                      height: "1.375rem",
                      maskImage: `url(${INFO_ICON})`,
                      WebkitMaskImage: `url(${INFO_ICON})`,
                      backgroundColor: "var(--labels-secondary)",
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                    }}
                  />
                </div>
              ) : (
                <span className="text-spec-17 text-[var(--labels-secondary)]">
                  {row.label}
                </span>
              )}
              <span className="text-spec-17 font-medium text-[var(--labels-primary)]">
                {row.value}
              </span>
            </m.div>
          ),
        )}
      </AnimatePresence>
    </div>
  );
}

/** components/transfer/recipient-pill.tsx */
function RecipientPill({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="recipient-pill pointer-events-auto flex max-w-full items-center gap-1.5 overflow-hidden rounded-full"
      style={{
        paddingLeft: "6px",
        paddingRight: "12px",
        paddingTop: "6px",
        paddingBottom: "6px",
      }}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: "inset 0 0 0 0.03125rem rgba(255, 255, 255, 0.25)",
        }}
      >
        <span
          className="font-bold text-white"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 600,
            fontSize: "0.75rem",
            lineHeight: "1",
          }}
        >
          {name.charAt(0)}
        </span>
      </div>
      <span
        className="text-spec-17 min-w-0 truncate text-[var(--labels-primary)]"
        style={{ fontWeight: 500 }}
      >
        {name}
      </span>
    </div>
  );
}

/**
 * The sent title, revealed a line at a time. The words are set once to find
 * where the title wraps, then each line rises in after the last, so the
 * reveal follows the lines the reader sees at any card width.
 */
function LineReveal({
  text,
  onLines,
}: {
  text: string;
  onLines: (count: number) => void;
}) {
  const words = text.split(" ");
  const measure = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<string[] | null>(null);

  useLayoutEffect(() => {
    const element = measure.current;
    if (!element) return;
    const grouped: string[][] = [];
    let top: number | null = null;
    Array.from(element.children).forEach((child, index) => {
      const offset = (child as HTMLElement).offsetTop;
      if (top === null || Math.abs(offset - top) > 2) {
        grouped.push([]);
        top = offset;
      }
      grouped[grouped.length - 1]!.push(words[index]!);
    });
    const next = grouped.map((line) => line.join(" "));
    setLines(next);
    onLines(next.length);
    // Measured once per title: the card's width is fixed while it shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!lines) {
    return (
      <span ref={measure} style={{ opacity: 0 }}>
        {words.map((word, index) => (
          <span key={index}>
            {word}
            {index < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    );
  }

  return (
    <>
      {lines.map((line, index) => (
        <m.span
          key={`${text}-${index}`}
          initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * LINE_STAGGER,
            ease: EASE,
          }}
          style={{ display: "block" }}
        >
          {line}
        </m.span>
      ))}
    </>
  );
}

/**
 * The transfer review step as the dev transfer-confirmation page drives it:
 * the amount card, recipient and metadata over the footnote and slide CTA;
 * sliding sends (the knob reads "Sending…"), then the review blurs away
 * under the green checkmark Lottie and the "sent" title, and the slide gives
 * way to Done. Done, or a few seconds, brings the review back as the next
 * kind of transfer: an e-Transfer, a tip out, a bank transfer, a cash out.
 *
 * The stage holds the card's full height, the review at the top and the
 * slide pinned to the bottom, so neither moves as the rows or the transfer
 * change.
 */
export function TransferFlow() {
  const slideRef = useRef<SlideButtonRef>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const [titleLines, setTitleLines] = useState(2);
  const sent = status === "sent";
  const transfer = TRANSFERS[index % TRANSFERS.length]!;

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(
      () => {
        if (status === "sending") setStatus("sent");
        else reset();
      },
      status === "sending" ? SENDING_MS : SENT_MS,
    );
    return () => clearTimeout(timer);
  }, [status]);

  function reset() {
    setStatus("idle");
    setIndex((current) => current + 1);
    void slideRef.current?.reset();
  }

  // The arrival line follows the title's last line, and Done follows that.
  const arrivalDelay = titleLines * LINE_STAGGER + 0.1;

  return (
    <div className="flex h-full w-full flex-col" style={{ paddingBlock: 24 }}>
      <div className="grid">
        {/* Sent header: checkmark, title line by line, arrival line. */}
        <AnimatePresence>
          {sent && (
            <m.div
              key="sent"
              className="flex flex-col items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{ gridArea: "1 / 1", zIndex: 10 }}
            >
              <div
                style={{
                  width: "4.75rem",
                  height: "4.75rem",
                  marginBottom: "2rem",
                  position: "relative",
                  overflow: "visible",
                }}
              >
                <m.div
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.4, ease: EASE }}
                  style={{
                    position: "absolute",
                    top: "-1.5rem",
                    left: "-1.5rem",
                    width: "7.75rem",
                    height: "7.75rem",
                    overflow: "visible",
                  }}
                >
                  <DotLottieReact
                    src="/media/craft/components/app/lottie/checkmark-green.lottie"
                    loop={false}
                    autoplay
                    // Sized from the scaled-down box at a reduced ratio
                    // otherwise, and never re-measured as it grows.
                    renderConfig={{ devicePixelRatio: 4 }}
                    style={{ width: "7.75rem", height: "7.75rem" }}
                  />
                </m.div>
              </div>
              <div className="text-left" style={{ width: "100%" }}>
                <h1
                  className="text-spec-32 font-semibold text-[var(--labels-primary)]"
                  style={{
                    fontFamily: "var(--font-inter)",
                    maxWidth: "min(28rem, 100%)",
                    margin: 0,
                  }}
                >
                  <LineReveal onLines={setTitleLines} text={transfer.title} />
                </h1>
                <m.p
                  className="text-spec-17 font-normal text-[var(--labels-secondary)]"
                  initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: arrivalDelay,
                    ease: EASE,
                  }}
                  style={{
                    fontFamily: "var(--font-inter)",
                    marginTop: "0.75rem",
                  }}
                >
                  {transfer.arrival}
                </m.p>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Amount card: blurs and fades out once the money has landed. */}
        <m.div
          animate={{
            opacity: sent ? 0 : 1,
            filter: sent ? "blur(5px)" : "blur(0px)",
          }}
          transition={{
            opacity: { duration: 0.4, ease: EASE },
            filter: { duration: 0.4, ease: EASE },
          }}
          style={{
            gridArea: "1 / 1",
            alignSelf: "start",
            pointerEvents: sent ? "none" : "auto",
            zIndex: 1,
          }}
        >
          <div
            className="amount-card card-shadow relative w-full overflow-hidden"
            style={{
              borderRadius: "20px",
              backgroundColor: "var(--card-background)",
            }}
          >
            <div style={{ padding: "3rem 1.5rem", position: "relative" }}>
              <div className="h-[3.9rem] overflow-hidden">
                <div className="price relative flex h-[3.9rem] items-center justify-center">
                  <span
                    className="font-inter-amounts amount-currency leading-none"
                    style={{
                      fontSize: "var(--large-amount)",
                      color: "var(--labels-primary)",
                      letterSpacing: "var(--letter-spacing-large-amount)",
                      lineHeight: "var(--large-amount)",
                      fontWeight: 650,
                    }}
                  >
                    $
                  </span>
                  <span
                    className="font-inter-amounts amount-value leading-none"
                    style={{
                      fontSize: "var(--large-amount)",
                      color: "var(--labels-primary)",
                      letterSpacing: "var(--letter-spacing-large-amount)",
                      lineHeight: "var(--large-amount)",
                      display: "inline-block",
                      fontWeight: 650,
                    }}
                  >
                    {transfer.amount}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex w-full items-center justify-center">
                <div className="flex min-w-0 items-center justify-center gap-2">
                  <span className="text-spec-17 text-[var(--labels-secondary)]">
                    To
                  </span>
                  <RecipientPill
                    color={transfer.recipient.color}
                    name={transfer.recipient.name}
                  />
                </div>
              </div>
            </div>
          </div>
          <Metadata status={status} transfer={transfer} />
        </m.div>
      </div>

      {/* Pinned to the bottom of the stage, below whatever the review needs. */}
      <div
        className="grid"
        style={{ marginTop: "auto", paddingTop: "2.25rem" }}
      >
        {/* Confirm stack: footnote over the slide; steps back once sent. */}
        <m.div
          animate={{
            opacity: sent ? 0 : 1,
            scale: sent ? 0.98 : 1,
            y: sent ? -8 : 0,
          }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{
            gridArea: "1 / 1",
            alignSelf: "end",
            pointerEvents: sent ? "none" : "auto",
          }}
        >
          {/* Fades with the send instead of folding away, so the slide
              below it holds still. */}
          <m.p
            animate={{ opacity: status === "idle" ? 1 : 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="text-center font-medium whitespace-pre-line text-[var(--labels-tertiary)]"
            style={{
              marginTop: 0,
              marginBottom: `${FOOTNOTE_GAP_PX}px`,
              marginLeft: "0.75rem",
              marginRight: "0.75rem",
              fontFamily: "var(--font-inter)",
              fontSize: "0.8125rem",
              lineHeight: "1.125rem",
            }}
          >
            Carefully review your recipient&apos;s details.
            <br />
            Once sent, transfers cannot be cancelled.
          </m.p>
          <SlideButton
            ref={slideRef}
            label="Slide to send"
            className="w-full"
            initialKnobScale={0.92}
            onSlideComplete={() => setStatus("sending")}
          />
        </m.div>

        <AnimatePresence>
          {sent && (
            <m.div
              key="done"
              initial={{ opacity: 0, filter: "blur(5px)", y: 8 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{
                duration: 0.4,
                delay: arrivalDelay + 0.15,
                ease: EASE,
              }}
              // Centred on the slide track it replaces (72px tall; Done is 50).
              style={{
                gridArea: "1 / 1",
                alignSelf: "end",
                marginBottom: "11px",
              }}
            >
              <PrimaryButton onClick={reset} className="w-full">
                Done
              </PrimaryButton>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
