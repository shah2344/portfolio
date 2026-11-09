import { BrandMark } from "@/components/motion/brand-turn";
import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";
import type { ReactNode } from "react";

import styles from "./case-study.module.css";

import anydayIconImage from "../../../../public/media/anyday/logo.png";
import oldPortalImage from "../../../../public/media/anyday/old-portal.webp";
import payoutPosterImage from "../../../../public/media/anyday/payout-poster.webp";

import { HomeFooter } from "@/components/home/footer/footer";
import { PlaygroundTile } from "@/components/home/playground/playground";
import { SectionToc, type TocSection } from "@/components/ui/section-toc";
import { AnyDayFinSupport } from "@/components/work/anyday/fin-support";
import { AnyDayFigure, AnyDayFigureRow } from "@/components/work/anyday/media";
import {
  type AnyDayPhoneClip,
  type AnyDayScreenClip,
  AnyDayPhoneBoard,
} from "@/components/work/anyday/phone-board";
import {
  type CaseStudyAnnotation,
  CaseStudyCard,
  CaseStudyEnding,
  CaseStudyMedia,
  CaseStudySection,
} from "@/components/work/case-study";
import { AnyDayMediaReveal } from "@/components/work/anyday/media-reveal";
import { AnyDayPortalCarousel } from "@/components/work/anyday/portal-carousel";
// Restore with the carousel below.
// import { AnyDayToolsCarousel } from "@/components/work/anyday/tools-carousel";
import { CaseStudyPage } from "@/components/work/humi/case-study-shell";
import { InlineDemoVideo } from "@/components/work/inline-demo-video";

/** Each rail entry lands on the shared section heading, as it does in Humi. */
const ANYDAY_SECTIONS: readonly TocSection[] = [
  { id: "problem", label: "Problem" },
  { id: "research", label: "Discovery" },
  { id: "solution", label: "Solution" },
  { id: "impact", label: "Impact" },
];

const OLD_PORTAL_MARKS: readonly CaseStudyAnnotation[] = [
  {
    /* The top of the payments dashboard: the second platform managers
       switched to. */
    mark: { x: 0.625, y: 0.28, h: 0.02 },
    note: { x: 0.7, y: 0.2, w: 0.2, tilt: 1 },
    text: "Disconnected tools",
  },
  {
    mark: {
      x: 0.517,
      y: 0.205,
      h: 0.06,
      side: "left",
      arrowDirection: "left",
      tilt: -5,
    },
    note: { x: 0.29, y: 0.085, w: 0.2, tilt: -2 },
    text: "Confusing tip pools",
  },
];

/** Landscape captures of the portal run wide. */
const PORTAL = "2000 / 1075";

/*
 * Walkthroughs of the original app, trimmed from a 2022 recording and played
 * at real speed. On a board the phones sit a fifth of the plate wide and 74.5%
 * of its height, centred, so a mark's y is 0.1275 + 0.745 × its height on the
 * screen.
 */
const OLD_APP_CLIPS: readonly AnyDayPhoneClip[] = [
  {
    description:
      "A member adds a debit card, enters an amount, opens a sheet of send limits and tiered fees, picks a recipient, and confirms the transfer with the fee added before reaching a success screen.",
    src: "/media/anyday/old-app-instant-transfer.mp4",
    title: "Sending an instant transfer in the original app",
  },
  {
    description:
      "A member types their email and password, logs in, and lands on a $0.00 balance until their tips load.",
    src: "/media/anyday/old-app-login.mp4",
    title: "Logging in to the original app",
  },
];

const OLD_PORTAL_CLIP: AnyDayScreenClip = {
  description:
    "A manager fills in two members by hand, submits, and gets back a wallet error on each row, then an invalid identifier error once the wallets are fixed.",
  ground: "#f8f8f8",
  height: 1068,
  src: "/media/anyday/old-portal-add-members.mp4?v=3",
  title: "Adding members in the original portal",
  width: 1920,
};

