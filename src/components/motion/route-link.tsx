"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import { PrefetchLink } from "@/components/ui/prefetch-link";

import { closeCaseStudy, openCaseStudy } from "./case-study-zoom";
import { navigateToPage, type ZoomDirection } from "./page-wipe";

type RouteLinkProps = Omit<
  ComponentProps<typeof PrefetchLink>,
  "href" | "onNavigate"
> & {
  href: string;
  /** Opens a case study out of its homepage card, or closes it into one. */
  zoom?: ZoomDirection;
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
        if (zoom === "open") openCaseStudy(navigate, href);
        else if (zoom === "close") closeCaseStudy(navigate);
        else navigateToPage(navigate);
      }}
      replace={replace}
      scroll={scroll}
    />
  );
}
