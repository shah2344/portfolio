import Script from "next/script";

import { resolveUmami } from "@/config/analytics";

/**
 * Umami's tracker: page views (including client-side navigations), referrers
 * and UTM tags, Core Web Vitals per visit, and uncaught script errors. The
 * hash is left out so table-of-contents jumps don't count as page views.
 */
export function UmamiScript() {
  const umami = resolveUmami({
    UMAMI_WEBSITE_ID: process.env.UMAMI_WEBSITE_ID,
    UMAMI_SCRIPT_URL: process.env.UMAMI_SCRIPT_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  if (!umami) return null;

  return (
    <Script
      data-errors="true"
      data-exclude-hash="true"
      data-performance="true"
      data-release={umami.release}
      data-website-id={umami.websiteId}
      src={umami.scriptUrl}
      strategy="afterInteractive"
    />
  );
}
