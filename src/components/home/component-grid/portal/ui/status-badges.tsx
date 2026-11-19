import type { CSSProperties, ReactNode } from "react";

import { ICON_BASE, cn } from "./cn";

/*
 * Badge (components/ui/badge.tsx), Tag (components/ui/tag.tsx),
 * MemberStatusBadge (+ lib/utils/member-status.ts) and PayoutStatusBadge
 * (components/features/payments/payout-status-badge.tsx). cva() is replaced
 * by the equivalent class strings.
 */

const badgeBase =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-small-heavy transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

const badgeVariants = {
  default:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  breakfast:
    "border-transparent bg-amber-100 text-amber-600 hover:bg-amber-200 pl-1.5 pr-2 py-0.5 font-medium gap-1",
  lunch:
    "border-transparent bg-orange-100 text-orange-600 hover:bg-orange-200 pl-1.5 pr-2 py-0.5 font-medium gap-1",
  dinner:
    "border-transparent bg-sky-100 text-sky-600 hover:bg-sky-200 pl-1.5 pr-2 py-0.5 font-medium gap-1",
} as const;

export function Badge({
  className,
  variant = "default",
  children,
  style,
}: {
  className?: string;
  variant?: keyof typeof badgeVariants;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(badgeBase, badgeVariants[variant], className)}
      style={style}
    >
      {typeof children === "string" ? (
        <span className="text-small-heavy">{children}</span>
      ) : (
        children
      )}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-sub)] text-[var(--label-secondary)]",
        "rounded-[var(--radius-3)] px-2 py-1",
        "text-small-plus",
        "whitespace-nowrap",
        "relative",
        "shadow-[inset_0px_-1px_0px_0px_rgba(39,39,42,0.06)]",
      )}
    >
      {children}
    </div>
  );
}

export type MemberStatus = "active" | "invited" | "onboarding" | "inactive";

const memberStatus: Record<
  MemberStatus,
  { className: string; style: CSSProperties; label: string }
> = {
  active: {
    className:
      "bg-[var(--bg-positivelight)] text-[var(--colors-green-700)] w-fit",
    style: {
      backgroundColor: "var(--bg-positivelight)",
      color: "var(--label-positive)",
    },
    label: "Active",
  },
  invited: {
    className: "bg-[var(--bg-infolight)] text-[var(--colors-blue-700)] w-fit",
    style: {
      backgroundColor: "var(--bg-infolight)",
      color: "var(--label-interactive)",
    },
    label: "Invited",
  },
  onboarding: {
    className: "bg-[var(--bg-infolight)] text-[var(--colors-blue-700)] w-fit",
    style: {
      backgroundColor: "var(--bg-infolight)",
      color: "var(--label-interactive)",
    },
    label: "Onboarding",
  },
  inactive: {
    className: "bg-[var(--bg-shade)] text-[var(--label-secondary)] w-fit",
    // Darker than the product's #f4f4f5, which vanishes on the card's grey.
    style: { backgroundColor: "#e4e4e7", color: "#71717a" },
    label: "Inactive",
  },
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const { className, style, label } = memberStatus[status];
  return (
    <Badge
      className={`${className} max-w-full truncate whitespace-nowrap`}
      style={style}
    >
      {label}
    </Badge>
  );
}

export function ProcessingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`ios-spinner h-3.5 w-3.5 ${className || ""}`}
      viewBox="0 0 200 200"
    >
      <defs>
        <path
          id="processing-spinner-path"
          d="M 92.5 25 C 92.5 21.686 95.186 19 98.5 19 L 98.5 19 C 101.814 19 104.5 21.686 104.5 25 L 104.5 50 C 104.5 53.314 101.814 56 98.5 56 L 98.5 56 C 95.186 56 92.5 53.314 92.5 50 Z"
          fill="currentColor"
        />
      </defs>
      <g opacity="0.2">
        <use
          href="#processing-spinner-path"
          style={{ transformOrigin: "100px 100px" }}
        />
      </g>
      {[45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
        <g key={angle} opacity={[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1][index]}>
          <use
            href="#processing-spinner-path"
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: "100px 100px",
            }}
          />
        </g>
      ))}
    </svg>
  );
}

const payoutBase: CSSProperties = {
  borderRadius: "var(--radius-full)",
  fontSize: "13px",
  lineHeight: "18px",
};

export function PayoutStatusBadge({
  status,
  payeeCount,
  completedCount,
}: {
  status: string;
  payeeCount?: number;
  completedCount?: number;
}) {
  switch (status) {
    case "paid":
      return (
        <Badge
          className="flex-shrink-0 gap-1 bg-[#E3FDEC] pr-2 pl-1.5 whitespace-nowrap text-green-700 hover:!bg-[#E3FDEC]"
          style={payoutBase}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ICON_BASE}/checkmark.circle.svg`}
            alt=""
            className="h-3.5 w-3.5 flex-shrink-0"
          />
          <span className="font-medium">Paid</span>
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="secondary"
          className="flex-shrink-0 gap-1 bg-blue-50 pr-2 pl-1.5 whitespace-nowrap text-blue-700 hover:!bg-blue-50"
          style={payoutBase}
        >
          <ProcessingSpinner />
          <span className="font-medium">Processing</span>
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="destructive"
          className="flex-shrink-0 gap-1 bg-red-50 pr-2 pl-1.5 whitespace-nowrap text-red-600 hover:!bg-red-50"
          style={payoutBase}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ICON_BASE}/error.circle.svg`}
            alt=""
            className="h-3.5 w-3.5 flex-shrink-0"
          />
          <span className="font-medium">Failed</span>
        </Badge>
      );
    default:
      if (payeeCount && payeeCount > 0) {
        const paidCount =
          completedCount !== undefined ? completedCount : payeeCount - 1;
        return (
          <Badge
            variant="secondary"
            className="flex-shrink-0 gap-1 bg-yellow-50 pr-2 pl-1.5 whitespace-nowrap text-yellow-600 hover:!bg-yellow-50"
            style={payoutBase}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ICON_BASE}/error.circle.svg`}
              alt=""
              className="h-3.5 w-3.5 flex-shrink-0"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(76%) sepia(82%) saturate(561%) hue-rotate(359deg) brightness(99%) contrast(97%)",
              }}
            />
            <span className="font-medium">
              Paid {paidCount} of {payeeCount}
            </span>
          </Badge>
        );
      }
      return (
        <Badge
          variant="secondary"
          className="flex-shrink-0 gap-1 bg-gray-50 pr-2 pl-1.5 whitespace-nowrap text-gray-600 hover:!bg-gray-50"
          style={payoutBase}
        >
          <span className="font-medium">Unknown</span>
        </Badge>
      );
  }
}
