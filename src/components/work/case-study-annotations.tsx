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

/*
 * The brush takes its width from how fast the pen was moving, so a stroke is
 * shaped by where its points bunch up rather than by any width we set: dense
 * sampling reads as a slow, loaded start, sparse sampling as the flick at the
 * end. Every mark below is sampled unevenly for that reason.
 */
const PEN = "brush" as const;

/**
 * One hand at two sizes, in board units. The board scales with the frame, so
 * a pen that lands near 2px on the 800px column would be a hairline on a
 * phone: below the wide breakpoint the same marks are drawn with a heavier
 * pen and a longer head, and a thin screen-space outline (see
 * `.humi-story-annotations__narrow` in globals.css) keeps them from
 * fattening as the frame widens again.
 */
type Nib = { size: number; head: number; taper: number; chevron: number };
const WIDE_NIB: Nib = { size: 5.5, head: 28, taper: 42, chevron: 7 };
const NARROW_NIB: Nib = { size: 6.5, head: 46, taper: 56, chevron: 8 };

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
  /** Leave from the end of the note's line even when the mark is mostly
   *  above or below it, so the leader hooks round rather than dropping. */
  leave?: "side";
  /** Match the angle of a rotated screen, in degrees. */
  tilt?: number;
  /** Use the earlier screen-edge spine and chevron instead of a leader arrow. */
  shape?: "arrow" | "chevron";
};

/** Frame-relative note placement; optional y moves the note vertically. */
type Note = {
  x: number;
  y?: number;
  w: number;
  tilt?: number;
  shiftX?: number;
};

