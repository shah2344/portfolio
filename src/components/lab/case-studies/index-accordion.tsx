import Image from "next/image";
import Link from "next/link";

import cta from "./cta.module.css";
import { labProjects } from "./data";
import styles from "./index-accordion.module.css";
import { ProjectMark } from "@/components/home/case-study-tiles/project-mark";

/**
 * Index C — Disclosure. The index reads as a quiet list until a row is
 * opened, and then that row becomes the card: its screen, its results, and
 * both ways in. One row is open at a time, and the first is open to begin
 * with, so the page never loads as a list of closed doors. It's native
 * `<details name>` — exclusive, keyboard-operable, and announced as
 * expandable without any script — and the open and close are animated only
 * where the browser can size to `auto`.
 */
export function IndexAccordion() {
  return (
    <div className={styles.root}>
      <div className="section-heading">
        <span>Case studies</span>
      </div>

      <div className={styles.list}>
        {labProjects.map((project, index) => (
          <details
            className={styles.item}
            key={project.id}
            name="lab-case-studies"
            open={index === 0}
          >
            <summary className={styles.summary}>
              <ProjectMark project={project} size={56} />
              <span className={styles.text}>
                <h3 className={styles.name}>{project.name}</h3>
                <span className={styles.tagline}>{project.tagline}</span>
              </span>
              <span className={styles.years}>{project.years}</span>
              <span aria-hidden="true" className={styles.toggle} />
            </summary>

            <div className={styles.panel}>
              <Link className={styles.cover} href={project.href} tabIndex={-1}>
                <Image
                  alt={project.cover.alt}
                  sizes="(max-width: 40rem) calc(100vw - 3rem), 676px"
                  src={project.cover.src}
                />
              </Link>

              <p className={styles.summaryText}>{project.summary}</p>

              <dl className={styles.stats}>
                {project.metrics.map((metric) => (
                  <div key={metric.value}>
                    <dt>{metric.value}</dt>
                    <dd>{metric.label}</dd>
                  </div>
                ))}
              </dl>

              <div className={styles.actions}>
                <Link className={cta.primary} href={project.href}>
                  Read the case study
                </Link>
                <Link className={cta.more} href={project.outcomesHref}>
                  See the results
                </Link>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
