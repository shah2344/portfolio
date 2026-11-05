"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeLogo } from "../character/home-logo";
import { CHARACTER_EVENT, type CharacterCommand } from "../character/motion";
import type {
  CharacterBreathing,
  CharacterPerformance,
  CharacterTreatment,
} from "../character/pose";
import { BaselineCharacter } from "./baseline";
import styles from "./character-lab.module.css";

const treatments: {
  value: CharacterTreatment;
  label: string;
  description: string;
}[] = [
  {
    value: "floating",
    label: "A · Floating",
    description: "The familiar face, with a curved surface and richer acting.",
  },
  {
    value: "outline",
    label: "B · Outlined",
    description: "A drawn head gives the features a tangible home.",
  },
  {
    value: "filled",
    label: "C · Softly filled",
    description: "A quiet neutral material adds presence and volume.",
  },
];
const breathings: {
  value: CharacterBreathing;
  label: string;
  description: string;
}[] = [
  {
    value: "lids",
    label: "1 · Lids",
    description: "Lids lift a hair on the inhale, pupils open slightly.",
  },
  {
    value: "mouth",
    label: "2 · Mouth",
    description: "Lips part softly on each exhale, then close.",
  },
  {
    value: "lift",
    label: "3 · Lift",
    description: "The chin rises and cheeks widen across the curved face.",
  },
  {
    value: "combined",
    label: "4 · Combined",
    description:
      "Lift leads; lids trail it slightly and lips part faintly on the exhale.",
  },
];
const performances: CharacterPerformance[] = [
  "greeting",
  "inspect",
  "doubleTake",
  "smirk",
  "nod",
  "wobble",
  "nap",
  "dizzy",
  "confused",
  "winded",
];
export function CharacterLab() {
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [dark, setDark] = useState(false),
    [status, setStatus] = useState(
      "Autonomous · same seed across the new treatments",
    );
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function send(command: CharacterCommand) {
    ref.current
      ?.querySelectorAll("[data-character-root]")
      .forEach((root) =>
        root.dispatchEvent(
          new CustomEvent(CHARACTER_EVENT, { detail: command }),
        ),
      );
  }
  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  function play(performance: CharacterPerformance) {
    clearTimers();
    send({ type: "play", performance, time: window.performance.now() });
    setStatus(performance.replace("doubleTake", "Double-take"));
  }
  function scenario(kind: "pointer" | "wake" | "theme") {
    clearTimers();
    send({
      type: "play",
      performance: kind === "wake" ? "nap" : "smirk",
      time: window.performance.now(),
    });
    setStatus(
      kind === "wake"
        ? "Nap → activation after 3 seconds"
        : kind === "theme"
          ? "Smirk → light adaptation"
          : "Smirk → pointer takeover",
    );
    timers.current.push(
      setTimeout(
        () => {
          if (kind === "wake")
            ref.current
              ?.querySelectorAll<HTMLButtonElement>("[data-character-play]")
              .forEach((button) => button.click());
          else if (kind === "theme")
            send({
              type: "appearance",
              dark: false,
              time: window.performance.now(),
            });
          else
            send({
              type: "gaze",
              point: { x: -0.8, y: 0.2 },
              time: window.performance.now(),
            });
        },
        kind === "wake" ? 3000 : 650,
      ),
    );
  }
  return (
    <main ref={ref} className={styles.lab} data-dark={dark}>
      <div className={styles.inner}>
        <Link href="/">← Homepage</Link>
        <header>
          <p className={styles.eyebrow}>Dot & pause / character study</p>
          <h1>A little more alive.</h1>
          <p>
            Compare the same performance at its real 44px size. The enlarged
            views expose the drawing and depth; the original keeps its previous
            behavior.
          </p>
        </header>
        <section
          className={styles.controls}
          aria-label="Character preview controls"
        >
          <div className={styles.row}>
            {performances.map((p) => (
              <button key={p} onClick={() => play(p)}>
                {p === "doubleTake" ? "Double-take" : p}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <button
              aria-pressed={paused}
              onClick={() => {
                clearTimers();
                setPaused(!paused);
                send({ type: "pause", value: !paused });
              }}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              aria-pressed={reduced}
              onClick={() => {
                setReduced(!reduced);
                send({ type: "reduce", value: !reduced });
              }}
            >
              Reduced motion
            </button>
            <button
              aria-pressed={dark}
              onClick={() => {
                setDark(!dark);
                send({
                  type: "appearance",
                  dark: !dark,
                  time: window.performance.now(),
                });
              }}
            >
              Dark background
            </button>
            <button
              onClick={() => {
                clearTimers();
                send({ type: "showcase", time: window.performance.now() });
                setStatus(
                  "60-second showcase · greeting, inspect, double-take, smirk, nod, wobble, nap, dizziness",
                );
              }}
            >
              60-second showcase
            </button>
            <button
              onClick={() => {
                clearTimers();
                send({ type: "reset" });
                setStatus("Autonomous · same seed across the new treatments");
              }}
            >
              Autonomous
            </button>
          </div>
          <div className={styles.row} aria-label="Gaze directions">
            {[
              { label: "Front", x: 0, y: 0 },
              { label: "Left", x: -1, y: 0 },
              { label: "Right", x: 1, y: 0 },
              { label: "Up", x: 0, y: -1 },
              { label: "Down", x: 0, y: 1 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  clearTimers();
                  send({
                    type: "gaze",
                    point: p,
                    time: window.performance.now(),
                  });
                  setStatus(`Held pose · ${p.label}`);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p role="status">
            {paused
              ? "Paused"
              : reduced
                ? "Static reduced-motion preview"
                : status}
          </p>
        </section>
        <section className={styles.grid} aria-label="Face treatments">
          <article className={styles.card}>
            <h2>Original</h2>
            <div className={styles.actual}>
              <BaselineCharacter paused={paused || reduced} />
            </div>
            <div className={styles.enlarged}>
              <BaselineCharacter paused={paused || reduced} />
            </div>
            <span className={styles.caption}>
              44px above · 4× inspection below
            </span>
            <p>
              Previous mouth, flat tilt, and original idle behavior. An
              independent baseline.
            </p>
          </article>
          {treatments.map((t) => (
            <article className={styles.card} key={t.value}>
              <h2>{t.label}</h2>
              <div className={styles.actual}>
                <HomeLogo preview treatment={t.value} seed={42} />
              </div>
              <div className={styles.enlarged}>
                <HomeLogo preview treatment={t.value} seed={42} />
              </div>
              <span className={styles.caption}>
                44px above · 4× inspection below
              </span>
              <p>{t.description}</p>
            </article>
          ))}
        </section>
        <section>
          <h2>Depth & mouth</h2>
          <p>
            Use the direction and performance controls above. Both comparisons
            use the same pose and clock.
          </p>
          <div className={styles.comparisons}>
            <article className={styles.card}>
              <h3>Flat plane</h3>
              <div className={styles.enlarged}>
                <HomeLogo preview flat treatment="outline" seed={42} />
              </div>
            </article>
            <article className={styles.card}>
              <h3>Curved surface</h3>
              <div className={styles.enlarged}>
                <HomeLogo preview treatment="outline" seed={42} />
              </div>
            </article>
            <article className={styles.card}>
              <h3>Coupled mouth</h3>
              <div className={`${styles.enlarged} ${styles.mouthOnly}`}>
                <HomeLogo preview oldMouth seed={42} />
              </div>
            </article>
            <article className={styles.card}>
              <h3>Independent corners</h3>
              <div className={`${styles.enlarged} ${styles.mouthOnly}`}>
                <HomeLogo preview seed={42} />
              </div>
            </article>
          </div>
        </section>
        <section>
          <h2>Breathing</h2>
          <p>
            Each adds a face breath on the body&apos;s 4.2-second rise and fall.
            Watch the 44px size first; the enlargement only shows how.
          </p>
          <div className={styles.comparisons}>
            {breathings.map((b) => (
              <article className={styles.card} key={b.value}>
                <h3>{b.label}</h3>
                <div className={styles.actual}>
                  <HomeLogo preview breathing={b.value} seed={42} />
                </div>
                <div className={styles.enlarged}>
                  <HomeLogo preview breathing={b.value} seed={42} />
                </div>
                <p>{b.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h2>Interruptions</h2>
          <p>
            Each scenario interrupts a running performance from its current
            pose.
          </p>
          <div className={styles.row}>
            <button onClick={() => scenario("pointer")}>
              Pointer takeover
            </button>
            <button onClick={() => scenario("wake")}>
              Wake with activation
            </button>
            <button onClick={() => scenario("theme")}>
              Theme during reaction
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