export type CaseStudyAnnotation = {
  /** What the note is about, marked on the screen. */
  mark: Mark;
  note: Note;
  /**
   * The same note below the wide breakpoint, where there is no margin to hang
   * it in: nudged into the nearest white space inside the frame, with its
   * mark moved to suit. Without it the wide placement is pulled inside the
   * frame as it stands.
   */
  narrow?: {
    mark?: Mark;
    note: Note & {
      align?: "start" | "center" | "end";
      /** Wash out the screen's own text behind the note with white. */
      backdrop?: boolean;
      /** How many lines the note wraps to, so a leader that leaves from
       *  above or below it starts clear of the writing. */
      lines?: number;
    };
  };
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
/** Half the opening of an arrowhead, in radians: a little under 30°. */
const HEAD_SPREAD = 0.5;
/** A line of the hand below the wide breakpoint, where it is set larger
 *  against the screen. */
const NARROW_LINE = 72;

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

const unit = (x: number, y: number): Vec => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

/**
 * A leader: one unbroken arc and an open head.
 *
 * The pen sets off along `leave` — out of the end of a line of writing, or
 * straight down from under it — and comes round in a single curve, with no
 * second bend, so the head lands pointing at what it calls out. Given
 * `arrive`, it comes in along that direction instead and hooks into the mark.
 */
function leader(start: Vec, leave: Vec, tip: Vec, nib: Nib, arrive?: Vec) {
  const length = Math.hypot(tip.x - start.x, tip.y - start.y) || 1;
  let c1: Vec = {
    x: start.x + leave.x * length * 0.42,
    y: start.y + leave.y * length * 0.42,
  };
  const chord = unit(tip.x - start.x, tip.y - start.y);
  const along = chord.x * leave.x + chord.y * leave.y;
  if (!arrive && along > 0.8) {
    /* Setting off nearly straight at the target would rule a line. A hand
       swings out a little first, further the straighter the shot, and to the
       side it was already leaning; dead on, the side is fixed by where the
       stroke sits, so the same mark always bows the same way. */
    const lean = -chord.y * leave.x + chord.x * leave.y;
    const side =
      Math.abs(lean) > 0.03
        ? Math.sign(lean)
        : jitter(start.x + tip.y, 4) >= 0
          ? 1
          : -1;
    const swing = length * 0.16 * ((along - 0.8) / 0.2) * side;
    c1 = { x: c1.x - chord.y * swing, y: c1.y + chord.x * swing };
  }
  const into = arrive ?? unit(tip.x - c1.x, tip.y - c1.y);
  const reach = length * (arrive ? 0.42 : 0.3);
  const c2: Vec = { x: tip.x - into.x * reach, y: tip.y - into.y * reach };

  /* Sampled densest at the start, so the brush reads a loaded, slow stroke
     that quickens toward the head. */
  const shaft: Point[] = Array.from({ length: 30 }, (_, index) => {
    const t = (index / 29) ** 1.25;
    const point = cubicAt(start, c1, c2, tip, t);
    return [point.x, point.y, 0.48 + 0.2 * Math.sin(t * Math.PI)];
  });

  const back = unit(c2.x - tip.x, c2.y - tip.y);
  const wing = (angle: number, reachOut: number): Vec => ({
    x: tip.x + (back.x * Math.cos(angle) - back.y * Math.sin(angle)) * reachOut,
    y: tip.y + (back.x * Math.sin(angle) + back.y * Math.cos(angle)) * reachOut,
  });
  /* One stroke in, one stroke out: a hand draws the head as a single "v",
     and the second side usually comes out a little shorter than the first.
     Each side bellies outward a touch, the way a quick flick does. */
  const head: Point[] = [];
  const side = (from: Vec, to: Vec, belly: number, skipFirst: boolean) => {
    const normal = unit(-(to.y - from.y), to.x - from.x);
    for (let index = skipFirst ? 1 : 0; index <= 8; index += 1) {
      const t = index / 8;
      const swell = Math.sin(t * Math.PI) * belly;
      head.push([
        from.x + (to.x - from.x) * t + normal.x * swell,
        from.y + (to.y - from.y) * t + normal.y * swell,
        0.5 + 0.14 * Math.sin(t * Math.PI),
      ]);
    }
  };
  const belly = nib.head * 0.06;
  side(wing(HEAD_SPREAD, nib.head), tip, belly, false);
  side(tip, wing(-HEAD_SPREAD, nib.head * 0.84), belly, true);

  const shape = { taper: nib.taper, simulatePressure: true };
  return [
    strokePath(PEN, nib.size, shaft, true, shape),
    strokePath(PEN, nib.size, head, true, {
      ...shape,
      taper: nib.taper * 0.5,
    }),
  ];
}

/**
 * A note's leader. It leaves from wherever the writing faces its target —
 * the end of the line when the mark is beside it, under or over the words
 * when the mark is mostly below or above — so it always reads as coming out
 * of the note. A mark with `arrowDirection` is approached from that side, so
 * the leader swings out past it and hooks back in.
 */
function noteLeader(mark: Mark, note: Note, nib: Nib, halfHeight: number) {
  const target = { x: bx(mark.x), y: by(mark.y + mark.h / 2) };
  const noteY = by(note.y ?? mark.y + mark.h / 2);
  const noteLeft = bx(note.x);
  const noteRight = bx(note.x + note.w);
  const toward = target.x >= (noteLeft + noteRight) / 2 ? 1 : -1;
  const sideGap = toward > 0 ? target.x - noteRight : noteLeft - target.x;
  const drop = target.y - noteY;
  const fromSide =
    mark.leave === "side" ||
    mark.arrowDirection !== undefined ||
    sideGap >= Math.abs(drop) * 0.8;

  const start = fromSide
    ? { x: (toward > 0 ? noteRight : noteLeft) + toward * NOTE_GAP, y: noteY }
    : {
        x: Math.min(Math.max(target.x, noteLeft + 30), noteRight - 30),
        y: noteY + Math.sign(drop) * halfHeight,
      };
  const leave = fromSide ? { x: toward, y: 0 } : { x: 0, y: Math.sign(drop) };

  if (!mark.arrowDirection) return leader(start, leave, target, nib);
  const heading = mark.arrowDirection === "left" ? -1 : 1;
  return leader(
    start,
    leave,
    { x: target.x + heading * 16, y: target.y },
    nib,
    { x: heading, y: 0 },
  );
}

/** One placement's mark: a chevron on the screen's edge, or a leader. */
function markGroup(
  mark: Mark,
  note: Note,
  nib: Nib,
  halfHeight: number,
  layout: "wide" | "narrow",
  key: string,
) {
  return (
    <g
      className={`humi-story-annotations__${layout}`}
      key={key}
      style={
        mark.tilt
          ? {
              transform: `rotate(${mark.tilt}deg)`,
              transformOrigin: `${mark.x * 100}% ${(mark.y + mark.h / 2) * 100}%`,
            }
          : undefined
      }
    >
      {mark.shape === "chevron" ? (
        <path
          d={strokePath(PEN, nib.chevron, chevronStroke(mark), true, {
            taper: 26,
            simulatePressure: true,
          })}
        />
      ) : (
        noteLeader(mark, note, nib, halfHeight).map((d, index) => (
          <path d={d} key={index} />
        ))
      )}
    </g>
  );
}

/**
 * The marks, laid over the screen and out past its edges to the notes. They
 * carry no words: the handwriting beside them is real text in the document,
 * so nothing here needs reading out. Each is drawn twice, once per pen, and
 * the layout shows the one that suits it.
 */
function AnnotationMarks({
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
      {annotations.map(({ mark, narrow, note, text }) => [
        markGroup(mark, note, WIDE_NIB, NOTE_HALF_LINE, "wide", `${text}-w`),
        markGroup(
          narrow?.mark ?? mark,
          narrow?.note ?? note,
          NARROW_NIB,
          ((narrow?.note.lines ?? 1) * NARROW_LINE) / 2 + 8,
          "narrow",
          `${text}-n`,
        ),
      ])}
    </svg>
  );
}

/**
 * The teardown over a screen: the marks, and the handwriting they lead from.
 * It sits over the frame rather than inside it, because a note hangs in the
 * margin on a wide viewport and its leader has to cross the frame's edge to
 * reach it.
 *
 * The notes are real text, so they are still the account of what is wrong
 * with each legacy screen for anyone reading with assistive technology.
 */
export function CaseStudyAnnotations({
  annotations,
}: {
  annotations: readonly CaseStudyAnnotation[];
}) {
  return (
    <div className="humi-story-annotations">
      <AnnotationMarks annotations={annotations} />
      {annotations.map(({ mark, narrow, note, text }) => (
        <p
          className={
            mark.side === "left"
              ? "humi-story-annotations__note humi-story-annotations__note--left"
              : "humi-story-annotations__note"
          }
          data-narrow-align={narrow?.note.align}
          data-narrow-backdrop={narrow?.note.backdrop ? "" : undefined}
          /* An opened card keeps room for whatever hangs past its frame. */
          data-pg-overhang=""
          key={text}
          style={
            {
              "--note-tilt": `${note.tilt ?? 0}deg`,
              "--note-w": `${note.w * 100}%`,
              "--note-x": `${note.x * 100}%`,
              "--note-shift-x": `${note.shiftX ?? 0}cqw`,
              /* The note and its arrow share a vertical center. */
              "--note-y": `${(note.y ?? mark.y + mark.h / 2) * 100}%`,
              ...(narrow && narrowNoteStyle(narrow, mark)),
            } as CSSProperties
          }
        >
          {text}
        </p>
      ))}
    </div>
  );
}

/** The narrow placement, read by the narrow media query in globals.css. */
function narrowNoteStyle(
  { mark, note }: NonNullable<CaseStudyAnnotation["narrow"]>,
  wideMark: Mark,
) {
  const at = mark ?? wideMark;
  return {
    "--note-narrow-tilt": `${note.tilt ?? 0}deg`,
    "--note-narrow-w": `${note.w * 100}%`,
    "--note-narrow-x": `${note.x * 100}%`,
    "--note-narrow-y": `${(note.y ?? at.y + at.h / 2) * 100}%`,
  };
}
