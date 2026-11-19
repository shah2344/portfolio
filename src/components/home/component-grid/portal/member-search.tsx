"use client";

import { AnimatePresence, m } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { DemoCursor, useDemo } from "../demo";
import { FitStage } from "../fit-stage";
import { MembersTable, filterMembers, members } from "./members-table";
import { ICON_BASE, cn } from "./ui/cn";
import { Button } from "./ui/button";
import { LoaderIcon } from "./ui/loader-icon";
import { useTableSearch } from "./ui/use-table-search";

/*
 * The members card of app/unpaid-payout-details/[id]/page.tsx: its table
 * header (search icon <-> spinner while filtering, search input, Filter
 * button) and the member rows under it. The page filters the same way and
 * shows the spinner for 200ms after each keystroke.
 *
 * Left alone, a cursor clicks into the search and types: a name, part of a
 * phone number, then a surname, a key at a time, so the spinner turns, the
 * matches light up and the table folds down to them, then opens back up as
 * the query is cleared. Pointing at the card stops it and hands the search
 * over.
 */
const QUERIES = ["Maya", "0263", "Okafor"];
const HOME = { x: 250, y: 250 };

function MemberSearch() {
  const {
    searchValue: searchTerm,
    setSearchValue: setSearchTerm,
    isSearchFocused,
    setIsSearchFocused,
    isFiltering,
  } = useTableSearch();

  const root = useRef<HTMLDivElement>(null);
  const query = useRef(0);

  const cursor = useDemo(
    root,
    async (a) => {
      await a.wait(600);
      await a.move("search", { kind: "ibeam", ax: 0.3 });
      await a.click();
      setIsSearchFocused(true);
      await a.wait(250);
      const text = QUERIES[query.current++ % QUERIES.length] ?? "Maya";
      await a.type(setSearchTerm, text, { ms: 130 });
      await a.wait(1600);
      for (let i = text.length - 1; i >= 0; i--) {
        setSearchTerm(text.slice(0, i));
        await a.wait(55);
      }
      setIsSearchFocused(false);
      await a.moveTo(HOME.x, HOME.y, "pointer");
      await a.wait(900);
    },
    {
      home: HOME,
      interactive: true,
      reset: () => {
        setSearchTerm("");
        setIsSearchFocused(false);
      },
    },
  );

  // The card shows at most two rows, so the column fits the feed card
  // and a broad match (a single digit) never grows it.
  const filteredMembers = filterMembers(members, searchTerm).slice(0, 2);

  // The table shrinks to its matches with motion while its card keeps the
  // height of the full list, so nothing around it moves.
  const frame = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState<number>();
  const [tableHeight, setTableHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = table.current;
    if (!element) return;
    if (frame.current) setFrameHeight(frame.current.offsetHeight);
    const observer = new ResizeObserver(() =>
      setTableHeight(element.offsetHeight),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative"
      ref={(element) => {
        frame.current = element;
        root.current = element;
      }}
      style={{ minHeight: frameHeight }}
    >
      <DemoCursor
        kind={cursor.kind}
        pressed={cursor.pressed}
        shown={cursor.running}
        x={cursor.x}
        y={cursor.y}
      />
      <div className="w-full overflow-hidden rounded-[var(--radius-6)] border border-[var(--border-solid)] bg-[var(--bg-base)]">
        {/* Table Header */}
        <div className="relative flex w-full items-center gap-3 border-b border-[var(--border-solid)] bg-[var(--bg-shade)] px-4 py-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.div
                  key={isFiltering ? "spinner" : "search"}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                    filter: "blur(4px)",
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    filter: "blur(4px)",
                  }}
                  transition={{
                    type: "spring",
                    duration: 0.2,
                    bounce: 0,
                  }}
                >
                  {isFiltering ? (
                    <LoaderIcon
                      role="status"
                      aria-label="Loading"
                      className={cn(
                        "h-5 w-5 animate-spin text-[var(--label-secondary)]",
                      )}
                    />
                  ) : (
                    <svg
                      className={`h-5 w-5 transition-colors duration-200 ${isSearchFocused ? "text-[var(--label-primary)]" : "text-[var(--icon-faint)]"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      />
                    </svg>
                  )}
                </m.div>
              </AnimatePresence>
            </div>
            <input
              data-demo="search"
              type="text"
              placeholder="Search by name..."
              aria-label="Search members by name"
              value={searchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => {
                const value = e.target.value;
                // Capitalize first letter but preserve spaces
                const capitalizedValue =
                  value.charAt(0).toUpperCase() + value.slice(1);
                setSearchTerm(capitalizedValue);
              }}
              className="flex-1 bg-transparent text-[1rem] text-[var(--label-primary)] placeholder-[var(--label-faint)] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="regular"
              className="h-[2.125rem] px-3 text-[1rem] font-medium"
              leftIcon={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${ICON_BASE}/filtertable.svg`}
                  alt="Filter"
                  className="h-5 w-5"
                />
              }
            >
              Filter
            </Button>
          </div>
        </div>

        <m.div
          className="overflow-hidden"
          initial={false}
          animate={{ height: tableHeight ?? "auto" }}
          transition={{ type: "spring", duration: 0.35, bounce: 0 }}
        >
          <div ref={table}>
            <MembersTable rows={filteredMembers} searchTerm={searchTerm} />
          </div>
        </m.div>
      </div>
    </div>
  );
}

export function PortalMemberSearch() {
  return (
    <FitStage gutter={16} className="anyday-portal">
      <MemberSearch />
    </FitStage>
  );
}
