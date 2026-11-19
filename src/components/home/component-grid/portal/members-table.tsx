"use client";

import type { CSSProperties, ReactNode } from "react";
import { m } from "motion/react";

import { cn } from "./ui/cn";
import { HighlightText } from "./ui/highlight-text";
import { MemberStatusBadge, type MemberStatus } from "./ui/status-badges";

/*
 * The members table of app/members/members-page-client.tsx at mobile widths
 * (below `sm`/`md`): the Name column (name over phone, both highlighted) and
 * the Status column. Phone and Assigned locations columns are hidden there.
 * Names, numbers and locations are invented.
 */

export type Member = {
  id: string;
  name: string;
  mobile_number_code: string;
  mobile_number: string;
  status: MemberStatus;
  locations: string[];
  /** For the selection toolbar's payment total. */
  tipsOwed: number;
};

export const LOCATIONS = [
  { value: "downtown", label: "Downtown" },
  { value: "harbour", label: "Harbour" },
  { value: "uptown", label: "Uptown" },
];

export const members: Member[] = [
  {
    id: "1",
    name: "Diego Alvarez",
    mobile_number_code: "1",
    mobile_number: "5550100187",
    status: "active",
    locations: ["downtown"],
    tipsOwed: 231.25,
  },
  {
    id: "2",
    name: "Lena Fischer",
    mobile_number_code: "1",
    mobile_number: "5550100248",
    status: "invited",
    locations: ["harbour"],
    tipsOwed: 48.75,
  },
  {
    id: "3",
    name: "Maya Chen",
    mobile_number_code: "1",
    mobile_number: "5550100142",
    status: "active",
    locations: ["downtown", "uptown"],
    tipsOwed: 169.8,
  },
  {
    id: "4",
    name: "Priya Nair",
    mobile_number_code: "1",
    mobile_number: "5550100263",
    status: "onboarding",
    locations: ["uptown"],
    tipsOwed: 64.5,
  },
  {
    id: "5",
    name: "Sam Okafor",
    mobile_number_code: "1",
    mobile_number: "5550100319",
    status: "inactive",
    locations: ["harbour"],
    tipsOwed: 146.8,
  },
];

/** lib/utils/phone.ts */
function formatPhoneNumber(code: string, number: string): string {
  const cleanedNumber = number.replace(/\D/g, "");
  const cleanedCode = String(code).replace(/\D/g, "");
  if (cleanedCode === "1" && cleanedNumber.length === 10) {
    return `+${cleanedCode}\u202F(${cleanedNumber.slice(0, 3)}) ${cleanedNumber.slice(3, 6)}-${cleanedNumber.slice(6)}`;
  }
  return `+${cleanedCode} ${cleanedNumber}`;
}

function normalizePhoneForSearch(code: string, number: string): string {
  const cleanedNumber = number.replace(/\D/g, "");
  const cleanedCode = code ? String(code).replace(/\D/g, "") : "";
  return cleanedCode ? `${cleanedCode}${cleanedNumber}` : cleanedNumber;
}

