"use client";

import { SmoothSurface } from "@/components/ui/smooth-surface";

import { BlossomCarousel } from "@blossom-carousel/react";
import "@blossom-carousel/react/style.css";
import Image, { type StaticImageData } from "next/image";

import internalToolsImage from "../../../../public/media/anyday/internal-tools-member-events.webp";
import { AnyDayAppStoreShots } from "./app-store-shots";
import { InlineDemoVideo } from "../inline-demo-video";
import styles from "./tools-carousel.module.css";

type ToolSlide = {
  title: string;
  label: string;
  description: string;
} & (
  | {
      type: "image";
      image: StaticImageData;
      size: "phone" | "wide";
    }
  | {
      type: "video";
      src: string;
      width: number;
      height: number;
      size: "phone" | "wide";
    }
  | { type: "app-store"; size: "phone" }
);

const TOOL_SLIDES: readonly ToolSlide[] = [
  {
    type: "video",
    title: "AnyDay restaurant portal",
    label: "Employer payout portal",
    description:
      "Restaurant managers calculate tips and send earnings to their team through the portal.",
    src: "/media/anyday/client-portal-01.mp4",
    width: 1620,
    height: 1080,
    size: "wide",
  },
  {
    type: "app-store",
    title: "AnyDay App Store screenshots",
    label: "Employee wallet app",
    description:
      "A rotating set of App Store screenshots showing the AnyDay member app.",
    size: "phone",
  },
  {
    type: "image",
    title:
      "AnyDay internal admin showing a member profile and payment event history",
    label: "Operations console",
    description:
      "Behind the scenes, support and operations teams use admin tools to manage accounts and payment issues.",
    image: internalToolsImage,
    size: "wide",
  },
];

export function AnyDayToolsCarousel() {
  return (
    <section className={styles.section} aria-labelledby="anyday-tools-title">
      <BlossomCarousel
        aria-label="From manager payouts to member earnings and internal operations"
        aria-roledescription="carousel"
        className={styles.track}
        role="region"
        tabIndex={-1}
      >
        {TOOL_SLIDES.map((tool, index) => {
          const descriptionId = `anyday-tool-description-${index + 1}`;

          return (
            <div
              aria-label={`${index + 1} of ${TOOL_SLIDES.length}: ${tool.label}`}
              aria-roledescription="slide"
              className={styles.slide}
              data-blossom-slide
              key={tool.label}
              role="group"
            >
              <div
                aria-label={tool.type === "video" ? undefined : tool.label}
                aria-describedby={
                  tool.type === "video" ? undefined : descriptionId
                }
                className={styles.frame}
                role={tool.type === "video" ? undefined : "group"}
                tabIndex={tool.type === "video" ? undefined : 0}
                onFocus={(event) => {
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "center",
                    behavior: "instant",
                  });
                }}
              >
                <SmoothSurface
                  as="div"
                  className={`${styles.card} ${styles[tool.size]} ${
                    tool.type === "app-store" ? styles.appStore : ""
                  }`}
                >
                  {tool.type === "image" ? (
                    <Image
                      alt={tool.title}
                      className={styles.image}
                      fill
                      sizes={
                        tool.size === "phone"
                          ? "(max-width: 52.5rem) 48vw, 24rem"
                          : "(max-width: 52.5rem) calc(100vw - 3rem), 49.5rem"
                      }
                      src={tool.image}
                      unoptimized
                    />
                  ) : tool.type === "video" ? (
                    <InlineDemoVideo
                      describedBy={descriptionId}
                      flat
                      ground="#f7f7f7"
                      height={tool.height}
                      scrubbable={false}
                      src={tool.src}
                      title={tool.title}
                      width={tool.width}
                    />
                  ) : (
                    <AnyDayAppStoreShots aspectRatio="1242 / 2208" />
                  )}
                </SmoothSurface>
              </div>
              <span className={styles.label}>{tool.label}</span>
              <span className="sr-only" id={descriptionId}>
                {tool.description}
              </span>
            </div>
          );
        })}
      </BlossomCarousel>

      <div className={styles.intro}>
        <p className="humi-impact__lede" id="anyday-tools-title">
          <strong>From sending payouts to managing earnings.</strong> I designed
          how employers pay their teams, how employees manage their money, and
          how our internal teams resolve issues.
        </p>
      </div>
    </section>
  );
}
