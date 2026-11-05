import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A section label with a hairline running to the far edge, shared by the
 * homepage and the case studies. The rule is drawn by the heading itself, so
 * the label is the only text a screen reader hears.
 */
export function SectionHeading({
  children,
  className,
  ...props
}: ComponentProps<"h2">) {
  return (
    <h2 className={cn("section-heading", className)} {...props}>
      <span>{children}</span>
    </h2>
  );
}
