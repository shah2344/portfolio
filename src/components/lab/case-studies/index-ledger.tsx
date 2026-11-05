import Image from "next/image";
import Link from "next/link";

import cta from "./cta.module.css";
import { labProjects } from "./data";
import styles from "./index-ledger.module.css";
import { IndexPreview } from "./v1-index-preview";

/**
 * Index B — Ledger. The first Index, re-set as headlines: each row is one
 * two-tone sentence — the name in ink, what it did in grey — at section
 * headline size, with the credits above it and the
 * proof below. The screen still surfaces under the cursor, now as a squircle
 * that grows out of the pointer instead of a tilted card.
 */
export function IndexLedger() {
  return (
    <div className={styles.root}>
      <div className="section-heading">
        <span>Case studies</span>
      </div>

      <IndexPreview
        className={styles.frame}
        layerClassName={styles.layer}
        previews={labProjects.map((project) => (
          <Image
            alt=""
            key={project.id}
            sizes="340px"
            src={project.cover.src}
          />
        ))}
      >
        <ol className={styles.list}>
          {labProjects.map((project, index) => {
            const [proof] = project.metrics;

            return (
              <li className={styles.item} data-index={index} key={project.id}>
                <Link className={styles.row} href={project.href}>
                  <span className={styles.meta}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {project.sector}
                    <span aria-hidden="true">·</span>
                    {project.years}
                  </span>
                  <h3 className={styles.headline}>
                    {project.name}.{" "}
                    <span className={styles.quiet}>{project.tagline}.</span>
                  </h3>
                  <span className={styles.proof}>
                    <strong>{proof.value}</strong> {proof.label}.
                  </span>
                  <span className={`${cta.more} ${styles.more}`}>
                    Read the case study
                  </span>
                </Link>
                <Image
                  alt={project.cover.alt}
                  className={styles.thumb}
                  sizes="calc(100vw - 3rem)"
                  src={project.cover.src}
                />
              </li>
            );
          })}
        </ol>
      </IndexPreview>
    </div>
  );
}
