import { describe, expect, it } from "bun:test";

import { resolveSiteUrl } from "../../src/config/site.ts";

describe("resolveSiteUrl", () => {
  it("prefers an explicit site URL over Vercel deployment URLs", () => {
    const url = resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://muhammadshahid.design/",
      VERCEL_PROJECT_PRODUCTION_URL: "portfolio.vercel.app",
      VERCEL_URL: "portfolio-preview.vercel.app",
    });

    expect(url.href).toBe("https://muhammadshahid.design/");
  });

  it("uses the production Vercel URL before a preview URL", () => {
    const url = resolveSiteUrl({
      VERCEL_PROJECT_PRODUCTION_URL: "portfolio.vercel.app",
      VERCEL_URL: "portfolio-preview.vercel.app",
    });

    expect(url.href).toBe("https://portfolio.vercel.app/");
  });

  it("uses the preview URL when no canonical deployment URL exists", () => {
    const url = resolveSiteUrl({
      VERCEL_URL: "portfolio-git-main.vercel.app",
    });

    expect(url.href).toBe("https://portfolio-git-main.vercel.app/");
  });

  it("falls back to the local development URL", () => {
    expect(resolveSiteUrl({}).href).toBe("http://localhost:3000/");
  });
});
