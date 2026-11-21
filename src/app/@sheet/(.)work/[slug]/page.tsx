import { notFound } from "next/navigation";

import { CaseSheetEntry } from "@/components/work/case-sheet/case-sheet";
import { getProjectBySlug } from "@/content/projects";

export { generateMetadata, generateStaticParams } from "@/app/work/[slug]/page";

export const dynamicParams = false;

/*
 * A case study opened from the homepage: it rises as a sheet over the page
 * rather than replacing it. Arriving by its URL renders the full page in
 * `app/work/[slug]` instead; a reload on a desktop reopens the sheet
 * (`reopen-sheet-script.ts`).
 */
export default async function CaseSheetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug, { includeDrafts: false });

  if (!project) notFound();

  const { default: Project } = await project.load();

  return (
    <CaseSheetEntry href={`/work/${slug}`} name={project.metadata.title}>
      <Project />
    </CaseSheetEntry>
  );
}
