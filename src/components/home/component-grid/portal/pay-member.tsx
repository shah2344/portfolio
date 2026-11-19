"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";

import { DemoCursor, useDemo } from "../demo";
import { FitStage } from "../fit-stage";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { HighlightText } from "./ui/highlight-text";
import { LoaderIcon } from "./ui/loader-icon";
import { PayoutStatusBadge } from "./ui/status-badges";

/*
 * components/features/payments/pay-member-drawer.tsx, played as a short
 * film in a glass browser: a manager on the Payments page opens Pay member,
 * finds the member with the recipient search, picks the wallet, types the
 * amount and a memo, ticks "Use memo for internal notes" (the notes field
 * folds away), and pays. The drawer closes and the payment lands at the top
 * of Recent activity as Processing, then turns Paid: the page itself
 * confirms it, so there's no toast. Each pass pays the next member, so the
 * rows build up rather than rewind. Visitors who prefer reduced motion see
 * the filled drawer instead.
 */

/* The scene is at least this tall; it grows with its card. */
const FILL = 780;
const HOME = { x: 300, y: 640 };

const MEMBERS = [
  {
    id: "maya",
    name: "Maya Chen",
    phone: "+1 (555) 010-0142",
    color: "#7055ff",
  },
  {
    id: "diego",
    name: "Diego Alvarez",
    phone: "+1 (555) 010-0187",
    color: "#f97316",
  },
  {
    id: "lena",
    name: "Lena Fischer",
    phone: "+1 (555) 010-0248",
    color: "#ec4899",
  },
  {
    id: "priya",
    name: "Priya Nair",
    phone: "+1 (555) 010-0263",
    color: "#0ea5e9",
  },
];

const WALLETS = [
  { id: "downtown", name: "Downtown", balance: "$2,480.00" },
  { id: "uptown", name: "Uptown", balance: "$1,120.40" },
];

/* Who each pass pays: what's typed to find them, how much, and why. */
const PASSES = [
  { member: "maya", query: "Ma", amount: "120.00", memo: "Friday tips" },
  { member: "diego", query: "Di", amount: "85.50", memo: "Saturday tips" },
  { member: "priya", query: "Pr", amount: "64.25", memo: "Sunday brunch" },
] as const;

type Field = "recipient" | "wallet" | "amount" | "memo" | null;

type Payment = {
  key: number;
  member: string;
  amount: string;
  memo: string;
  status: "processing" | "paid";
};

type Scene = {
  open: boolean;
  focus: Field;
  recipientOpen: boolean;
  query: string;
  recipient: string | null;
  walletOpen: boolean;
  wallet: string | null;
  amount: string;
  memo: string;
  internal: boolean;
  paying: boolean;
  payments: Payment[];
};

const FORM = {
  focus: null,
  recipientOpen: false,
  query: "",
  recipient: null,
  walletOpen: false,
  wallet: null,
  amount: "",
  memo: "",
  internal: false,
  paying: false,
} satisfies Partial<Scene>;

const REST: Scene = { open: false, payments: [], ...FORM };

/* The frame that tells the story on its own: the drawer open and filled. */
const POSTER: Scene = {
  ...REST,
  open: true,
  recipient: "maya",
  wallet: "downtown",
  amount: "120.00",
  memo: "Friday tips",
  internal: true,
};

const DRAWER = { type: "spring", duration: 0.55, bounce: 0 } as const;
const MENU = { type: "spring", stiffness: 600, damping: 35 } as const;
const ROW = { type: "spring", duration: 0.5, bounce: 0 } as const;

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      className="m-0 font-medium text-[#1c1c1c]"
      style={{ fontSize: "15px", lineHeight: "20px", letterSpacing: "-0.24px" }}
    >
      {children}
    </div>
  );
}

