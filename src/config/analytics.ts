export interface AnalyticsEnvironment {
  UMAMI_WEBSITE_ID?: string;
  UMAMI_SCRIPT_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
}

export interface UmamiConfig {
  websiteId: string;
  scriptUrl: string;
  /** Short commit SHA, attached to captured errors. */
  release?: string;
}

const UMAMI_CLOUD_SCRIPT = "https://cloud.umami.is/script.js";

/**
 * Umami runs only on the production deployment, and only once a website ID
 * is set, so local work and preview links never count as visits.
 */
export function resolveUmami(
  environment: AnalyticsEnvironment,
): UmamiConfig | null {
  const websiteId = environment.UMAMI_WEBSITE_ID?.trim();
  if (!websiteId || environment.VERCEL_ENV !== "production") return null;

  return {
    websiteId,
    scriptUrl: environment.UMAMI_SCRIPT_URL?.trim() || UMAMI_CLOUD_SCRIPT,
    release: environment.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || undefined,
  };
}
