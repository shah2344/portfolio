import type { StaticImageData } from "next/image";

import anydayKitchen from "../../../../public/media/anyday/anyday-card-bg.jpg";
import anydayLogo from "../../../../public/media/anyday/logo.png";
import anydayAdmin from "../../../../public/media/anyday/admin-overview.jpeg";
import anydayPayouts from "../../../../public/media/anyday/payouts.png";
import anydayTipPool from "../../../../public/media/anyday/tip-pool.png";
import anydayAppStore from "../../../../public/media/anyday/app_store/AppStore_6_5_01.png";
import anydaySavings from "../../../../public/media/anyday/savings-goal-edit.png";
import humiLogo from "../../../../public/media/humi/logo.svg";
import humiHero from "../../../../public/media/humi/hero.png";
import humiPeople from "../../../../public/media/humi/people-directory.webp";
import humiImport from "../../../../public/media/humi/employerecord-1.png";
import humiPayroll from "../../../../public/media/humi/payroll-highlight.webp";
import humiTimeOff from "../../../../public/media/humi/timeoff-highlight.webp";

/*
 * Every fact here is lifted from the case studies themselves — the intros,
 * `HumiImpact`, and AnyDay's "What the work changed". The variations only
 * rearrange it; none of them should need a number the case study doesn't
 * already stand behind.
 */

export type LabShot = {
  src: StaticImageData;
  alt: string;
};

export type LabMetric = {
  value: string;
  label: string;
};

export type LabProject = {
  id: "anyday" | "humi";
  name: string;
  href: string;
  /** Straight to the case study's results section. */
  outcomesHref: string;
  sector: string;
  years: string;
  role: string;
  team: string;
  tagline: string;
  summary: string;
  metrics: readonly LabMetric[];
  /** The photograph or illustration a card can bleed to its edges. */
  scene: LabShot;
  /** The one screen that stands for the project. */
  cover: LabShot;
  /** Supporting screens, in reading order. */
  shots: readonly LabShot[];
  video?: { src: string; width: number; height: number; title: string };
  logo: StaticImageData;
  /** Deep tone sampled for the homepage card wash; see `card-colors.ts`. */
  ink: string;
  /** A light ground that sits under the project's screens. */
  paper: string;
};

export const labProjects = [
  {
    id: "anyday",
    name: "AnyDay",
    href: "/work/anyday",
    outcomesHref: "/work/anyday#outcomes",
    sector: "Fintech · Hospitality",
    years: "2022 – 2026",
    role: "Senior product designer",
    team: "Team of 50",
    tagline: "Rethinking payouts for hospitality",
    summary:
      "Four years evolving Canada's leading instant payout platform for hospitality — the Today app, the employer portal, tip automation, savings, and support.",
    metrics: [
      {
        value: "$3M",
        label: "saved by members through auto-save in its first two months",
      },
      {
        value: "66%",
        label: "of support tickets resolved automatically over three months",
      },
    ],
    scene: {
      src: anydayKitchen,
      alt: "Restaurant staff working in an open kitchen",
    },
    cover: {
      src: anydayAdmin,
      alt: "The AnyDay employer portal home: total balance across location wallets and a payments chart",
    },
    shots: [
      {
        src: anydayAppStore,
        alt: "App Store screen reading “Get your pay, AnyDay” over the Today app home",
      },
      {
        src: anydayPayouts,
        alt: "The Today app payments screen with a monthly earnings chart",
      },
      {
        src: anydayTipPool,
        alt: "The tip pool calculator splitting a shift's tips across roles",
      },
      {
        src: anydaySavings,
        alt: "Editing a savings pocket in the Today app, with round-up saving switched on",
      },
    ],
    video: {
      src: "/media/anyday/payout.mp4",
      width: 1620,
      height: 1080,
      title: "A product showcase of AnyDay's mobile and employer experiences",
    },
    logo: anydayLogo,
    ink: "#261907",
    paper: "#f4f1ec",
  },
  {
    id: "humi",
    name: "Humi",
    href: "/work/humi",
    outcomesHref: "/work/humi#impact",
    sector: "HR tech · Payroll",
    years: "2018 – 2019",
    role: "First product designer",
    team: "Team of 30",
    tagline: "Unifying HR for growing teams",
    summary:
      "Joining as a design intern and staying on as the first product designer, I led a redesign that joined HR, payroll, benefits, and insurance into one platform.",
    metrics: [
      {
        value: "4,000+",
        label: "businesses on the platform, up from 1,400",
      },
      { value: "32%", label: "drop in the CX ticket backlog" },
      {
        value: "$46M",
        label: "raised across Series A and B, then acquired by Employment Hero",
      },
    ],
    scene: {
      src: humiHero,
      alt: "Five illustrated people representing the teams and employees Humi served",
    },
    cover: {
      src: humiPeople,
      alt: "The redesigned Humi people directory, listing employees by role, status, and department",
    },
    shots: [
      {
        src: humiImport,
        alt: "Importing employees into Humi, matching spreadsheet columns to Humi fields",
      },
      {
        src: humiPayroll,
        alt: "Humi payroll confirming a processed pay run with employer obligations and net pay",
      },
      {
        src: humiTimeOff,
        alt: "Requesting time off in Humi, with a date range, leave type, and overlapping requests",
      },
    ],
    logo: humiLogo,
    ink: "#182027",
    paper: "#f3f5f6",
  },
] as const satisfies readonly LabProject[];
