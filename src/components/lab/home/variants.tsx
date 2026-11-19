import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CaseStudyTiles } from "@/components/home/case-study-tiles/case-study-tiles";
import { projects } from "@/components/home/home-content";
import { SmoothSurface } from "@/components/ui/smooth-surface";
import { buildExperienceGroups } from "@/content/experience";

import { EMAIL, feed, figures, work, type LabFeedItem } from "./data";
import { FilteredFeed } from "./filtered-feed";
import { HostStage } from "./host-stage";
import { LocalTime } from "./local-time";
import { SectionNav } from "./section-nav";
import {
  Character,
  Contact,
  ExperienceRows,
  FeedTile,
  Heading,
  Intro,
  Links,
  Mark,
  RoleDates,
  WorkCard,
} from "./parts";
import base from "./home-lab.module.css";
import styles from "./variants.module.css";

/* --- Sections the studies share when they leave one alone ---------------- */

function WorkSection({ children }: { children?: ReactNode }) {
  return (
    <section aria-labelledby="work" className={base.section}>
      <Heading id="work">Selected work</Heading>
      {children ?? (
        <div className={base.cards}>
          {work.map((project) => (
            <WorkCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

function ExperienceSection() {
  return (
    <section aria-labelledby="experience" className={base.section}>
      <Heading id="experience">Experience</Heading>
      <ExperienceRows />
    </section>
  );
}

function FeedSection({ items = feed }: { items?: readonly LabFeedItem[] }) {
  return (
    <section aria-labelledby="feed" className={base.section}>
      <Heading id="feed">Feed</Heading>
      <div className={base.feed}>
        {items.map((item) => (
          <FeedTile item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function Rest() {
  return (
    <>
      <WorkSection />
      <ExperienceSection />
      <FeedSection />
      <Contact />
    </>
  );
}

/* --- 01 Headline first ---------------------------------------------------- */

export function Headline() {
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <Character />
        <div className={styles.headline}>
          <h1>Muhammad Shahid</h1>
          <p className={styles.headlineLead}>
            I design fintech and HR products that hundreds of thousands of
            people use.
          </p>
          <p className={styles.headlineSupport}>
            Product designer in Toronto, seven years in. I&rsquo;m a generalist
            with a passion for coherence, now exploring AI and design systems at{" "}
            <span className={base.ink}>Montran</span>.
          </p>
        </div>
        <Links />
      </header>
      <Rest />
    </main>
  );
}

/* --- 02 Fact rail ---------------------------------------------------------- */

const facts = [
  ["Now", "Design Consultant, Montran"],
  ["Based", "Toronto"],
  ["Focus", "Fintech, HR tech, design systems"],
  ["Experience", "7 years"],
  ["Open to", "New roles and collaborations"],
] as const;

export function FactRail() {
  return (
    <main className={base.main}>
      <header className={`${base.masthead} ${styles.rail}`}>
        <Character />
        <h1 className="sr-only">Muhammad Shahid</h1>
        <Intro />
        <dl className={styles.railFacts}>
          {facts.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Links />
      </header>
      <Rest />
    </main>
  );
}

/* --- 03 Pinned identity ---------------------------------------------------- */

const pinnedSections = [
  ["work", "Selected work"],
  ["experience", "Experience"],
  ["feed", "Feed"],
] as const;

export function Pinned() {
  return (
    <div className={styles.pinned}>
      <header className={styles.pinnedAside}>
        <div className={styles.pinnedTop}>
          <Character />
          <h1>Muhammad Shahid</h1>
          <p>
            I&rsquo;m <span className={base.ink}>Muhammad</span>, a product
            designer from Toronto, currently exploring AI and design systems at{" "}
            <span className={base.ink}>Montran</span>.
          </p>
          <p>
            I&rsquo;ve spent the last 7 years designing fintech and HR tech
            products used by hundreds of thousands of people. I&rsquo;m a
            generalist with a passion for coherence.
          </p>
          <Links className={styles.pinnedLinks} />
        </div>
        <SectionNav sections={pinnedSections} />
      </header>
      <main className={styles.pinnedMain}>
        <WorkSection>
          <CaseStudyTiles projects={projects} />
        </WorkSection>
        <ExperienceSection />
        <section aria-labelledby="feed" className={base.section}>
          <FilteredFeed
            className={base.feed}
            heading={<Heading id="feed">Feed</Heading>}
          >
            {feed.map((item) => (
              <FeedTile item={item} key={item.id} />
            ))}
          </FilteredFeed>
        </section>
      </main>
    </div>
  );
}

/* --- 04 Character as host -------------------------------------------------- */

/**
 * iMessage's pointer: the left edge runs on past the corner and curls down
 * to a point just below the bubble. The top of the box hides under the body.
 */
function Tail() {
  return (
    <svg
      aria-hidden="true"
      className={styles.tail}
      fill="currentColor"
      viewBox="0 0 40 42"
    >
      <path d="M0 0h40v28h-6c-10 1-16 5-20 13C6 38 0 30 0 18Z" />
    </svg>
  );
}

/**
 * One bubble from the character. Rendered unread; `HostStage` types and
 * delivers it when it is reached. The body is a Lisse surface, so the tail
 * sits outside its clip.
 */
function Message({
  as: Tag = "p",
  id,
  tail = true,
  children,
}: {
  as?: "p" | "h2";
  id?: string;
  tail?: boolean;
  children: ReactNode;
}) {
  return (
    <Tag className={styles.bubble} data-message="" data-state="unread" id={id}>
      <SmoothSurface as="span" className={styles.bubbleBody}>
        <span className={styles.bubbleText}>{children}</span>
        <span aria-hidden="true" className={styles.typing}>
          <i />
          <i />
          <i />
        </span>
      </SmoothSurface>
      {tail && <Tail />}
    </Tag>
  );
}

export function Host() {
  return (
    <HostStage className={styles.host}>
      <div className={styles.hostTrack}>
        <div className={styles.hostFigure} data-figure="">
          <Character className={styles.hostCharacter} />
        </div>
      </div>
      <main className={styles.hostMain}>
        <header className={styles.hostIntro}>
          <h1 className="sr-only">Muhammad Shahid</h1>
          <div className={styles.thread}>
            <Message tail={false}>
              Hi, I&rsquo;m <span className={base.ink}>Muhammad</span>.
              I&rsquo;m a product designer from Toronto, exploring AI and design
              systems at <span className={base.ink}>Montran</span>.
            </Message>
            <Message>
              Seven years of fintech and HR tech, used by hundreds of thousands
              of people.
            </Message>
          </div>
          <div
            className={styles.hostLinks}
            data-attachment=""
            data-message=""
            data-state="unread"
          >
            <Links />
          </div>
        </header>

        <section aria-labelledby="work" className={base.section}>
          <Message as="h2" id="work">
            Start with these two.
          </Message>
          <div className={base.cards}>
            {work.map((project) => (
              <WorkCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        <section aria-labelledby="experience" className={base.section}>
          <Message as="h2" id="experience">
            Here&rsquo;s where I&rsquo;ve worked.
          </Message>
          <ExperienceRows />
        </section>

        <section aria-labelledby="feed" className={base.section}>
          <Message as="h2" id="feed">
            And the smaller things I&rsquo;ve made along the way.
          </Message>
          <div className={base.feed}>
            {feed.map((item) => (
              <FeedTile item={item} key={item.id} />
            ))}
          </div>
        </section>

        <section className={base.section}>
          <Message>
            Say hello at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </Message>
        </section>
      </main>
    </HostStage>
  );
}

/* --- 05 The sentence is the index ------------------------------------------ */

function Ref({
  href,
  children,
  title,
  sub,
  image,
}: {
  href: string;
  children: ReactNode;
  title: string;
  sub: string;
  image?: LabFeedItem["image"];
}) {
  return (
    <Link className={styles.ref} href={href}>
      {children}
      <span aria-hidden="true" className={styles.peek}>
        {image && (
          <span className={styles.peekMedia}>
            <Image alt="" fill sizes="260px" src={image} />
          </span>
        )}
        <span className={styles.peekTitle}>{title}</span>
        <span className={styles.peekSub}>{sub}</span>
      </span>
    </Link>
  );
}

export function SentenceIndex() {
  const [anyday, humi] = work;
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <Character />
        <h1 className="sr-only">Muhammad Shahid</h1>
        <div className={styles.sentence}>
          <p>
            I&rsquo;m Muhammad, a product designer from Toronto, currently
            exploring AI and design systems at{" "}
            <Ref
              href="#experience"
              sub="Design Consultant · since April"
              title="Montran"
            >
              Montran
            </Ref>
            .
          </p>
          <p>
            I&rsquo;ve spent the last{" "}
            <Ref
              href="#experience"
              sub="Humi, Batch, AnyDay, Montran"
              title="Four companies since 2018"
            >
              7 years
            </Ref>{" "}
            designing{" "}
            <Ref
              href={anyday.href}
              image={anyday.image}
              sub={anyday.tagline}
              title="AnyDay · case study"
            >
              fintech
            </Ref>{" "}
            and{" "}
            <Ref
              href={humi.href}
              image={humi.image}
              sub={humi.tagline}
              title="Humi · case study"
            >
              HR tech
            </Ref>{" "}
            products used by hundreds of thousands of people. I&rsquo;m a{" "}
            <Ref
              href="#feed"
              image={feed[3]?.image}
              sub="Mobile, web and motion, 2020 to 2026"
              title={`${feed.length} pieces in the feed`}
            >
              generalist
            </Ref>{" "}
            with a passion for coherence.
          </p>
        </div>
        <Links />
      </header>
      <Rest />
    </main>
  );
}

/* --- 06 Numbers band ------------------------------------------------------- */

export function Numbers() {
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <Character />
        <h1 className="sr-only">Muhammad Shahid</h1>
        <Intro />
        <Links />
      </header>
      <section aria-label="Results" className={styles.band}>
        {figures.map((figure) => (
          <Link className={styles.figure} href={figure.href} key={figure.label}>
            <span className={styles.figureValue}>
              {figure.value}
              {figure.unit && <small>{figure.unit}</small>}
            </span>
            <span className={styles.figureLabel}>{figure.label}</span>
            {figure.company && (
              <span className={styles.figureSource}>
                <Mark company={figure.company} size={18} />
                {figure.company}
              </span>
            )}
          </Link>
        ))}
      </section>
      <Rest />
    </main>
  );
}

/* --- 07 Tiles that carry the pitch ----------------------------------------- */

export function PitchTiles() {
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <Character />
        <h1 className="sr-only">Muhammad Shahid</h1>
        <Intro />
        <Links />
      </header>
      <WorkSection>
        <div className={styles.pitch}>
          {work.map((project) => (
            <article className={styles.pitchItem} key={project.id}>
              <WorkCard project={project} />
              <div className={styles.pitchMeta}>
                <p>
                  <span className={base.ink}>{project.role}</span>
                  <span className={styles.pitchYears}>{project.years}</span>
                </p>
                <p>{project.outcome}</p>
              </div>
            </article>
          ))}
          <div className={styles.now}>
            <Mark company="Montran" size={44} />
            <p>
              <span className={base.ink}>AI and design systems at Montran</span>
              <span>Design Consultant since April. Nothing public yet.</span>
            </p>
            <span className={styles.nowTag}>Now</span>
          </div>
        </div>
      </WorkSection>
      <ExperienceSection />
      <FeedSection />
      <Contact />
    </main>
  );
}

/* --- 08 Feed as a contact sheet -------------------------------------------- */

const filters = [
  ["all", "All"],
  ["mobile", "Mobile"],
  ["web", "Web"],
  ["motion", "Motion"],
] as const;

export function ContactSheet() {
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <Character />
        <h1 className="sr-only">Muhammad Shahid</h1>
        <Intro />
        <Links />
      </header>
      <WorkSection />
      <ExperienceSection />
      <section
        aria-labelledby="feed"
        className={`${base.section} ${styles.sheet}`}
      >
        <div className={styles.sheetHead}>
          <Heading id="feed">Feed</Heading>
          <fieldset className={styles.filters}>
            <legend className="sr-only">Show</legend>
            {filters.map(([value, label]) => (
              <label key={value}>
                <input
                  defaultChecked={value === "all"}
                  name="feed-filter"
                  type="radio"
                  value={value}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className={styles.sheetGrid}>
          {feed.map((item) => (
            <FeedTile
              item={item}
              key={item.id}
              sizes="(max-width: 780px) 50vw, 360px"
            />
          ))}
        </div>
      </section>
      <Contact />
    </main>
  );
}

/* --- 09 Career spine ------------------------------------------------------- */

const spineNotes: Record<string, string> = {
  Montran: "AI and design systems. Nothing public yet.",
};

function Strip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      aria-label={label}
      className={styles.strip}
      role="region"
      // Scrollable regions need to take focus for the arrow keys to reach them.
      tabIndex={0}
    >
      {children}
    </div>
  );
}

function StudyCard({ company }: { company: string }) {
  const project = work.find(({ name }) => name === company);
  if (!project) return null;
  return (
    <Link className={styles.study} data-tone={project.tone} href={project.href}>
      <span className={styles.studyMedia}>
        <Image alt="" fill sizes="280px" src={project.image} />
      </span>
      <span className={styles.studyLabel}>Case study</span>
      <span className={styles.studyTitle}>{project.tagline}</span>
    </Link>
  );
}

export function Spine() {
  const groups = buildExperienceGroups();
  const elsewhere = feed.filter(({ company }) => company === null);
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <Character />
        <h1 className="sr-only">Muhammad Shahid</h1>
        <Intro />
        <Links />
      </header>
      <section aria-labelledby="experience" className={base.section}>
        <Heading id="experience">Work, by where I made it</Heading>
        <ol className={styles.spine}>
          {groups.map((group, index) => {
            const pieces = feed.filter(
              ({ company }) => company === group.company,
            );
            const hasStudy = work.some(({ name }) => name === group.company);
            const count = pieces.length + (hasStudy ? 1 : 0);
            return (
              <li key={group.company + index}>
                <details open={group.company === "AnyDay"}>
                  <summary>
                    <Mark company={group.company} />
                    <span className={styles.spineCompany}>{group.company}</span>
                    <span className={styles.spineRoles}>
                      {group.roles.map((role) => (
                        <span key={role.title}>
                          {role.title}
                          <RoleDates role={role} />
                        </span>
                      ))}
                    </span>
                    <span className={styles.spineCount}>
                      {count > 0 ? count : ""}
                    </span>
                  </summary>
                  {count > 0 ? (
                    <Strip label={`Work from ${group.company}`}>
                      <StudyCard company={group.company} />
                      {pieces.map((item) => (
                        <FeedTile item={item} key={item.id} sizes="280px" />
                      ))}
                    </Strip>
                  ) : (
                    <p className={styles.spineNote}>
                      {spineNotes[group.company] ?? "Nothing to show here."}
                    </p>
                  )}
                </details>
              </li>
            );
          })}
          <li>
            <details>
              <summary>
                <span aria-hidden="true" className={styles.spinePlus}>
                  +
                </span>
                <span className={styles.spineCompany}>Elsewhere</span>
                <span className={styles.spineRoles}>
                  <span>
                    {elsewhere.map(({ source }) => source).join(", ")}
                  </span>
                </span>
                <span className={styles.spineCount}>{elsewhere.length}</span>
              </summary>
              <Strip label="Work made elsewhere">
                {elsewhere.map((item) => (
                  <FeedTile item={item} key={item.id} sizes="280px" />
                ))}
              </Strip>
            </details>
          </li>
        </ol>
      </section>
      <Contact />
    </main>
  );
}

/* --- 10 Say what you want -------------------------------------------------- */

const fit = [
  ["Role", "Senior product design"],
  ["Where", "Toronto. I've worked remote, hybrid and in person."],
  ["Focus", "Fintech, HR tech, design systems"],
] as const;

export function Status() {
  return (
    <main className={base.main}>
      <header className={base.masthead}>
        <div className={styles.statusBar}>
          <Character />
          <p className={styles.status}>
            <span aria-hidden="true" className={styles.statusDot} />
            Open to new roles
            <span className={styles.statusTime}>
              <LocalTime fallback="Toronto" />
            </span>
          </p>
        </div>
        <h1 className="sr-only">Muhammad Shahid</h1>
        <Intro />
        <div className={styles.actions}>
          <a className={styles.primary} href={`mailto:${EMAIL}`}>
            Email me
          </a>
          <a
            className={styles.secondary}
            href="/Muhammad-Shahid-Resume.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            Resume (PDF)
          </a>
          <Links className={styles.actionLinks} only={["Dribbble", "GitHub"]} />
        </div>
        <dl className={styles.fit}>
          {fit.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </header>
      <Rest />
    </main>
  );
}
