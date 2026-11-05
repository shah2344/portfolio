"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MotionBoundary } from "@/components/motion/motion-boundary";
import { closeCaseStudy } from "@/components/motion/case-study-zoom";
import { markCaseStudySeen } from "@/components/motion/return-visit";
import { RouteLink } from "@/components/motion/route-link";
import { GlassMaterial } from "@/components/ui/glass-material";

// Closing navigates home; HomeEntranceRoot restores its saved scroll position.
const HOME = "/";

/* User-supplied IconCrossLarge, inlined so it arrives with the glass button. */
const CLOSE_PATH = "M4.75 4.75L19.25 19.25M19.25 4.75L4.75 19.25";

/**
 * The case study's way out: a link home, which also answers to Escape.
 */
export function CaseStudyClose({ label }: { label: string }) {
  const router = useRouter();

  useEffect(() => {
    markCaseStudySeen();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) {
        return;
      }

      closeCaseStudy(() => router.push(HOME, { scroll: false }));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <MotionBoundary>
      <RouteLink
        aria-label={label}
        className="glass-button case-study-page__close"
        href={HOME}
        scroll={false}
        zoom="close"
      >
        <GlassMaterial />
        <svg
          aria-hidden="true"
          className="case-study-page__close-icon"
          fill="none"
          focusable="false"
          viewBox="0 0 24 24"
        >
          <path
            d={CLOSE_PATH}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
      </RouteLink>
    </MotionBoundary>
  );
}
