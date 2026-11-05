import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import type { CSSProperties } from "react";

import anydayLogo from "../../../../public/media/anyday/logo.png";
import batchLogo from "../../../../public/media/batch/logo-mark.svg";
import humiLogo from "../../../../public/media/humi/logo.svg";
import montranLogo from "../../../../public/media/montran/logo-mark.svg";

import { buildExperienceGroups } from "@/content/experience";

type RowStyle = CSSProperties & {
  "--home-enter-delay"?: string;
};

/** Companies enter newest first, each one following the last down the list. */
const ROW_ENTER_STAGGER_MS = 70;

/* The companies whose marks the repository actually carries. */
export const companyMarks: Record<
  string,
  { slug: string; src: StaticImageData }
> = {
  AnyDay: { slug: "anyday", src: anydayLogo },
  Batch: { slug: "batch", src: batchLogo },
  Humi: { slug: "humi", src: humiLogo },
  Montran: { slug: "montran", src: montranLogo },
};

/**
 * One row per company: its mark and name, then each role held there beside
 * the years it ran. Wide, the three read as columns; narrow, the company
 * heads its roles.
 */
export function ExperienceList() {
  return (
    <div
      className="home-experience"
      data-home-enter="idle"
      data-home-enter-kind="surface"
    >
      <ol className="experience-list">
        {buildExperienceGroups().map((group, index) => {
          const mark = companyMarks[group.company];
          return (
            <li
              className="experience-group"
              key={group.company + index}
              style={
                {
                  "--home-enter-delay": `${index * ROW_ENTER_STAGGER_MS}ms`,
                } as RowStyle
              }
            >
              <h3 className="experience-group__company">
                <SmoothSurface
                  as="span"
                  aria-hidden="true"
                  className={
                    mark
                      ? `experience-item__mark experience-item__mark--${mark.slug}`
                      : "experience-item__mark"
                  }
                >
                  {mark ? (
                    <Image alt="" sizes="28px" src={mark.src} />
                  ) : (
                    group.company.charAt(0)
                  )}
                </SmoothSurface>
                {group.company}
              </h3>
              <ol className="experience-group__roles">
                {group.roles.map((role) => (
                  <li className="experience-role" key={role.title}>
                    <span className="experience-role__title">{role.title}</span>
                    <time
                      className="experience-role__dates"
                      dateTime={role.dateTime}
                    >
                      {role.dateFrom}
                      {role.dateTo !== null && (
                        <>
                          {" \u2013 "}
                          <span
                            className={
                              role.ongoing ? "experience-role__now" : undefined
                            }
                          >
                            {role.dateTo}
                          </span>
                        </>
                      )}
                    </time>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
