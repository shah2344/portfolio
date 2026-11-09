import { SmoothSurface } from "@/components/ui/smooth-surface";
import type { CSSProperties } from "react";
import Image from "next/image";
import { entranceDelayMs } from "@/components/motion/entrance-timing";

import anydaySecurityPromoImage from "../../../public/media/craft/anyday-security-promo.png";
import anydaySuperadminImage from "../../../public/media/craft/anyday-superadmin.png";
import candidateViewImage from "../../../public/media/craft/candidate-view.png";
import currencySelectImage from "../../../public/media/craft/currency-select.png";
import houseOfDogeWaveMockup from "../../../public/media/craft/house-of-doge-wave-mockup.png";
import appLaunchPoster from "../../../public/media/craft/app-launch-poster.jpg";
import ewaOnboardingPoster from "../../../public/media/craft/ewa-onboarding-poster.jpg";
import retryPayoutPoster from "../../../public/media/craft/retry-payout-poster.jpg";
import shotsMockups1080x60Poster from "../../../public/media/craft/shots-mockups-1080x60-poster.jpg";
import shotsMockups1080x60v2Poster from "../../../public/media/craft/shots-mockups-1080x60-2-poster.jpg";
import shotsMockups1080x60v3Poster from "../../../public/media/craft/shots-mockups-1080x60-3-poster.jpg";
import shotsMockups874Poster from "../../../public/media/craft/shots-mockups-874-poster.jpg";
import shotsMockupsPoster from "../../../public/media/craft/shots-mockups-poster.webp";
import sunwingStarPortalImage from "../../../public/media/craft/sunwing-star-representative-portal.webp";
import tipSummaryPoster from "../../../public/media/craft/tip-summary-poster.jpg";
import wallpaperImage from "../../../public/media/craft/Wallpaper.jpg";
import widget1Image from "../../../public/media/craft/widget-1.png";
import widget2Image from "../../../public/media/craft/widget-2.png";
import widget3Image from "../../../public/media/craft/widget-3.png";
import anydayIconImage from "../../../public/media/anyday/logo.png";
import humiLogoImage from "../../../public/media/humi/logo.svg";
// The same file as the story's lead frame, so opening it finds the image cached.
import humiPeopleImage from "../../../public/media/humi/people.webp";

import { HomeTooltip } from "@/components/home/tooltip/tooltip";
import { HomeDock } from "@/components/home/dock/dock";
import { HomeLogo } from "@/components/home/character/home-logo";
import { HomeThemeToggle } from "@/components/home/home-theme-toggle";
import { HOME_CHARACTER_TIMING } from "@/components/home/character/timing";
import {
  PlaygroundTile,
  PlaygroundVideo,
} from "@/components/home/playground/playground";
import { PlaygroundFeed } from "@/components/home/playground/feed";
import { PlaygroundGrid } from "@/components/home/playground/grid";
import { HomeKeyboardFocus } from "@/components/home/home-keyboard-focus";
import { HomeEntranceRoot } from "@/components/home/home-entrance-root";
import {
  CaseStudyTiles,
  type CaseStudyTileProject,
} from "@/components/home/case-study-tiles/case-study-tiles";
import { Company } from "@/components/home/experience/intro";
import { ExperienceList } from "@/components/home/experience/list";
import { HomeFooter } from "@/components/home/footer/footer";
import { SectionHeading } from "@/components/ui/section-heading";

// Keep the card available to restore when it is ready for the feed.
const showCurrencySelect = false;
const showSuperadmin = false;
const showTipSummaries = false;

const projects = [
  {
    id: "anyday",
    name: "AnyDay",
    tagline: "Moving restaurants beyond cash tip-outs",
    href: "/work/anyday",
    icon: anydayIconImage,
    film: {
      src: "/media/anyday/payout.mp4",
      width: 1620,
      height: 1080,
      title: "A product showcase of AnyDay's mobile and employer experiences",
    },
  },
  {
    id: "humi",
    name: "Humi",
    tagline: "Unifying HR for growing teams",
    href: "/work/humi",
    logo: humiLogoImage,
    scene: {
      alt: "Five illustrated people representing the teams and employees Humi served",
      src: humiPeopleImage,
    },
  },
] satisfies readonly CaseStudyTileProject[];

const DOCK_ENTER_STEP = 2;
// The work heading follows the profile links by one beat.
const WORK_ENTER_STEP = DOCK_ENTER_STEP + 1;
const enterDelay = (index: number) =>
  ({
    "--home-enter-delay": `calc(var(--home-character-content-delay, ${HOME_CHARACTER_TIMING.contentDelayMs}ms) + ${entranceDelayMs(index)}ms)`,
  }) as CSSProperties;

