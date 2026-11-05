import type { ComponentType } from "react";
import { z } from "zod";

export type ProjectStatus = "draft" | "published";

const projectMetadataSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use a lowercase, hyphen-separated slug.",
      ),
    title: z.string().min(1),
    summary: z.string().min(1),
    year: z
      .number()
      .int()
      .min(2000)
      .max(new Date().getFullYear() + 1),
    role: z.string().min(1),
    disciplines: z.array(z.string().min(1)).min(1),
    cover: z.object({
      src: z.string().min(1),
      alt: z.string().min(1),
    }),
    featured: z.boolean(),
    order: z.number().int().nonnegative(),
    status: z.enum(["draft", "published"]),
  })
  .strict();

export type ProjectMetadataInput = z.input<typeof projectMetadataSchema>;
export type ProjectMetadata = z.output<typeof projectMetadataSchema>;

export interface ProjectEntry {
  metadata: ProjectMetadata;
  load: () => Promise<{ default: ComponentType }>;
}

export function defineProjectMetadata(
  input: ProjectMetadataInput,
): ProjectMetadata {
  const result = projectMetadataSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "metadata"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid project metadata — ${details}`);
  }

  return result.data;
}

export function selectProjects(
  entries: readonly ProjectEntry[],
  options: { includeDrafts: boolean },
): readonly ProjectEntry[] {
  return entries
    .filter(
      ({ metadata }) =>
        options.includeDrafts || metadata.status === "published",
    )
    .toSorted(
      (left, right) =>
        left.metadata.order - right.metadata.order ||
        right.metadata.year - left.metadata.year ||
        left.metadata.title.localeCompare(right.metadata.title),
    );
}
