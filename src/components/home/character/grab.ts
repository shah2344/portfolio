import { clamp, ease, spring, type Point } from "./pose";

type Bounds = { left: number; right: number; top: number; bottom: number };
const homeBounds: Bounds = { left: -104, right: 104, top: -84, bottom: 96 };

/** Underdamped spring, solved analytically so release feels the same at 60/120Hz. */
function rebound(
  x: number,
  v: number,
  target: number,
  dt: number,
  held: boolean,
  soothing: boolean,
  dashing = false,
): [number, number] {
  // A dodge is a dash: stiffer and better damped, so it gets out of the way
  // fast and stops where it meant to instead of wobbling back into reach.
  const speed = dashing ? 44 : held ? 32 : 23;
  const damping = dashing ? 0.76 : held ? 0.84 : soothing ? 0.82 : 0.57;
  const decay = speed * damping;
  const frequency = speed * Math.sqrt(1 - damping * damping);
  const offset = x - target;
  const b = (v + decay * offset) / frequency;
  const sin = Math.sin(frequency * dt),
    cos = Math.cos(frequency * dt);
  const envelope = Math.exp(-decay * dt);
  return [
    target + envelope * (offset * cos + b * sin),
    envelope *
      ((b * frequency - decay * offset) * cos -
        (offset * frequency + decay * b) * sin),
  ];
}

