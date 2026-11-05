import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AgentationTools } from "@/components/dev/agentation-tools";
import { LiveFavicon } from "@/components/favicon/live-favicon";
import { characterBackgroundScript } from "@/components/home/character/backgrounds";
import { siteConfig } from "@/config/site";

import "./globals.css";

const timelessSans = localFont({
  src: "./fonts/TimelessSansVF.woff2",
  weight: "300 800",
  style: "normal",
  display: "swap",
  variable: "--font-timeless-sans",
});

/*
 * The hand that marks up the case-study screens. Self-hosted with the rest of
 * the type rather than fetched, and only ever used for annotation, so it loads
 * on the pages that carry one and stays out of the reading column.
 *
 * The face is declared on `html` so any route can reach the variable, which
 * had Next preloading it everywhere — including the homepage, which never
 * paints a glyph of it and was spending a request on it against first paint.
 * Opting out of the preload leaves the `@font-face` in place: the annotations
 * fetch it when they are actually rendered, and `swap` covers the gap.
 */
const caveat = Caveat({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  preload: false,
  variable: "--font-hand",
});

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  category: "portfolio",
  openGraph: {
    type: "website",
    locale: siteConfig.locale.replace("-", "_"),
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    // Served from `public/` rather than as `app/opengraph-image.gif`: Next
    // types file-based metadata images only for png, jpeg, ico, and svg, and
    // sent the GIF as `text/plain`, which unfurlers reject under `nosniff`.
    images: [
      {
        url: "/images/og.gif",
        width: 1200,
        height: 630,
        type: "image/gif",
        alt: "Muhammad Shahid, Product Designer, with a glossy glass character between the two.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

/* The browser's chrome and form controls follow the page into dark. The two
   colours are the page's grounds, `--site-background` in `globals.css`. */
export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${timelessSans.variable} ${caveat.variable}`}
      data-scroll-behavior="smooth"
      lang={siteConfig.locale}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('portfolio-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=t==='dark'?'#0f0f0f':'#fcfcfc'})}}catch(e){}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: characterBackgroundScript }}
        />
      </head>
      <body>
        <div data-site-root>{children}</div>
        <AgentationTools />
        <LiveFavicon />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