/** Highlight phone text with normalized search matching (members page). */
function HighlightPhoneText({
  formattedPhone,
  normalizedPhone,
  searchTerm,
}: {
  formattedPhone: string;
  normalizedPhone: string;
  searchTerm: string;
}) {
  if (!searchTerm.trim()) {
    return <span>{formattedPhone}</span>;
  }

  const normalizedSearch = searchTerm.replace(/\D/g, "");
  if (!normalizedSearch || !normalizedPhone.includes(normalizedSearch)) {
    return <HighlightText text={formattedPhone} highlight={searchTerm} />;
  }

  const searchIndex = normalizedPhone.indexOf(normalizedSearch);
  if (searchIndex === -1) {
    return <span>{formattedPhone}</span>;
  }

  let normalizedPos = 0;
  const parts: Array<{ text: string; isHighlight: boolean }> = [];
  let currentPart: { text: string; isHighlight: boolean } | null = null;

  for (let i = 0; i < formattedPhone.length; i++) {
    const char = formattedPhone[i] ?? "";
    const isDigit = /\d/.test(char);

    let shouldHighlight = false;
    if (isDigit) {
      shouldHighlight =
        normalizedPos >= searchIndex &&
        normalizedPos < searchIndex + normalizedSearch.length;
      normalizedPos++;
    } else {
      shouldHighlight = currentPart ? currentPart.isHighlight : false;
    }

    if (currentPart && currentPart.isHighlight !== shouldHighlight) {
      parts.push(currentPart);
      currentPart = { text: char, isHighlight: shouldHighlight };
    } else if (currentPart) {
      currentPart.text += char;
    } else {
      currentPart = { text: char, isHighlight: shouldHighlight };
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return (
    <span>
      {parts.map((part, index) => {
        if (part.isHighlight) {
          return (
            <m.span
              key={`phone-highlight-${index}`}
              initial={false}
              animate={{ backgroundSize: "100% 100%" }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
              style={{
                background: "linear-gradient(90deg, #fef08a 0%, #fef08a 100%)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "left center",
                backgroundSize: "100% 100%",
                padding: "0",
                borderRadius: "var(--radius-1)",
              }}
            >
              {part.text}
            </m.span>
          );
        }
        return <span key={`phone-text-${index}`}>{part.text}</span>;
      })}
    </span>
  );
}

/** The page's search filter (name, phone, normalized phone), plus locations. */
export function filterMembers(
  list: Member[],
  searchTerm: string,
  locations: string[] = [],
) {
  let filtered = list;
  if (locations.length > 0) {
    filtered = filtered.filter((member) =>
      member.locations.some((location) => locations.includes(location)),
    );
  }
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    const normalizedSearch = searchTerm.replace(/\D/g, "");

    filtered = filtered.filter((member) => {
      const name = member.name.toLowerCase();
      const phoneCode = member.mobile_number_code;
      const phoneNumber = member.mobile_number;
      const formattedPhone = formatPhoneNumber(phoneCode, phoneNumber);
      const normalizedPhone = normalizePhoneForSearch(phoneCode, phoneNumber);

      return (
        name.includes(searchLower) ||
        phoneCode.toLowerCase().includes(searchLower) ||
        phoneNumber.toLowerCase().includes(searchLower) ||
        formattedPhone.toLowerCase().includes(searchLower) ||
        (normalizedSearch.length > 0 &&
          normalizedPhone.includes(normalizedSearch))
      );
    });
  }
  return filtered;
}

function Cell({
  className,
  style,
  children,
}: {
  className: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <td
      data-slot="table-cell"
      className={cn("align-middle whitespace-nowrap", className)}
      style={style}
    >
      {children}
    </td>
  );
}

export function MembersTable({
  rows,
  searchTerm = "",
  selection,
}: {
  rows: Member[];
  searchTerm?: string;
  /** A leading checkbox column, as in the product's selectable tables. */
  selection?: {
    renderHeader: () => ReactNode;
    renderCell: (member: Member) => ReactNode;
  };
}) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full !overflow-visible"
    >
      <table
        data-slot="table"
        className="text-regular-default w-full caption-bottom"
      >
        <thead data-slot="table-header" className="[&_tr]:border-b">
          <tr
            data-slot="table-row"
            className="w-full border-b border-[var(--border-solid)] bg-[var(--bg-shade)] transition-colors duration-[30ms]"
          >
            {selection && (
              <th
                data-slot="table-head"
                className="h-10 py-3 pr-0 pl-4 text-center align-middle whitespace-nowrap"
                style={{ width: "44px" }}
              >
                {selection.renderHeader()}
              </th>
            )}
            <th
              data-slot="table-head"
              className="h-10 min-w-0 px-4 py-3 text-left align-middle text-[0.875rem] leading-[1rem] font-medium whitespace-nowrap text-[var(--label-secondary)]"
            >
              Name
            </th>
            <th
              data-slot="table-head"
              className="h-10 py-3 pr-5 pl-4 text-right align-middle text-[0.875rem] leading-[1rem] font-medium whitespace-nowrap text-[var(--label-secondary)]"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody
          data-slot="table-body"
          className="w-full [&_tr:last-child]:border-0"
        >
          {rows.length === 0 ? (
            <tr
              data-slot="table-row"
              className="w-full border-b border-[var(--border-solid)] bg-[var(--control-base)] transition-colors duration-[30ms]"
            >
              <td
                data-slot="table-cell"
                colSpan={selection ? 3 : 2}
                className="p-2 align-middle whitespace-nowrap"
              >
                <div className="py-8 text-center text-[var(--label-secondary)]">
                  No results.
                </div>
              </td>
            </tr>
          ) : (
            rows.map((member, index) => {
              const isLastRow = index === rows.length - 1;
              const formattedPhone = formatPhoneNumber(
                member.mobile_number_code,
                member.mobile_number,
              );
              return (
                <tr
                  key={member.id}
                  data-slot="table-row"
                  className="w-full cursor-pointer border-b border-[var(--border-solid)] bg-white transition-colors duration-[30ms] last:border-b-0 hover:bg-[var(--bg-shade)]"
                >
                  {selection && (
                    <Cell
                      className="py-4 pr-0 pl-4 text-center"
                      style={{ width: "44px" }}
                    >
                      {selection.renderCell(member)}
                    </Cell>
                  )}
                  <Cell
                    className={cn(
                      "min-w-0 py-4 pr-5 pl-4 text-left",
                      isLastRow && !selection ? "rounded-bl-2xl" : "",
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className="truncate text-[1rem] font-medium text-[var(--label-primary)]"
                        style={{
                          lineHeight: "1.25rem",
                          letterSpacing: "-0.015rem",
                        }}
                      >
                        <HighlightText
                          text={member.name}
                          highlight={searchTerm}
                        />
                      </span>
                      <span
                        className="truncate text-[14px] font-normal tracking-[-0.08px] text-[var(--label-secondary)]"
                        style={{
                          lineHeight: "18px",
                          letterSpacing: "-0.08px",
                        }}
                      >
                        <HighlightPhoneText
                          formattedPhone={formattedPhone}
                          normalizedPhone={normalizePhoneForSearch(
                            member.mobile_number_code,
                            member.mobile_number,
                          )}
                          searchTerm={searchTerm}
                        />
                      </span>
                    </div>
                  </Cell>
                  <Cell className="py-4 pr-5 pl-4 text-right">
                    <div className="flex min-w-0 items-center justify-end">
                      <MemberStatusBadge status={member.status} />
                    </div>
                  </Cell>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
