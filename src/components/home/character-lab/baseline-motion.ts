import { isReturnVisit } from "@/components/motion/return-visit";
import {
  HOME_CHARACTER_TIMING,
  homeCharacterArrival,
} from "../character/timing";
import { createCharacterDizziness } from "../character/dizziness";
import {
  APPEARANCE_REACTION_MS,
  appearanceReaction,
} from "../character/appearance";

import { characterSleep, CHARACTER_SLEEP_MS } from "./baseline-sleep";

import { characterAttention, createGazeShift } from "../character/gaze";

type Point = { x: number; y: number };
/** Owns only this SVG. All listeners and animation work are removed on unmount. */
export function startHomeCharacter(svg: SVGSVGElement, paused = false) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const head = svg.querySelector<SVGGElement>("[data-head]")!;
  const mouth = svg.querySelector<SVGPathElement>("[data-mouth]")!;
  mouth.setAttribute("fill", "currentColor");
  let active = true;
  let disposed = false;
  const eyes = [...svg.querySelectorAll<SVGGElement>("[data-eye]")].map(
    (el, index) => ({
      el,
      index,
      pupil: el.querySelector<SVGPathElement>("[data-pupil]")!,
      clip: el.querySelector<SVGPathElement>("[data-aperture]")!,
      upper: el.querySelector<SVGPathElement>("[data-upper]")!,
      lower: el.querySelector<SVGPathElement>("[data-lower]")!,
      x: 0.6,
      y: 1,
      vx: 0,
      vy: 0,
    }),
  );
  const random = (a: number, b: number) => a + Math.random() * (b - a),
    clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
  const ease = (t: number) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  function spring(
    x: number,
    v: number,
    target: number,
    w: number,
    dt: number,
  ): [number, number] {
    const a = x - target,
      b = v + w * a,
      e = Math.exp(-w * dt);
    return [target + (a + b * dt) * e, (v - w * b * dt) * e];
  }
  let pointer: Point | null = null;
  let lastInput = performance.now(),
    previous = lastInput,
    frame = 0;
  // Stay asleep through the blurred arrival, then open into the idle motion.
  const wakeAt =
    !reduce.matches && !isReturnVisit() && !document.hidden ? lastInput : -1e5;
  const welcomeBlinks =
    wakeAt > 0 && homeCharacterArrival().doubleBlink
      ? [wakeAt + 360, wakeAt + 560]
      : [];
  let blinkAt = -1e5,
    blinkDuration = 310,
    nextBlink = lastInput + random(2500, 4800);
  let hx = 0,
    hy = 0,
    hvx = 0,
    hvy = 0,
    tilt = 0,
    tv = 0,
    lidRest = 0.12,
    lv = 0,
    smile = 1.8,
    sv = 0,
    mouthWidth = 4.3,
    mwv = 0,
    mouthOpen = 0,
    mov = 0,
    mouthSlant = 0,
    msv = 0,
    attention = 0,
    av = 0;
  let sleepAt = lastInput + random(22000, 38000);
  let sleepClosure = 0,
    sleepVelocity = 0;
  const dizziness = createCharacterDizziness();
  let dizzyAt = -1e5,
    cooldownUntil = 0,
    greetAt = -1e5;
  let nextGlance = lastInput + random(1200, 1700),
    glanceNumber = 0;
  let glance: Point | null = null;
  let idleShift: ReturnType<typeof createGazeShift> | null = null;
  let pendingShift = false;
  let previousHeadTarget: Point | null = null;
  let appearanceAt = -1e5;
  let appearanceDark = false;
  const moods = {
    curious: {
      smile: 0,
      width: 2.8,
      open: 3.3,
      slant: 0.2,
      lids: 0.02,
      lean: -0.7,
    },
    thoughtful: {
      smile: 1.1,
      width: 5.1,
      open: 0,
      slant: 3.2,
      lids: 0.18,
      lean: 0.9,
    },
    pleased: {
      smile: 5.4,
      width: 6,
      open: 0,
      slant: -0.3,
      lids: 0.17,
      lean: -0.4,
    },
    calm: { smile: 1.8, width: 4.3, open: 0, slant: 0, lids: 0.13, lean: 0 },
  } as const;
  let glanceMood: keyof typeof moods = "calm";
  // Sample the space around the face as well as the page. A shuffled bag
  // visits every direction before repeating, without per-frame randomness.
  const directions = [
    { x: -240, y: -110, mood: "curious" },
    { x: 210, y: -90, mood: "curious" },
    { x: 290, y: 90, mood: "thoughtful" },
    { x: -180, y: 170, mood: "pleased" },
    { x: 50, y: -150, mood: "thoughtful" },
    { x: 140, y: 250, mood: "pleased" },
    { x: -280, y: 25, mood: "thoughtful" },
    { x: 30, y: 150, mood: "calm" },
  ] as const;
  let glanceBag: number[] = [];
  let lastDirection = -1;
  function beginBlink(now: number, duration = 310) {
    blinkAt = now;
    blinkDuration = duration;
    nextBlink = now + random(3800, 6800);
  }
  function closure(now: number) {
    const t = (now - blinkAt) / blinkDuration;
    if (t < 0 || t >= 1) return 0;
    if (t < 0.25) return ease(t / 0.25);
    if (t < 0.34) return 1;
    return 1 - ease((t - 0.34) / 0.66);
  }
  function lid(eye: (typeof eyes)[number], c: number, rest: number) {
    // Fixed asymmetry in the drawing, never per-frame noise. Both lids converge
    // on the same seam at full closure; the pupil itself is never deformed.
    const ink = 1 - c,
      side = eye.index === 1 ? -1 : 1;
    const topOpen = -18 - (eye.index === 1 ? 0.35 : 0) + rest * 16,
      bottomOpen = 18 - rest * 3;
    const top = topOpen + (3 - topOpen) * c,
      bottom = bottomOpen + (3 - bottomOpen) * c;
    const left = -0.18 * ink * side,
      right = 0.28 * ink * side;
    const upper = `M-13 ${left}C${-13 - 0.45 * ink} ${top * (1.3333 + 0.026 * ink * side)} ${13 + 0.25 * ink} ${top * (1.3333 - 0.022 * ink * side)} 13 ${right}`;
    const lower = `M-13 ${left}C${-13 + 0.3 * ink} ${bottom * (1.3333 - 0.018 * ink * side)} ${13 + 0.5 * ink} ${bottom * (1.3333 + 0.022 * ink * side)} 13 ${right}`;
    eye.clip.setAttribute(
      "d",
      `${upper}C${13 + 0.5 * ink} ${bottom * (1.3333 + 0.022 * ink * side)} ${-13 + 0.3 * ink} ${bottom * (1.3333 - 0.018 * ink * side)} -13 ${left}Z`,
    );
    eye.upper.setAttribute("d", upper);
    eye.lower.setAttribute("d", lower);
  }
  function elementTarget(selector: string): Point | null {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    if (r.bottom <= 0 || r.top >= innerHeight) return null;
    return { x: r.left + Math.min(r.width / 2, 180), y: r.top + r.height / 2 };
  }
  function chooseGlance(now: number) {
    if (!glanceBag.length) {
      glanceBag = directions.map((_, index) => index);
      for (let i = glanceBag.length - 1; i > 0; i--) {
        const j = Math.floor(random(0, i + 1));
        [glanceBag[i], glanceBag[j]] = [glanceBag[j]!, glanceBag[i]!];
      }
      if (glanceBag.at(-1) === lastDirection) {
        [glanceBag[0], glanceBag[glanceBag.length - 1]] = [
          glanceBag[glanceBag.length - 1]!,
          glanceBag[0]!,
        ];
      }
    }
    lastDirection = glanceBag.pop()!;
    const direction = directions[lastDirection]!;
    const r = svg.getBoundingClientRect();
    // Occasionally notice something real; otherwise explore a new direction.
    const content =
      glanceNumber++ % 3 === 2
        ? [".home-intro__story", ".home-dock__bar", "#work", "#experience"]
            .map(elementTarget)
            .filter((point): point is Point => point !== null)
        : [];
    previousHeadTarget = glance || pointer;
    glance = content.length
      ? content[Math.floor(random(0, content.length))]!
      : {
          x: clamp(r.left + r.width / 2 + direction.x, 12, innerWidth - 12),
          y: clamp(r.top + r.height / 2 + direction.y, 12, innerHeight - 12),
        };
    glanceMood = content.length ? "pleased" : direction.mood;
    pendingShift = true;
    // A fixation is still, with varied dwell time. Occasionally inspect a
    // second area sooner; do not continuously pan between unrelated objects.
    nextGlance =
      now + (Math.random() < 0.18 ? random(750, 1150) : random(1900, 3700));
  }
  function render(now: number) {
    frame = 0;
    if (!active || document.hidden) return;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const on = !reduce.matches && !paused,
      elapsed = now - lastInput;
    const age = now - dizzyAt,
      dizzy =
        on && age >= 0 && age < 2200
          ? ease(age / 220) * (1 - ease((age - 1100) / 1100))
          : 0;
    const greeting = on ? Math.exp(-Math.max(0, now - greetAt) / 450) : 0;
    const adaptation = appearanceReaction(
      appearanceDark,
      on ? now - appearanceAt : -1,
    );
    // Sleep is an occasional idle beat, with a long drowsy lead-in. Input
    // cancels the timeline; the spring opens the eyes without snapping.
    if (on && now - sleepAt >= CHARACTER_SLEEP_MS) {
      sleepAt = now + random(38000, 62000);
    }
    const sleep = characterSleep(
      on && !adaptation.active && !dizzy ? now - sleepAt : -1,
    );
    [sleepClosure, sleepVelocity] = spring(
      sleepClosure,
      sleepVelocity,
      sleep.closure,
      sleep.closure < sleepClosure ? 26 : 7,
      dt,
    );
    const sleepy = Math.max(sleep.tired, sleepClosure);
    if (
      on &&
      sleepy < 0.05 &&
      !adaptation.active &&
      elapsed > 1100 &&
      !dizzy &&
      now >= nextGlance
    )
      chooseGlance(now);
    if (!on || sleepy > 0.1 || dizzy || adaptation.active) {
      idleShift = null;
      pendingShift = false;
    }
    // Keep looking at the last point until curiosity chooses a new one.
    const target = on && sleepy < 0.45 ? glance || pointer : null;
    const mood = moods[glance ? glanceMood : "calm"];
    // Idle curiosity inherits the held gaze without a neutral pose in between.
    const attentive = target ? 1 - sleepy : 0;
    // Reacquire attention promptly; relax gently when no target is available.
    const attentionSpeed = attentive > attention ? 24 : 9;
    [attention, av] = spring(
      attention,
      av,
      on ? attentive : 0,
      attentionSpeed,
      dt,
    );
    const gazeSpeed = pointer && !glance && elapsed < 350 ? 30 : 19;

    if (
      on &&
      !adaptation.active &&
      welcomeBlinks.length &&
      now >= welcomeBlinks[0]!
    ) {
      welcomeBlinks.shift();
      beginBlink(now, 160);
    } else if (
      on &&
      sleepy < 0.1 &&
      !adaptation.active &&
      now >= nextBlink &&
      dizzy < 0.3
    ) {
      beginBlink(now, random(250, 330));
    }
    const waking = on
      ? 1 -
        ease(
          (now - wakeAt - HOME_CHARACTER_TIMING.wakeDelayMs) /
            HOME_CHARACTER_TIMING.wakeMs,
        )
      : 0;
    const c = on
      ? Math.max(
          waking,
          sleepClosure,
          adaptation.active ? adaptation.closure : closure(now),
        )
      : 0;
    // The eyes lead a new fixation; the smaller, softer head turn follows.
    const headTarget =
      glance && (pendingShift || (idleShift && now < idleShift.start + 65))
        ? previousHeadTarget
        : target;
    const sr = svg.getBoundingClientRect(),
      nx = headTarget
        ? clamp((headTarget.x - (sr.left + sr.width / 2)) / 260, -1, 1)
        : 0,
      ny = headTarget
        ? clamp((headTarget.y - (sr.top + sr.height / 2)) / 230, -1, 1)
        : 0;
    const breath = on ? Math.sin(now / 1800) * 0.22 : 0;
    [hx, hvx] = spring(
      hx,
      hvx,
      on ? nx * 1.6 * attention + Math.sin(age / 170) * dizzy * 1.2 : 0,
      9,
      dt,
    );
    [hy, hvy] = spring(
      hy,
      hvy,
      on ? ny * 1.1 * attention + breath - greeting * 0.9 + sleepy * 1.1 : 0,
      9,
      dt,
    );
    [tilt, tv] = spring(
      tilt,
      tv,
      on
        ? (nx * 0.9 + mood.lean) * attention +
            Math.sin(age / 220) * dizzy * 3 -
            sleepy * 1.5
        : 0,
      9,
      dt,
    );
    [lidRest, lv] = spring(
      lidRest,
      lv,
      on
        ? (glance ? mood.lids : 0.13 * (1 - attention)) +
            0.2 * dizzy +
            adaptation.lids +
            sleepy * 0.65
        : 0.13,
      10,
      dt,
    );
    [smile, sv] = spring(
      smile,
      sv,
      on
        ? (mood.smile + 1.3 * greeting) * (1 - waking) * (1 - sleepy) +
            0.2 * waking -
            2.8 * dizzy
        : 1.8,
      8,
      dt,
    );
    const yawn = 0.8 * waking * (1 - waking);
    [mouthWidth, mwv] = spring(
      mouthWidth,
      mwv,
      on
        ? mood.width * (1 - sleepy) + 3 * sleepy + 0.5 * greeting - 1.4 * yawn
        : 4.3,
      10,
      dt,
    );
    [mouthOpen, mov] = spring(
      mouthOpen,
      mov,
      on
        ? Math.max(
            mood.open * (1 - waking) * (1 - sleepy),
            1.7 * yawn,
            dizzy * 0.8,
          )
        : 0,
      10,
      dt,
    );
    [mouthSlant, msv] = spring(
      mouthSlant,
      msv,
      on ? mood.slant * (1 - waking) * (1 - sleepy) : 0,
      9,
      dt,
    );
    if (!on) {
      hx = hy = hvx = hvy = tilt = tv = 0;
      lidRest = 0.13;
      smile = 1.8;
      mouthWidth = 4.3;
      mouthOpen = mouthSlant = mwv = mov = msv = sv = lv = 0;
      sleepClosure = sleepVelocity = 0;
    }
    svg.style.setProperty("--character-pitch", `${clamp(-hy * 2.2, -4, 4)}deg`);
    svg.style.setProperty("--character-yaw", `${clamp(hx * 2.8, -5, 5)}deg`);
    head.setAttribute(
      "transform",
      `translate(${hx} ${hy + waking * 1.6}) rotate(${tilt - waking * 2} 120 115)`,
    );
    // Both pupils share a direction derived from the face center. Computing
    // independent near-field rays allowed the cursor to pull them cross-eyed.
    let gazeX = 0.6,
      gazeY = 1;
    const faceMatrix = head.getScreenCTM();
    if (target && faceMatrix) {
      const inverse = faceMatrix.inverse();
      const gazeAt = (point: Point) => {
        const local = new DOMPoint(point.x, point.y).matrixTransform(inverse);
        const dx = local.x - 120,
          dy = local.y - 110;
        const distance = Math.sqrt(dx * dx + dy * dy + 55 * 55);
        return { x: (dx / distance) * 6.3, y: (dy / distance) * 7.2 };
      };
      const aim = gazeAt(target);
      const engagement = glance ? 1 - sleepy : attention;
      gazeX += (aim.x - 0.6) * engagement;
      gazeY += (aim.y - 1) * engagement;
    }
    if (pendingShift && target && faceMatrix && on) {
      const from = { x: eyes[0]!.x, y: eyes[0]!.y };
      const to = { x: gazeX, y: gazeY };
      const largeShift = Math.hypot(to.x - from.x, to.y - from.y) > 7.5;
      const blink = largeShift && Math.random() < 0.4 && now - blinkAt > 500;
      if (blink) beginBlink(now, 210);
      idleShift = createGazeShift(
        from,
        to,
        now + (blink ? 40 : 0),
        Math.random() < 0.4,
      );
      pendingShift = false;
    }
    const fixation =
      glance && idleShift && sleepy < 0.1 && !dizzy && !adaptation.active
        ? idleShift.sample(now)
        : null;
    eyes.forEach((eye) => {
      // Dizziness moves both eyes together rather than breaking binocular alignment.
      const tx = gazeX * (1 - dizzy * 0.7) + Math.cos(age / 150) * 2.2 * dizzy;
      const ty = gazeY * (1 - dizzy * 0.7) + Math.sin(age / 150) * 1.6 * dizzy;
      if (fixation) {
        // Sample the short shift directly; a second spring would stretch it
        // back into the slow, uniform glide this replaces.
        eye.x = fixation.x;
        eye.y = fixation.y;
        eye.vx = eye.vy = 0;
      } else {
        [eye.x, eye.vx] = spring(eye.x, eye.vx, tx, on ? gazeSpeed : 25, dt);
        [eye.y, eye.vy] = spring(eye.y, eye.vy, ty, on ? gazeSpeed : 25, dt);
      }
      if (!on) {
        eye.x = 0.6;
        eye.y = 1;
        eye.vx = eye.vy = 0;
      }
      const bound = Math.hypot(eye.x / 7.1, eye.y / 8.2),
        k = bound > 1 ? 1 / bound : 1;
      eye.pupil.setAttribute(
        "transform",
        `translate(${eye.x * k} ${eye.y * k})${adaptation.pupil === 1 ? "" : ` scale(${adaptation.pupil})`}`,
      );
      lid(eye, c, lidRest);
    });
    // One continuous outline morphs from a quiet smile to a small curious O,
    // an asymmetric thinking mouth, or a warmer greeting. No expression swaps.
    const left = 120 - mouthWidth,
      right = 120 + mouthWidth,
      upperY = 143 + smile - mouthOpen,
      lowerY = 143 + smile + mouthOpen,
      leftY = 143.1 + mouthSlant * 0.5,
      rightY = 142.9 - mouthSlant * 0.5;
    mouth.setAttribute(
      "d",
      `M${left} ${leftY}C${120 - mouthWidth * 0.45} ${upperY} ${120 + mouthWidth * 0.45} ${upperY} ${right} ${rightY}C${120 + mouthWidth * 0.45} ${lowerY} ${120 - mouthWidth * 0.45} ${lowerY} ${left} ${leftY}Z`,
    );
    if (active && !document.hidden && on) frame = requestAnimationFrame(render);
  }

  function wake() {
    if (active && !document.hidden && !frame) {
      previous = performance.now();
      frame = requestAnimationFrame(render);
    }
  }
  function attend(point: Point, measure = false) {
    const now = performance.now();
    if (!pointer && now - lastInput > 1800) {
      greetAt = now;
      beginBlink(now, 270);
    }
    if (
      measure &&
      !reduce.matches &&
      now > cooldownUntil &&
      dizziness.track(
        characterAttention(point, svg.getBoundingClientRect()),
        now,
      )
    ) {
      dizzyAt = now;
      cooldownUntil = now + 3200;
      dizziness.reset();
      beginBlink(now, 290);
      nextGlance = now + 6500;
    }
    pointer = point;
    lastInput = now;
    sleepAt = now + random(22000, 38000);
    glance = null;
    idleShift = null;
    pendingShift = false;
    // A new gesture starts a fresh idle interval; never retain an old glance deadline.
    // Keep a brief recovery period after dizziness, independently of normal curiosity.
    nextGlance = Math.max(now + 1300, dizzyAt + 3000);
    wake();
  }

  const controller = new AbortController();
  const options = { signal: controller.signal };
  document.addEventListener(
    "pointermove",
    (e) => {
      if (active && e.pointerType !== "touch")
        attend({ x: e.clientX, y: e.clientY }, true);
    },
    options,
  );
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (active) attend({ x: e.clientX, y: e.clientY });
    },
    options,
  );
  function leave() {
    pointer = null;
    dizziness.reset();
    wake();
  }
  document.documentElement.addEventListener("pointerleave", leave, options);
  window.addEventListener("blur", leave, options);
  window.addEventListener(
    "scroll",
    () => {
      lastInput = performance.now();
      sleepAt = lastInput + random(22000, 38000);
      nextGlance = lastInput + 1500;
      glance = null;
      idleShift = null;
      pendingShift = false;
      dizziness.reset();
      wake();
    },
    { ...options, passive: true },
  );
  window.addEventListener("resize", wake, options);
  document.addEventListener(
    "keydown",
    () => {
      if (!active) return;
      lastInput = performance.now();
      sleepAt = lastInput + random(22000, 38000);
      wake();
    },
    options,
  );
  // Keyboard navigation is another expression of attention: follow the focused link.
  document.addEventListener(
    "focusin",
    (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const r = e.target.getBoundingClientRect();
      if (r.width && r.height)
        attend({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    },
    options,
  );
  svg.addEventListener(
    "pointerenter",
    () => {
      greetAt = performance.now();
      sleepAt = greetAt + random(22000, 38000);
      beginBlink(greetAt);
      wake();
    },
    options,
  );
  const preference = () => {
    dizzyAt = -1e5;
    dizziness.reset();
    welcomeBlinks.length = 0;
    appearanceAt = -1e5;
    glance = null;
    idleShift = null;
    pendingShift = false;
    wake();
  };
  reduce.addEventListener("change", preference, options);
  const systemAppearance = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () =>
    document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : systemAppearance.matches;
  let previousDark = isDark();
  const reactToAppearance = () => {
    const dark = isDark();
    if (dark === previousDark) return;
    previousDark = dark;
    if (disposed || !active || document.hidden || reduce.matches) return;
    // Start with the committed colors; the new view remains live during the
    // theme wipe, so waiting for its completion makes the reaction feel late.
    appearanceAt = performance.now();
    sleepAt = appearanceAt + random(22000, 38000);
    appearanceDark = dark;
    welcomeBlinks.length = 0;
    idleShift = null;
    pendingShift = false;
    glance = null;
    // The adaptation owns the lids until it settles. Idle and greeting blinks
    // must not cut short a held closure or interrupt dark adaptation.
    const duration = APPEARANCE_REACTION_MS[dark ? "dark" : "light"];
    nextGlance = appearanceAt + duration + 1200;
    blinkAt = -1e5;
    nextBlink = appearanceAt + duration + random(2600, 4400);
    wake();
  };
  const appearanceObserver = new MutationObserver(reactToAppearance);
  appearanceObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  systemAppearance.addEventListener("change", reactToAppearance, options);
  document.addEventListener(
    "visibilitychange",
    () => {
      cancelAnimationFrame(frame);
      frame = 0;
      welcomeBlinks.length = 0;
      appearanceAt = -1e5;
      dizziness.reset();
      if (!document.hidden) {
        lastInput = performance.now();
        sleepAt = lastInput + random(22000, 38000);
        sleepClosure = sleepVelocity = 0;
        nextBlink = lastInput + random(2500, 4500);
        nextGlance = lastInput + random(1200, 1700);
        dizzyAt = -1e5;
        wake();
      }
    },
    options,
  );
  const observer = new IntersectionObserver(
    ([entry]) => {
      active = Boolean(entry?.isIntersecting);
      if (active) {
        lastInput = performance.now();
        sleepAt = lastInput + random(22000, 38000);
        sleepClosure = sleepVelocity = 0;
        dizziness.reset();
        nextBlink = lastInput + 3000;
        nextGlance = lastInput + 1500;
        wake();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        pointer = null;
        dizziness.reset();
        glance = null;
        idleShift = null;
        pendingShift = false;
        dizzyAt = -1e5;
      }
    },
    { threshold: 0 },
  );
  observer.observe(svg);
  // Establish the closed lids before the first client paint.
  render(performance.now());
  return () => {
    disposed = true;
    active = false;
    appearanceObserver.disconnect();
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}