export function HomeContent() {
  return (
    <div className="editorial-page">
      <HomeEntranceRoot />
      <HomeKeyboardFocus />
      <HomeTooltip />

      <main className="home" id="editorial-main">
        <header className="home-masthead" id="home-top">
          <div className="home-masthead__bar">
            <div
              className="home-masthead__character"
              data-home-enter="idle"
              data-home-enter-kind="character"
            >
              <HomeLogo />
            </div>
            <div
              data-home-enter="idle"
              data-home-load=""
              data-home-enter-kind="chrome"
              style={enterDelay(0)}
            >
              <HomeThemeToggle />
            </div>
          </div>

          <div className="home-intro">
            <h1 className="sr-only">Muhammad Shahid</h1>
            <div className="home-intro__story">
              <p
                data-home-enter="idle"
                data-home-load=""
                data-home-enter-kind="text"
                style={enterDelay(0)}
              >
                I&rsquo;m <span className="home-intro__name">Muhammad</span>, a
                product designer from Toronto, currently exploring AI and design
                systems at <Company name="Montran" />.
              </p>
              <p
                data-home-enter="idle"
                data-home-load=""
                data-home-enter-kind="text"
                style={enterDelay(1)}
              >
                I&rsquo;ve spent the last 7 years designing fintech and HR tech
                products used by hundreds of thousands of people. I&rsquo;m a
                generalist with a passion for coherence.
              </p>
            </div>
            <HomeDock enterStyle={enterDelay(DOCK_ENTER_STEP)} />
          </div>
        </header>

        <section aria-labelledby="work" className="home-section">
          <SectionHeading
            data-home-enter="idle"
            data-home-load=""
            data-home-enter-kind="surface"
            id="work"
            style={enterDelay(WORK_ENTER_STEP)}
          >
            Selected work
          </SectionHeading>
          <CaseStudyTiles
            enterStyle={enterDelay(WORK_ENTER_STEP + 1)}
            projects={projects}
          />
        </section>

        <section aria-labelledby="experience" className="home-section">
          <SectionHeading
            data-home-enter="idle"
            data-home-enter-kind="heading"
            id="experience"
          >
            Experience
          </SectionHeading>
          <ExperienceList />
        </section>

        {/* The sheet slides up over the footer, which waits pinned beneath
            it and is uncovered as the page runs out. */}
        <div className="home-reveal">
          <div className="home-sheet">
            <section aria-labelledby="craft" className="home-playground">
              <PlaygroundFeed>
                {/* Inside the feed, so the heading's rule opens out with the
                cards; its text divides the growth back out. */}
                <SectionHeading
                  data-home-enter="idle"
                  data-home-enter-kind="heading"
                  id="craft"
                >
                  Feed
                </SectionHeading>

                <PlaygroundGrid className="pg-grid--feed" mobileSnap={false}>
                  {showTipSummaries && (
                    <PlaygroundTile
                      caption="Tip summaries"
                      subtitle="AnyDay"
                      year={2026}
                    >
                      <PlaygroundVideo
                        alt="A payouts table prototype expanding a server's tip summary breakdown"
                        poster={tipSummaryPoster}
                        src="/media/craft/tip-summary.mp4?v=4"
                      />
                    </PlaygroundTile>
                  )}

                  <PlaygroundTile
                    caption="Anyday Financial"
                    subtitle="AnyDay"
                    year={2026}
                  >
                    <div className="pg-split">
                      <SmoothSurface as="div">
                        <PlaygroundVideo
                          alt="A set of product mockups"
                          poster={shotsMockups874Poster}
                          sizes="(max-width: 780px) 50vw, 430px"
                          src="/media/craft/shots-mockups-874.mp4?v=4"
                        />
                      </SmoothSurface>
                      <SmoothSurface as="div">
                        <PlaygroundVideo
                          alt="A set of product mockups"
                          poster={shotsMockups1080x60Poster}
                          sizes="(max-width: 780px) 50vw, 430px"
                          src="/media/craft/shots-mockups-1080x60.mp4?v=4"
                        />
                      </SmoothSurface>
                    </div>
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Club owner experience"
                    subtitle="House of Doge"
                    year={2026}
                  >
                    <div className="pg-split">
                      <SmoothSurface as="div">
                        <PlaygroundVideo
                          alt="Animated mobile portfolio mockups with sports cards"
                          poster={shotsMockups1080x60v2Poster}
                          sizes="(max-width: 780px) 50vw, 430px"
                          src="/media/craft/shots-mockups-1080x60-2.mp4?v=4"
                        />
                      </SmoothSurface>
                      <SmoothSurface as="div">
                        <Image
                          alt="House of Doge football match screen showing live score, owners' lounge, and voting"
                          className="pg-media"
                          fill
                          placeholder="blur"
                          sizes="(max-width: 780px) 50vw, 430px"
                          src={houseOfDogeWaveMockup}
                        />
                      </SmoothSurface>
                    </div>
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Pay Direct"
                    subtitle="AnyDay x KOHO"
                    year={2025}
                  >
                    <PlaygroundVideo
                      alt="A set of product mockups"
                      poster={shotsMockups1080x60v3Poster}
                      src="/media/craft/shots-mockups-1080x60-3.mp4?v=4"
                    />
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Retrying failed payouts"
                    subtitle="AnyDay"
                    year={2025}
                  >
                    <PlaygroundVideo
                      alt="A payouts table with a failed transaction being retried from an inline control"
                      poster={retryPayoutPoster}
                      src="/media/craft/retry-payout.mp4?v=4"
                    />
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Browsing pockets"
                    className="pg-tile--pockets"
                    subtitle="AnyDay"
                    year={2025}
                  >
                    <PlaygroundVideo
                      alt="Scrolling through a list of savings pockets in the AnyDay app"
                      poster={shotsMockupsPoster}
                      src="/media/craft/shots-mockups.mp4?v=4"
                    />
                  </PlaygroundTile>

                  {showSuperadmin && (
                    <PlaygroundTile
                      caption="Superadmin"
                      subtitle="AnyDay"
                      year={2024}
                    >
                      <Image
                        alt="AnyDay Superadmin employee profile showing pay balances, personal details, and employment"
                        className="pg-media"
                        fill
                        placeholder="blur"
                        sizes="(max-width: 780px) 100vw, 864px"
                        src={anydaySuperadminImage}
                      />
                    </PlaygroundTile>
                  )}

                  <PlaygroundTile
                    caption="iOS widgets"
                    subtitle="AnyDay"
                    year={2024}
                  >
                    <div className="pg-widget-composition">
                      <Image
                        alt=""
                        className="pg-widget-composition__wallpaper"
                        fill
                        placeholder="blur"
                        sizes="(max-width: 780px) 100vw, 864px"
                        src={wallpaperImage}
                      />
                      <Image
                        alt="Safe to spend AnyDay widget"
                        placeholder="blur"
                        sizes="(max-width: 780px) 62vw, 620px"
                        src={widget1Image}
                      />
                      <div className="pg-widget-composition__row">
                        <Image
                          alt="Total balance AnyDay widget"
                          placeholder="blur"
                          sizes="(max-width: 780px) 22vw, 220px"
                          src={widget2Image}
                        />
                        <Image
                          alt="Spending category AnyDay widget"
                          placeholder="blur"
                          sizes="(max-width: 780px) 22vw, 220px"
                          src={widget3Image}
                        />
                      </div>
                    </div>
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Security"
                    subtitle="AnyDay"
                    year={2024}
                  >
                    <div className="pg-security">
                      <div>
                        <Image
                          alt="AnyDay mobile prompt introducing passcodes and two-factor authentication"
                          className="pg-media"
                          fill
                          placeholder="blur"
                          sizes="(max-width: 780px) 67vw, (max-width: 1422px) 60vw, 854px"
                          src={anydaySecurityPromoImage}
                        />
                      </div>
                    </div>
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="EWA onboarding"
                    style={{ aspectRatio: "1922 / 1082" }}
                    subtitle="AnyDay"
                    year={2023}
                  >
                    <PlaygroundVideo
                      alt="AnyDay earned wage access onboarding guide for employers connecting employees, payroll records, and funding"
                      poster={ewaOnboardingPoster}
                      src="/media/craft/earnedpayclient.mp4?v=2"
                    />
                  </PlaygroundTile>

                  {showCurrencySelect && (
                    <PlaygroundTile
                      caption="Currency select"
                      subtitle="AnyDay"
                      year={2023}
                    >
                      <div className="pg-currency-select">
                        <Image
                          alt="AnyDay currency selector showing popular and available currencies on an iPhone"
                          className="pg-media"
                          fill
                          placeholder="blur"
                          sizes="(max-width: 780px) 100vw, 864px"
                          src={currencySelectImage}
                        />
                      </div>
                    </PlaygroundTile>
                  )}

                  <PlaygroundTile
                    caption="App launch"
                    subtitle="AnyDay"
                    year={2023}
                  >
                    <PlaygroundVideo
                      alt="AnyDay mobile app launching into its wallet home screen"
                      poster={appLaunchPoster}
                      src="/media/craft/app-launch.mp4?v=4"
                    />
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Sunwing Star representative portal"
                    subtitle="Sunwing"
                    year={2022}
                  >
                    <Image
                      alt="Sunwing Star representative portal showing an account balance, recent transactions, and a branded Mastercard"
                      className="pg-media"
                      fill
                      placeholder="blur"
                      sizes="(max-width: 780px) 100vw, 864px"
                      src={sunwingStarPortalImage}
                    />
                  </PlaygroundTile>

                  <PlaygroundTile
                    caption="Candidate view"
                    subtitle="Batch"
                    year={2020}
                  >
                    <Image
                      alt="Batch candidate profile showing experience, a scorecard, contact details, and interview actions"
                      className="pg-media"
                      fill
                      placeholder="blur"
                      sizes="(max-width: 780px) 100vw, 864px"
                      src={candidateViewImage}
                    />
                  </PlaygroundTile>
                </PlaygroundGrid>
              </PlaygroundFeed>
            </section>
          </div>

          <HomeFooter />
        </div>
      </main>
    </div>
  );
}
