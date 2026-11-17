import type { StaticImageData } from "next/image";

import anydayFilmPoster from "../../../../public/media/anyday/payout-poster.webp";
import securityImage from "../../../../public/media/craft/anyday-security-promo.png";
import appLaunchPoster from "../../../../public/media/craft/app-launch-poster.jpg";
import candidateViewImage from "../../../../public/media/craft/candidate-view.png";
import ewaOnboardingPoster from "../../../../public/media/craft/ewa-onboarding-poster.jpg";
import dogeImage from "../../../../public/media/craft/house-of-doge-wave-mockup.png";
import retryPayoutPoster from "../../../../public/media/craft/retry-payout-poster.jpg";
import kohoPoster from "../../../../public/media/craft/shots-mockups-1080x60-3-poster.jpg";
import zellePoster from "../../../../public/media/craft/shots-mockups-874-poster.jpg";
import pocketsPoster from "../../../../public/media/craft/shots-mockups-poster.webp";
import sunwingImage from "../../../../public/media/craft/sunwing-star-representative-portal.webp";
import widgetsWallpaper from "../../../../public/media/craft/Wallpaper.jpg";
import widgetImage from "../../../../public/media/craft/widget-1.png";
import humiPeople from "../../../../public/media/humi/people.webp";

/*
 * What the ten homepage studies draw from. Every fact is one the site already
 * states: the intro, the Experience list, the feed's captions, and the two
 * case studies' own results. The studies rearrange it and add no new claims.
 */

export const EMAIL = "hello@muhammad.design";

export type LabWork = {
  id: "anyday" | "humi";
  name: string;
  href: string;
  tagline: string;
  role: string;
  years: string;
  sector: string;
  /** One result, in the case study's own words. */
  outcome: string;
  image: StaticImageData;
  alt: string;
  tone: "dark" | "light";
};

export const work: readonly [LabWork, LabWork] = [
  {
    id: "anyday",
    name: "AnyDay",
    href: "/work/anyday",
    tagline: "Moving restaurants beyond cash tip-outs",
    role: "Sr. Product Designer",
    years: "2022 – 26",
    sector: "Fintech",
    outcome:
      "Auto-save drove 76% of deposit value into Pockets in its first two months.",
    image: anydayFilmPoster,
    alt: "AnyDay's employer portal and member app shown together",
    tone: "dark",
  },
  {
    id: "humi",
    name: "Humi",
    href: "/work/humi",
    tagline: "Unifying HR for growing teams",
    role: "Product Designer",
    years: "2018 – 19",
    sector: "HR tech",
    outcome:
      "The redesign shipped as Humi grew from 1,400 to 4,000+ businesses.",
    image: humiPeople,
    alt: "Five illustrated people representing the teams and employees Humi served",
    tone: "light",
  },
];

/** Results the case studies already stand behind, for the numbers band. */
export const figures = [
  {
    value: "7",
    unit: "years",
    label: "designing fintech and HR tech products",
    company: null,
    href: "#experience",
  },
  {
    value: "76%",
    unit: null,
    label: "of deposit value into Pockets came through auto-save",
    company: "AnyDay",
    href: "/work/anyday",
  },
  {
    value: "70%",
    unit: null,
    label: "of support inquiries resolved without a person",
    company: "AnyDay",
    href: "/work/anyday",
  },
  {
    value: "4,000+",
    unit: null,
    label: "businesses on Humi, up from 1,400",
    company: "Humi",
    href: "/work/humi",
  },
] as const;

export type FeedKind = "mobile" | "web";

export type LabFeedItem = {
  id: string;
  title: string;
  source: string;
  /** The Experience row the piece hangs from; `null` when it was made elsewhere. */
  company: "AnyDay" | "Batch" | null;
  year: number;
  kind: FeedKind;
  /** A moving prototype on the homepage, shown here by its poster. */
  motion: boolean;
  image: StaticImageData;
  /** Artwork set over the image, as the homepage composes its widgets. */
  overlay?: StaticImageData;
  alt: string;
};

export const feed: readonly LabFeedItem[] = [
  {
    id: "financial",
    title: "Anyday Financial",
    source: "AnyDay",
    company: "AnyDay",
    year: 2026,
    kind: "mobile",
    motion: true,
    image: zellePoster,
    alt: "A Zelle transfer in the AnyDay app",
  },
  {
    id: "club-owner",
    title: "Club owner experience",
    source: "House of Doge",
    company: null,
    year: 2026,
    kind: "mobile",
    motion: false,
    image: dogeImage,
    alt: "House of Doge football match screen with a live score and voting",
  },
  {
    id: "pay-direct",
    title: "Pay Direct",
    source: "AnyDay x KOHO",
    company: "AnyDay",
    year: 2025,
    kind: "mobile",
    motion: true,
    image: kohoPoster,
    alt: "KOHO benefits offered to AnyDay members",
  },
  {
    id: "retry",
    title: "Retrying failed payouts",
    source: "AnyDay",
    company: "AnyDay",
    year: 2025,
    kind: "web",
    motion: true,
    image: retryPayoutPoster,
    alt: "A payouts table with a failed transaction being retried",
  },
  {
    id: "pockets",
    title: "Browsing pockets",
    source: "AnyDay",
    company: "AnyDay",
    year: 2025,
    kind: "mobile",
    motion: true,
    image: pocketsPoster,
    alt: "A list of savings pockets in the AnyDay app",
  },
  {
    id: "widgets",
    title: "iOS widgets",
    source: "AnyDay",
    company: "AnyDay",
    year: 2024,
    kind: "mobile",
    motion: false,
    image: widgetsWallpaper,
    overlay: widgetImage,
    alt: "The Safe to spend AnyDay widget on a home screen wallpaper",
  },
  {
    id: "security",
    title: "Security",
    source: "AnyDay",
    company: "AnyDay",
    year: 2024,
    kind: "mobile",
    motion: false,
    image: securityImage,
    alt: "AnyDay prompt introducing passcodes and two-factor authentication",
  },
  {
    id: "ewa",
    title: "EWA onboarding",
    source: "AnyDay",
    company: "AnyDay",
    year: 2023,
    kind: "web",
    motion: true,
    image: ewaOnboardingPoster,
    alt: "AnyDay earned wage access onboarding guide for employers",
  },
  {
    id: "app-launch",
    title: "App launch",
    source: "AnyDay",
    company: "AnyDay",
    year: 2023,
    kind: "mobile",
    motion: true,
    image: appLaunchPoster,
    alt: "AnyDay mobile app launching into its wallet home screen",
  },
  {
    id: "sunwing",
    title: "Sunwing Star representative portal",
    source: "Sunwing",
    company: null,
    year: 2022,
    kind: "web",
    motion: false,
    image: sunwingImage,
    alt: "Sunwing Star representative portal with a balance and a branded card",
  },
  {
    id: "candidate",
    title: "Candidate view",
    source: "Batch",
    company: "Batch",
    year: 2020,
    kind: "web",
    motion: false,
    image: candidateViewImage,
    alt: "Batch candidate profile with a scorecard and interview actions",
  },
];
