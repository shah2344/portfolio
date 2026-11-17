import Image, { type StaticImageData } from "next/image";
import type { CSSProperties, ReactNode } from "react";

import securityImage from "../../../../public/media/craft/anyday-security-promo.png";
import appLaunchPoster from "../../../../public/media/craft/app-launch-poster.jpg";
import candidateViewImage from "../../../../public/media/craft/candidate-view.png";
import ewaOnboardingPoster from "../../../../public/media/craft/ewa-onboarding-poster.jpg";
import dogeImage from "../../../../public/media/craft/house-of-doge-wave-mockup.png";
import retryPayoutPoster from "../../../../public/media/craft/retry-payout-poster.jpg";
import supportPoster from "../../../../public/media/craft/shots-mockups-1080x60-poster.jpg";
import kohoPoster from "../../../../public/media/craft/shots-mockups-1080x60-3-poster.jpg";
import zellePoster from "../../../../public/media/craft/shots-mockups-874-poster.jpg";
import pocketsPoster from "../../../../public/media/craft/shots-mockups-poster.webp";
import sunwingImage from "../../../../public/media/craft/sunwing-star-representative-portal.webp";

import styles from "./feed-tags-lab.module.css";

/**
 * Round two of the feed's contribution tags: ten treatments grown from the
 * three that survived round one (outline pill, colour dot, glass badge). Half
 * live inside the card, half use the empty space to the right of the caption.
 * Each role owns one hue, used the same way everywhere. Development only.
 */

type Role = "design" | "build" | "prototype" | "research";

const ROLES: Record<Role, { label: string; hue: number; icon: ReactNode }> = {
  design: {
    label: "Design",
    hue: 292,
    icon: (
      <path d="M3 13l.9-3.6 6.9-6.9a1.2 1.2 0 011.7 0l1 1a1.2 1.2 0 010 1.7L6.6 12.1 3 13zM9.6 3.7l2.7 2.7" />
    ),
  },
  build: {
    label: "Build",
    hue: 252,
    icon: <path d="M5.8 4.5L2.3 8l3.5 3.5M10.2 4.5L13.7 8l-3.5 3.5" />,
  },
  prototype: {
    label: "Prototype",
    hue: 55,
    icon: (
      <path d="M5 3.9v8.2a.6.6 0 00.9.5l6.8-4.1a.6.6 0 000-1L5.9 3.4a.6.6 0 00-.9.5z" />
    ),
  },
  research: {
    label: "Research",
    hue: 155,
    icon: <path d="M11 7a4 4 0 11-8 0 4 4 0 018 0zM10 10l3.2 3.2" />,
  },
};

function Glyph({ role }: { role: Role }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      {ROLES[role].icon}
    </svg>
  );
}

/** A dot in the role's hue, then its name. The unit every dotted option shares. */
function Dot({ role }: { role: Role }) {
  return (
    <span className={styles.dot} data-role={role}>
      {ROLES[role].label}
    </span>
  );
}

function Study({
  index,
  name,
  note,
  image,
  inCard,
  aside,
  asideAlign = "center",
  title,
  source,
  shelf = false,
}: {
  index: number;
  name: string;
  note: string;
  image: StaticImageData;
  /** Laid over the media. */
  inCard?: ReactNode;
  /** Set in the empty space to the right of the caption. */
  aside?: ReactNode;
  asideAlign?: "center" | "start";
  title: string;
  source: string;
  /** The caption moves onto a shelf inside the card. */
  shelf?: boolean;
}) {
  return (
    <article className={styles.study}>
      <header className={styles.studyHead}>
        <span className={styles.studyIndex}>
          {String(index).padStart(2, "0")}
        </span>
        <h3 className={styles.studyName}>{name}</h3>
        <p className={styles.studyNote}>{note}</p>
      </header>
      <figure className={styles.tile}>
        <div className={styles.media}>
          <Image
            alt=""
            fill
            placeholder="blur"
            sizes="(max-width: 780px) 100vw, 520px"
            src={image}
          />
          {inCard}
        </div>
        {!shelf && (
          <figcaption className={styles.caption} data-align={asideAlign}>
            <span className={styles.captionText}>
              <span className={styles.title}>{title}</span>
              <span className={styles.sub}>{source}</span>
            </span>
            {aside}
          </figcaption>
        )}
      </figure>
    </article>
  );
}

/** A role dot whose name can fold away when the card gets small. */
function FoldDot({ role }: { role: Role }) {
  return (
    <span className={styles.foldDot} data-role={role} title={ROLES[role].label}>
      <span className={styles.foldLabel}>{ROLES[role].label}</span>
    </span>
  );
}

const SIZES = [
  { name: "Large", width: 440 },
  { name: "Medium", width: 280 },
  { name: "Small", width: 200 },
] as const;

