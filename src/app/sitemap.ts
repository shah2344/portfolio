import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getProjects } from "@/content/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url.href,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...getProjects({ includeDrafts: false }).map(({ metadata }) => ({
      url: new URL(`/work/${metadata.slug}`, siteConfig.url).href,
      changeFrequency: "monthly" as const,
      priority: metadata.featured ? 0.9 : 0.7,
    })),
  ];
}
