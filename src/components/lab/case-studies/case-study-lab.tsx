import type { ReactNode } from "react";

import { CinemaHighlights } from "./cinema-highlights";
import { IndexAccordion } from "./index-accordion";
import { IndexLedger } from "./index-ledger";
import { IndexStage } from "./index-stage";
import styles from "./lab.module.css";

type Variation = {
  id: string;
  code: string;
  name: string;
  idea: string;
  /** "column" is wrapped in the homepage's 724px column by the lab; "self"
   *  variations set their own width, so the lab adds no second gutter. */
  width: "column" | "self";
  render: () => ReactNode;
};

type Group = {
  id: string;
  title: string;
  note: string;
  variations: readonly Variation[];
};

const groups: readonly Group[] = [
  {
    id: "cinema",
    title: "Cinema",
    note: "C1 Keynote is now on the homepage. C3 stays here for comparison.",
    variations: [
      {
        id: "cinema-highlights",
        code: "C3",
        name: "Highlights",
        idea: "Feature cards, one per project, side by side under a two-tone headline. Humi's illustration is centred on the card's floor.",
        width: "self",
        render: () => <CinemaHighlights />,
      },
    ],
  },
  {
    id: "index",
    title: "Index",
    note: "Round two, unchanged. The rows borrow the Experience list's brand tiles, hairlines, and 17/15px type.",
    variations: [
      {
        id: "index-stage",
        code: "I1",
        name: "Stage",
        idea: "One large screen above rows drawn like the Experience list. Moving along the rows changes what's on stage.",
        width: "column",
        render: () => <IndexStage />,
      },
      {
        id: "index-ledger",
        code: "I2",
        name: "Ledger",
        idea: "Each row is one two-tone sentence at section-headline size: the name in ink, what it did in grey. The screen grows out of the cursor.",
        width: "column",
        render: () => <IndexLedger />,
      },
      {
        id: "index-disclosure",
        code: "I3",
        name: "Disclosure",
        idea: "A quiet list until a row opens into the full card: screen, results, both calls to action. One open at a time, native and script-free.",
        width: "column",
        render: () => <IndexAccordion />,
      },
    ],
  },
];

export function CaseStudyLab() {
  return (
    <div className={`editorial-page ${styles.page}`}>
      <header className={styles.masthead}>
        <p className={styles.kicker}>
          Lab · round three · not linked from the site
        </p>
        <h1>Cinema and Index, refined</h1>
        <p className={styles.lede}>
          Three takes on each direction, set in a display type scale and built
          from the portfolio&rsquo;s own parts: the brand tiles and hairlines
          from Experience, the squircle corner, Inter at 590 and 510, and the
          site&rsquo;s blue. Each is self-contained, so the winner can move onto
          the homepage and this folder can go.
        </p>
        <nav aria-label="Variations" className={styles.nav}>
          {groups.flatMap((group) =>
            group.variations.map((variation) => (
              <a href={`#${variation.id}`} key={variation.id}>
                <span>{variation.code}</span>
                {variation.name}
              </a>
            )),
          )}
        </nav>
      </header>

      {groups.map((group) => (
        <div className={styles.group} id={group.id} key={group.id}>
          <header className={styles.groupHeader}>
            <h2>{group.title}</h2>
            <p>{group.note}</p>
          </header>

          {group.variations.map((variation) => (
            <section
              aria-labelledby={`${variation.id}-title`}
              className={styles.variation}
              id={variation.id}
              key={variation.id}
            >
              <header className={styles.label}>
                <p className={styles.number}>{variation.code}</p>
                <div>
                  <h3 id={`${variation.id}-title`}>{variation.name}</h3>
                  <p>{variation.idea}</p>
                </div>
              </header>

              <div
                className={
                  variation.width === "column" ? styles.column : styles.wide
                }
              >
                {variation.render()}
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
