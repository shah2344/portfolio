/*
 * Reloading a case study on a desktop opens it again as the sheet over the
 * homepage, not as a page of its own. Inlined at the top of every document,
 * so the story's page is swapped out before it paints.
 *
 * On a reload of `/work/[slug]`, the story's path is kept for the homepage,
 * which replaces this entry in history. The homepage's sheet takes it and
 * pushes the story's URL again (`CaseSheetHost`), so the sheet rises over it
 * and closing steps back to the homepage. Arriving by a link still lands on
 * the full page, and phones keep their own story pages (`phone-sheet.ts`).
 */

import { PHONE_SHEET_QUERY } from "./phone-sheet";

export const REOPEN_KEY = "case-sheet:reopen";

function reopen(key: string, phoneQuery: string) {
  const path = window.location.pathname;
  if (!path.startsWith("/work/")) return;
  if (window.matchMedia(phoneQuery).matches) return;
  const [entry] = performance.getEntriesByType("navigation") as
    PerformanceNavigationTiming[] | [];
  if (entry?.type !== "reload") return;
  window.sessionStorage.setItem(key, path);
  document.documentElement.style.visibility = "hidden";
  window.location.replace("/");
}

export const reopenSheetScript = `try{(${reopen.toString()})(${JSON.stringify(REOPEN_KEY)},${JSON.stringify(PHONE_SHEET_QUERY)})}catch(e){}`;
