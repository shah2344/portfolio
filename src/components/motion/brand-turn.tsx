"use client";

import type { ReactNode } from "react";

import styles from "./brand-turn.module.css";
import {
  BRAND_HANDOFF,
  BRAND_HANDOFF_KEY,
  isBrandHandoff,
  type BrandHandoff,
} from "./brand-turn-motion";

/** `?brand-handoff=pop` on any page picks a candidate until it is cleared. */
export function chosenBrandHandoff(): BrandHandoff {
  try {
    const query = new URLSearchParams(window.location.search).get(
      BRAND_HANDOFF_KEY,
    );
    if (query === "default") window.localStorage.removeItem(BRAND_HANDOFF_KEY);
    else if (isBrandHandoff(query))
      window.localStorage.setItem(BRAND_HANDOFF_KEY, query);
    const stored = window.localStorage.getItem(BRAND_HANDOFF_KEY);
    if (isBrandHandoff(stored)) return stored;
  } catch {}
  return BRAND_HANDOFF;
}

/**
 * The 44px brand mark's frame: the home character and a case study's logo.
 * It no longer turns one into the other across a route; the case-study zoom
 * carries that continuity, and copying the artwork on every departure sat on
 * the click that opened a case study.
 */
export function BrandMark({ children }: { children: ReactNode }) {
  return (
    <span className={styles.frame}>
      <span className={styles.content}>{children}</span>
    </span>
  );
}