/** One option drawn at three card widths, so it is judged where it has to fit. */
function SizeStudy({
  index,
  name,
  note,
  image,
  inCard,
  meta,
  title,
  source,
  verdict,
}: {
  index: number;
  name: string;
  note: string;
  image: StaticImageData;
  inCard?: ReactNode;
  /** Set on the caption's second line, after the source. */
  meta?: ReactNode;
  title: string;
  source: string;
  verdict?: string;
}) {
  return (
    <article className={styles.sizeStudy}>
      <header className={styles.studyHead}>
        <span className={styles.studyIndex}>
          {String(index).padStart(2, "0")}
        </span>
        <h3 className={styles.studyName}>
          {name}
          {verdict && <span className={styles.verdict}>{verdict}</span>}
        </h3>
        <p className={styles.studyNote}>{note}</p>
      </header>
      <div className={styles.sizes}>
        {SIZES.map((size) => (
          <div className={styles.sizeCell} key={size.name}>
            <span className={styles.sizeName}>
              {size.name} · {size.width}px
            </span>
            <figure
              className={styles.sized}
              style={{ width: size.width } as CSSProperties}
            >
              <div className={styles.sizedMedia}>
                <Image
                  alt=""
                  fill
                  placeholder="blur"
                  sizes={`${size.width}px`}
                  src={image}
                />
                {inCard}
              </div>
              <figcaption className={styles.sizedCaption}>
                <span className={styles.title}>{title}</span>
                <span className={styles.metaLine}>
                  <span>{source}</span>
                  {meta}
                </span>
              </figcaption>
            </figure>
          </div>
        ))}
      </div>
    </article>
  );
}

