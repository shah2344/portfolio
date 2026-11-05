import { BrandMark } from "@/components/motion/brand-turn";
import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { Tilt } from "@/components/motion-primitives/tilt";
import { CASE_STUDY_ART_SIZES } from "@/components/motion/case-study-art";
import { PlaygroundTile } from "@/components/home/playground/tile";
import { HomeFooter } from "@/components/home/footer/footer";
import { RouteLink } from "@/components/motion/route-link";
import { GlassMaterial } from "@/components/ui/glass-material";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionToc, type TocSection } from "@/components/ui/section-toc";
import {
  type CaseStudyAnnotation,
  CaseStudyAnnotationMarks,
  CaseStudyAnnotationNotes,
} from "@/components/work/case-study-annotations";
import {
  CaseStudyPage,
  HumiStoryCard,
} from "@/components/work/humi/case-study-shell";
import { CaseStudyMediaArrival } from "@/components/work/case-study-media-arrival";
import { cn } from "@/lib/utils";

/*
 * Sizing these against the viewport had a desktop reader downloading and
 * decoding the 3840px variant of a 1.9MB export to paint a fraction of it —
 * several hundred milliseconds of decode landing mid-scroll for pixels that were thrown away. So the hint states the column instead.
 *
 * It has to keep step with `.humi-story-card` in `globals.css`, which is
 * `min(100%, 848px)` with 1.5rem gutters: 848 − 48 leaves an 800px frame, and
 * 848px is the 53rem the query below switches at. The hint still read 676px
 * from a 724px column the card has since outgrown, which under-stated every
 * frame by 22% — enough that a 1× display picked the 750w candidate and
 * upscaled it, while a 2× display sized against the wrong number entirely.
 */
const MEDIA_SIZES = "(min-width: 53rem) 800px, calc(100vw - 3rem)";

export type { CaseStudyAnnotation, TocSection };

/** The card every story beat sits on. One name for all three case studies. */
export const CaseStudyCard = HumiStoryCard;

/**
 * The page, the story chrome, and the intro every case study opens
 * with: sticky brand mark, screen-reader heading, lede, and dates. Everything
 * below the intro is the individual story, passed as children.
 */
export function CaseStudy({
  brand,
  children,
  className,
  date,
  heading,
  lede,
  mainId,
  sections,
}: {
  brand: { mark: ReactNode; name: string };
  children: ReactNode;
  className?: string;
  date: string;
  /** The visually hidden h1 that names the story. */
  heading: string;
  lede: ReactNode;
  mainId: string;
  sections: readonly TocSection[];
}) {
  return (
    <CaseStudyPage closeLabel={`Close ${brand.name} case study`}>
      <div className={cn("humi-case-study", className)}>
        <main id={mainId}>
          <SectionToc sections={sections} />

          <div className="humi-story-intro__brand" aria-hidden="true">
            <BrandMark>{brand.mark}</BrandMark>
            <span>{brand.name}</span>
          </div>

          {/* The story slides up over the footer, which waits pinned beneath
              it. The brand mark and contents rail stay outside, above the
              header blur. */}
          <div className="case-study-sheet">
            <header className="humi-story-intro">
              <h1 className="sr-only">{heading}</h1>
              <p className="humi-story-intro__lede">{lede}</p>
              <p className="humi-story-intro__date">{date}</p>
            </header>

            {children}
          </div>
        </main>

        <HomeFooter className="case-study-footer" contactOnly />
      </div>
    </CaseStudyPage>
  );
}

/**
 * A section break. The id is both the anchor the rail scrolls to and the row
 * it highlights, so it has to match an entry in the `sections` list above.
 */
export function CaseStudySection({
  children,
  id,
}: {
  children: string;
  id: string;
}) {
  return (
    <SectionHeading className="humi-story-divider" id={id}>
      {children}
    </SectionHeading>
  );
}

/** One screen in a frame: the export, the marks over it, the notes beside it. */
type CaseStudyScreen = {
  alt: string;
  annotations?: readonly CaseStudyAnnotation[];
  /** Take back the card's gutters and keep the export's own aspect ratio. */
  bleed?: boolean;
  /**
   * Fraction of the export's height to take off the top, for a screen that was
   * captured with a sliver of the page behind it still in shot.
   */
  cropTop?: number;
  eager?: boolean;
  /**
   * The solid plate an export is drawn on, laid behind it so the rounded cut
   * baked into the artwork fills in under the frame's tighter corner.
   */
  ground?: string;
  lead?: boolean;
  /** The lead frame, drawn like its homepage tile and sharing its artwork and
   *  `sizes`, so the bytes are already cached. */
  card?: boolean;
  plate?: boolean;
  src: StaticImageData;
  surface?: "profile";
};

