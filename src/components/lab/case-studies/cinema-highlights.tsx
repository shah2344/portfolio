import Image from "next/image";
import Link from "next/link";

import { AnyDayFilm } from "@/components/home/case-study-tiles/anyday-film";
import styles from "./cinema-highlights.module.css";
import { labProjects } from "./data";
import { ProjectMark } from "@/components/home/case-study-tiles/project-mark";

/**
 * Cinema C — Highlights. Feature cards, cut down to one tall
 * card per project and set side by side in the homepage column under a
 * two-tone headline. AnyDay's card carries its product film at the foot, with
 * the kitchen it's shot in rising above it and blurring progressively toward
 * the copy; Humi's is its illustration, centred on the card's floor. The heading's link covers the card, so the whole card opens
 * the case study.
 */
export function CinemaHighlights() {
  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>
        Case studies.{" "}
        <span>Two products, taken from first concept to launch.</span>
      </h3>

      <ul className={styles.cards}>
        {labProjects.map((project) => {
          const film = "video" in project ? project.video : null;

          return (
            <li
              className={styles.card}
              data-tone={film ? "dark" : "light"}
              key={project.id}
            >
              {film ? (
                <AnyDayFilm
                  className={styles.film}
                  film={film}
                  sizes="(max-width: 40rem) calc(100vw - 3rem), 330px"
                />
              ) : (
                <Image
                  alt=""
                  className={styles.illustration}
                  sizes="(max-width: 40rem) 140vw, 470px"
                  src={project.scene.src}
                />
              )}

              <div className={styles.copy}>
                <ProjectMark project={project} size={40} />
                <p className={styles.eyebrow}>
                  {project.sector} · {project.years}
                </p>
                <h4 className={styles.name}>
                  <Link className={styles.link} href={project.href}>
                    {project.name}
                  </Link>
                </h4>
                <p className={styles.tagline}>{project.tagline}.</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
