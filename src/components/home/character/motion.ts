import { BRAND_TURN_EVENT } from "@/components/motion/brand-turn-motion";
import { isReturnVisit } from "@/components/motion/return-visit";
import {
  HOME_CHARACTER_LONG_WAIT_MS,
  HOME_CHARACTER_TIMING,
  homeCharacterArrival,
} from "./timing";
import { homeTravelEmotion, sampleTravelEmotion } from "./travel";
import { appearanceReaction, APPEARANCE_REACTION_MS } from "./appearance";
import { createCharacterGrab } from "./grab";
import { createCharacterDizziness } from "./dizziness";
import { characterAttention, createGazeShift } from "./gaze";
import { createCharacterDirector } from "./director";
import { createCharacterMood } from "./mood";
import { bindCharacterRenderer } from "./geometry";
import { bindCharacterGlass } from "./glass";
import {
  clamp,
  ease,
  restingPose,
  mouthPoses,
  blendMouth,
  spring,
  type CharacterBreathing,
  type CharacterPerformance,
  type CharacterPose,
  type CharacterTreatment,
  type Point,
} from "./pose";

export type CharacterCommand =
  | { type: "play"; performance: CharacterPerformance; time: number }
  | { type: "gaze"; point: Point; time: number }
  | { type: "pause"; value: boolean }
  | { type: "reduce"; value: boolean }
  | { type: "appearance"; dark: boolean; time: number }
  | { type: "showcase"; time: number }
  | { type: "reset" };
export type CharacterOptions = {
  treatment?: CharacterTreatment;
  seed?: number;
  now?: () => number;
  preview?: boolean;
  flat?: boolean;
  oldMouth?: boolean;
  breathing?: CharacterBreathing;
};
export const CHARACTER_EVENT = "home-character-command";
// How strongly each feature carries the face breath. Combined, the lift leads
// and the lids and lips follow lightly, so one breath reads across the face.
const breathWeights: Record<
  CharacterBreathing,
  { lids: number; mouth: number; lift: number; lidLag?: boolean }
> = {
  lids: { lids: 1, mouth: 0, lift: 0 },
  mouth: { lids: 0, mouth: 1, lift: 0 },
  lift: { lids: 0, mouth: 0, lift: 1 },
  combined: { lids: 0.5, mouth: 0.3, lift: 0.6, lidLag: true },
};
// Case-study links the visitor is considering; the character shares the interest.
const WORK_LINK = 'a[href^="/work/"]';
// Anything a tap could reasonably mean to press; tapping elsewhere puzzles it.
const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, video, audio, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), [contenteditable]';

/** Underdamped spring, solved analytically: head turns carry a little weight
 * past their target and settle, where a critical spring would stop dead. */
function followThrough(
  x: number,
  v: number,
  target: number,
  speed: number,
  damping: number,
  dt: number,
): [number, number] {
  const decay = speed * damping,
    frequency = speed * Math.sqrt(1 - damping * damping);
  const offset = x - target,
    b = (v + decay * offset) / frequency;
  const sin = Math.sin(frequency * dt),
    cos = Math.cos(frequency * dt),
    envelope = Math.exp(-decay * dt);
  return [
    target + envelope * (offset * cos + b * sin),
    envelope *
      ((b * frequency - decay * offset) * cos -
        (offset * frequency + decay * b) * sin),
  ];
}
const directions: Point[] = [
  { x: -0.8, y: -0.5 },
  { x: 0.8, y: -0.4 },
  { x: 0.9, y: 0.3 },
  { x: -0.6, y: 0.7 },
  { x: 0.2, y: -0.8 },
  { x: 0.5, y: 0.9 },
  { x: -0.9, y: 0.1 },
  { x: 0.1, y: 0.5 },
];
const showcase: [number, CharacterPerformance][] = [
  [0, "greeting"],
  [5000, "inspect"],
  [11000, "doubleTake"],
  [17000, "smirk"],
  [23000, "nod"],
  [29000, "wobble"],
  [35000, "nap"],
  [44000, "dizzy"],
  [50000, "inspect"],
  [56000, "greeting"],
];

