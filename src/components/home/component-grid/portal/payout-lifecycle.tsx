"use client";

import { AnimatePresence, m } from "motion/react";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { DemoCursor, useDemo } from "../demo";
import { FitStage } from "../fit-stage";
import { cn } from "./ui/cn";
import { Badge, PayoutStatusBadge } from "./ui/status-badges";

/*
 * A payout's statuses as a state machine, with the product's badges as the
 * nodes, the Recent activity row they drive and the events that move it.
 * Each pass pays the next member; reduced motion shows the finished path.
 */

type Node = "requested" | "processing" | "failed" | "paid";
type Edge = "submit" | "settle" | "return" | "retry";

const MEMBERS = [
  { name: "Maya Chen", color: "#7055ff", amount: 120 },
  { name: "Diego Alvarez", color: "#f97316", amount: 85.5 },
  { name: "Priya Nair", color: "#0ea5e9", amount: 64.25 },
  { name: "Lena Fischer", color: "#ec4899", amount: 248 },
];

type Payment = { key: number; member: number; status: Node; reason: number };

/*
 * Why a payout comes back, and who can fix it. A processor timeout is the
 * only one a plain retry cures; the others need the employer or the member
 * to act first, so the row offers that action instead.
 */
const REASONS = [
  {
    event: "bank timeout",
    label: "Bank timeout",
    action: "Retry",
    fix: null,
  },
  {
    event: "insufficient_funds",
    label: "Insufficient funds",
    action: "Add funds",
    fix: { name: "wallet.funded", detail: "+$500.00" },
  },
  {
    event: "member_not_onboarded",
    label: "Member hasn't finished setup",
    action: "Remind",
    fix: { name: "member.onboarded", detail: "after reminder" },
  },
] as const;
type Event = { id: number; time: string; name: string; detail: string };
type Scene = {
  payments: Payment[];
  visited: Node[];
  edges: Edge[];
  live: Edge | null;
  events: Event[];
  idem: string;
};

