"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type PrefetchLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * A `Link` that also warms its route when it takes keyboard focus.
 *
 * `Link` prefetches as it enters the viewport, and bumps that to the front of
 * the queue when a pointer rests on it or a finger lands on it — but it never
 * listens for focus, so a reader moving through the page by keyboard waited on
 * the viewport alone, and on a route whose prefetch had gone stale, on the
 * click. Focus is the keyboard's version of hovering, so it asks for the route
 * too. A prefetch lands in the same client cache the viewport and hover ones
 * do, so a route that is already there and still fresh costs nothing.
 */
export function PrefetchLink({
  href,
  onFocus,
  prefetch,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      href={href}
      onFocus={(event) => {
        onFocus?.(event);
        if (prefetch !== false) router.prefetch(href);
      }}
      prefetch={prefetch}
    />
  );
}