/** One frame owner. The director and renderer are shared by the homepage and lab. */
export function startHomeCharacter(
  svg: SVGSVGElement,
  options: CharacterOptions = {},
) {
  const now = options.now ?? (() => performance.now());
  const root = svg.closest<HTMLElement>("[data-character-root]")!;
  const playButton = root.querySelector<HTMLButtonElement>(
    "[data-character-play]",
  );
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const appearance = matchMedia("(prefers-color-scheme: dark)");
  const start = now();
  const mood = createCharacterMood(start);
  const director = createCharacterDirector(
    options.seed ?? Math.floor(Math.random() * 0xffffffff),
    start,
    () => mood.sample(now()),
  );
  // The orb's light and material follow the head every frame (filled only).
  const glass = bindCharacterGlass(svg);
  const random = (a: number, b: number) => a + director.random() * (b - a);
  const draw = bindCharacterRenderer(
    svg,
    options.treatment ?? "floating",
    options.flat,
    options.oldMouth,
  );
  const dizziness = createCharacterDizziness();
  const grab = createCharacterGrab(() => director.random());
  let grabPointer: number | null = null;
  let suppressClickUntil = -Infinity;
  const clearGrabTransform = () => {
    if (playButton) playButton.style.transform = "";
    root.dataset.grabbing = "false";
    root.dataset.grabMotion = "false";
  };
  const releaseCapture = () => {
    const id = grabPointer;
    grabPointer = null;
    if (id !== null && playButton?.hasPointerCapture(id))
      playButton.releasePointerCapture(id);
  };
  const cancelGrab = () => {
    if (grabPointer !== null) suppressClickUntil = now() + 600;
    releaseCapture();
    grab.reset();
    clearGrabTransform();
  };
  const abort = new AbortController(),
    listener = { signal: abort.signal };
  let disposed = false,
    active = true,
    frame = 0,
    previous = start,
    paused = false,
    simulatedReduced = false,
    brandTurning = false;
  let pose = restingPose();
  const velocity = restingPose();
  const resetVelocity = () => {
    for (const k of Object.keys(velocity) as (keyof CharacterPose)[]) {
      if (k === "mouth") {
        for (const m of Object.keys(
          velocity.mouth,
        ) as (keyof typeof velocity.mouth)[])
          velocity.mouth[m] = 0;
      } else velocity[k] = 0;
    }
  };
  resetVelocity();
  let rect = root.getBoundingClientRect(),
    dirty = true;
  let lastPointer: Point | null = null,
    lastInput = start,
    nextGlance = start + 1600,
    glanceIndex = 0,
    bag: number[] = [];
  let attention = { x: 0.1, y: 0.1 },
    headAttention = attention,
    previousAttention = attention,
    shiftAt = start;
  let gazeShift: ReturnType<typeof createGazeShift> | null = null;
  let blinkAt = -Infinity,
    blinkDuration = 280,
    nextBlink = start + random(2500, 4800);
  // Interest widens the pupils; breath accumulates phase so its pace can change.
  let interest = 0,
    interestVelocity = 0,
    interestUntil = -Infinity,
    breath = 0,
    lastScrollY = 0,
    workLink: Element | null = null;
  let adaptationAt = -Infinity,
    adaptationDark = false,
    dizzyCooldown = 0,
    greetAt = -Infinity,
    // Taps on empty space, the last puzzled look, the cursor leaving the
    // window, and the last copy, each so reactions stay occasional.
    emptyTaps: number[] = [],
    puzzledUntil = -Infinity,
    leftAt = -Infinity,
    nodAt = -Infinity,
    selectionAt = -Infinity;
  // Matches `HomeEntranceRoot`: a deep link has no opening. A load restored
  // partway down still greets at the centre before it dissolves.
  const fresh = !options.preview && !isReturnVisit() && !document.hidden;
  const opening = fresh && !location.hash;
  const { waitedMs } = fresh ? homeCharacterArrival() : { waitedMs: 0 };
  // A slow load ran the arrival in CSS already; join its clock, not restart it.
  const openedAt = start - Math.min(waitedMs, HOME_CHARACTER_TIMING.arrivalMs);
  let wakeAt = opening ? openedAt : -Infinity;
  // After a long wait the trip to the masthead is relief, not a random mood.
  const travelEmotion =
    wakeAt === openedAt && !reduce.matches
      ? waitedMs >= HOME_CHARACTER_LONG_WAIT_MS
        ? "delighted"
        : homeTravelEmotion()
      : undefined;
  if (travelEmotion) root.dataset.arrivalEmotion = travelEmotion;
  const greetingEnd =
    wakeAt === openedAt
      ? openedAt + HOME_CHARACTER_TIMING.contentDelayMs
      : -Infinity;
  if (wakeAt === openedAt && !reduce.matches) {
    director.play(
      "greeting",
      Math.max(start, openedAt + HOME_CHARACTER_TIMING.greetingDelayMs),
    );
  }
  // The opening translates an ancestor without resizing the SVG. Invalidate
  // its pointer geometry once it has reached the resting slot.
  // A waiting character that was sent straight home lands after the trip alone.
  const arrivalSettlesAt =
    wakeAt === openedAt
      ? openedAt + HOME_CHARACTER_TIMING.entranceMs
      : fresh && waitedMs > 0
        ? start +
          HOME_CHARACTER_TIMING.entranceMs -
          HOME_CHARACTER_TIMING.travelDelayMs
        : -Infinity;
  let arrivalRectPending = arrivalSettlesAt > -Infinity;
  let showcaseAt: number | null = null,
    showcaseIndex = 0;
  let fixedGaze = false;
  const reduced = () => reduce.matches || simulatedReduced;
  const blocked = () =>
    disposed ||
    !active ||
    document.hidden ||
    paused ||
    reduced() ||
    brandTurning;
  const isDark = () =>
    document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : appearance.matches;
  let previousDark = isDark();
  function updateControls() {
    root.dataset.paused = String(paused);
    root.dataset.reduced = String(reduced());
    if (playButton)
      playButton.setAttribute("aria-disabled", String(paused || reduced()));
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function wake() {
    if (!blocked() && !frame) {
      previous = now();
      frame = requestAnimationFrame(render);
    }
  }
  function suspend() {
    stop();
    cancelGrab();
    lastPointer = null;
    gazeShift = null;
    adaptationAt = -Infinity;
    dizziness.reset();
    showcaseAt = null;
  }
  function resume() {
    const time = now();
    director.reset(time);
    lastInput = time;
    nextGlance = time + 1600;
    nextBlink = time + random(2500, 4500);
    wakeAt = -Infinity;
    wake();
  }
  function setPaused(value: boolean) {
    paused = value;
    updateControls();
    if (paused) suspend();
    else resume();
  }
  function preference() {
    suspend();
    director.reset(now());
    pose = restingPose();
    resetVelocity();
    draw(pose);
    updateControls();
    wake();
  }
  function beginBlink(time: number, duration = 280) {
    blinkAt = time;
    blinkDuration = duration;
    nextBlink = time + random(3800, 6800);
  }
  function noticeInput(time: number) {
    director.input(time);
    mood.input(time);
  }
  function pique(time: number, ms: number) {
    interestUntil = Math.max(interestUntil, time + ms);
  }
  function setAttention(point: Point, time: number, saccade: boolean) {
    // People often blink on a large change of fixation; it hides the jump.
    if (
      saccade &&
      Math.hypot(point.x - attention.x, point.y - attention.y) > 0.7 &&
      time - blinkAt > 1500 &&
      director.random() < 0.35
    )
      beginBlink(time + 20, random(210, 260));
    previousAttention = headAttention;
    attention = point;
    shiftAt = time;
    if (saccade)
      gazeShift = createGazeShift(
        { x: pose.gazeX, y: pose.gazeY },
        { x: point.x * 6.3, y: point.y * 7.2 },
        time,
        director.random() < 0.4,
      );
    else {
      gazeShift = null;
      headAttention = point;
    }
  }
  function attend(point: Point, time: number, measure = false) {
    if (blocked() || grabPointer !== null || grab.engaged) return;
    if (
      measure &&
      lastPointer &&
      Math.hypot(point.x - lastPointer.x, point.y - lastPointer.y) < 3
    )
      return;
    if (dirty || (arrivalRectPending && time < greetingEnd)) {
      rect = root.getBoundingClientRect();
      dirty = false;
    }
    lastPointer = point;
    lastInput = time;
    fixedGaze = false;
    noticeInput(time);
    nextGlance = time + random(1400, 2200);
    const gaze = characterAttention(point, rect);
    setAttention(gaze, time, false);
    if (
      measure &&
      time > dizzyCooldown &&
      time - adaptationAt >
        APPEARANCE_REACTION_MS[adaptationDark ? "dark" : "light"] &&
      dizziness.track(gaze, time)
    ) {
      director.play("dizzy", time);
      dizzyCooldown = time + 3200;
      dizziness.reset();
    }
    wake();
  }
  function chooseGlance(time: number) {
    if (!bag.length) {
      bag = directions.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random(0, i + 1));
        [bag[i], bag[j]] = [bag[j]!, bag[i]!];
      }
    }
    const direction = directions[bag.pop()!]!;
    let point = direction;
    if (++glanceIndex % 3 === 0 && !options.preview) {
      const targets = [
        ".home-intro__story",
        ".home-dock__bar",
        "#work",
        "#experience",
      ]
        .map((selector) =>
          document.querySelector(selector)?.getBoundingClientRect(),
        )
        .filter(
          (r): r is DOMRect =>
            !!r && r.width > 0 && r.top < innerHeight && r.bottom > 0,
        );
      const target = targets[Math.floor(random(0, targets.length))];
      if (target)
        point = {
          x: clamp(
            (target.left + Math.min(target.width / 2, 180) - rect.left - 22) /
              260,
            -1,
            1,
          ),
          y: clamp(
            (target.top + target.height / 2 - rect.top - 22) / 230,
            -1,
            1,
          ),
        };
    }
    setAttention(point, time, true);
    nextGlance = time + random(1600, 3400);
  }
  function reactToAppearance(dark = isDark(), time = now()) {
    if (blocked()) return;
    adaptationAt = time;
    adaptationDark = dark;
    blinkAt = -Infinity;
    if (!["nod", "wobble", "greeting"].includes(director.active ?? ""))
      director.cancel(time);
    noticeInput(time);
    nextGlance = time + APPEARANCE_REACTION_MS[dark ? "dark" : "light"] + 1200;
    nextBlink = nextGlance + 1800;
    wake();
  }
  let measuredFrames = 0,
    measuredTotal = 0,
    measuredMax = 0;
  function render() {
    const measurementStart =
      process.env.NODE_ENV === "development" ? performance.now() : 0;
    frame = 0;
    if (blocked()) return;
    const time = now(),
      dt = Math.min(0.05, Math.max(0, (time - previous) / 1000));
    previous = time;
    // All layout reads precede renderer writes, and only happen after invalidation.
    if (arrivalRectPending && time >= arrivalSettlesAt) {
      dirty = true;
      arrivalRectPending = false;
    }
    if (dirty) {
      rect = root.getBoundingClientRect();
      dirty = false;
    }
    if (showcaseAt !== null) {
      const entry = showcase[showcaseIndex];
      if (entry && time - showcaseAt >= entry[0]) {
        director.play(entry[1], showcaseAt + entry[0]);
        showcaseIndex++;
      }
      if (time - showcaseAt >= 60000) {
        showcaseAt = null;
        director.reset(time);
      }
    }
    const secondary = grab.sample(time, dt);
    const playingWithGrab = grabPointer !== null || grab.engaged;
    if (playButton) {
      playButton.style.transform = playingWithGrab
        ? `translate(${secondary.x.toFixed(3)}px, ${secondary.y.toFixed(3)}px) rotate(${secondary.roll.toFixed(3)}deg) scale(${(1 + secondary.stretch - secondary.squeeze).toFixed(4)}, ${(1 - secondary.stretch - secondary.squeeze).toFixed(4)})`
        : "";
    }
    root.dataset.grabbing = String(secondary.held);
    root.dataset.grabMotion = String(playingWithGrab);
    const adaptation = appearanceReaction(adaptationDark, time - adaptationAt);
    if (
      time >= greetingEnd &&
      !fixedGaze &&
      !playingWithGrab &&
      !director.gazeOwned &&
      !adaptation.active &&
      time >= nextGlance
    )
      chooseGlance(time);
    if (time - shiftAt >= 75) headAttention = attention;
    else headAttention = previousAttention;
    const base = restingPose();
    const greeting = time < greetingEnd;
    base.yaw = greeting ? 0 : headAttention.x * 16;
    base.pitch = greeting ? 0 : headAttention.y * 10;
    base.roll = greeting ? 0 : headAttention.x * 2;
    const feeling = mood.sample(time);
    // A slow breath: taller and slightly lifted on the inhale, slower when bored.
    breath += (dt * 2 * Math.PI) / (4.2 * (1 + 0.5 * feeling.boredom));
    base.squash = 1 + 0.012 * Math.sin(breath);
    base.y = -0.35 * Math.sin(breath);
    const fixation = gazeShift?.sample(time);
    base.gazeX = greeting ? 0.6 : (fixation?.x ?? attention.x * 6.3);
    base.gazeY = greeting ? 1 : (fixation?.y ?? attention.y * 7.2);
    const target = sampleTravelEmotion(
      director.sample(
        time,
        base,
        !adaptation.active &&
          time - lastInput > 1800 &&
          showcaseAt === null &&
          !fixedGaze &&
          !playingWithGrab &&
          secondary.comfort === 0,
      ),
      !adaptation.active && wakeAt === openedAt ? travelEmotion : undefined,
      time - openedAt - HOME_CHARACTER_TIMING.travelDelayMs,
    );
    // An ignored character's blinks grow heavy and slow.
    if (!adaptation.active && director.active !== "nap" && time >= nextBlink)
      beginBlink(time, random(250, 330) * (1 + 0.4 * feeling.boredom));
    const bt = (time - blinkAt) / blinkDuration;
    const blink =
      bt < 0 || bt >= 1
        ? 0
        : bt < 0.25
          ? ease(bt / 0.25)
          : bt < 0.34
            ? 1
            : 1 - ease((bt - 0.34) / 0.66);
    const waking =
      1 -
      ease(
        (time - wakeAt - HOME_CHARACTER_TIMING.wakeDelayMs) /
          HOME_CHARACTER_TIMING.wakeMs,
      );
    target.closure = Math.max(
      target.closure,
      waking,
      adaptation.active ? adaptation.closure : blink,
    );
    target.lidLeft += adaptation.lids + 0.16 * feeling.boredom;
    target.lidRight += adaptation.lids + 0.12 * feeling.boredom;
    [interest, interestVelocity] = spring(
      interest,
      interestVelocity,
      time < interestUntil ? 1 : 0,
      time < interestUntil ? 10 : 5,
      dt,
    );
    target.pupil = adaptation.pupil * (1 + 0.14 * interest);
    target.lidLeft -= 0.06 * interest;
    target.lidRight -= 0.06 * interest;
    if (secondary.pulling) {
      // The body trails the hand while the eyes glance toward its home slot.
      target.yaw = -secondary.x * 0.13;
      target.pitch = -secondary.y * 0.09;
      target.gazeX = -secondary.x * 0.045;
      target.gazeY = -secondary.y * 0.045;
      target.roll = secondary.wriggle * 3;
      if (secondary.bracing) target.pitch -= 7;
      target.lidLeft = 0.12 + Math.abs(secondary.wriggle) * 0.22;
      target.lidRight = 0.1 + secondary.pull * 0.18;
      target.mouth = {
        ...(Math.abs(secondary.wriggle) > 0.25
          ? mouthPoses.smirk
          : secondary.pull > 0.55
            ? mouthPoses.curious
            : mouthPoses.smile),
      };
    } else if (secondary.escaped) {
      target.mouth = { ...mouthPoses.smirk };
    } else if (secondary.fleeing || secondary.dodging) {
      // It keeps an eye on the cursor throughout: startled at first, cheeky
      // once it gets the game, then visibly running out of steam.
      const cheeky = ease((secondary.fluster - 0.15) / 0.35),
        tired = ease((secondary.fluster - 0.6) / 0.35);
      target.yaw = clamp(secondary.lookX * 15, -18, 18);
      target.pitch = secondary.lookY * 8 + 5 * tired;
      target.gazeX = secondary.lookX * 6;
      target.gazeY = secondary.lookY * 6.5;
      target.lidLeft = -0.14 + 0.36 * cheeky * (1 - tired) + 0.4 * tired;
      target.lidRight = -0.14 + 0.08 * cheeky + 0.34 * tired;
      target.pupil *= 1 - 0.14 * (1 - cheeky);
      target.mouth = blendMouth(
        blendMouth(mouthPoses.surprised, mouthPoses.smirk, cheeky),
        mouthPoses.pant,
        tired,
      );
    }
    if (
      secondary.pulling ||
      secondary.escaped ||
      secondary.dodging ||
      secondary.fleeing
    )
      target.happy = 0;
    else {
      // Recent pats and the visit's accumulated warmth both soften the rest face.
      const warmth = Math.max(
        secondary.comfort,
        director.active === null
          ? Math.max(secondary.happiness * 0.5, feeling.warmth * 0.3)
          : 0,
      );
      target.mouth = blendMouth(target.mouth, mouthPoses.smile, warmth);
      if (director.active === null && interest > 0.01)
        target.mouth = blendMouth(
          target.mouth,
          mouthPoses.interested,
          0.35 * interest * (1 - warmth),
        );
      target.happy = Math.max(target.happy, secondary.comfort);
      if (secondary.comfort > 0) {
        // Reassurance softens the face into a small, varied attentive tilt.
        target.yaw *= 1 - secondary.comfort * 0.7;
        target.pitch =
          target.pitch * (1 - secondary.comfort) +
          secondary.comfort * secondary.tapTilt;
        target.roll =
          target.roll * (1 - secondary.comfort * 0.8) +
          secondary.tapTilt * secondary.comfort * 0.6;
        target.lidLeft = 0.08;
        target.lidRight = 0.08;
      }
    }
    // The face rides the same breath, faded out while the hand holds it.
    const held = secondary.pulling ? 0 : 1,
      weights = breathWeights[options.breathing ?? "combined"],
      inhale = Math.sin(breath) * held,
      // Combined, the lids trail the chin by ~180ms so nothing moves in lockstep.
      lidInhale =
        Math.sin(breath - (weights.lidLag ? (0.18 * 2 * Math.PI) / 4.2 : 0)) *
        held,
      exhale = Math.max(0, -inhale);
    // Lids lift a hair on the inhale and settle back as it leaves.
    target.lidLeft -= 0.12 * weights.lids * lidInhale;
    target.lidRight -= 0.12 * weights.lids * lidInhale;
    target.pupil *= 1 + 0.07 * weights.lids * lidInhale;
    // Lips part slightly on each exhale, closing again for the inhale.
    target.mouth.opening += 0.85 * weights.mouth * exhale;
    target.mouth.offsetY += 0.35 * weights.mouth * exhale;
    target.mouth.width -= 0.4 * weights.mouth * exhale;
    // The chin lifts and the cheeks widen, so the features drift over the
    // curved surface instead of the whole head scaling.
    target.pitch -= 3 * weights.lift * inhale;
    target.mouth.width += 0.3 * weights.lift * inhale;
    for (const key of Object.keys(pose) as (keyof CharacterPose)[]) {
      if (key === "mouth") {
        for (const m of Object.keys(pose.mouth) as (keyof typeof pose.mouth)[])
          [pose.mouth[m], velocity.mouth[m]] = spring(
            pose.mouth[m],
            velocity.mouth[m],
            target.mouth[m],
            // A touch slower than the head, so expressions settle just after it.
            15,
            dt,
          );
      } else if (key === "closure" || key === "asleep" || key === "pupil")
        pose[key] = target[key];
      else if (key === "yaw" || key === "pitch" || key === "roll")
        [pose[key], velocity[key]] = followThrough(
          pose[key],
          velocity[key],
          target[key],
          13,
          0.7,
          dt,
        );
      else if (
        (key === "gazeX" || key === "gazeY") &&
        fixation &&
        !director.gazeOwned
      ) {
        pose[key] = target[key];
        velocity[key] = 0;
      } else
        [pose[key], velocity[key]] = spring(
          pose[key],
          velocity[key],
          target[key],
          key.startsWith("gaze") ? 30 : key.startsWith("lid") ? 15 : 14,
          dt,
        );
    }
    root.dataset.performance = secondary.held
      ? "grab"
      : secondary.escaped
        ? "escape"
        : secondary.dodging
          ? "dodge"
          : secondary.comfort > 0
            ? "happy"
            : (director.active ?? "idle");
    // Lit from the settled pose; the material never fully stops moving.
    glass?.update(pose, secondary, time, dt);
    draw(pose);
    if (process.env.NODE_ENV === "development") {
      const cost = performance.now() - measurementStart;
      measuredTotal += cost;
      measuredMax = Math.max(measuredMax, cost);
      if (++measuredFrames === 240) {
        root.dataset.frameAverageMs = (measuredTotal / measuredFrames).toFixed(
          3,
        );
        root.dataset.frameMaxMs = measuredMax.toFixed(3);
        measuredFrames = measuredTotal = measuredMax = 0;
      }
    }
    frame = requestAnimationFrame(render);
  }
  playButton?.addEventListener(
    "pointerdown",
    (e) => {
      if (blocked() || !e.isPrimary || e.button !== 0 || grabPointer !== null)
        return;
      const time = now();
      const slot = root.getBoundingClientRect();
      grab.begin({ x: e.clientX, y: e.clientY }, time, {
        left: Math.max(-104, 10 - slot.left),
        right: Math.min(104, innerWidth - slot.right - 10),
        top: Math.max(-84, 10 - slot.top),
        bottom: Math.min(96, innerHeight - slot.bottom - 10),
      });
      grabPointer = e.pointerId;
      suppressClickUntil = -Infinity;
      playButton.setPointerCapture(e.pointerId);
      root.dataset.grabbing = "true";
      root.dataset.grabMotion = "true";
      lastInput = time;
      adaptationAt = -Infinity;
      wakeAt = -Infinity;
      showcaseAt = null;
      fixedGaze = false;
      gazeShift = null;
      dizziness.reset();
      noticeInput(time);
      director.cancel(time);
      wake();
    },
    listener,
  );
  playButton?.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId === grabPointer) {
        grab.move({ x: e.clientX, y: e.clientY }, now());
        lastInput = now();
      }
    },
    listener,
  );
  playButton?.addEventListener(
    "contextmenu",
    (e) => {
      if (grabPointer !== null) e.preventDefault();
    },
    listener,
  );
  const finishGrab = (e: PointerEvent) => {
    if (e.pointerId !== grabPointer) return;
    const time = now();
    const cancelled = e.type !== "pointerup";
    // Include the final pointer coordinate even when it arrives between frames.
    if (!cancelled) grab.move({ x: e.clientX, y: e.clientY }, now());
    const dragged = grab.dragged;
    const tap = grab.release(time, cancelled);
    if (!tap || dragged || cancelled) suppressClickUntil = time + 600;
    releaseCapture();
    root.dataset.grabbing = "false";
    lastInput = time;
    dirty = true;
    noticeInput(time);
    if (dragged && !cancelled) {
      // A playful pull endears; a yank that made it wary costs some warmth.
      if (grab.wary) mood.annoy(0.15, time);
      else mood.play(time);
      director.play("smirk", time);
    }
    wake();
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    playButton?.addEventListener(type, finishGrab as EventListener, listener);
  playButton?.addEventListener(
    "click",
    (e) => {
      // Capture precedes both expression and glass-background click handlers.
      // Keyboard activation remains available after any interrupted drag.
      if (e.detail !== 0 && now() < suppressClickUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { ...listener, capture: true },
  );
  playButton?.addEventListener(
    "click",
    () => {
      if (!blocked()) {
        const time = now();
        grab.tap(time);
        mood.tap(time);
        pique(time, 700);
        noticeInput(time);
        director.cancel(time);
        showcaseAt = null;
        gazeShift = null;
        lastInput = time;
        wake();
      }
    },
    listener,
  );
  playButton?.addEventListener(
    "pointerenter",
    (e) => {
      if (e.pointerType !== "touch" && !blocked()) pique(now(), 900);
      if (
        e.pointerType === "touch" ||
        grabPointer !== null ||
        grab.engaged ||
        grab.wary ||
        blocked() ||
        now() < greetingEnd ||
        now() - greetAt < 12000
      )
        return;
      greetAt = now();
      noticeInput(greetAt);
      director.play("greeting", greetAt);
      wake();
    },
    listener,
  );
  if (!options.preview) {
    document.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "touch") {
          const time = now();
          if (
            !blocked() &&
            grabPointer === null &&
            grab.approach(
              {
                x: e.clientX - rect.left - rect.width / 2,
                y: e.clientY - rect.top - rect.height / 2,
              },
              time,
            )
          ) {
            // The chase expression takes over from here; no performance.
            noticeInput(time);
            director.cancel(time);
            lastInput = time;
            gazeShift = null;
            wake();
          } else if (grab.takeSurrender() && !blocked()) {
            // Giving up is part of the game: winded, relieved, a little fonder.
            noticeInput(time);
            mood.play(time);
            director.play("winded", time);
            lastInput = time;
            wake();
          }
          // Back after a while away: a hello, like the cursor arriving on it.
          if (
            leftAt !== -Infinity &&
            time - leftAt > 3000 &&
            time - greetAt > 12000 &&
            !blocked() &&
            !grab.engaged &&
            grabPointer === null &&
            time >= greetingEnd
          ) {
            greetAt = time;
            noticeInput(time);
            director.play("greeting", time);
          }
          leftAt = -Infinity;
          attend({ x: e.clientX, y: e.clientY }, time, true);
        }
      },
      listener,
    );
    // A tap is a press and release in place; a touch that scrolls is not.
    let press: {
      id: number;
      x: number;
      y: number;
      time: number;
      napping: boolean;
    } | null = null;
    document.addEventListener(
      "pointerdown",
      (e) => {
        const time = now();
        press = e.isPrimary
          ? {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              time,
              napping: director.active === "nap",
            }
          : null;
        attend({ x: e.clientX, y: e.clientY }, time);
      },
      listener,
    );
    document.addEventListener(
      "pointerup",
      (e) => {
        const time = now(),
          tap = press;
        press = null;
        const target = e.target instanceof Element ? e.target : null;
        if (
          !tap ||
          tap.napping ||
          tap.id !== e.pointerId ||
          time - tap.time > 450 ||
          Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10 ||
          e.button !== 0 ||
          !target ||
          root.contains(target) ||
          target.closest(INTERACTIVE) ||
          getComputedStyle(target).cursor === "pointer" ||
          document.getSelection()?.isCollapsed === false ||
          blocked() ||
          grabPointer !== null ||
          grab.engaged ||
          time < greetingEnd
        )
          return;
        // Tapping where nothing happens: it looks there, puzzled. A quick
        // run of them stops being a puzzle and starts being funny.
        emptyTaps = [...emptyTaps.filter((at) => time - at < 1400), time];
        if (emptyTaps.length >= 3) {
          emptyTaps = [];
          puzzledUntil = time + 2200;
          mood.play(time);
          director.play("smirk", time);
        } else if (time >= puzzledUntil) {
          puzzledUntil = time + 2200;
          director.play("confused", time);
        }
        wake();
      },
      listener,
    );
    document.addEventListener("pointercancel", () => (press = null), listener);
    document.addEventListener(
      "selectionchange",
      () => {
        // Selecting text: the eyes read along to the end of the selection.
        const time = now();
        if (time - selectionAt < 150 || blocked()) return;
        const selection = document.getSelection();
        if (
          !selection ||
          selection.isCollapsed ||
          !selection.rangeCount ||
          selection.toString().trim().length < 3
        )
          return;
        const r = selection.getRangeAt(0).getBoundingClientRect();
        if (!r.width && !r.height) return;
        selectionAt = time;
        attend({ x: r.right, y: r.top + r.height / 2 }, time);
        pique(time, 900);
      },
      listener,
    );
    document.addEventListener(
      "copy",
      () => {
        // Copying something, often the email address: an approving nod.
        const time = now();
        if (blocked() || grab.engaged || time - nodAt < 6000) return;
        nodAt = time;
        noticeInput(time);
        director.play("nod", time);
        wake();
      },
      listener,
    );
    document.addEventListener(
      "focusin",
      (e) => {
        if (e.target instanceof HTMLElement && !root.contains(e.target)) {
          const r = e.target.getBoundingClientRect();
          if (r.width && r.height)
            attend({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, now());
        }
      },
      listener,
    );
    document.addEventListener(
      "pointerover",
      (e) => {
        const link =
          e.target instanceof Element ? e.target.closest(WORK_LINK) : null;
        // The eyes already follow the cursor; entering a case study widens them.
        if (link && link !== workLink && !blocked()) pique(now(), 1600);
        workLink = link;
      },
      listener,
    );
    document.addEventListener(
      "keydown",
      () => {
        if (!blocked()) {
          if (grabPointer !== null) {
            suppressClickUntil = now() + 600;
            grab.release(now(), true);
            releaseCapture();
            root.dataset.grabbing = "false";
          }
          lastInput = now();
          noticeInput(lastInput);
        }
      },
      listener,
    );
    const leave = () => {
      // It keeps watching where the cursor left for a moment before moving on.
      lastPointer = null;
      leftAt = now();
      dizziness.reset();
      nextGlance = now() + 2600;
    };
    document.documentElement.addEventListener("pointerleave", leave, listener);
    window.addEventListener(
      "blur",
      () => {
        cancelGrab();
        leave();
      },
      listener,
    );
  }
  window.addEventListener(
    "scroll",
    () => {
      dirty = true;
      if (grabPointer !== null) cancelGrab();
      if (!blocked() && !options.preview) {
        const time = now(),
          scrolled = window.scrollY;
        lastInput = time;
        noticeInput(time);
        nextGlance = time + 1500;
        dizziness.reset();
        // Reading down the page: glance along with it, then keep to itself.
        if (scrolled > lastScrollY && time - shiftAt > 900)
          setAttention({ x: attention.x * 0.4, y: 0.85 }, time, true);
        if (scrolled > 120) director.settle(time);
        lastScrollY = scrolled;
      }
    },
    { ...listener, passive: true },
  );
  window.addEventListener(
    "resize",
    () => {
      cancelGrab();
      dirty = true;
    },
    listener,
  );
  const sizeObserver = new ResizeObserver(() => {
    dirty = true;
  });
  sizeObserver.observe(svg);
  const themeObserver = new MutationObserver(() => {
    const dark = isDark();
    if (dark !== previousDark) {
      previousDark = dark;
      reactToAppearance(dark);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  appearance.addEventListener(
    "change",
    () => {
      const dark = isDark();
      if (dark !== previousDark) {
        previousDark = dark;
        reactToAppearance(dark);
      }
    },
    listener,
  );
  reduce.addEventListener("change", preference, listener);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) suspend();
      else resume();
    },
    listener,
  );
  const visibility = new IntersectionObserver(
    ([entry]) => {
      const wasActive = active;
      active = !!entry?.isIntersecting;
      if (!active) {
        if (options.preview) {
          cancelGrab();
          stop();
        } else suspend();
      } else if (!wasActive) {
        if (options.preview) {
          dirty = true;
          wake();
        } else resume();
      }
    },
    { threshold: 0 },
  );
  visibility.observe(root);
  root.addEventListener(
    BRAND_TURN_EVENT,
    (e) => {
      brandTurning = Boolean((e as CustomEvent<boolean>).detail);
      if (brandTurning) {
        cancelGrab();
        stop();
      } else wake();
    },
    listener,
  );
  root.addEventListener(
    CHARACTER_EVENT,
    (e) => {
      const command = (e as CustomEvent<CharacterCommand>).detail;
      if (command.type === "pause") return setPaused(command.value);
      if (command.type === "reduce") {
        simulatedReduced = command.value;
        preference();
        return;
      }
      if (command.type === "reset") {
        cancelGrab();
        fixedGaze = false;
        director.reset(now());
        mood.reset(now());
        pose = restingPose();
        resetVelocity();
        draw(pose);
        wake();
        return;
      }
      if (blocked()) return;
      if (command.type === "play") {
        showcaseAt = null;
        director.play(command.performance, command.time);
      }
      if (command.type === "gaze") {
        noticeInput(command.time);
        director.cancel(command.time);
        fixedGaze = true;
        setAttention(command.point, command.time, true);
      }
      if (command.type === "appearance")
        reactToAppearance(command.dark, command.time);
      if (command.type === "showcase") {
        director.reset(command.time);
        showcaseAt = command.time;
        showcaseIndex = 0;
        fixedGaze = false;
      }
      wake();
    },
    listener,
  );
  updateControls();
  // Joining a CSS arrival that is already awake must not flash shut.
  if (wakeAt === openedAt && !reduced() && !paused)
    pose.closure =
      1 -
      ease(
        (start - openedAt - HOME_CHARACTER_TIMING.wakeDelayMs) /
          HOME_CHARACTER_TIMING.wakeMs,
      );
  draw(pose);
  wake();
  return () => {
    disposed = true;
    cancelGrab();
    stop();
    abort.abort();
    visibility.disconnect();
    sizeObserver.disconnect();
    themeObserver.disconnect();
  };
}
