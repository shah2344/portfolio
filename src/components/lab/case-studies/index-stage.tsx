import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import chevronIcon from "remixicon/icons/Arrows/arrow-right-s-line.svg";

import { labProjects } from "./data";
import { IndexStageFrame } from "./index-stage-client";
import styles from "./index-stage.module.css";
import { ProjectMark } from "@/components/home/case-study-tiles/project-mark";
import { RemixIcon } from "@/components/ui/remix-icon";

/**
 * Index A — Stage. The index as a pair: one large screen above, and beneath
 * it rows drawn exactly like the Experience list further down the page — the
 * same 56px brand tile, the same inset hairline, the same type. Moving along
 * the rows changes what's on stage, like a Finder column with its preview.
 * On touch there is nothing to hover, so each row carries its own screen.
 */
export function IndexStage() {
  return (
    <div className={styles.root}>
      <div className="section-heading">
        <span>Case studies</span>
      </div>

      <IndexStageFrame
        className={styles.frame}
        slides={labProjects.map((project) => (
          <div
            className={styles.slide}
            key={project.id}
            style={{ "--paper": project.paper } as CSSProperties}
          >
            <Image
              alt=""
              sizes="(max-width: 40rem) 100vw, 676px"
              src={project.cover.src}
            />
            <p className={styles.caption}>
              <ProjectMark project={project} size={24} />
              {project.name}
              <span>{project.role}</span>
            </p>
          </div>
        ))}
        stageClassName={styles.stage}
      >
        <ol className={styles.list}>
          {labProjects.map((project, index) => (
            <li className={styles.item} data-index={index} key={project.id}>
              <Link className={styles.row} href={project.href}>
                <ProjectMark project={project} size={56} />
                <span className={styles.text}>
                  <h3 className={styles.name}>{project.name}</h3>
                  <span className={styles.tagline}>{project.tagline}</span>
                </span>
                <span className={styles.years}>{project.years}</span>
                <RemixIcon className={styles.chevron} icon={chevronIcon} />
              </Link>
              <Image
                alt={project.cover.alt}
                className={styles.thumb}
                sizes="calc(100vw - 3rem)"
                src={project.cover.src}
              />
            </li>
          ))}
        </ol>
      </IndexStageFrame>
    </div>
  );
}
