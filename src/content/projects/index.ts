import { metadata as templateMetadata } from "./_template.mdx";
import { metadata as anydayMetadata } from "./anyday.mdx";
import { metadata as humiMetadata } from "./humi.mdx";
import { metadata as montranMetadata } from "./montran.mdx";
import {
  selectProjects,
  type ProjectEntry,
  type ProjectMetadata,
} from "./project";

export type {
  ProjectEntry,
  ProjectMetadata,
  ProjectMetadataInput,
  ProjectStatus,
} from "./project";
export { defineProjectMetadata } from "./project";

export interface ProjectQueryOptions {
  includeDrafts?: boolean;
}

const projectRegistry = [
  {
    metadata: anydayMetadata,
    load: () => import("./anyday.mdx"),
  },
  {
    metadata: humiMetadata,
    load: () => import("./humi.mdx"),
  },
  {
    metadata: montranMetadata,
    load: () => import("./montran.mdx"),
  },
  {
    metadata: templateMetadata,
    load: () => import("./_template.mdx"),
  },
] satisfies readonly ProjectEntry[];

function includeDraftsByDefault(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getProjects(
  options: ProjectQueryOptions = {},
): readonly ProjectEntry[] {
  return selectProjects(projectRegistry, {
    includeDrafts: options.includeDrafts ?? includeDraftsByDefault(),
  });
}

export function getProjectBySlug(
  slug: string,
  options: ProjectQueryOptions = {},
): ProjectEntry | undefined {
  return getProjects(options).find(
    ({ metadata }: { metadata: ProjectMetadata }) => metadata.slug === slug,
  );
}
