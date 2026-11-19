"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import { PrefetchLink } from "@/components/ui/prefetch-link";

import { closeCaseStudy } from "./case-study-zoom";
import { navigateToPage } from "./page-wipe";

type RouteLinkProps = Omit<
  ComponentProps<typeof PrefetchLink>,
  "href" | "onNavigate"
> & {
  href: string;
  /** Closes a full-page case study back into the homepage. */
  zoom?: "close";
};

/** Prefetched navigation with immediate arrival, including during a theme change. */
export function RouteLink({
  href,
  replace = false,
  scroll = true,
  zoom,
  ...props
}: RouteLinkProps) {
  const router = useRouter();

  return (
    <PrefetchLink
      {...props}
      href={href}
      onNavigate={(event) => {
        event.preventDefault();
        const navigate = () =>
          replace
            ? router.replace(href, { scroll })
            : router.push(href, { scroll });
        if (zoom === "close") closeCaseStudy(navigate);
        else navigateToPage(navigate);
      }}
      replace={replace}
      scroll={scroll}
    />
  );
}
