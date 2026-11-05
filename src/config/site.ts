export interface SiteEnvironment {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}

export interface SiteConfig {
  name: string;
  title: string;
  description: string;
  locale: string;
  location: string;
  url: URL;
}

function asAbsoluteUrl(value: string, source: string): URL {
  const candidate = value.includes("://") ? value : `https://${value}`;

  try {
    return new URL(candidate);
  } catch {
    throw new Error(`${source} must be a valid absolute URL.`);
  }
}

export function resolveSiteUrl(environment: SiteEnvironment): URL {
  if (environment.NEXT_PUBLIC_SITE_URL) {
    return asAbsoluteUrl(
      environment.NEXT_PUBLIC_SITE_URL,
      "NEXT_PUBLIC_SITE_URL",
    );
  }

  if (environment.VERCEL_PROJECT_PRODUCTION_URL) {
    return asAbsoluteUrl(
      environment.VERCEL_PROJECT_PRODUCTION_URL,
      "VERCEL_PROJECT_PRODUCTION_URL",
    );
  }

  if (environment.VERCEL_URL) {
    return asAbsoluteUrl(environment.VERCEL_URL, "VERCEL_URL");
  }

  return new URL("http://localhost:3000");
}

export const siteConfig: SiteConfig = {
  name: "Muhammad Shahid",
  title: "Muhammad Shahid — Product Designer & AI-Assisted Design Engineer",
  description:
    "Product designer and AI-assisted design engineer creating thoughtful digital products and expressive interactive experiences.",
  locale: "en-CA",
  location: "Toronto, Canada",
  url: resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  }),
};
