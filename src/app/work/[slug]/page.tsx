import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { siteConfig } from "@/config/site";
import { getProjectBySlug, getProjects } from "@/content/projects";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects({ includeDrafts: false }).map(({ metadata }) => ({
    slug: metadata.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug, { includeDrafts: false });

  if (!project) return {};

  const { metadata } = project;
  const title = `${metadata.title} — ${siteConfig.name}`;
  const url = `/work/${metadata.slug}`;
  const images = [{ alt: metadata.cover.alt, url: metadata.cover.src }];

  // Next replaces `openGraph` and `twitter` wholesale rather than merging them
  // with the layout's, so each is spelled out in full: a partial one drops the
  // site's name, type, and URL, and an absent one shares the homepage's title.
  return {
    title,
    description: metadata.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: siteConfig.locale.replace("-", "_"),
      url,
      siteName: siteConfig.name,
      title,
      description: metadata.summary,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metadata.summary,
      images,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug, { includeDrafts: false });

  if (!project) notFound();

  const { default: Project } = await project.load();

  return (
    <PageTransition key={slug}>
      <Project />
    </PageTransition>
  );
}