export function createCharacterGrab(random: () => number) {
  let x = 0,
    y = 0,
    vx = 0,
    vy = 0;
  let held = false,
    escaped = false,
    moved = false;
  let origin: Point = { x: 0, y: 0 },
    anchor = origin,
    pointer = origin;
  let bounds = homeBounds,
    started = 0,
    escapeAt = Infinity,
    wriggleAt = Infinity;
  let side = 1,
    agitation = 0,
    movedAt = 0,
    releasedAt = -Infinity;
  let dodgeUntil = -Infinity,
    dodgeCooldown = -Infinity,
    dodgeCount = 0,
    chaseUntil = -Infinity,
    chaseStarted = -Infinity,
    dodgedAt = -Infinity,
    surrenderAfter = 5,
    surrendered = false;
  // The cursor being avoided, and how fast it was last moving.
  let threat: Point = { x: 0, y: 0 },
    threatAt = -Infinity,
    threatVelocity: Point = { x: 0, y: 0 };
  let affection = 0,
    tappedAt = -Infinity,
    calmUntil = -Infinity;
  let comfort = 0,
    comfortVelocity = 0,
    comfortUntil = -Infinity;
  let tapTilt = 0,
    tiltVelocity = 0,
    tiltTarget = 0,
    comfortTarget = 1;
  let dodgeTarget: Point = { x: 0, y: 0 },
    sampledAt = 0;
  const reset = () => {
    x = y = vx = vy = agitation = 0;
    held = escaped = moved = false;
    dodgeUntil = dodgeCooldown = -Infinity;
    dodgeCount = 0;
    chaseUntil = chaseStarted = dodgedAt = threatAt = -Infinity;
    surrendered = false;
    affection = 0;
    tappedAt = calmUntil = -Infinity;
    comfort = comfortVelocity = tapTilt = tiltVelocity = tiltTarget = 0;
    comfortUntil = -Infinity;
  };
  return {
    get held() {
      return held;
    },
    get wary() {
      return agitation >= 0.45;
    },
    get engaged() {
      return (
        held ||
        escaped ||
        sampledAt < dodgeUntil ||
        Math.hypot(x, y, vx / 23, vy / 23) > 0.08
      );
    },
    get dragged() {
      return moved || escaped;
    },
    begin(point: Point, time: number, viewportBounds = homeBounds) {
      origin = pointer = point;
      anchor = { x, y };
      bounds = viewportBounds;
      started = time;
      movedAt = time;
      dodgeUntil = -Infinity;
      held = true;
      escaped = moved = false;
      side = random() < 0.5 ? -1 : 1;
      wriggleAt = time + 620 + random() * 450;
      escapeAt = random() < 0.38 ? wriggleAt + 820 : Infinity;
    },
    move(point: Point, time = movedAt + 16) {
      if (!held) return;
      const travel = Math.hypot(point.x - pointer.x, point.y - pointer.y);
      const speed = (travel / Math.max(16, time - movedAt)) * 1000;
      // A few gentle pulls are welcome; repeated or fast yanks build wariness.
      const wasWary = agitation >= 0.45;
      agitation = Math.min(
        1.4,
        agitation + travel / 620 + (speed > 650 ? travel / 800 : 0),
      );
      affection = Math.max(0, affection - travel / 1100);
      if (agitation >= 0.45) calmUntil = comfortUntil = -Infinity;
      if (!wasWary && agitation >= 0.45) {
        dodgeCount = 0;
        chaseUntil = chaseStarted = -Infinity;
        // A short game, never an endless one: four to six dodges at most.
        surrenderAfter = 4 + Math.floor(random() * 3);
      }
      movedAt = time;
      pointer = point;
      if (Math.hypot(point.x - origin.x, point.y - origin.y) > 5) moved = true;
    },
    release(time: number, cancelled = false) {
      const tap = held && !moved && time - started < 350 && !cancelled;
      held = false;
      escaped = false;
      releasedAt = time;
      // Carry a little of the throw into the return, never an unbounded fling.
      vx = clamp(vx, -420, 420);
      vy = clamp(vy, -420, 420);
      return tap;
    },
    tap(time: number) {
      // A cluster of taps continues one response rather than replaying it.
      if (time - tappedAt > 650) {
        tiltTarget = (random() - 0.5) * 5;
        comfortTarget = 0.8 + random() * 0.2;
        comfortUntil = time + 900 + random() * 500;
      } else comfortUntil = Math.max(comfortUntil, time + 650);
      affection = Math.min(1, affection + 0.34);
      agitation *= 0.18;
      tappedAt = time;
      calmUntil = time + 2400;
      dodgeUntil = chaseUntil = chaseStarted = -Infinity;
      dodgeCooldown = calmUntil;
      dodgeCount = 0;
      // Keep the body's current position and velocity; reassurance changes its
      // expression and softens the return, without a repeated hop or scale pulse.
    },
    approach(point: Point, time: number) {
      if (time - threatAt < 120) {
        const elapsed = Math.max(8, time - threatAt) / 1000;
        threatVelocity = {
          x: clamp((point.x - threat.x) / elapsed, -3000, 3000),
          y: clamp((point.y - threat.y) / elapsed, -3000, 3000),
        };
      } else threatVelocity = { x: 0, y: 0 };
      threat = point;
      threatAt = time;
      if (
        held ||
        escaped ||
        agitation < 0.45 ||
        time < calmUntil ||
        time - releasedAt < 400
      )
        return false;
      // Read where the cursor is heading, so a fast swipe can't simply land on it.
      const ahead = {
        x: point.x + threatVelocity.x * 0.12,
        y: point.y + threatVelocity.y * 0.12,
      };
      const near = Math.min(
        Math.hypot(point.x - x, point.y - y),
        Math.hypot(ahead.x - x, ahead.y - y),
      );
      if (near > 96) return false;
      // Following keeps the game alive. Backing off for a moment ends it.
      chaseUntil = time + 1600;
      if (chaseStarted === -Infinity) chaseStarted = time;
      // Between dodges it only bolts again if the cursor is right on it.
      if (time < dodgeCooldown && (near > 40 || time - dodgedAt < 140))
        return false;
      if (dodgeCount >= surrenderAfter || time - chaseStarted > 7000) {
        // Out of breath: it gives up, heads home and lets itself be caught.
        agitation = 0.22;
        chaseUntil = chaseStarted = dodgeUntil = -Infinity;
        calmUntil = time + 1800;
        surrendered = true;
        return false;
      }
      // Try straight away and two angled escapes; take whichever lands
      // farthest from where the cursor is going, which handles cornering.
      const away = Math.atan2(y - ahead.y, x - ahead.x || side * 0.01),
        distance = 46 + agitation * 12 + random() * 12;
      let best = { x, y },
        bestScore = -Infinity;
      for (const turn of [0, 1.15, -1.15]) {
        const angle = away + turn + (random() - 0.5) * 0.4;
        const candidate = {
          x: clamp(x + Math.cos(angle) * distance, bounds.left, bounds.right),
          y: clamp(
            y + Math.sin(angle) * distance * 0.75,
            bounds.top,
            bounds.bottom,
          ),
        };
        const score = Math.hypot(candidate.x - ahead.x, candidate.y - ahead.y);
        if (score > bestScore) [best, bestScore] = [candidate, score];
      }
      dodgeTarget = best;
      side = best.x >= x ? 1 : -1;
      dodgeCount++;
      dodgedAt = time;
      dodgeUntil = time + 260;
      dodgeCooldown = time + 240 + random() * 160;
      return true;
    },
    /** True once after the character gives up a chase. */
    takeSurrender() {
      const value = surrendered;
      surrendered = false;
      return value;
    },
    reset,
    sample(time: number, dt: number) {
      sampledAt = time;
      affection = Math.max(0, affection - dt * 0.025);
      [comfort, comfortVelocity] = spring(
        comfort,
        comfortVelocity,
        time < comfortUntil ? comfortTarget : 0,
        time < comfortUntil ? 12 : 8,
        dt,
      );
      if (
        time >= comfortUntil &&
        comfort < 0.005 &&
        Math.abs(comfortVelocity) < 0.04
      )
        comfort = comfortVelocity = 0;
      [tapTilt, tiltVelocity] = spring(
        tapTilt,
        tiltVelocity,
        tiltTarget,
        8,
        dt,
      );
      if (chaseUntil !== -Infinity && time > chaseUntil) {
        agitation = Math.min(agitation, 0.22);
        chaseUntil = chaseStarted = -Infinity;
      }
      agitation =
        time < chaseUntil
          ? Math.max(0.55, agitation - dt * 0.01)
          : Math.max(0, agitation - dt * 0.055);
      let tx = 0,
        ty = 0,
        wriggle = 0;
      if (held && agitation > 0.82 && time - started > 520)
        escapeAt = Math.min(escapeAt, time + 220);
      const bracing = held && escapeAt - time < 220;
      if (held && time >= escapeAt) {
        held = false;
        escaped = true;
        vx = clamp(-x * 4 - side * 90, -340, 340);
        vy = -190;
      }
      if (held) {
        const dx = pointer.x - origin.x + anchor.x;
        const dy = pointer.y - origin.y + anchor.y;
        // Increasing resistance makes the character feel tethered to its slot.
        const distance = Math.hypot(dx, dy);
        const breakaway = 0.12 + 0.88 * ease((distance - 12) / 36);
        const resistance =
          breakaway *
          (distance > 56
            ? (56 + 48 * (1 - Math.exp(-(distance - 56) / 100))) / distance
            : 1);
        tx = dx * resistance;
        ty = dy * resistance;
        const t = time - wriggleAt;
        const cycle = t % 1700;
        if (t >= 0 && cycle < 620) {
          const envelope = Math.sin((Math.PI * cycle) / 620) ** 2;
          wriggle = Math.sin(cycle / 46) * envelope;
          tx += wriggle * 7 * side;
          ty -= envelope * 8;
        }
        if (bracing) {
          const anticipation = ease(1 - (escapeAt - time) / 220);
          tx *= 1 - anticipation * 0.4;
          ty -= anticipation * 9;
          wriggle += Math.sin(time / 28) * anticipation;
        }
      } else if (
        time < dodgeUntil ||
        (time < chaseUntil && agitation >= 0.45)
      ) {
        // It keeps its distance while chased, and only heads home after.
        tx = dodgeTarget.x;
        ty = dodgeTarget.y;
      }
      const dashing = !held && time < dodgeUntil;
      [x, vx] = rebound(x, vx, tx, dt, held, time < calmUntil, dashing);
      [y, vy] = rebound(y, vy, ty, dt, held, time < calmUntil, dashing);
      const safeX = clamp(x, bounds.left, bounds.right);
      const safeY = clamp(y, bounds.top, bounds.bottom);
      if (safeX !== x) vx = 0;
      if (safeY !== y) vy = 0;
      x = safeX;
      y = safeY;
      if (!held && Math.hypot(x, y, vx, vy) < 0.025) x = y = vx = vy = 0;
      const pull = clamp(Math.hypot(x, y) / 90);
      return {
        x,
        y,
        roll: clamp(vx * 0.022 + x * 0.065 + wriggle * 5, -14, 14),
        stretch: clamp(Math.hypot(vx, vy) / 9500, 0, held ? 0.025 : 0.04),
        squeeze: held && moved ? 0.015 * ease((time - started) / 180) : 0,
        pull,
        wriggle,
        escaped,
        held,
        bracing,
        wary: agitation >= 0.45,
        dodging: time < dodgeUntil,
        // The whole chase, not just each dash, and how worn out it is (0–1).
        fleeing: !held && time < chaseUntil && agitation >= 0.45,
        fluster: clamp(dodgeCount / surrenderAfter),
        // Where the cursor is from here, so it can keep an eye on it.
        lookX: clamp((threat.x - x) / 70, -1, 1),
        lookY: clamp((threat.y - y) / 70, -1, 1),
        happiness: affection,
        comfort,
        tapTilt,
        pulling: held && (moved || time - started > 350),
      };
    },
  };
}
