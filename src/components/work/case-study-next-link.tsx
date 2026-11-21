"use client";

import type { ComponentProps } from "react";

import { RouteLink } from "@/components/motion/route-link";
import { replacePhoneSheet } from "@/components/work/case-sheet/phone-sheet";

/**
 * The link on to the next case study. On a phone, a story stacked over the
 * homepage hands its place in history to the next, which stays stacked; see
 * `phone-sheet.ts`.
 */
export function CaseStudyNextLink({
  href,
  ...props
}: ComponentProps<typeof RouteLink>) {
  return (
    <RouteLink
      {...props}
      href={href}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        if (replacePhoneSheet(href)) event.preventDefault();
      }}
    />
  );
}
