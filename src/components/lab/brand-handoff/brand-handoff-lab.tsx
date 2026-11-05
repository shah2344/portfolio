"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HomeLogo } from "@/components/home/character/home-logo";
import { chosenBrandHandoff } from "@/components/motion/brand-turn";
import {
  BRAND_HANDOFF,
  BRAND_HANDOFF_KEY,
  BRAND_HANDOFF_LABELS,
  BRAND_HANDOFFS,
  brandHandoffPlan,
  type BrandHandoff,
} from "@/components/motion/brand-turn-motion";
import { SmoothSurface } from "@/components/ui/smooth-surface";
import anydayIconImage from "../../../../public/media/anyday/logo.png";
import styles from "./brand-handoff-lab.module.css";

type Face = "character" | "logo";

function Faces() {
  return (
    <>
      <span className={styles.face} data-face="character">
        <HomeLogo preview />
      </span>
      <span className={styles.face} data-face="logo">
        <SmoothSurface as="span" className="anyday-logo">
          <Image
            alt=""
            className="anyday-app-icon"
            height={44}
            src={anydayIconImage}
            unoptimized
            width={44}
          />
        </SmoothSurface>
      </span>
    </>
  );
}

function HandoffRow({
  style,
  active,
  onUse,
  players,
}: {
  style: BrandHandoff;
  active: boolean;
  onUse: () => void;
  players: Map<BrandHandoff, () => void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const showing = useRef<Face>("character");
  const running = useRef<Animation[]>([]);
  const [face, setFace] = useState<Face>("character");

  function play(to?: Face) {
    const row = ref.current;
    const target =
      to ?? (showing.current === "character" ? "logo" : "character");
    if (!row || target === showing.current) return;
    for (const animation of running.current) animation.cancel();
    const from = showing.current;
    showing.current = target;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      row.dataset.showing = target;
      setFace(target);
      return;
    }
    const plan = brandHandoffPlan(style, target === "logo" ? 1 : -1);
    const animations = [...row.querySelectorAll<HTMLElement>("[data-face]")]
      .map((element) => {
        const frames =
          element.dataset.face === from
            ? plan.outgoing
            : element.dataset.face === target
              ? plan.incoming
              : undefined;
        return frames?.length
          ? element.animate(frames, {
              duration: plan.duration,
              easing: "linear",
              fill: "both",
            })
          : undefined;
      })
      .filter((animation): animation is Animation => Boolean(animation));
    running.current = animations;
    row.dataset.to = target;
    row.dataset.animating = "true";
    void Promise.allSettled(animations.map((a) => a.finished)).then(() => {
      if (running.current !== animations) return;
      // Set synchronously: waiting for React's render showed the old face for a frame.
      row.dataset.showing = target;
      setFace(target);
      delete row.dataset.animating;
      for (const animation of animations) animation.cancel();
      running.current = [];
    });
  }

  // The shared controls advance every row by one step.
  useEffect(() => {
    players.set(style, () => play());
    return () => void players.delete(style);
  });

  const { name, note } = BRAND_HANDOFF_LABELS[style];
  const { duration } = brandHandoffPlan(style, 1);
  return (
    <article className={styles.card} data-active={active || undefined}>
      <header>
        <h2>
          {name}
          {style === BRAND_HANDOFF && (
            <span className={styles.tag}>default</span>
          )}
          {active && <span className={styles.tag}>on site</span>}
        </h2>
        <p>{note}</p>
        <p className={styles.caption}>{duration}ms</p>
      </header>
      <div
        ref={ref}
        className={styles.stages}
        data-handoff={style}
        data-showing={face}
      >
        <div className={styles.actual}>
          <span className={styles.frame}>
            <Faces />
          </span>
        </div>
        <div className={styles.enlarged}>
          <span className={styles.frame}>
            <Faces />
          </span>
        </div>
      </div>
      <div className={styles.row}>
        <button type="button" onClick={() => play("logo")}>
          To case study
        </button>
        <button type="button" onClick={() => play("character")}>
          Back home
        </button>
        <button type="button" aria-pressed={active} onClick={onUse}>
          {active ? "Used on site" : "Use on site"}
        </button>
      </div>
    </article>
  );
}

const CHOICE_EVENT = "brand-handoff-choice";
function subscribeToChoice(onChange: () => void) {
  window.addEventListener(CHOICE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHOICE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function BrandHandoffLab() {
  const chosen = useSyncExternalStore(
    subscribeToChoice,
    chosenBrandHandoff,
    () => BRAND_HANDOFF,
  );
  const [players] = useState(() => new Map<BrandHandoff, () => void>());
  const [looping, setLooping] = useState(false);
  const playAll = () => players.forEach((play) => play());

  useEffect(() => {
    if (!looping) return;
    playAll();
    const timer = window.setInterval(playAll, 1400);
    return () => window.clearInterval(timer);
  });

  function use(style: BrandHandoff) {
    try {
      if (style === BRAND_HANDOFF)
        window.localStorage.removeItem(BRAND_HANDOFF_KEY);
      else window.localStorage.setItem(BRAND_HANDOFF_KEY, style);
    } catch {}
    window.dispatchEvent(new Event(CHOICE_EVENT));
  }

  return (
    <main className={styles.lab}>
      <div className={styles.inner}>
        <Link href="/">Home</Link>
        <header>
          <p className={styles.eyebrow}>Lab · brand handoff</p>
          <h1>Character to case-study mark</h1>
          <p>
            Each row runs the handoff the site plays when the home character
            becomes a case study&apos;s mark, at actual size and enlarged.
            &ldquo;Use on site&rdquo; stores the choice in this browser, so real
            navigation between home and AnyDay uses it.
          </p>
        </header>
        <div className={styles.row}>
          <button type="button" onClick={playAll}>
            Play all
          </button>
          <button
            type="button"
            aria-pressed={looping}
            onClick={() => setLooping((value) => !value)}
          >
            {looping ? "Stop loop" : "Loop all"}
          </button>
        </div>
        <div className={styles.grid}>
          {BRAND_HANDOFFS.map((style) => (
            <HandoffRow
              key={style}
              style={style}
              active={chosen === style}
              onUse={() => use(style)}
              players={players}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
