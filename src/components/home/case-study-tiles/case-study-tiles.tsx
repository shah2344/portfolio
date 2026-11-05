import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";

import { CASE_STUDY_ART_SIZES } from "@/components/motion/case-study-art";
import { RouteLink } from "@/components/motion/route-link";

import { AnyDayFilm, type FilmScene } from "./anyday-film";
import styles from "./case-study-tiles.module.css";
import { ProjectMark } from "./project-mark";

export type CaseStudyTileProject = {
  id: string;
  name: string;
  /** The headline, without its closing full stop. */
  tagline: string;
  href: string;
} & (
  | {
      /** The logo dropped into the shared mark tile; see `ProjectMark`. */
      logo: StaticImageData;
      icon?: never;
    }
  | {
      /** An app icon drawn as supplied, with its own tile, in place of one. */
      icon: StaticImageData;
      logo?: never;
    }
) &
  (
    | {
        /** A filmed project runs its film at the foot; see `AnyDayFilm`. */
        film: { src: string; width: number; height: number; title: string };
        scene?: never;
      }
    | {
        /** The illustration on stage. */
        scene: FilmScene;
        film?: never;
      }
  );

/**
 * The homepage's case studies, as product tiles in the column: the brand and a
 * headline centred at the top, and the work on stage below it, edge to edge.
 * The whole tile is the link. A filmed project runs its film full width at the
 * foot with a hazed reflection of it rising behind the copy; see `AnyDayFilm`. The
 * tiles pin and stack, and the one underneath settles back as the next rises
 * over it.
 */
export function CaseStudyTiles({
  enterStyle,
  projects,
}: {
  /** Both cards share one entrance beat; neither trails the other. */
  enterStyle?: CSSProperties;
  projects: readonly CaseStudyTileProject[];
}) {
  const timelines = projects.map((_, index) => `--case-study-tile-${index}`);

  return (
    <div
      className={styles.root}
      style={{ timelineScope: timelines.join(", ") } as CSSProperties}
    >
      {projects.map((project, index) => {
        const next = timelines[index + 1];
        const { film } = project;
        return (
          <article
            className={styles.panel}
            data-home-enter="idle"
            data-home-load=""
            data-home-enter-kind="surface"
            data-tone={film ? "dark" : "light"}
            key={project.id}
            style={
              {
                viewTimelineName: timelines[index],
                ...enterStyle,
              } as CSSProperties
            }
          >
            <div
              className={styles.tile}
              data-recedes={next ? "" : undefined}
              style={next ? ({ animationTimeline: next } as CSSProperties) : {}}
            >
              <SmoothSurface as="div" className={styles.surface}>
                <header className={styles.copy}>
                  <p className={styles.brand}>
                    {project.icon ? (
                      <Image
                        alt=""
                        className={styles.icon}
                        height={36}
                        src={project.icon}
                        width={36}
                      />
                    ) : (
                      <ProjectMark
                        className={styles.mark}
                        project={project}
                        size={36}
                      />
                    )}
                  </p>
                  <h3 className={styles.headline}>{project.tagline}.</h3>
                </header>

                {film ? (
                  <AnyDayFilm
                    className={styles.film}
                    film={film}
                    priority={index === 0}
                    sizes="(max-width: 40rem) 110vw, (max-width: 724px) 55vw, 372px"
                  />
                ) : (
                  <div className={styles.stage}>
                    <Image
                      alt={project.scene.alt}
                      className={styles.illustration}
                      // Next on the page after the first tile, so it is fetched
                      // with the page rather than when it is already arriving.
                      loading="eager"
                      sizes={CASE_STUDY_ART_SIZES}
                      src={project.scene.src}
                    />
                  </div>
                )}

                {/* The whole card is the link: it lies over the tile, above the
                  copy and the film, and names the case study it opens. */}
                <RouteLink
                  className={styles.tileLink}
                  data-home-tip={`View ${project.name}`}
                  href={project.href}
                  zoom="open"
                >
                  <span className="sr-only">
                    Read the case study for {project.name}
                  </span>
                </RouteLink>
              </SmoothSurface>

              {/* Lisse draws both rims outside the artwork clip. */}
              <SmoothSurface
                as="span"
                aria-hidden="true"
                className={styles.edge}
                effects={{
                  outerBorder: {
                    width: 1,
                    color: "var(--case-study-card-line)",
                    opacity: 1,
                  },
                  innerBorder: {
                    width: 1,
                    color: "var(--site-media-stroke)",
                    opacity: 1,
                  },
                }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
