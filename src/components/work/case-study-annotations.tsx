import { strokePath } from "drawesome";
import type { Point } from "drawesome";
import type { CSSProperties } from "react";

/*
 * The board the marks are drawn on: the natural 2:1 of the screen exports, so
 * the overlay and the pixels underneath share one coordinate space and the
 * whole thing scales with the frame. Marks are authored as fractions of the
 * frame and multiplied up, so a coordinate can be read off a screenshot at any
 * size.
 */
const BOARD = { w: 2000, h: 1000 };

/* Pen width in board units. At the 800px media column this lands near 3px. */
const PEN_SIZE = 5.5;

/*
 * The brush takes its width from how fast the pen was moving, so a stroke is
 * shaped by where its points bunch up rather than by any width we set: dense
 * sampling reads as a slow, loaded start, sparse sampling as the flick at the
 * end. Every mark below is sampled unevenly for that reason.
 */
const PEN = "brush" as const;

/* A taper keeps every brush stroke from ending like a plotted vector. */
const SHAPE = { taper: 38, simulatePressure: true };

/** The point in the screen the handwritten note is calling out. */
type Mark = {
  /** The target's horizontal position and vertical span, as frame fractions. */
  x: number;
  y: number;
  h: number;
  /** Which side the handwritten note sits on. */
  side?: "left" | "right";
  /** Optional horizontal direction at the arrowhead. */
  arrowDirection?: "left" | "right";
  /** Match the angle of a rotated screen, in degrees. */
  tilt?: number;
  /** Use the earlier screen-edge spine and chevron instead of a leader arrow. */
  shape?: "arrow" | "chevron";
};

export type CaseStudyAnnotation = {
  /** What the note is about, marked on the screen. */
  mark: Mark;
  /** Frame-relative note placement; optional y moves the note vertically. */
  note: { x: number; y?: number; w: number; tilt?: number; shiftX?: number };
  /**
   * What is wrong, in the voice of someone reading over your shoulder. Only
   * the problem: the Solution section below answers these, and a margin note
   * that argues both sides is no longer a note.
   */
  text: string;
};

/** Board coordinates from frame fractions. */
const bx = (x: number) => x * BOARD.w;
const by = (y: number) => y * BOARD.h;

/**
 * Deterministic jitter. A mark that is drawn twice at the same place should
 * come out the same both times — the alternative is a screenshot that shifts
 * under you between builds — so the wobble is a function of position, not a
 * random number.
 */
const jitter = (n: number, phase: number) =>
  Math.sin(n * 12.9898 + phase * 78.233) * 0.5;

const ARROW_HEAD_LENGTH = 26;
/** Half the opening of the head, in radians: a little under 30°. */
const ARROW_HEAD_SPREAD = 0.5;
const CHEVRON_PEN_SIZE = 7;
const CHEVRON_SHAPE = { taper: 26, simulatePressure: true };
const CHEVRON_REACH = 15;
const CHEVRON_RUN = 20;

/** The earlier Humi mark: a screen-edge spine with a chevron toward its note. */
function chevronStroke({ x, y, h, side = "right" }: Mark): Point[] {
  const x0 = bx(x);
  const top = by(y);
  const height = by(h);
  const middle = top + height / 2;
  const reach = side === "right" ? CHEVRON_REACH : -CHEVRON_REACH;
  const points: Point[] = [];
  const push = (px: number, py: number) =>
    points.push([px + jitter(py, 2) * 0.7, py + jitter(px, 3) * 0.7, 0.5]);

  const run = (
    from: number,
    to: number,
    steps: number,
    slowAt: "end" | "start",
  ) => {
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const eased = slowAt === "end" ? 1 - (1 - t) ** 1.5 : t ** 1.5;
      push(x0, from + (to - from) * eased);
    }
  };

  run(top, middle - CHEVRON_RUN, 9, "end");
  push(x0 + reach * 0.55, middle - CHEVRON_RUN * 0.45);
  push(x0 + reach, middle);
  push(x0 + reach * 0.55, middle + CHEVRON_RUN * 0.45);
  run(middle + CHEVRON_RUN, top + height, 9, "start");
  return points;
}

