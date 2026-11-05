import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";

import conversationsImage from "../../../../public/media/anyday/fin-conversations.webp";
import csatImage from "../../../../public/media/anyday/fin-csat.webp";
import ratingsImage from "../../../../public/media/anyday/fin-ratings.webp";
import supportPoster from "../../../../public/media/anyday/fin-support-poster.webp";

import { PlaygroundTile } from "@/components/home/playground/tile";
import { CaseStudyMediaArrival } from "@/components/work/case-study-media-arrival";
import { InlineDemoVideo } from "@/components/work/inline-demo-video";

import styles from "./fin-support.module.css";

/** The support flow and its results, arranged like Humi's discovery board. */
export function AnyDayFinSupport() {
  return (
    <CaseStudyMediaArrival>
      <PlaygroundTile
        asContainer
        className={styles.zoom}
        interactiveContent
        label="AnyDay Fin support flow and results"
        style={{ aspectRatio: "var(--anyday-card-aspect, 816 / 440)" }}
      >
        <SmoothSurface as="div" className={styles.board}>
          <SmoothSurface
            as="div"
            className={`${styles.media} ${styles.conversations}`}
          >
            <Image
              alt="Fin conversation handling: 70% resolved by the AI agent, with 26% passed to a teammate."
              sizes="(min-width: 53rem) 404px, calc(51vw - 1.53rem)"
              src={conversationsImage}
            />
          </SmoothSurface>
          <SmoothSurface
            as="div"
            className={`${styles.media} ${styles.support}`}
          >
            <InlineDemoVideo
              backdrop={
                <Image
                  alt=""
                  className={styles.poster}
                  sizes="(min-width: 53rem) 174px, calc(22vw - 0.66rem)"
                  src={supportPoster}
                />
              }
              compact
              controls={false}
              describedBy="anyday-fin-video-description"
              flat
              ground="#282828"
              height={1328}
              src="/media/anyday/fin-support.mp4"
              title="AnyDay Fin support conversation"
              width={880}
            />
          </SmoothSurface>
          <SmoothSurface
            as="div"
            className={`${styles.media} ${styles.ratings}`}
          >
            <Image
              alt="Conversation ratings: 44.74% amazing and 41.39% great."
              sizes="(min-width: 53rem) 206px, calc(26vw - 0.78rem)"
              src={ratingsImage}
            />
          </SmoothSurface>
          <SmoothSurface as="div" className={`${styles.media} ${styles.csat}`}>
            <Image
              alt="Fin customer satisfaction rose from 50% in April to 87.7% in August."
              sizes="(min-width: 53rem) 365px, calc(46vw - 1.38rem)"
              src={csatImage}
            />
          </SmoothSurface>
          <p className="sr-only" id="anyday-fin-video-description">
            A member uses AnyDay’s Fin AI support chat to get help inside the
            app.
          </p>
        </SmoothSurface>
      </PlaygroundTile>
    </CaseStudyMediaArrival>
  );
}
