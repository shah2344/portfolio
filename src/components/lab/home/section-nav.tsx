"use client";

import { useEffect, useState } from "react";

import styles from "./variants.module.css";

/**
 * The pinned column's contents list. The section whose heading has passed
 * the upper third of the window is marked as the one being read; at the foot
 * of the page the last section wins, since it may never reach that line.
 */
export function SectionNav({
  sections,
}: {
  sections: readonly (readonly [id: string, label: string])[];
}) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      let found: string | null = null;
      for (const [id] of sections) {
        const heading = document.getElementById(id);
        if (heading && heading.getBoundingClientRect().top <= line) found = id;
      }
      setCurrent(atEnd ? (sections.at(-1)?.[0] ?? found) : found);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sections]);

  return (
    <nav aria-label="Sections" className={styles.pinnedNav}>
      <ol>
        {sections.map(([id, label]) => (
          <li key={id}>
            <a
              aria-current={current === id ? "location" : undefined}
              href={`#${id}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