type Vec = { x: number; y: number };

/** Gap between the writing and the start of its leader, in board units. */
const NOTE_GAP = 18;
/** Roughly half a line of the hand: where a leader leaves from under a note. */
const NOTE_HALF_LINE = 34;

const cubicAt = (p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec => {
  const u = 1 - t;
  return {
    x:
      u ** 3 * p0.x +
      3 * u ** 2 * t * p1.x +
      3 * u * t ** 2 * p2.x +
      t ** 3 * p3.x,
    y:
      u ** 3 * p0.y +
      3 * u ** 2 * t * p1.y +
      3 * u * t ** 2 * p2.y +
      t ** 3 * p3.y,
  };
};

/**
 * A leader from the writing to its mark: one unbroken arc and an open head.
 *
 * The leader leaves from wherever the writing faces its target — the end of
 * the line when the mark is beside it, under or over the words when the mark is
 * mostly below or above — so it always reads as coming out of the note. A mark
 * with `arrowDirection` is approached from that side, so the leader swings out
 * past it and hooks back in.
 */
function handDrawnArrow({ mark, note }: CaseStudyAnnotation) {
  const target = { x: bx(mark.x), y: by(mark.y + mark.h / 2) };
  const noteY = by(note.y ?? mark.y + mark.h / 2);
  const noteLeft = bx(note.x);
  const noteRight = bx(note.x + note.w);
  const toward = target.x >= (noteLeft + noteRight) / 2 ? 1 : -1;
  const sideGap = toward > 0 ? target.x - noteRight : noteLeft - target.x;
  const drop = target.y - noteY;
  const fromSide =
    mark.arrowDirection !== undefined || sideGap >= Math.abs(drop) * 0.8;

  const start = fromSide
    ? { x: (toward > 0 ? noteRight : noteLeft) + toward * NOTE_GAP, y: noteY }
    : {
        x: Math.min(Math.max(target.x, noteLeft + 30), noteRight - 30),
        y: noteY + Math.sign(drop) * NOTE_HALF_LINE,
      };

  let tip: Vec = target;
  let c1: Vec;
  let c2: Vec;
  if (mark.arrowDirection) {
    const heading = mark.arrowDirection === "left" ? -1 : 1;
    tip = { x: target.x + heading * 16, y: target.y };
    const reach = Math.min(110, Math.max(50, Math.abs(tip.y - start.y) * 0.45));
    c1 = { x: start.x + toward * reach, y: start.y };
    c2 = { x: tip.x - heading * reach, y: tip.y };
  } else {
    const vx = tip.x - start.x;
    const vy = tip.y - start.y;
    const length = Math.hypot(vx, vy) || 1;
    /* Bow the arc the way the leader leaves the note, so it starts out along
       the line of writing (or straight down from it) and straightens into
       the mark: the head lands pointing at what it calls out. */
    let nx = -vy / length;
    let ny = vx / length;
    const leave = fromSide ? { x: toward, y: 0 } : { x: 0, y: Math.sign(drop) };
    if (nx * leave.x + ny * leave.y < 0) {
      nx = -nx;
      ny = -ny;
    }
    const bow = length * 0.2;
    c1 = { x: start.x + vx / 3 + nx * bow, y: start.y + vy / 3 + ny * bow };
    c2 = {
      x: start.x + (vx * 2) / 3 + nx * bow * 0.4,
      y: start.y + (vy * 2) / 3 + ny * bow * 0.4,
    };
  }

  /* Sampled densest at the start, so the brush reads a loaded, slow stroke
     that quickens toward the head. */
  const shaft: Point[] = Array.from({ length: 26 }, (_, index) => {
    const t = (index / 25) ** 1.2;
    const point = cubicAt(start, c1, c2, tip, t);
    return [
      point.x + jitter(index, 5) * 0.8,
      point.y + jitter(index, 6) * 0.8,
      0.46 + 0.2 * Math.sin(t * Math.PI),
    ];
  });

  const tangentLength = Math.hypot(tip.x - c2.x, tip.y - c2.y) || 1;
  const backX = (c2.x - tip.x) / tangentLength;
  const backY = (c2.y - tip.y) / tangentLength;
  const wing = (angle: number, length: number): Vec => ({
    x: tip.x + (backX * Math.cos(angle) - backY * Math.sin(angle)) * length,
    y: tip.y + (backX * Math.sin(angle) + backY * Math.cos(angle)) * length,
  });
  /* One stroke in, one stroke out: a hand draws the head as a single "v",
     and the second side usually comes out a little shorter than the first. */
  const head: Point[] = [];
  const line = (from: Vec, to: Vec, phase: number, skipFirst: boolean) => {
    for (let index = skipFirst ? 1 : 0; index <= 7; index += 1) {
      const t = index / 7;
      head.push([
        from.x + (to.x - from.x) * t + jitter(index, phase) * 0.6,
        from.y + (to.y - from.y) * t + jitter(index, phase + 1) * 0.6,
        0.5 + 0.12 * Math.sin(t * Math.PI),
      ]);
    }
  };
  line(wing(ARROW_HEAD_SPREAD, ARROW_HEAD_LENGTH), tip, 8, false);
  line(tip, wing(-ARROW_HEAD_SPREAD, ARROW_HEAD_LENGTH * 0.86), 11, true);

  return [
    strokePath(PEN, PEN_SIZE, shaft, true, SHAPE),
    strokePath(PEN, PEN_SIZE, head, true, SHAPE),
  ];
}

/**
 * The marks, laid over the screen inside the media frame. They carry no words:
 * the handwriting beside them is real text in the document, so nothing here
 * needs reading out.
 */
export function CaseStudyAnnotationMarks({
  annotations,
}: {
  annotations: readonly CaseStudyAnnotation[];
}) {
  return (
    <svg
      aria-hidden="true"
      className="humi-story-annotations__marks"
      preserveAspectRatio="none"
      viewBox={`0 0 ${BOARD.w} ${BOARD.h}`}
    >
      {annotations.map((annotation) => (
        <g
          key={annotation.text}
          style={
            annotation.mark.tilt
              ? {
                  transform: `rotate(${annotation.mark.tilt}deg)`,
                  transformOrigin: `${annotation.mark.x * 100}% ${(annotation.mark.y + annotation.mark.h / 2) * 100}%`,
                }
              : undefined
          }
        >
          {annotation.mark.shape === "chevron" ? (
            <path
              className="humi-story-annotations__mark"
              d={strokePath(
                PEN,
                CHEVRON_PEN_SIZE,
                chevronStroke(annotation.mark),
                true,
                CHEVRON_SHAPE,
              )}
            />
          ) : (
            handDrawnArrow(annotation).map((d, index) => (
              <path
                className="humi-story-annotations__mark"
                d={d}
                key={index}
              />
            ))
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * The handwriting. Positioned over the screen on a wide viewport and stacked
 * under it on a narrow one, where a 340px screenshot is too small to annotate
 * and the notes are the only part still worth reading.
 */
export function CaseStudyAnnotationNotes({
  annotations,
}: {
  annotations: readonly CaseStudyAnnotation[];
}) {
  return (
    <div className="humi-story-annotations">
      {annotations.map((annotation) => (
        <p
          className={
            annotation.mark.side === "left"
              ? "humi-story-annotations__note humi-story-annotations__note--left"
              : "humi-story-annotations__note"
          }
          key={annotation.text}
          style={
            {
              "--note-tilt": `${annotation.note.tilt ?? 0}deg`,
              "--note-w": `${annotation.note.w * 100}%`,
              "--note-x": `${annotation.note.x * 100}%`,
              "--note-shift-x": `${annotation.note.shiftX ?? 0}cqw`,
              /* The note and its arrow share a vertical center. */
              "--note-y": `${(annotation.note.y ?? annotation.mark.y + annotation.mark.h / 2) * 100}%`,
            } as CSSProperties
          }
        >
          {annotation.text}
        </p>
      ))}
    </div>
  );
}
