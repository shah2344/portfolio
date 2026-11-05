const SNAP_DURATION = 250;

/** Ease-out cubic: motion starts immediately and settles without overshoot. */
function settleProgress(progress: number) {
  if (progress <= 0 || progress >= 1) return progress;
  const rest = 1 - progress;
  return 1 - rest * rest * rest;
}

export function nearestSlide(track: HTMLElement) {
  const centre = track.scrollLeft + track.clientWidth / 2;
  let nearest = 0;
  let distance = Infinity;
  Array.from(track.children).forEach((child, index) => {
    const slide = child as HTMLElement;
    const delta = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centre);
    if (delta < distance) {
      distance = delta;
      nearest = index;
    }
  });
  return nearest;
}

/** Keep one owner of scrolling until the card reaches its unscaled centre. */
export function createShotSnap(
  track: HTMLElement,
  reducedMotion: () => boolean,
  onComplete: () => void,
) {
  let frame = 0;
  let held = false;
  let previousSnap = "";
  let previousPriority = "";

  const restore = () => {
    if (!held) return;
    held = false;
    if (previousSnap)
      track.style.setProperty(
        "scroll-snap-type",
        previousSnap,
        previousPriority,
      );
    else track.style.removeProperty("scroll-snap-type");
  };
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    restore();
  };
  const hold = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!held) {
      previousSnap = track.style.getPropertyValue("scroll-snap-type");
      previousPriority = track.style.getPropertyPriority("scroll-snap-type");
      held = true;
      // Blossom's snap rule is important. Override it while we own the rail,
      // so the browser cannot snap each animation frame to a different card.
      track.style.setProperty("scroll-snap-type", "none", "important");
    }
  };
  const centre = (
    index: number,
    behavior: ScrollBehavior,
    duration = SNAP_DURATION,
  ) => {
    const slide = track.children[index] as HTMLElement | undefined;
    if (!slide) return;
    hold();
    const start = track.scrollLeft;
    const target = Math.max(
      0,
      Math.min(
        track.scrollWidth - track.clientWidth,
        slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2,
      ),
    );
    const finish = () => {
      track.scrollTo({ left: target, behavior: "instant" });
      frame = 0;
      restore();
      onComplete();
    };
    if (
      behavior !== "smooth" ||
      reducedMotion() ||
      Math.abs(target - start) < 1
    ) {
      finish();
      return;
    }
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      if (progress >= 1) {
        finish();
        return;
      }
      const eased = settleProgress(progress);
      track.scrollTo({
        left: start + (target - start) * eased,
        behavior: "instant",
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  return {
    centre,
    hold,
    cancel,
    get active() {
      return held;
    },
  };
}