/** components/ui/input.tsx's look, with its focus ring drawn from state. */
function Box({
  focused,
  children,
  className,
  name,
}: {
  focused: boolean;
  children: ReactNode;
  className?: string;
  name?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center rounded-[var(--radius-5)] bg-[var(--control-base)] px-3 transition-[border-color,box-shadow] duration-150",
        className,
      )}
      data-demo={name}
      style={{
        border: focused
          ? "1.5px solid var(--border-brand)"
          : "1px solid var(--border-strong)",
        boxShadow: focused ? "0 0 0 3px rgba(92, 97, 255, 0.15)" : "none",
      }}
    >
      {children}
    </div>
  );
}

function Caret({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <m.span
      aria-hidden="true"
      className="ml-px inline-block h-[18px] w-px bg-[var(--label-primary)] align-middle"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
    />
  );
}

function Chevron() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-[var(--icon-faint,#a1a1aa)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 9l6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
      />
    </svg>
  );
}

/** components/ui/searchable-select.tsx, driven by the scene. */
function Select({
  name,
  focused,
  open,
  query,
  value,
  right,
  placeholder,
  options,
}: {
  name: string;
  focused: boolean;
  open: boolean;
  query: string;
  value: string | null;
  right?: string;
  placeholder: string;
  options: { id: string; label: string; sublabel: string }[];
}) {
  const shown = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="relative">
      <Box focused={focused} className="h-11" name={name}>
        <span
          className="flex-1 truncate"
          style={{ fontSize: "15px", lineHeight: "20px" }}
        >
          {open ? (
            query ? (
              <span className="text-[var(--label-primary)]">{query}</span>
            ) : (
              <span className="text-[var(--label-faint)]">
                {value ?? placeholder}
              </span>
            )
          ) : value ? (
            <span className="text-[var(--label-primary)]">{value}</span>
          ) : (
            <span className="text-[var(--label-faint)]">{placeholder}</span>
          )}
          <Caret on={focused && open} />
        </span>
        <span className="flex items-center gap-1">
          {right && !open && (
            <span
              className="whitespace-nowrap text-[var(--label-secondary)]"
              style={{ fontSize: "15px" }}
            >
              {right}
            </span>
          )}
          <Chevron />
        </span>
      </Box>
      <AnimatePresence>
        {open && (
          <m.div
            className="shadow-dropdown absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-[var(--radius-4)] bg-[var(--control-base)] p-1"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.1 } }}
            transition={{ scale: MENU, opacity: { duration: 0.1 } }}
            style={{ transformOrigin: "top" }}
          >
            <m.div layout transition={MENU}>
              <AnimatePresence initial={false} mode="popLayout">
                {shown.map((option, index) => (
                  <m.div
                    key={option.id}
                    layout="position"
                    className={cn(
                      "flex flex-col rounded-[var(--radius-2)] p-3",
                      index === 0 && "bg-[var(--bg-shade)]",
                    )}
                    data-demo={`${name}-${option.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <span
                      className="font-medium text-[var(--label-primary)]"
                      style={{ fontSize: "15px", lineHeight: "20px" }}
                    >
                      <HighlightText highlight={query} text={option.label} />
                    </span>
                    <span
                      className="text-[#62626a]"
                      style={{ fontSize: "13px", lineHeight: "18px" }}
                    >
                      {option.sublabel}
                    </span>
                  </m.div>
                ))}
              </AnimatePresence>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** components/ui/animated-checkbox.tsx */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "relative block h-[18px] w-[18px] shrink-0 overflow-hidden rounded-[var(--radius-2)] border transition-colors duration-150",
        checked
          ? "border-[var(--primary)] bg-[var(--primary)]"
          : "border-[var(--border-heavy)] bg-white",
      )}
    >
      <AnimatePresence initial={false}>
        {checked && (
          <m.span
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", duration: 0.2, bounce: 0 }}
          >
            <svg
              fill="none"
              height="12"
              stroke="var(--primary-foreground)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              viewBox="0 0 24 24"
              width="12"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* The Payments page behind the drawer: its title, button and the payments
   this film makes are real; the older activity under them is filler, as
   the story isn't about it. */
const FILLER = [62, 48, 70, 54, 44, 66, 52, 58];

function ActivityRow({ payment }: { payment: Payment }) {
  const member = MEMBERS.find((item) => item.id === payment.member);
  return (
    <m.div
      className="overflow-hidden"
      initial={{ height: 0 }}
      animate={{ height: "auto" }}
      transition={ROW}
    >
      <m.div
        className="grid grid-cols-[32px_minmax(0,1fr)_auto_96px] items-center gap-3 border-b border-[var(--border-solid)] px-4 py-3"
        // A quick flash marks the row as it lands; the badge carries the
        // status from there.
        initial={{ backgroundColor: "rgba(92, 97, 255, 0.1)", opacity: 0 }}
        animate={{ backgroundColor: "rgba(92, 97, 255, 0)", opacity: 1 }}
        transition={{
          backgroundColor: { duration: 0.6, ease: "easeOut", delay: 0.2 },
          opacity: { duration: 0.3 },
        }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-white"
          style={{
            backgroundColor: member?.color,
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {member?.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className="truncate font-medium text-[var(--label-primary)]"
            style={{ fontSize: "15px", lineHeight: "20px" }}
          >
            {member?.name}
          </span>
          <span
            className="truncate text-[var(--label-secondary)]"
            style={{ fontSize: "13px", lineHeight: "18px" }}
          >
            {payment.memo}
          </span>
        </span>
        <span
          className="font-medium text-[var(--label-primary)] tabular-nums"
          style={{ fontSize: "15px" }}
        >
          ${payment.amount}
        </span>
        <span className="flex justify-end">
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              key={payment.status}
              initial={{ opacity: 0, scale: 0.9, filter: "blur(3px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(3px)" }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              <PayoutStatusBadge status={payment.status} />
            </m.span>
          </AnimatePresence>
        </span>
      </m.div>
    </m.div>
  );
}

function Page({ dimmed, payments }: { dimmed: boolean; payments: Payment[] }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 pt-6">
        <div
          className="font-semibold text-[var(--label-primary)]"
          style={{
            fontSize: "24px",
            lineHeight: "30px",
            letterSpacing: "-0.5px",
          }}
        >
          Payments
        </div>
        <span data-demo="open">
          <Button size="regular" variant="primary">
            Pay member
          </Button>
        </span>
      </div>
      <div
        className="mx-6 mt-6 min-h-0 flex-1 overflow-hidden rounded-t-[var(--radius-6)] border border-b-0 border-black/[0.08]"
        style={{
          maskImage: "linear-gradient(to bottom, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)",
        }}
      >
        <div className="border-b border-[var(--border-solid)] bg-[var(--bg-shade)] px-4 py-3">
          <div
            className="font-medium text-[var(--label-secondary)]"
            style={{ fontSize: "14px" }}
          >
            Recent activity
          </div>
        </div>
        {payments.map((payment) => (
          <ActivityRow key={payment.key} payment={payment} />
        ))}
        {FILLER.map((width, index) => (
          <m.div
            key={index}
            layout="position"
            transition={ROW}
            className="grid grid-cols-[32px_minmax(0,1fr)_auto_96px] items-center gap-3 border-b border-[var(--border-solid)] px-4 py-[18px]"
          >
            <span className="h-8 w-8 rounded-full bg-black/[0.06]" />
            <span className="flex flex-col gap-2">
              <span
                className="h-2 rounded-full bg-black/[0.09]"
                style={{ width: `${width}%` }}
              />
              <span
                className="h-1.5 rounded-full bg-black/[0.05]"
                style={{ width: `${width - 22}%` }}
              />
            </span>
            <span className="h-2 w-12 rounded-full bg-black/[0.08]" />
            <span className="ml-auto h-5 w-14 rounded-full bg-black/[0.05]" />
          </m.div>
        ))}
      </div>
      <m.div
        className="absolute inset-0 bg-black/30"
        animate={{ opacity: dimmed ? 1 : 0 }}
        initial={false}
        transition={{ duration: 0.3 }}
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* Stageshow's glass browser (Window chrome="glass"): a frosted frame that
   takes the color of the field behind it, gray lights, the address centred
   in a pill with a lock, and the page as a white card inset in the frame. */
function GlassBrowser({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-5 flex flex-col rounded-[12px]"
      style={{
        background: "rgba(248, 250, 253, 0.45)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow:
          "0 0 0 1px rgba(229, 237, 245, 0.5), 0 15px 35px rgba(23, 23, 23, 0.08)",
      }}
    >
      <div className="grid h-[35px] shrink-0 grid-cols-[1fr_minmax(0,262px)_1fr] items-center gap-3 px-5">
        <span className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2 w-2 rounded-full"
              style={{ background: "rgba(186, 200, 218, 0.5)" }}
            />
          ))}
        </span>
        <span
          className="flex h-5 items-center justify-center gap-1 rounded-full px-2"
          style={{
            background: "rgba(255, 255, 255, 0.38)",
            boxShadow: "inset 0 0 0 1px rgba(229, 237, 245, 0.5)",
            color: "#50617a",
            fontSize: "10px",
          }}
        >
          <svg aria-hidden="true" height="8" viewBox="0 0 7 8" width="7">
            <path
              d="M1.5 3.3V2.4a2 2 0 0 1 4 0v.9"
              fill="none"
              stroke="#667691"
              strokeWidth="1.1"
            />
            <rect
              fill="#667691"
              height="4.7"
              rx="1.2"
              width="7"
              x="0"
              y="3.3"
            />
          </svg>
          AnyDay · Payments
        </span>
        <span />
      </div>
      <div
        className="relative mx-1.5 mb-1.5 flex-1 overflow-hidden rounded-[6px] bg-white"
        style={{ boxShadow: "0 3px 6px rgba(23, 23, 23, 0.06)" }}
      >
        {children}
      </div>
    </div>
  );
}

function Drawer({ scene }: { scene: Scene }) {
  const member = MEMBERS.find((item) => item.id === scene.recipient);
  const wallet = WALLETS.find((item) => item.id === scene.wallet);
  return (
    <m.div
      className="absolute top-2 right-2 bottom-2 z-10 flex w-[min(400px,calc(100%-16px))] flex-col overflow-visible rounded-[var(--radius-5)]"
      animate={{ x: scene.open ? 0 : "112%" }}
      initial={false}
      transition={DRAWER}
      style={{
        background: "#FDFDFD",
        boxShadow: "0px 8px 32px 0px rgba(39, 39, 42, 0.2)",
      }}
    >
      <div className="flex items-center justify-between border-b border-[rgba(39,39,42,0.06)] px-6 py-4">
        <div
          className="font-semibold text-[#1c1c1c]"
          style={{
            fontSize: "17px",
            lineHeight: "22px",
            letterSpacing: "-0.44px",
          }}
        >
          Pay member
        </div>
        <svg
          className="h-5 w-5 text-[var(--label-secondary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M6 6l12 12M18 6L6 18"
            strokeLinecap="round"
            strokeWidth={1.75}
          />
        </svg>
      </div>

      <m.div
        className="flex flex-1 flex-col gap-[18px] px-6 pt-5"
        animate={{ opacity: scene.paying ? 0.5 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative z-30 flex flex-col gap-2">
          <Label>Recipient</Label>
          <Select
            focused={scene.focus === "recipient"}
            name="recipient"
            open={scene.recipientOpen}
            options={MEMBERS.map((item) => ({
              id: item.id,
              label: item.name,
              sublabel: item.phone,
            }))}
            placeholder="Select a member..."
            query={scene.query}
            right={member?.phone.slice(-8)}
            value={member?.name ?? null}
          />
        </div>

        <div className="relative z-20 flex flex-col gap-2">
          <Label>Send from</Label>
          <Select
            focused={scene.focus === "wallet"}
            name="wallet"
            open={scene.walletOpen}
            options={WALLETS.map((item) => ({
              id: item.id,
              label: item.name,
              sublabel: item.balance,
            }))}
            placeholder="Select wallet..."
            query=""
            right={wallet?.balance}
            value={wallet?.name ?? null}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Amount</Label>
          <Box
            className="h-11"
            focused={scene.focus === "amount"}
            name="amount"
          >
            <span
              className="font-medium text-[var(--label-primary)]"
              style={{ fontSize: "15px" }}
            >
              $
            </span>
            <span
              className="ml-1"
              style={{ fontSize: "15px", lineHeight: "20px" }}
            >
              {scene.amount ? (
                <span className="text-[var(--label-primary)]">
                  {scene.amount}
                </span>
              ) : scene.focus !== "amount" ? (
                <span className="text-[var(--label-faint)]">0.00</span>
              ) : null}
              <Caret on={scene.focus === "amount"} />
            </span>
          </Box>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <Label>Memo</Label>
            <div
              className="text-[#8f8f8f]"
              style={{
                fontSize: "13px",
                lineHeight: "18px",
                letterSpacing: "-0.08px",
              }}
            >
              Add messages you want the member to see.
            </div>
          </div>
          <Box
            className="h-[52px] items-start py-2"
            focused={scene.focus === "memo"}
            name="memo"
          >
            <span style={{ fontSize: "15px", lineHeight: "20px" }}>
              {scene.memo ? (
                <span className="text-[var(--label-primary)]">
                  {scene.memo}
                </span>
              ) : scene.focus !== "memo" ? (
                <span className="text-[var(--label-faint)]">Enter memo...</span>
              ) : null}
              <Caret on={scene.focus === "memo"} />
            </span>
          </Box>
          <div className="flex items-center gap-2 pt-1" data-demo="internal">
            <Checkbox checked={scene.internal} />
            <span
              className="font-medium text-[#1c1c1c]"
              style={{
                fontSize: "15px",
                lineHeight: "20px",
                letterSpacing: "-0.24px",
              }}
            >
              Use memo for internal notes
            </span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!scene.internal && (
            <m.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{
                opacity: { duration: 0.2, ease: "easeOut", delay: 0.07 },
                height: { duration: 0.2, ease: "easeInOut" },
                y: { duration: 0.2, ease: "easeInOut" },
              }}
            >
              <div>
                <Label>Internal notes</Label>
                <div
                  className="text-[#8f8f8f]"
                  style={{ fontSize: "13px", lineHeight: "18px" }}
                >
                  Only visible to other managers
                </div>
              </div>
              <Box className="h-[52px] items-start py-2" focused={false}>
                <span
                  className="text-[var(--label-faint)]"
                  style={{ fontSize: "15px", lineHeight: "20px" }}
                >
                  Enter internal notes...
                </span>
              </Box>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      <div className="flex gap-2 border-t border-[rgba(39,39,42,0.06)] px-6 py-4">
        <Button size="regular" variant="secondary">
          Cancel
        </Button>
        <span className="flex-1" data-demo="pay">
          <Button className="w-full" size="regular" variant="primary">
            {scene.paying && <LoaderIcon className="h-4 w-4 animate-spin" />}
            Pay member
          </Button>
        </span>
      </div>
    </m.div>
  );
}

export function PortalPayMember() {
  const [scene, setScene] = useState<Scene>(REST);
  // The film never runs for reduced motion, so those visitors get the
  // poster: the drawer open and filled.
  const reduce = useReducedMotion();
  const shown = reduce ? POSTER : scene;
  const root = useRef<HTMLDivElement>(null);
  const pass = useRef(0);
  const set = (patch: Partial<Scene>) =>
    setScene((current) => ({ ...current, ...patch }));

  const cursor = useDemo(
    root,
    async (a) => {
      const run = PASSES[pass.current++ % PASSES.length] ?? PASSES[0];
      const key = pass.current;
      // The drawer is closed, so its form clears out of sight.
      set(FORM);
      await a.wait(900);

      await a.move("open", { kind: "hand" });
      await a.click();
      set({ open: true });
      await a.wait(700);

      await a.move("recipient", { kind: "ibeam", ax: 0.3 });
      await a.click();
      set({ focus: "recipient", recipientOpen: true });
      await a.wait(600);
      await a.type((query) => set({ query }), run.query, { ms: 220 });
      await a.wait(500);
      await a.move(`recipient-${run.member}`, { kind: "pointer", ax: 0.3 });
      await a.click();
      // As the product does, choosing a member moves on to the wallet.
      set({
        recipient: run.member,
        recipientOpen: false,
        query: "",
        focus: "wallet",
        walletOpen: true,
      });
      await a.wait(800);
      await a.move("wallet-downtown", { ax: 0.3 });
      await a.click();
      // And choosing the wallet moves on to the amount.
      set({ wallet: "downtown", walletOpen: false, focus: "amount" });
      await a.wait(350);
      await a.type((amount) => set({ amount }), run.amount, { ms: 120 });
      await a.wait(500);

      await a.move("memo", { kind: "ibeam", ax: 0.2, ay: 0.4 });
      await a.click();
      set({ focus: "memo" });
      await a.wait(250);
      await a.type((memo) => set({ memo }), run.memo, { ms: 75 });
      await a.wait(500);

      await a.move("internal", { kind: "hand", ax: 0.04 });
      await a.click();
      set({ internal: true, focus: null });
      await a.wait(900);

      await a.move("pay", { kind: "hand" });
      await a.click();
      set({ paying: true });
      await a.wait(1000);

      // The drawer closes and the payment lands at the top of Recent
      // activity, still processing; a moment later it settles as Paid.
      const payment: Payment = {
        key,
        member: run.member,
        amount: run.amount,
        memo: run.memo,
        status: "processing",
      };
      setScene((current) => ({
        ...current,
        open: false,
        paying: false,
        payments: [payment, ...current.payments].slice(0, 4),
      }));
      await a.moveTo(HOME.x, HOME.y, "pointer");
      await a.wait(1600);
      setScene((current) => ({
        ...current,
        payments: current.payments.map((item) =>
          item.key === key ? { ...item, status: "paid" } : item,
        ),
      }));
      await a.wait(2600);
    },
    { reset: () => setScene(REST), home: HOME },
  );

  return (
    <FitStage className="anyday-portal" fill={FILL} inset={0}>
      <div
        aria-label="Paying a member from the Payments page: the Pay member drawer opens, a recipient is searched for and chosen, a wallet, amount and memo are filled in, and the payment appears in Recent activity, first processing and then paid."
        className="relative h-full overflow-hidden"
        ref={root}
        role="img"
        style={{ fontFamily: "var(--font-family-sans)" }}
      >
        {/* A soft color field for the glass to take its tint from. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 6% 4%, rgba(176, 178, 255, 0.75), transparent 70%), radial-gradient(55% 50% at 98% 96%, rgba(255, 200, 164, 0.7), transparent 70%), radial-gradient(45% 40% at 84% 6%, rgba(169, 216, 255, 0.55), transparent 70%), #f3f3f3",
          }}
        />
        <div aria-hidden="true" className="contents" inert>
          <GlassBrowser>
            <Page dimmed={shown.open} payments={shown.payments} />
            <Drawer scene={shown} />
          </GlassBrowser>
        </div>
        <DemoCursor
          kind={cursor.kind}
          pressed={cursor.pressed}
          shown={cursor.running}
          x={cursor.x}
          y={cursor.y}
        />
      </div>
    </FitStage>
  );
}
