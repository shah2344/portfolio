/**
 * One source of truth for the career: the Experience list on the homepage and
 * the year count in the intro paragraph both derive from `roles` below.
 *
 * Dates are authored once and everything derived from them is computed: the
 * order the list reads in, the range printed beside each role, and the year
 * count in the intro, which is otherwise a bug waiting for an anniversary.
 */

/**
 * How the role was held. It reads beside the dates in place of a computed
 * length, because a hiring team scanning the list wants to know whether a
 * short stint was a contract before it wants to know it was six months.
 */
export type Employment = "Full-time" | "Part-time" | "Contract";

/** Where the work happened, drawn as a glyph at the end of the row. */
export type Workplace = "In-person" | "Hybrid" | "Remote";

type Role = {
  company: string;
  /** Inclusive first month, `YYYY-MM`. */
  start: string;
  /** Optional label in place of the starting year. */
  startLabel?: string;
  /** Inclusive last month, `YYYY-MM`; `null` while the role is ongoing. */
  end: string | null;
  title: string;
  employment: Employment;
  workplace: Workplace;
};

/**
 * Newest first, which is the order the list reads in.
 */
const roles: readonly Role[] = [
  {
    company: "Montran",
    start: "2026-04",
    startLabel: "Apr",
    end: null,
    title: "Design Consultant",
    employment: "Contract",
    workplace: "Remote",
  },
  {
    company: "AnyDay",
    start: "2022-04",
    end: "2026-03",
    title: "Sr. Product Designer",
    employment: "Full-time",
    workplace: "Hybrid",
  },
  {
    company: "Batch",
    start: "2020-01",
    end: "2020-06",
    title: "Product Designer",
    employment: "Full-time",
    workplace: "Hybrid",
  },
  {
    company: "Humi",
    start: "2018-07",
    end: "2019-10",
    title: "Product Designer",
    employment: "Full-time",
    workplace: "In-person",
  },
  {
    company: "Humi",
    start: "2018-05",
    end: "2018-06",
    title: "Design Intern",
    employment: "Part-time",
    workplace: "In-person",
  },
] as const;

const MONTH_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Months since year zero, so spans are integer arithmetic rather than dates. */
function toMonths(month: string) {
  if (!MONTH_FORMAT.test(month)) {
    throw new Error(`Expected a YYYY-MM month, received "${month}"`);
  }
  const [year, index] = month.split("-").map(Number) as [number, number];
  return year * 12 + (index - 1);
}

function fromMonths(months: number) {
  return {
    year: Math.floor(months / 12),
    month: months % 12,
  };
}

function yearOf(month: string) {
  return fromMonths(toMonths(month)).year;
}

/**
 * The closing year of a range as its last two digits, `2022 – 26`, since the
 * opening year already carries the century. Across a century it stays whole.
 */
function shortYear(startYear: number, endYear: number) {
  return Math.floor(startYear / 100) === Math.floor(endYear / 100)
    ? String(endYear).slice(-2)
    : String(endYear);
}

/**
 * The three date fields a row prints: the machine-readable range, the year it
 * opens on, and what closes it — `Now` while it runs, and nothing at all
 * when it opened and closed inside the same year.
 *
 * The range defaults to whole years, with an optional starting label. The
 * machine-readable span always preserves the exact months.
 */
function formatRange(role: Role) {
  const startYear = yearOf(role.start);
  const endYear = role.end === null ? null : yearOf(role.end);

  return {
    dateTime:
      role.end && role.end !== role.start
        ? `${role.start}/${role.end}`
        : role.start,
    dateFrom: role.startLabel ?? String(startYear),
    dateTo:
      endYear === null
        ? "Now"
        : endYear === startYear
          ? null
          : shortYear(startYear, endYear),
  };
}

function currentMonth(now: Date) {
  return now.getFullYear() * 12 + now.getMonth();
}

export type ExperienceEntry = {
  company: string;
  /**
   * Whether the entry directly above is another stint at the same company. The
   * run shares one mark, so a promotion reads as one job with two titles rather
   * than as the same logo printed twice.
   */
  continuesCompany: boolean;
  /** Machine-readable range for the `<time>` element. */
  dateTime: string;
  /** Starting label of the range, e.g. `2022` or `Apr`. */
  dateFrom: string;
  /**
   * Last year as two digits (`26`), `Now` while the role is ongoing, or `null` when the role
   * began and ended inside the same year — a range printed as `2026 – 2026`
   * says nothing the first half didn't.
   */
  dateTo: string | null;
  /** How the role was held, e.g. `Full-time`. */
  employment: Employment;
  ongoing: boolean;
  /** Where the role was worked from, e.g. `Hybrid`. */
  workplace: Workplace;
  title: string;
};

/**
 * The roles newest first, each with the range it ran over and how it was held.
 *
 * "Newest" is the month a role stopped, not the month it started: a role still
 * running today heads the list even when one that began after it has already
 * ended. Within a company that ordering also puts the later stint of a run
 * above the one it grew out of, which is what `continuesCompany` reads against.
 *
 * Nothing here depends on today's date — only the intro's year count does — so
 * the list is the same on every render.
 */
export function buildExperienceList(): readonly ExperienceEntry[] {
  return [...roles]
    .sort((a, b) => {
      // Anything still running outranks everything finished.
      if ((a.end === null) !== (b.end === null)) return a.end === null ? -1 : 1;
      // Then the most recently finished, and within one end month, the later
      // start — which is also the tiebreak between two ongoing roles.
      const byEnd = a.end && b.end ? toMonths(b.end) - toMonths(a.end) : 0;
      return byEnd || toMonths(b.start) - toMonths(a.start);
    })
    .map((role, index, ordered) => ({
      company: role.company,
      title: role.title,
      continuesCompany: ordered[index - 1]?.company === role.company,
      ongoing: role.end === null,
      employment: role.employment,
      workplace: role.workplace,
      ...formatRange(role),
    }));
}

export type ExperienceGroup = {
  company: string;
  roles: readonly ExperienceEntry[];
};

/**
 * The same list folded into one entry per run at a company, so a promotion
 * reads as one job with two titles under a single mark and name.
 */
export function buildExperienceGroups(): readonly ExperienceGroup[] {
  const groups: { company: string; roles: ExperienceEntry[] }[] = [];
  for (const role of buildExperienceList()) {
    const current = groups.at(-1);
    if (role.continuesCompany && current) current.roles.push(role);
    else groups.push({ company: role.company, roles: [role] });
  }
  return groups;
}

// The count reads as prose, not as a statistic, so it is spelled out.
const numberWords: Record<number, string> = {
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
  11: "eleven",
  12: "twelve",
};

/** Whole years worked, spelled out for the intro paragraph. */
export function experienceYears(now: Date = new Date()) {
  const earliest = Math.min(...roles.map((role) => toMonths(role.start)));
  const elapsed = Math.floor((currentMonth(now) - earliest) / 12);
  return numberWords[elapsed] ?? String(elapsed);
}
