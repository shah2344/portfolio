import { describe, expect, it } from "bun:test";

import {
  defineProjectMetadata,
  selectProjects,
  type ProjectEntry,
  type ProjectMetadataInput,
} from "../../src/content/projects/project.ts";

const baseProject: ProjectMetadataInput = {
  slug: "accessible-design-system",
  title: "Accessible design system",
  summary: "A product design system built for clarity and scale.",
  year: 2026,
  role: "Product designer",
  disciplines: ["Product design", "Design engineering"],
  cover: {
    src: "/images/projects/design-system-cover.jpg",
    alt: "A collection of interface components",
  },
  featured: true,
  order: 1,
  status: "published",
};

function entry(overrides: Partial<ProjectMetadataInput>): ProjectEntry {
  return {
    metadata: defineProjectMetadata({ ...baseProject, ...overrides }),
    load: async () => ({ default: () => null }),
  };
}

describe("defineProjectMetadata", () => {
  it("returns valid project metadata", () => {
    expect(defineProjectMetadata(baseProject)).toEqual(baseProject);
  });

  it("reports the invalid field when metadata cannot be parsed", () => {
    expect(() =>
      defineProjectMetadata({ ...baseProject, slug: "Not Valid" }),
    ).toThrow(/Invalid project metadata.*slug/s);
  });
});

describe("selectProjects", () => {
  const entries = [
    entry({ slug: "third", title: "Third", order: 2, year: 2026 }),
    entry({ slug: "second", title: "Second", order: 1, year: 2024 }),
    entry({ slug: "first", title: "First", order: 1, year: 2026 }),
    entry({ slug: "draft", title: "Draft", order: 0, status: "draft" }),
  ];

  it("excludes drafts and sorts by order, year, then title", () => {
    const selected = selectProjects(entries, { includeDrafts: false });

    expect(selected.map(({ metadata }) => metadata.slug)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("includes drafts when explicitly requested without mutating the registry", () => {
    const selected = selectProjects(entries, { includeDrafts: true });

    expect(selected[0]?.metadata.slug).toBe("draft");
    expect(selected).toHaveLength(4);
    expect(entries[0]?.metadata.slug).toBe("third");
  });
});
