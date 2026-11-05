import {
  blendPose,
  ease,
  performanceDuration,
  restingPose,
  seededRandom,
  type CharacterPerformance,
  type CharacterPose,
} from "./pose";
import { neutralMood, type CharacterMood } from "./mood";
import { ownsGaze, samplePerformance } from "./performances";
type Performance = {
  kind: CharacterPerformance;
  start: number;
  side: number;
  from: CharacterPose;
};
const LIVELY_WINDOW = 60000;
const ACTIVATION_WINDOW = 30000;
export function createCharacterDirector(
  seed: number,
  now: number,
  mood: () => CharacterMood = () => neutralMood,
) {
  const random = seededRandom(seed);
  const between = (a: number, b: number) => a + random() * (b - a);
  let current: Performance | null = null;
  let last = restingPose(),
    livelyUntil = now + LIVELY_WINDOW,
    nextBeat = now + between(5000, 9000),
    napAt = now + between(55000, 85000),
    lastNap = -Infinity,
    lastActivation = -Infinity,
    activations = 0,
    boredPulled = false;
  let recent: CharacterPerformance[] = [],
    bag: CharacterPerformance[] = [];
  /** Brisk while the visitor is arriving or engaging; calm while they read. */
  const gap = (time: number) =>
    time < livelyUntil || time - lastActivation < ACTIVATION_WINDOW
      ? between(5000, 9000)
      : between(10000, 18000);
  function choose(activation = false): CharacterPerformance {
    const { warmth, boredom } = mood();
    let pool: CharacterPerformance[];
    if (activation)
      pool =
        warmth > 0.5
          ? ["nod", "wobble", "smirk"]
          : ["doubleTake", "smirk", "wobble"];
    else {
      pool = [
        "inspect",
        "inspect",
        "inspect",
        "doubleTake",
        "doubleTake",
        "smirk",
        "smirk",
        "nod",
        "wobble",
      ];
      // A liked character is playful; an ignored one looks for something to do.
      if (warmth > 0.5) pool.push("nod", "nod", "wobble", "smirk");
      if (boredom > 0.5)
        pool = [...pool.filter((k) => k !== "wobble"), "inspect", "inspect"];
    }
    if (activation) {
      const eligible = pool.filter((k) => !recent.includes(k));
      return eligible[Math.floor(random() * eligible.length)] ?? "nod";
    }
    if (!bag.some((k) => !recent.includes(k))) bag = [...pool];
    const eligible = bag
      .map((kind, index) => ({ kind, index }))
      .filter((item) => !recent.includes(item.kind));
    const chosen = eligible[Math.floor(random() * eligible.length)]!;
    bag.splice(chosen.index, 1);
    return chosen.kind;
  }
  function play(kind: CharacterPerformance, time: number) {
    current = { kind, start: time, side: random() < 0.5 ? -1 : 1, from: last };
    recent = [...recent, kind].slice(-2);
    if (kind === "nap") lastNap = time;
    nextBeat = time + performanceDuration[kind] + gap(time);
  }
  return {
    random,
    get active() {
      return current?.kind ?? null;
    },
    get gazeOwned() {
      return current ? ownsGaze(current.kind) : false;
    },
    play,
    input(time: number) {
      napAt = time + between(55000, 85000);
      nextBeat = Math.max(nextBeat, time + 1800);
      if (current?.kind === "nap") play("greeting", time);
    },
    activate(time: number) {
      if (time - lastActivation < 600) return false;
      lastActivation = time;
      const kind =
        current?.kind === "nap"
          ? "greeting"
          : activations++ === 0
            ? "nod"
            : choose(true);
      this.input(time);
      play(kind, time);
      return true;
    },
    /** The visitor started reading: end the lively window early. */
    settle(time: number) {
      livelyUntil = Math.min(livelyUntil, time);
    },
    reset(time: number) {
      current = null;
      nextBeat = time + gap(time);
      napAt = time + between(55000, 85000);
      last = restingPose();
    },
    cancel(time: number) {
      current = null;
      nextBeat = time + gap(time);
    },
    sample(time: number, base: CharacterPose, autonomous = true) {
      // Once per bored stretch, so it can't be rescheduled every frame.
      if (mood().boredom > 0.6) {
        if (!boredPulled) {
          boredPulled = true;
          if (napAt > time + 9000) napAt = time + between(4000, 9000);
        }
      } else boredPulled = false;
      if (current && time - current.start >= performanceDuration[current.kind])
        current = null;
      if (!current && autonomous) {
        if (time >= napAt && time - lastNap >= 90000) {
          play("nap", time);
          napAt = time + between(90000, 120000);
        } else if (time >= nextBeat) play(choose(), time);
      }
      last = current
        ? blendPose(
            current.from,
            samplePerformance(
              current.kind,
              time - current.start,
              base,
              current.side,
            ),
            ease((time - current.start) / 160),
          )
        : base;
      return last;
    },
  };
}
