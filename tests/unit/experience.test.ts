import { describe, expect, it } from "bun:test";

import {
  buildExperienceGroups,
  buildExperienceList,
  experienceYears,
} from "../../src/content/experience";

/** Sep 2026 — eight years and four months after the first role starts. */
const NOW = new Date(2026, 8, 5);

describe("experience list", () => {
  it("orders roles by the month they ended, still-running ones first", () => {
    const roles = buildExperienceList();

    expect(roles.map((role) => `${role.company} — ${role.title}`)).toEqual([
      "Montran — Contract designer",
      "AnyDay — Sr. Product Designer",
      "Batch — Founding Designer",
      "Humi — Product Designer",
      "Humi — Design Intern",
    ]);
  });

  it("flags the second stint of a run so the run shares one mark", () => {
    const roles = buildExperienceList();

    expect(
      roles
        .filter((role) => role.continuesCompany)
        .map((role) => `${role.company} — ${role.title}`),
    ).toEqual(["Humi — Design Intern"]);
    // The stint a run opens on never continues anything, even at the same
    // company as the row below it.
    expect(roles[0]!.continuesCompany).toBe(false);
  });

  it("marks the role running today as ongoing, and only that one", () => {
    const roles = buildExperienceList();
    const ongoing = roles.filter((role) => role.ongoing);

    expect(ongoing.map((role) => role.company)).toEqual(["Montran"]);
    for (const role of ongoing) {
      expect(role.dateTo).toBe("Now");
    }
    // A role that ended prints its last year rather than running open-ended.
    expect(roles[1]!.dateFrom).toBe("2022");
    expect(roles[1]!.dateTo).toBe("26");
  });

  it("prints a role that began and ended in one year as that year alone", () => {
    // At this granularity the second half would only repeat the first.
    const batch = buildExperienceList().find(
      (role) => role.company === "Batch",
    )!;

    expect(batch.dateFrom).toBe("2020");
    expect(batch.dateTo).toBeNull();
    expect(batch.dateTime).toBe("2020-01/2020-06");

    const intern = buildExperienceList().at(-1)!;

    expect(intern.title).toBe("Design Intern");
    expect(intern.dateFrom).toBe("2018");
    expect(intern.dateTo).toBeNull();
  });

  it("prints how each role was held beside its dates", () => {
    const roles = buildExperienceList();
    const byTitle = Object.fromEntries(
      roles.map((role) => [`${role.company} — ${role.title}`, role.employment]),
    );

    expect(byTitle["Montran — Contract designer"]).toBe("Contract");
    expect(byTitle["AnyDay — Sr. Product Designer"]).toBe("Full-time");
    expect(byTitle["Batch — Founding Designer"]).toBe("Full-time");
    expect(byTitle["Humi — Product Designer"]).toBe("Full-time");
    expect(byTitle["Humi — Design Intern"]).toBe("Part-time");
  });

  it("gives an ongoing role an open-ended machine-readable date", () => {
    const roles = buildExperienceList();
    const anyday = roles.find((role) => role.company === "AnyDay")!;
    const montran = roles.find((role) => role.company === "Montran")!;

    // The months survive in the machine-readable range even though the
    // printed one now reads in whole years.
    expect(anyday.dateTime).toBe("2022-04/2026-03");
    expect(anyday.dateFrom).toBe("2022");
    expect(anyday.dateTo).toBe("26");
    expect(montran.dateTime).toBe("2026-04");
    expect(roles.at(-1)!.dateTime).toBe("2018-05/2018-06");
  });
});

describe("experience groups", () => {
  it("folds a run at one company into a single group, newest role first", () => {
    const groups = buildExperienceGroups();

    expect(
      groups.map(
        (group) =>
          `${group.company}: ${group.roles.map((role) => role.title).join(", ")}`,
      ),
    ).toEqual([
      "Montran: Contract designer",
      "AnyDay: Sr. Product Designer",
      "Batch: Founding Designer",
      "Humi: Product Designer, Design Intern",
    ]);
  });
});

describe("experience years", () => {
  it("counts whole years from the first month worked", () => {
    expect(experienceYears(new Date(2026, 3, 30))).toBe("seven");
    expect(experienceYears(NOW)).toBe("eight");
  });

  it("rolls over on the anniversary rather than staying pinned", () => {
    expect(experienceYears(new Date(2027, 3, 30))).toBe("eight");
    expect(experienceYears(new Date(2027, 4, 1))).toBe("nine");
    expect(experienceYears(new Date(2028, 4, 1))).toBe("ten");
  });
});
