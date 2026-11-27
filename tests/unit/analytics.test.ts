import { describe, expect, it } from "bun:test";

import { resolveUmami } from "../../src/config/analytics.ts";
import { assetPath, readTrackedEvent } from "../../src/lib/analytics.ts";

describe("resolveUmami", () => {
  it("stays off without a website ID", () => {
    expect(resolveUmami({ VERCEL_ENV: "production" })).toBeNull();
  });

  it("stays off outside the production deployment", () => {
    expect(
      resolveUmami({ UMAMI_WEBSITE_ID: "abc", VERCEL_ENV: "preview" }),
    ).toBeNull();
    expect(resolveUmami({ UMAMI_WEBSITE_ID: "abc" })).toBeNull();
  });

  it("uses Umami Cloud and a short release on production", () => {
    expect(
      resolveUmami({
        UMAMI_WEBSITE_ID: " abc ",
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_SHA: "65133ca0f1e2d3",
      }),
    ).toEqual({
      websiteId: "abc",
      scriptUrl: "https://cloud.umami.is/script.js",
      release: "65133ca",
    });
  });

  it("accepts a self-hosted script", () => {
    expect(
      resolveUmami({
        UMAMI_WEBSITE_ID: "abc",
        UMAMI_SCRIPT_URL: "https://stats.example.com/script.js",
        VERCEL_ENV: "production",
      })?.scriptUrl,
    ).toBe("https://stats.example.com/script.js");
  });
});

describe("readTrackedEvent", () => {
  it("ignores elements without an event", () => {
    expect(readTrackedEvent({ profile: "email" })).toBeNull();
  });

  it("reads the event and its data, leaving other attributes out", () => {
    expect(
      readTrackedEvent({
        track: "contact",
        trackChannel: "email",
        trackPlace: "footer",
        profile: "email",
      }),
    ).toEqual({
      event: "contact",
      data: { channel: "email", place: "footer" },
    });
  });

  it("sends a bare event when there is no data", () => {
    expect(readTrackedEvent({ track: "theme" })).toEqual({ event: "theme" });
  });
});

describe("assetPath", () => {
  const origin = "https://muhammad.design";

  it("keeps same-origin files as their path and query", () => {
    expect(
      assetPath(
        "https://muhammad.design/_next/image?url=%2Fa.png&w=640",
        origin,
      ),
    ).toBe("/_next/image?url=%2Fa.png&w=640");
  });

  it("keeps other hosts in full", () => {
    expect(assetPath("https://cdn.example.com/a.mp4", origin)).toBe(
      "https://cdn.example.com/a.mp4",
    );
  });
});
