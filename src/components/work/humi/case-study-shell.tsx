import type { CSSProperties, ReactNode } from "react";

import { entranceDelayMs } from "@/components/motion/entrance-timing";

import { CaseStudyClose } from "@/components/work/case-study-close";

/**
 * A case study as a page of its own, at the same level as the homepage rather
 * than a sheet over it. The document scrolls, not a container inside it, so a
 * phone's browser chrome can collapse and stay translucent over the story the
 * way it does over any other page.
 */
export function CaseStudyPage({
  children,
  closeLabel,
}: {
  children: ReactNode;
  closeLabel: string;
}) {
  return (
    <div
      className="case-study-page"
      style={
        {
          "--case-enter-lede-delay": `${entranceDelayMs(1)}ms`,
          "--case-enter-date-delay": `${entranceDelayMs(2)}ms`,
          "--case-enter-media-delay": `${entranceDelayMs(3)}ms`,
        } as CSSProperties
      }
    >
      {/*
       * Keeps the sticky brand and the close control legible over the story
       * scrolling beneath them: a blur that deepens toward the top edge, and
       * a fade into the page over it. The fade is painted as a gradient image with no
       * background colour, so Safari has no solid colour on the top edge to
       * extend into its status bar.
       */}
      <div aria-hidden="true" className="case-study-page__blur">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden="true" className="case-study-page__scrim" />
      <header className="case-study-page__toolbar">
        <CaseStudyClose label={closeLabel} />
      </header>

      {children}
    </div>
  );
}

export function HumiStoryCard({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <article className={`humi-story-card ${className}`.trim()} id={id}>
      {children}
    </article>
  );
}