function CaseStudyFrame({
  alt,
  annotations,
  bleed = false,
  card = false,
  cropTop,
  eager = false,
  ground,
  lead = false,
  plate = false,
  src,
  surface,
}: CaseStudyScreen) {
  const marked = Boolean(annotations?.length);
  /*
   * Two different jobs that used to be one flag. The lead frame is what the
   * page opens on, so it is fetched ahead of everything else; a frame that is
   * merely `eager` is one the reader reaches within a screen or two of opening,
   * and it should start loading without waiting for the viewport — but at
   * ordinary priority, so it is not bidding against the frame on screen.
   */
  const immediate = eager || lead;

  const frame = (
    <SmoothSurface
      as="div"
      className={cn(
        "humi-story-media__frame",
        bleed && "humi-story-media__frame--bleed",
        plate && "humi-story-media__frame--plate",
        marked && "humi-story-media__frame--marked",
        card && "humi-story-media__frame--card",
        surface === "profile" && "humi-story-media__frame--profile",
      )}
      style={
        ground
          ? ({ "--site-media-surface": ground } as CSSProperties)
          : undefined
      }
    >
      {src ? (
        <Image
          alt={alt}
          fetchPriority={lead ? "high" : "auto"}
          loading={immediate ? "eager" : "lazy"}
          placeholder="blur"
          sizes={card ? CASE_STUDY_ART_SIZES : MEDIA_SIZES}
          src={src}
          style={
            cropTop
              ? {
                  /* Scale past the frame and pull up, so the trimmed strip
                       leaves the frame rather than leaving a gap under it. */
                  height: `${100 / (1 - cropTop)}%`,
                  marginBlockStart: `${-cropTop * 100}%`,
                }
              : undefined
          }
        />
      ) : null}
      {annotations?.length ? (
        <CaseStudyAnnotationMarks annotations={annotations} />
      ) : null}
    </SmoothSurface>
  );

  return (
    <div className="humi-story-media__stage">
      {frame}
      {annotations?.length ? (
        <CaseStudyAnnotationNotes annotations={annotations} />
      ) : null}
    </div>
  );
}

/** How far the furthest note hangs past either side of its frame, as a
 *  fraction of the frame's width, plus a little breathing room. */
function noteOverhang(annotations?: readonly CaseStudyAnnotation[]) {
  const overhang = Math.max(
    0,
    ...(annotations ?? []).map(({ note }) =>
      Math.max(-note.x, note.x + note.w - 1),
    ),
  );
  return overhang > 0 ? overhang + 0.02 : 0;
}

/**
 * A tilting media frame with its caption. Without `src` the frame renders
 * empty — the blank state a story uses before its screens are in place.
 */
export function CaseStudyMedia({
  alt = "",
  annotations,
  bleed = false,
  card = false,
  children,
  description,
  eager = false,
  expandable = false,
  ground,
  lead = false,
  plate = false,
  scrollScale = false,
  src,
  surface,
  title,
  tilt = true,
}: {
  alt?: string;
  /* A teardown of the screen: marks over the parts of the UI the redesign went
     after, and the handwriting that says what is wrong with each. */
  annotations?: readonly CaseStudyAnnotation[];
  /* An export whose subject runs past its own plate: give the frame the card's
     gutters back and let it keep the export's ratio rather than covering. */
  bleed?: boolean;
  children?: ReactNode;
  description?: string;
  /** Load without waiting for the viewport, at ordinary priority. */
  eager?: boolean;
  /** Open this story image using the shared expanding-card interaction. */
  expandable?: boolean;
  /** The solid plate the export is drawn on; see `CaseStudyScreen`. */
  ground?: string;
  /** The frame the page opens on: fetched ahead of every other screen. */
  lead?: boolean;
  /** The lead frame, drawn like its homepage tile and sharing its artwork and
   *  `sizes`, so the bytes are already cached. */
  card?: boolean;
  /* A raw screen export rather than a composed image: lay it on the muted
     plate so it reads apart from the composed frames around it. */
  plate?: boolean;
  /** A small, one-time scroll arrival for this image, with a static caption. */
  scrollScale?: boolean;
  src?: StaticImageData;
  /* The plate the frame lays its image on. Only the employee record departs
     from the default light surface. */
  surface?: "profile";
  title?: string;
  /** Pointer tilt for artwork that benefits from the motion. */
  tilt?: boolean;
}) {
  const hasCaption = Boolean(title || description || children);
  const frame = (
    <CaseStudyFrame
      alt={alt}
      annotations={annotations}
      bleed={bleed}
      card={card}
      eager={eager}
      ground={ground}
      lead={lead}
      plate={plate}
      src={src as StaticImageData}
      surface={surface}
    />
  );
  const media = tilt ? (
    <Tilt className="humi-story-media__tilt" rotationFactor={3}>
      {frame}
    </Tilt>
  ) : (
    frame
  );
  const zoomableMedia =
    src && expandable ? (
      <PlaygroundTile
        asContainer
        className="humi-story-media__zoom"
        label={title ?? alt}
        /* Margin notes stay on-screen when the frame is opened. */
        openMarginX={noteOverhang(annotations)}
        style={{ aspectRatio: `${src.width} / ${src.height}` }}
      >
        {media}
      </PlaygroundTile>
    ) : (
      media
    );

  return (
    <figure className="humi-story-media">
      {scrollScale ? (
        <CaseStudyMediaArrival>{zoomableMedia}</CaseStudyMediaArrival>
      ) : (
        zoomableMedia
      )}
      {hasCaption ? (
        <figcaption>
          {title || description ? (
            <p>
              <strong>{title}</strong> <span>{description}</span>
            </p>
          ) : null}
          {children}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** The closing section, plus the link on to the next case study. */
export function CaseStudyEnding({
  children,
  heading,
  id = "impact",
  next,
}: {
  children?: ReactNode;
  heading?: string;
  id?: string;
  next: { href: string; label: string };
}) {
  return (
    <section className="humi-story-ending" id={id}>
      {heading ? <h2>{heading}</h2> : null}
      {children}
      <div className="case-study-ending__actions">
        <div aria-hidden="true" className="mobile-toc-landing" />
        <span aria-hidden="true" className="case-study-ending__divider" />
        <RouteLink
          aria-label={`View ${next.label} case study`}
          className="case-study-ending__next"
          href={next.href}
        >
          <GlassMaterial />
          <span className="case-study-ending__next-prefix">
            View {next.label} case study
          </span>
          <span className="case-study-ending__next-short">
            View {next.label}
          </span>
          <svg
            aria-hidden="true"
            className="case-study-ending__next-arrow"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M14 6L20 12L14 18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M19 12H4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </RouteLink>
      </div>
    </section>
  );
}