/*
 * On the board two phones and the portal share one row height inside a 6cqw
 * margin: phones span x 0.06–0.20 and 0.22–0.36, the portal 0.39–0.94, and
 * every screen runs y 0.21–0.79. Arrows stop just outside the screen they
 * name. The side notes hang past the plate, into a column margin wide enough
 * for them from 64rem.
 */
const OLD_APP_FLOW_MARKS: readonly CaseStudyAnnotation[] = [
  {
    mark: { x: 0.052, y: 0.33, h: 0.06, side: "left" },
    note: { x: -0.135, y: 0.36, w: 0.12, tilt: -1 },
    text: "Fees and limits buried in a sheet",
  },
  {
    mark: { x: 0.29, y: 0.18, h: 0.02 },
    note: { x: 0.2, y: 0.1, w: 0.19, tilt: -0.6 },
    text: "Poor performance",
  },
  {
    mark: { x: 0.948, y: 0.42, h: 0.06 },
    note: { x: 1.015, y: 0.45, w: 0.12, tilt: 0.8 },
    text: "Errors surface too late",
  },
];

/** Humi's story card and caption layout, with AnyDay's video and paired media. */
function AnyDayStoryCard({
  children,
  description,
  id,
  title,
}: {
  children?: ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  const copy = (
    <p>
      <strong>{title}</strong> <span>{description}</span>
    </p>
  );
  return (
    <CaseStudyCard id={id}>
      {children ? (
        <figure className="humi-story-media">
          {children}
          <figcaption>{copy}</figcaption>
        </figure>
      ) : (
        <div className={styles.note}>{copy}</div>
      )}
    </CaseStudyCard>
  );
}

export function AnyDayCaseStudy() {
  // Keep these stories available to restore when they are ready to show.
  const showPayoutChoice = false;
  const showCardMigration = false;

  return (
    <CaseStudyPage closeLabel="Close AnyDay case study">
      <div className={`humi-case-study anyday-case-study ${styles.page}`}>
        <main id="anyday-story">
          <SectionToc sections={ANYDAY_SECTIONS} />

          <div className="humi-story-intro__brand" aria-hidden="true">
            <BrandMark>
              <SmoothSurface as="span" className="anyday-logo">
                <Image
                  alt=""
                  className="anyday-app-icon"
                  height={44}
                  loading="eager"
                  src={anydayIconImage}
                  unoptimized
                  width={44}
                />
              </SmoothSurface>
            </BrandMark>
            <span>AnyDay</span>
          </div>

          {/* The story slides up over the footer, which waits pinned beneath
              it. The brand mark and contents rail stay outside, above the
              header blur. */}
          <div className="case-study-sheet">
            <header className="humi-story-intro">
              <h1 className="humi-story-intro__lede">
                I spent four years at AnyDay, first as a designer and later
                building in code, shipping the employer portal and the worker
                app across web and mobile.
              </h1>
              <p className="humi-story-intro__date">2022 – 2026 · Team of 50</p>
            </header>

            <AnyDayMediaReveal>
              <AnyDayFigureRow width="full">
                {/* The film the homepage card plays. Its backdrop is the clip's
                  opening frame (the 0.35s it seeks to on load), so the page
                  paints the film rather than grey, and nothing changes when
                  playback takes over. That frame is the page's largest
                  paint, so it is fetched ahead of everything else. */}
                <figure className="anyday-figure">
                  <PlaygroundTile
                    asContainer
                    borderInset={0.5}
                    className={`anyday-video-zoom ${styles.openingVideo}`}
                    label="AnyDay product experience"
                  >
                    <InlineDemoVideo
                      controls={false}
                      cardRadius
                      backdrop={
                        <Image
                          alt=""
                          className="anyday-video-backdrop"
                          fetchPriority="high"
                          fill
                          loading="eager"
                          sizes="(max-width: 40rem) 110vw, 744px"
                          src={payoutPosterImage}
                        />
                      }
                      describedBy="anyday-opening-video-description"
                      eager
                      hairline
                      height={1080}
                      src="/media/anyday/payout.mp4"
                      title="AnyDay product experience"
                      width={1620}
                    />
                  </PlaygroundTile>
                  <figcaption
                    className="sr-only"
                    id="anyday-opening-video-description"
                  >
                    A product showcase of AnyDay&apos;s mobile and employer
                    experiences.
                  </figcaption>
                </figure>
              </AnyDayFigureRow>
            </AnyDayMediaReveal>

            <div className="anyday-prose">
              <p className={styles.caption}>
                <strong>
                  AnyDay helped restaurants move beyond cash tip-outs.
                </strong>{" "}
                Its platform simplified payments for over 3,500 restaurants in
                Canada and gave workers quicker access to their earnings through
                a digital wallet.
              </p>
            </div>

            <div className={`humi-case-study--flat ${styles.story}`}>
              {/* Temporarily hidden while its placement and lede are reworked.
              <CaseStudyCard id="anyday-tools">
                <AnyDayToolsCarousel />
              </CaseStudyCard>
              */}

              <CaseStudySection id="problem">Problem</CaseStudySection>
              <CaseStudyCard id="old-app">
                <AnyDayPhoneBoard
                  annotations={OLD_APP_FLOW_MARKS}
                  clips={OLD_APP_CLIPS}
                  description="Information was hard to find, performance had degraded, and errors surfaced too late to fix easily."
                  id="old-app-flows"
                  screen={OLD_PORTAL_CLIP}
                  title="The products had become something users worked around."
                />
              </CaseStudyCard>
              <CaseStudyCard id="old-portal">
                <CaseStudyMedia
                  expandable
                  alt="The original Today employer portal, with a tip calculator and restaurant wallet dashboard shown side by side."
                  description="Tip pools were confusing to set up, and with no POS connection, managers still keyed in every payout."
                  annotations={OLD_PORTAL_MARKS}
                  ground="#f2f2f2"
                  src={oldPortalImage}
                  title="Faster than handing out cash, but still operationally exhausting."
                />
              </CaseStudyCard>

              {/* Discovery pairs both sides of the product: why members moved
                  money off the card, and why payouts resisted automation. */}
              <CaseStudySection id="research">Discovery</CaseStudySection>
              <AnyDayStoryCard
                id="member-research"
                title="We interviewed representative workers."
                description="Most moved their pay straight out, so we set out to learn what it would take to earn a place in their everyday banking."
              >
                <AnyDayFigureRow width="full">
                  <AnyDayFigure
                    aspect="2000 / 1075"
                    alt="A research collage: a Notion table tracking survey participants and incentives, a video call where a member types a card number into the old app, and a mind map of the new app’s Home, Insights, Payments, Support, and Account sections."
                    height={1075}
                    label="AnyDay member research"
                    ground="#ffca00"
                    src="/media/anyday/research.webp"
                    width={2000}
                  />
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              <AnyDayStoryCard
                id="discovery-findings"
                title="We mapped payout journeys with managers."
                description="Tipping rules varied by restaurant and even by location. Automation only worked if any location could easily set up their own rules exactly how they had it in their spreadsheets."
              >
                <AnyDayFigureRow width="full">
                  <AnyDayFigure
                    aspect="3348 / 1800"
                    alt="A collage of discovery workshop photos showing restaurant goals, metrics, and the steps from tip calculation to payout."
                    height={1800}
                    label="AnyDay discovery workshop findings"
                    ground="#008bff"
                    src="/media/anyday/findings.webp"
                    width={3348}
                  />
                </AnyDayFigureRow>
              </AnyDayStoryCard>

              <CaseStudySection id="solution">Solution</CaseStudySection>
              <AnyDayStoryCard
                id="foundation"
                title="I designed the new app to give workers a reason to stay."
                description="Savings, rewards, and budgeting made AnyDay worth keeping as a primary account."
              >
                <AnyDayFigureRow width="wide">
                  <AnyDayFigure
                    alt="Three Today app screens: Home with a $1,194.23 spendable balance, Home’s Savings tab with savings goals, and Rewards with cashback offers."
                    aspect="3348 / 1800"
                    ground="#f2f2f2"
                    height={2065}
                    label="Today app — home, savings, and rewards"
                    src="/media/anyday/today-app-screens.webp"
                    unoptimized
                    width={3840}
                  />
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              <AnyDayStoryCard
                id="saving"
                title="Set money aside with every payout."
                description="I designed auto-save to split earnings between spending and savings goals. In its first two months, it accounted for 76% of all deposit value into Pockets."
              >
                <AnyDayFigureRow width="wide">
                  <AnyDayFigure
                    alt="Two Today app screens: “Set up auto-save” splitting each employer payout between Spendable, Trip to Italy, and Emergency, and a Trip to Italy goal 55% saved with auto-save on."
                    aspect="3840 / 2560"
                    ground="#f3f3f3"
                    height={2560}
                    label="Auto-save — payout split and goal progress"
                    src="/media/anyday/auto-save-split-goal.webp"
                    unoptimized
                    width={3840}
                  />
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              <AnyDayStoryCard
                id="portal-system"
                title="I designed the portal around how managers work."
                description="Precise filtering and pinned locations cut the digging, and proactive funding alerts cut the surprises. It all ran 6x faster on slower networks and devices."
              >
                <AnyDayFigureRow width="full">
                  <figure className="anyday-figure">
                    <AnyDayPortalCarousel describedBy="anyday-client-portal-description" />
                    <figcaption
                      className="sr-only"
                      id="anyday-client-portal-description"
                    >
                      Four walkthroughs of the AnyDay client portal across
                      payments, wallet funding, location activity, and setup.
                    </figcaption>
                  </figure>
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              <AnyDayStoryCard
                id="portal-onboarding"
                title="I designed a self-guided onboarding flow."
                description="A step-by-step checklist took managers from connecting their POS to setting their tip rules, without a call to support."
              >
                <AnyDayFigureRow width="wide">
                  <AnyDayFigure
                    alt="Two angled portal screens: the Oakville setup checklist on the Payments page, running from data collection to a first tip rule, and the “Review tip rule” step summarizing contributors, receivers, payout frequency, and services."
                    aspect={PORTAL}
                    ground="#f2f2f2"
                    height={2064}
                    label="Portal onboarding — setup checklist and tip rule review"
                    src="/media/anyday/portal-onboarding.webp"
                    unoptimized
                    width={3840}
                  />
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              <AnyDayStoryCard
                id="payouts"
                title="Payouts went from data entry to a final check."
                description="Synced sales and hours from the POS system fed into each service’s payout, leaving managers to only review and send."
              >
                <AnyDayFigureRow width="wide">
                  <figure className="anyday-figure">
                    <PlaygroundTile
                      asContainer
                      className={`anyday-video-zoom ${styles.payoutVideo}`}
                      label="Reviewing and sending a payout"
                    >
                      <InlineDemoVideo
                        backdrop={
                          <Image
                            alt=""
                            className="anyday-video-backdrop"
                            fill
                            sizes="(min-width: 64rem) 984px, calc(100vw - 2.5rem)"
                            src="/media/anyday/portal-payout-review-poster.webp"
                            unoptimized
                          />
                        }
                        describedBy="anyday-payout-review-description"
                        crossfadeLoop={false}
                        ground="#eeeeee"
                        height={1440}
                        src="/media/anyday/portal-payout-review.mp4"
                        title="Reviewing and sending a payout"
                        width={2160}
                      />
                    </PlaygroundTile>
                    <figcaption
                      className="sr-only"
                      id="anyday-payout-review-description"
                    >
                      Reviewing synced sales, hours worked, and allocated tips
                      before sending a payout to restaurant staff.
                    </figcaption>
                  </figure>
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              {/* Hidden for now.
              <AnyDayStoryCard
                id="roles"
                title="Every role could see what it was allowed to do."
                description="Local managers paid out, accountants reconciled, and regional managers funded locations. I turned a long permissions list into one chart."
              >
                <AnyDayFigureRow width="wide">
                  <AnyDayFigure
                    aspect={PORTAL}
                    label="Roles and permissions chart"
                  />
                </AnyDayFigureRow>
              </AnyDayStoryCard>
              */}
              {showPayoutChoice && (
                <AnyDayStoryCard
                  id="choice"
                  title="Making room for choice."
                  description="Members could receive tips in a bank account of their choice for free each week, or keep daily access on the card. Employers chose the payout day and paid a small fee, but couldn’t delay payouts beyond weekly."
                >
                  <AnyDayFigureRow width="wide">
                    <figure className="anyday-figure">
                      <PlaygroundTile
                        asContainer
                        className="anyday-video-zoom"
                        label="Weekly bank payout settings"
                        style={{ aspectRatio: "1920 / 1080" }}
                      >
                        <InlineDemoVideo
                          controls={false}
                          describedBy="anyday-scheduled-payout-video-description"
                          height={1080}
                          ground="#f5f5f5"
                          src="/media/anyday/scheduled.mp4"
                          title="Weekly bank payout settings"
                          width={1920}
                        />
                      </PlaygroundTile>
                      <figcaption
                        className="sr-only"
                        id="anyday-scheduled-payout-video-description"
                      >
                        Setting up a weekly payout schedule for tips sent to
                        members’ chosen bank accounts.
                      </figcaption>
                    </figure>
                  </AnyDayFigureRow>
                </AnyDayStoryCard>
              )}
              {showCardMigration && (
                <AnyDayStoryCard
                  id="card-migration"
                  title="100k+ members needed new cards."
                  description="I designed the transition to virtual cards with our new sponsor bank before the old card programme expired."
                >
                  <AnyDayFigureRow width="wide">
                    <figure className="anyday-figure">
                      <PlaygroundTile
                        asContainer
                        className="anyday-video-zoom"
                        label="AnyDay virtual card migration"
                        style={{ aspectRatio: "1920 / 1080" }}
                      >
                        <InlineDemoVideo
                          controls={false}
                          describedBy="anyday-card-migration-video-description"
                          height={1080}
                          ground="#fefefe"
                          src="/media/anyday/migration.mp4?v=3"
                          title="AnyDay virtual card migration"
                          width={1920}
                        />
                      </PlaygroundTile>
                      <figcaption
                        className="sr-only"
                        id="anyday-card-migration-video-description"
                      >
                        The member flow for moving to a new virtual card.
                      </figcaption>
                    </figure>
                  </AnyDayFigureRow>
                </AnyDayStoryCard>
              )}
              <AnyDayStoryCard
                id="support"
                title="I designed tailored flows for our new AI support agent."
                description="Built on Intercom’s Fin, it resolved 70% of inquiries on its own, clearing the backlog as CSAT rose from 50% to 87.7%."
              >
                <AnyDayFinSupport />
              </AnyDayStoryCard>

              <CaseStudySection id="impact">Impact</CaseStudySection>
              <div className="humi-impact" id="outcomes">
                <div className="humi-impact__intro">
                  <p className="humi-impact__lede">
                    Over one summer, we moved{" "}
                    <strong>
                      <span aria-hidden="true">~</span>
                      <span className="sr-only">about </span>200k members
                    </strong>{" "}
                    and <strong>3,500 restaurants</strong> onto our new
                    platform. We launched in batches, fixing issues before each
                    next group.
                  </p>
                  <p className="humi-impact__lede">
                    Restaurants got started faster and spent less time on
                    payouts. Onboarding a new location fell from 7 to{" "}
                    <strong>3 days</strong>, and simpler payouts cut
                    reconciliation from an 8-hour shift to about{" "}
                    <strong>30 minutes</strong>.
                  </p>
                  <p className="humi-impact__lede">
                    In its first two months, Autosave became the main way
                    members saved, accounting for <strong>76%</strong> of all
                    deposit value. Over the same period, the app’s rating rose
                    from 2.4 to <strong>4.6 stars</strong>.
                  </p>
                </div>
              </div>
              <CaseStudyEnding
                id="ending"
                next={{ href: "/work/humi", label: "Humi" }}
              />
            </div>
          </div>
        </main>

        <HomeFooter className="case-study-footer" contactOnly />
      </div>
    </CaseStudyPage>
  );
}
