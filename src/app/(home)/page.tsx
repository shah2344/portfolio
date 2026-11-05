import type { Metadata } from "next";

import { EditorialHome } from "@/components/home/editorial-home";
import { siteConfig } from "@/config/site";

// Set here rather than in the layout, which every route inherits from.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The chart's "Now" marker is rendered on the server, so the page has to be
// rebuilt as time passes rather than frozen at deploy.
export const revalidate = 86400;

// Tells search engines whose site this is: a profile page about one person.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: siteConfig.url.href,
  mainEntity: {
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url.href,
    jobTitle: "Product Designer & AI-Assisted Design Engineer",
    description: siteConfig.description,
    homeLocation: { "@type": "Place", name: siteConfig.location },
  },
};

export default function HomePage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
        type="application/ld+json"
      />
      <EditorialHome />
    </>
  );
}
