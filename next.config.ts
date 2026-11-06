import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  poweredByHeader: false,
  experimental: {
    // How long the router keeps a prerendered page it has prefetched or
    // visited. Next's default is five minutes, after which going back to a
    // page — the close button, a card, a "Next case study" link — waited on
    // fetching it again. Every route here is prerendered and changes no
    // faster than the homepage's
    // daily rebuild (`revalidate` in `app/(home)/page.tsx`), so a page is
    // kept for as long as that.
    staleTimes: { static: 86400 },
  },
  images: {
    // WebP only. AVIF encodes these large, flat-toned screenshots smaller, but
    // Safari decodes it in software and the decode lands on the main thread
    // before first paint — the bytes were bought back several times over in
    // decode time on exactly the browser that could least afford it. Next
    // serves the first format the request accepts, so listing WebP alone is
    // the honest way to say "everyone gets WebP".
    formats: ["image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Public files are served with `max-age=0` by default, which leaves
        // the browser nothing it may reuse: every `<video>` of the same film
        // downloads it again. The homepage card and the case study's lead
        // frame play the same film, so opening the case study should start
        // from the bytes the card already has. An hour of freshness covers a
        // visit; the
        // files are re-encoded in place under the same names, so anything
        // longer is revalidated in the background rather than trusted.
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // The same for the live favicon's frames and the share image: each
        // page load fetched all eighteen frames again rather than reusing them.
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