const START = 14 * 3600 + 2 * 60;
const time = (seconds: number) =>
  [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

const IDEMS = ["4f2a", "9c1e", "b37d", "e05f"];

const POSTER: Scene = {
  payments: [
    { key: 1, member: 0, status: "paid", reason: 0 },
    { key: 0, member: 3, status: "paid", reason: 0 },
  ],
  visited: ["requested", "processing", "failed", "paid"],
  edges: ["submit", "return", "retry", "settle"],
  live: null,
  idem: IDEMS[0]!,
  events: [
    {
      id: -4,
      time: time(START + 6),
      name: "payout.failed",
      detail: "bank timeout",
    },
    {
      id: -3,
      time: time(START + 9),
      name: "payout.retried",
      detail: "same idem_4f2a",
    },
    {
      id: -2,
      time: time(START + 10),
      name: "payout.processing",
      detail: "sent to bank",
    },
    { id: -1, time: time(START + 14), name: "payout.paid", detail: "settled" },
  ],
};

const HOME = { x: 300, y: 300 };
const SPRING = { type: "spring", duration: 0.5, bounce: 0 } as const;

const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pill: CSSProperties = {
  borderRadius: "var(--radius-full)",
  fontSize: "13px",
  lineHeight: "18px",
};

function RequestedBadge() {
  return (
    <Badge
      className="flex-shrink-0 bg-white px-2.5 whitespace-nowrap text-[var(--label-secondary)] shadow-[0_0_0_1px_rgba(0,0,0,0.07)] hover:!bg-white"
      style={pill}
    >
      <span className="font-medium">Requested</span>
    </Badge>
  );
}

function StatusBadge({ status }: { status: Node }) {
  return status === "requested" ? (
    <RequestedBadge />
  ) : (
    <PayoutStatusBadge status={status} />
  );
}

function PayoutLifecycle() {
  const root = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<Scene>(POSTER);
  const pass = useRef(0);
  const clock = useRef(START + 14);
  const nextId = useRef(0);

  const step = (
    status: Node,
    edge: Edge | null,
    event: { name: string; detail: string },
    seconds: number,
    fresh = false,
    reason = 0,
  ) => {
    clock.current += seconds;
    setScene((current) => {
      const payments = fresh
        ? [
            {
              key: nextId.current + 100,
              member: pass.current % MEMBERS.length,
              status,
              reason,
            },
            ...current.payments,
          ].slice(0, 3)
        : current.payments.map((payment, index) =>
            index === 0 ? { ...payment, status } : payment,
          );
      return {
        payments,
        visited: fresh ? [status] : [...new Set([...current.visited, status])],
        edges: fresh
          ? []
          : edge
            ? [...new Set([...current.edges, edge])]
            : current.edges,
        live: edge,
        idem: fresh ? IDEMS[pass.current % IDEMS.length]! : current.idem,
        events: [
          ...current.events,
          { id: nextId.current++, time: time(clock.current), ...event },
        ].slice(-4),
      };
    });
  };

  const fix = (reason: number, idem: string) => {
    const { fix: fixEvent } = REASONS[reason]!;
    if (fixEvent) step("failed", null, fixEvent, 2);
    step(
      "processing",
      "retry",
      { name: "payout.retried", detail: `same idem_${idem}` },
      fixEvent ? 1 : 3,
    );
  };

  const cursor = useDemo(
    root,
    async (a) => {
      await a.wait(900);
      pass.current++;
      const idem = IDEMS[pass.current % IDEMS.length]!;
      const reason = (pass.current - 1) % REASONS.length;
      step(
        "requested",
        null,
        { name: "payout.created", detail: `idem_${idem}` },
        20,
        true,
        reason,
      );
      await a.wait(1300);
      step(
        "processing",
        "submit",
        { name: "payout.processing", detail: "sent to bank" },
        1,
      );
      await a.wait(1700);
      step(
        "failed",
        "return",
        { name: "payout.failed", detail: REASONS[reason]!.event },
        5,
      );
      await a.wait(900);
      await a.move("retry", { kind: "hand" });
      await a.wait(250);
      await a.click();
      fix(reason, idem);
      await a.moveTo(HOME.x, HOME.y, "pointer");
      await a.wait(900);
      step("paid", "settle", { name: "payout.paid", detail: "settled" }, 4);
      await a.wait(2800);
    },
    {
      home: HOME,
      interactive: true,
      reset: () => {
        pass.current = 0;
        clock.current = START + 14;
        setScene(POSTER);
      },
    },
  );

  const current = scene.payments[0]?.status ?? "paid";
  const node = (id: Node) =>
    id === current ? "active" : scene.visited.includes(id) ? "visited" : "idle";
  const edge = (id: Edge) =>
    scene.live === id ? "live" : scene.edges.includes(id) ? "done" : "idle";

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
        aria-label={`Payout status: ${current}`}
        className="grid grid-cols-[auto_minmax(40px,1fr)_auto_minmax(40px,1fr)_auto] grid-rows-[auto_44px_auto] items-center"
        role="img"
      >
        <Station state={node("requested")}>
          <RequestedBadge />
        </Station>
        <HEdge state={edge("submit")} />
        <Station state={node("processing")}>
          <PayoutStatusBadge status="processing" />
        </Station>
        <HEdge state={edge("settle")} />
        <Station state={node("paid")}>
          <PayoutStatusBadge status="paid" />
        </Station>

        <div className="col-start-3 row-start-2 flex h-full justify-center gap-4">
          <VEdge state={edge("return")} />
          <VEdge dashed state={edge("retry")} up />
        </div>
        <div className="col-start-3 row-start-3 flex justify-center">
          <Station state={node("failed")}>
            <PayoutStatusBadge status="failed" />
          </Station>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-6)] border border-[var(--border-solid)] bg-[var(--bg-base)]">
        <div
          className="border-b border-[var(--border-solid)] bg-[var(--bg-shade)] px-4 py-2.5 font-medium text-[var(--label-secondary)]"
          style={{ fontSize: "13px", lineHeight: "18px" }}
        >
          Recent activity
        </div>
        <div className="h-[128px] overflow-hidden">
          {scene.payments.map((payment, index) => (
            <ActivityRow
              key={payment.key}
              live={index === 0}
              onFix={() => fix(payment.reason, scene.idem)}
              payment={payment}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[var(--radius-4)] bg-white/70 px-3 py-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
        <ol
          aria-label="Webhook events"
          className="flex h-[96px] flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,black_12px)]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {scene.events.map((event, index) => (
              <m.li
                animate={{ opacity: 1, y: 0 }}
                className="grid h-6 shrink-0 grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 font-mono"
                exit={{ opacity: 0, y: -8 }}
                initial={{ opacity: 0, y: 8 }}
                key={event.id}
                layout="position"
                style={{ fontSize: "11.5px", lineHeight: "16px" }}
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              >
                <span className="text-[var(--label-faint)] tabular-nums">
                  {event.time}
                </span>
                <span
                  className={cn(
                    "truncate",
                    index === scene.events.length - 1
                      ? "text-[var(--label-primary)]"
                      : "text-[var(--label-secondary)]",
                  )}
                >
                  {event.name}
                </span>
                <span className="text-right text-[var(--label-faint)]">
                  {event.detail}
                </span>
              </m.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
}

type Lit = "active" | "visited" | "idle";

function Station({ state, children }: { state: Lit; children: ReactNode }) {
  return (
    <m.div
      animate={{
        opacity: state === "idle" ? 0.38 : state === "visited" ? 0.7 : 1,
        scale: state === "active" ? 1 : 0.97,
      }}
      className="flex justify-center"
      initial={false}
      transition={{ duration: 0.3 }}
    >
      {children}
    </m.div>
  );
}

const STROKE = {
  idle: "rgba(39, 39, 42, 0.12)",
  done: "rgba(39, 39, 42, 0.38)",
  live: "rgb(92, 97, 255)",
};

function HEdge({ state }: { state: "idle" | "done" | "live" }) {
  return (
    <div
      className="relative mx-2 h-px self-center"
      style={{ background: STROKE.idle }}
    >
      <m.div
        animate={{
          scaleX: state === "idle" ? 0 : 1,
          backgroundColor: STROKE[state === "idle" ? "done" : state],
        }}
        className="absolute inset-0 origin-left"
        initial={false}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      />
      <Arrow
        className="absolute top-1/2 -right-px -translate-y-1/2"
        state={state}
      />
    </div>
  );
}

function VEdge({
  state,
  dashed = false,
  up = false,
}: {
  state: "idle" | "done" | "live";
  dashed?: boolean;
  up?: boolean;
}) {
  const color = STROKE[state === "idle" ? "done" : state];
  const line = (stroke: string): CSSProperties =>
    dashed
      ? {
          backgroundImage: `repeating-linear-gradient(to bottom, ${stroke} 0 3px, transparent 3px 6px)`,
        }
      : { background: stroke };
  return (
    <div className="relative my-1.5 w-px">
      <div className="absolute inset-0" style={line(STROKE.idle)} />
      <m.div
        animate={{ scaleY: state === "idle" ? 0 : 1 }}
        className={cn("absolute inset-0", up ? "origin-bottom" : "origin-top")}
        initial={false}
        style={line(color)}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      />
      <Arrow
        className={cn(
          "absolute left-1/2 -translate-x-1/2",
          up ? "-top-px -rotate-90" : "-bottom-px rotate-90",
        )}
        state={state}
      />
    </div>
  );
}

function Arrow({
  state,
  className,
}: {
  state: "idle" | "done" | "live";
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-2 w-2 transition-colors duration-300", className)}
      fill="none"
      style={{ color: STROKE[state] }}
      viewBox="0 0 8 8"
    >
      <path
        d="M2 1l3.5 3L2 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function ActivityRow({
  payment,
  live,
  onFix,
}: {
  payment: Payment;
  live: boolean;
  onFix: () => void;
}) {
  const member = MEMBERS[payment.member]!;
  const failed = payment.status === "failed";
  return (
    <m.div
      animate={{ height: "auto" }}
      className="overflow-hidden"
      initial={{ height: 0 }}
      transition={SPRING}
    >
      <div className="grid grid-cols-[32px_minmax(0,1fr)_auto_104px] items-center gap-3 border-b border-[var(--border-solid)] px-4 py-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-white"
          style={{
            backgroundColor: member.color,
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {member.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className="truncate font-medium text-[var(--label-primary)]"
            style={{ fontSize: "15px", lineHeight: "20px" }}
          >
            {member.name}
          </span>
          <span
            className="relative h-[18px]"
            style={{ fontSize: "13px", lineHeight: "18px" }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <m.span
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center gap-1 truncate text-[var(--label-secondary)]"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={failed ? "failed" : "ok"}
                transition={{ duration: 0.2 }}
              >
                {failed ? (
                  <>
                    {REASONS[payment.reason]!.label} ·
                    <button
                      className="cursor-pointer font-medium text-[var(--label-link)] hover:underline"
                      data-demo={live ? "retry" : undefined}
                      onClick={onFix}
                      type="button"
                    >
                      {REASONS[payment.reason]!.action}
                    </button>
                  </>
                ) : (
                  "Downtown wallet"
                )}
              </m.span>
            </AnimatePresence>
          </span>
        </span>
        <span
          className="font-medium text-[var(--label-primary)] tabular-nums"
          style={{ fontSize: "15px" }}
        >
          {money(member.amount)}
        </span>
        <span className="relative flex justify-end">
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              initial={{ opacity: 0, scale: 0.96 }}
              key={payment.status}
              transition={{ duration: 0.22 }}
            >
              <StatusBadge status={payment.status} />
            </m.span>
          </AnimatePresence>
        </span>
      </div>
    </m.div>
  );
}

export function PortalPayoutLifecycle() {
  return (
    <FitStage className="anyday-portal" gutter={24}>
      <PayoutLifecycle />
    </FitStage>
  );
}
