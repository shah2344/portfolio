"use client";

import { useEffect, useState } from "react";

import { currentWipe } from "./page-wipe";

/**
 * Whether the theme-change reveal running when this component mounted has
 * finished. A component mounted during the reveal starts `false` and turns
 * `true` as it lets go; one mounted with no reveal running, including every
 * server render and a first load, is `true` from the start.
 *
 * Video keys its sources off this. Starting a decoder, fetching, and seeking to
 * a first frame all land on Safari's compositor while it is drawing the
 * reveal's snapshot, and a page mounting several clips stalled it. The artwork
 * each clip already shows until its first frame covers the wait.
 */
export function useAfterWipe() {
  const [settled, setSettled] = useState(() => currentWipe() === null);

  useEffect(() => {
    if (settled) return;
    let active = true;
    void (currentWipe() ?? Promise.resolve()).then(() => {
      if (active) setSettled(true);
    });
    return () => {
      active = false;
    };
  }, [settled]);

  return settled;
}