export function FeedTagsLab() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <h1>Feed contribution tags, round three</h1>
        <p>
          The brief now: subtle, readable at a glance, and intact at every card
          size. On desktop the caption only shows on hover, so a tag that must
          be seen at rest has to live in the card. Rounds one and two follow
          below for comparison.
        </p>
        <p className={styles.legend}>
          <Dot role="design" />
          <Dot role="build" />
          <Dot role="prototype" />
          <Dot role="research" />
        </p>
      </header>

      <h2 className={styles.group}>Subtle at every size</h2>
      <p className={styles.groupNote}>
        Each option is drawn at three card widths. Below 240px the names fold
        into dots. A one-line key above the feed, like the one above, teaches
        the colours once so the dots stay readable.
      </p>
      <div className={styles.sizeList}>
        <SizeStudy
          image={sunwingImage}
          inCard={
            <span className={styles.mark}>
              <FoldDot role="research" />
              <FoldDot role="design" />
            </span>
          }
          index={11}
          name="Adaptive mark"
          note="A small white pill tucked into the card's corner. Names at large sizes, dots alone when the card is small. White holds on dark and light imagery alike."
          source="Sunwing"
          title="Sunwing Star representative portal"
          verdict="Recommended"
        />

        <SizeStudy
          image={kohoPoster}
          inCard={
            <span className={styles.letters}>
              {(["design", "build"] as const).map((role) => (
                <span
                  className={styles.letter}
                  data-role={role}
                  key={role}
                  title={ROLES[role].label}
                >
                  <span aria-hidden="true">{ROLES[role].label[0]}</span>
                  <span className="sr-only">{ROLES[role].label}</span>
                </span>
              ))}
            </span>
          }
          index={12}
          name="Letter coins"
          note="One 20px coin per role, carrying its initial. Identical at every size, and a letter reads faster than an icon."
          source="AnyDay x KOHO"
          title="Pay Direct"
        />

        <SizeStudy
          image={zellePoster}
          inCard={
            <>
              <span aria-hidden="true" className={styles.scrim} />
              <span className={styles.scrimMark}>
                <FoldDot role="design" />
                <FoldDot role="build" />
              </span>
            </>
          }
          index={13}
          name="Photo credit"
          note="No container. White text on a faint shade at the card's foot, the way a photo credit sits on a picture. Quietest, but the shade touches the artwork."
          source="AnyDay"
          title="Anyday Financial"
        />

        <SizeStudy
          image={retryPayoutPoster}
          meta={
            <span className={styles.meta}>
              <FoldDot role="design" />
              <FoldDot role="build" />
            </span>
          }
          index={14}
          name="Meta line"
          note="Roles join the source on the caption's second line. Cleanest card, but on desktop it is only seen on hover."
          source="AnyDay"
          title="Retrying failed payouts"
        />
      </div>

      <h2 className={styles.group}>Round two: inside the card</h2>
      <div className={styles.grid}>
        <Study
          image={zellePoster}
          inCard={
            <span className={`${styles.glass} ${styles.pinBottomLeft}`}>
              <Dot role="design" />
              <Dot role="build" />
            </span>
          }
          index={1}
          name="Glass dots"
          note="The glass badge carrying the colour dots. Caption untouched."
          source="AnyDay · 2026"
          title="Anyday Financial"
        />

        <Study
          image={pocketsPoster}
          inCard={
            <span className={`${styles.solids} ${styles.pinTopLeft}`}>
              <span className={styles.solid} data-role="prototype">
                Prototype
              </span>
            </span>
          }
          index={2}
          name="Solid chips"
          note="Full-colour chips, the way a wallet labels an asset. Loudest."
          source="AnyDay · 2025"
          title="Browsing pockets"
        />

        <Study
          image={kohoPoster}
          inCard={
            <span className={`${styles.coins} ${styles.pinTopRight}`}>
              <span className={styles.coin} data-role="design" title="Design">
                <Glyph role="design" />
                <span className="sr-only">Design</span>
              </span>
              <span className={styles.coin} data-role="build" title="Build">
                <Glyph role="build" />
                <span className="sr-only">Build</span>
              </span>
            </span>
          }
          index={3}
          name="Coin stack"
          note="Overlapping role coins in the corner, like a token pair."
          source="AnyDay x KOHO · 2025"
          title="Pay Direct"
        />

        <Study
          image={supportPoster}
          inCard={
            <span className={styles.shelf}>
              <span className={styles.captionText}>
                <span className={styles.title}>Support</span>
                <span className={styles.sub}>AnyDay · 2026</span>
              </span>
              <span className={styles.stack}>
                <Dot role="design" />
                <Dot role="build" />
              </span>
            </span>
          }
          index={4}
          name="Frosted shelf"
          note="The whole caption moves inside the card, roles on the right."
          shelf
          source="AnyDay · 2026"
          title="Support"
        />

        <Study
          image={sunwingImage}
          inCard={
            <span className={styles.tabs}>
              <span className={styles.tab} data-role="research">
                Research
              </span>
              <span className={styles.tab} data-role="design">
                Design
              </span>
            </span>
          }
          index={5}
          name="Edge tabs"
          note="Tinted tabs cut into the card's bottom edge, above the caption."
          source="Sunwing · 2022"
          title="Sunwing Star representative portal"
        />
      </div>

      <h2 className={styles.group}>Round two: beside the caption</h2>
      <div className={styles.grid}>
        <Study
          aside={
            <span className={styles.tints}>
              <span className={styles.tint} data-role="design">
                Design
              </span>
              <span className={styles.tint} data-role="build">
                Build
              </span>
            </span>
          }
          image={retryPayoutPoster}
          index={6}
          name="Tinted pills"
          note="Coloured text on a wash of the same hue, centred on the caption."
          source="AnyDay · 2025"
          title="Retrying failed payouts"
        />

        <Study
          aside={
            <span className={styles.capsule}>
              <Dot role="research" />
              <Dot role="design" />
              <Dot role="build" />
            </span>
          }
          image={ewaOnboardingPoster}
          index={7}
          name="Segmented capsule"
          note="The outline pill and the dots as one object, split by hairlines."
          source="AnyDay · 2023"
          title="EWA onboarding"
        />

        <Study
          aside={
            <span className={styles.pair}>
              <Dot role="design" />
              <Dot role="build" />
            </span>
          }
          asideAlign="start"
          image={securityImage}
          index={8}
          name="Baseline pair"
          note="No container. One role per caption line, sharing its baseline."
          source="AnyDay · 2024"
          title="Security"
        />

        <Study
          aside={
            <span className={styles.squircles}>
              <span
                className={styles.squircle}
                data-role="design"
                title="Design"
              >
                <Glyph role="design" />
                <span className="sr-only">Design</span>
              </span>
              <span
                className={styles.squircle}
                data-role="prototype"
                title="Prototype"
              >
                <Glyph role="prototype" />
                <span className="sr-only">Prototype</span>
              </span>
            </span>
          }
          image={dogeImage}
          index={9}
          name="Glyph squircles"
          note="Tinted icon tiles, as tall as the caption. Needs the legend once."
          source="House of Doge · 2026"
          title="Club owner experience"
        />

        <Study
          aside={
            <span
              className={styles.blend}
              style={
                {
                  "--h1": ROLES.design.hue,
                  "--h2": ROLES.build.hue,
                } as CSSProperties
              }
            >
              <span>Design + Build</span>
            </span>
          }
          image={appLaunchPoster}
          index={10}
          name="Blend pill"
          note="One pill whose wash and text run from one role's hue to the next."
          source="AnyDay · 2023"
          title="App launch"
        />
      </div>

      <h2 className={styles.group}>Kept from round one</h2>
      <div className={styles.grid}>
        <Study
          aside={<span className={styles.outline}>Prototype</span>}
          image={candidateViewImage}
          index={3}
          name="Outline pill"
          note="Redrawn on the same grid as the rest."
          source="Batch · 2020"
          title="Candidate view"
        />
        <Study
          aside={
            <span className={styles.inline}>
              <Dot role="design" />
              <Dot role="build" />
            </span>
          }
          image={zellePoster}
          index={5}
          name="Colour dot"
          note="Now on the right, in the role hues."
          source="AnyDay · 2026"
          title="Anyday Financial"
        />
        <Study
          image={appLaunchPoster}
          inCard={
            <span className={`${styles.glass} ${styles.pinBottomLeft}`}>
              <span className={styles.plain}>Design + build</span>
            </span>
          }
          index={9}
          name="Glass badge"
          note="Same badge, tightened: concentric corner, hairline, softer shadow."
          source="AnyDay · 2023"
          title="App launch"
        />
      </div>
    </main>
  );
}
