"use client";

import * as React from "react";

/*
 * hooks/use-table-search.ts. Same state and timing (the spinner shows for
 * `spinnerDelayMs` after each non-empty change); the product starts that
 * timer from an effect, here it starts in the setter so no state is set
 * inside an effect.
 */

interface UseTableSearchOptions {
  initialValue?: string;
  spinnerDelayMs?: number;
}

export function useTableSearch(options: UseTableSearchOptions = {}) {
  const { initialValue = "", spinnerDelayMs = 200 } = options;
  const [searchValue, setSearchValueState] = React.useState(initialValue);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [isFiltering, setIsFiltering] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const setSearchValue = React.useCallback(
    (value: string) => {
      setSearchValueState(value);
      if (timer.current) clearTimeout(timer.current);
      if (!value.trim()) {
        setIsFiltering(false);
        return;
      }
      setIsFiltering(true);
      timer.current = setTimeout(() => {
        setIsFiltering(false);
      }, spinnerDelayMs);
    },
    [spinnerDelayMs],
  );

  return {
    searchValue,
    setSearchValue,
    isSearchFocused,
    setIsSearchFocused,
    isFiltering,
  };
}
