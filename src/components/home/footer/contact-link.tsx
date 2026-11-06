"use client";

import type { ComponentProps } from "react";

/**
 * The footer waits pinned under the sheet, where the browser counts it as
 * already in view and won't scroll to a link focused inside it. Run the page
 * out instead, so a keyboard reader lands on the link fully uncovered.
 */
export function ContactLink(props: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onFocus={(event) => {
        if (!event.currentTarget.matches(":focus-visible")) return;
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant",
        });
      }}
    />
  );
}
