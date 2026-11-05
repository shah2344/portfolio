import {
  clamp,
  type CharacterPose,
  type CharacterTreatment,
  type MouthPose,
  type Point,
} from "./pose";
type Vec3 = { x: number; y: number; z: number };
export type CharacterGeometry = {
  head: string;
  eyes: { aperture: string; upper: string; lower: string; pupil: string }[];
  mouth: string;
};
function cubic(a: Point, b: Point, c: Point, d: Point, count = 24): Point[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count,
      s = 1 - t;
    return {
      x:
        s * s * s * a.x +
        3 * s * s * t * b.x +
        3 * s * t * t * c.x +
        t * t * t * d.x,
      y:
        s * s * s * a.y +
        3 * s * s * t * b.y +
        3 * s * t * t * c.y +
        t * t * t * d.y,
    };
  });
}
export function mouthPoints(m: MouthPose) {
  const left = {
      x: 32 - m.width + m.offsetX,
      y: 55 + m.leftCornerY + m.offsetY,
    },
    right = { x: 32 + m.width + m.offsetX, y: 55 + m.rightCornerY + m.offsetY };
  const x1 = 32 - m.width * 0.48 + m.offsetX,
    x2 = 32 + m.width * 0.48 + m.offsetX,
    y = 55 + m.offsetY;
  const opening = Math.max(0, m.opening);
  const upper = cubic(
    left,
    { x: x1, y: y + m.upperLeftCurve - opening },
    { x: x2, y: y + m.upperRightCurve - opening },
    right,
  );
  const lower = cubic(
    left,
    { x: x1, y: y + m.lowerLeftCurve + opening },
    { x: x2, y: y + m.lowerRightCurve + opening },
    right,
  );
  return { upper, lower };
}
function rotator(p: CharacterPose) {
  const rad = Math.PI / 180,
    yaw = clamp(p.yaw, -24, 24) * rad,
    pitch = clamp(p.pitch, -16, 16) * rad,
    roll = clamp(p.roll, -9, 9) * rad;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  return (v: Vec3): Vec3 => {
    const x = v.x * cy + v.z * sy,
      z = -v.x * sy + v.z * cy,
      y = v.y * cp + z * sp;
    return { x: x * cr - y * sr, y: x * sr + y * cr, z: -v.y * sp + z * cp };
  };
}
export function createProjection(
  p: CharacterPose,
  treatment: CharacterTreatment,
  flat = false,
) {
  const rotate = rotator(p),
    fit = treatment === "floating" ? 0.95 : 0.82;
  return (point: Point): Point => {
    const x = (point.x - 32) * fit,
      y = (point.y - 31) * fit;
    const z = 24 * Math.sqrt(Math.max(0, 1 - (x / 27) ** 2 - (y / 28) ** 2));
    const v = rotate({ x, y, z: flat ? 0 : z });
    // Keep the projected volume centered; facial features still travel over its surface.
    return { x: 32 + v.x / p.squash + p.x, y: 31 + v.y * p.squash + p.y };
  };
}
const path = (
  points: Point[],
  project: (point: Point) => Point,
  close = false,
) =>
  points
    .map((p, i) => {
      const q = project(p);
      return `${i ? "L" : "M"}${q.x.toFixed(3)} ${q.y.toFixed(3)}`;
    })
    .join("") + (close ? "Z" : "");
export function characterGeometry(
  p: CharacterPose,
  treatment: CharacterTreatment = "floating",
  flat = false,
  oldMouth = false,
): CharacterGeometry {
  const project = createProjection(p, treatment, flat);
  const eyes = [0, 1].map((index) => {
    const cx = index ? 43.5 : 20.5,
      cy = index ? 23.3 : 24.7;
    const rest = clamp(index ? p.lidRight : p.lidLeft, -0.25, 0.8),
      closure = clamp(p.closure);
    const h = clamp(p.happy ?? 0),
      asleep = clamp(p.asleep ?? 0);
    const shut = (open: number) => open * (1 - closure) + 2.2 * closure;
    // Asleep, both lids sag into a thin crescent that tapers at the corners:
    // a closed eye still reads in every treatment, where a collapsed seam vanishes.
    const sleep = (open: number, closed: number) =>
      open * (1 - asleep) + closed * asleep;
    const openTop = -18 + rest * 16;
    const top = sleep(shut(openTop + (-16 - openTop) * h), 3.4),
      bottom = sleep(shut(18 - rest * 3), 6.2);
    // The corners tuck in too, so the two crescents don't touch.
    const a = { x: cx - 12 + 3 * asleep, y: cy - 0.15 },
      d = { x: cx + 12 - 3 * asleep, y: cy + 0.2 };
    let upper = cubic(
      a,
      { x: cx - 12.3 + 3 * asleep, y: cy + top * 1.333 },
      { x: cx + 12.2 - 3 * asleep, y: cy + top * 1.333 },
      d,
    );
    let lower = cubic(
      a,
      {
        x: cx - 11.8 - 0.5 * closure + 3 * asleep,
        y: cy + bottom * 1.333,
      },
      {
        x: cx + 12.4 - 0.2 * closure - 3 * asleep,
        y: cy + bottom * 1.333,
      },
      d,
    );
    // Happy raises the cheek into the eye. Its upward arch crops both lids from
    // below, so the eye keeps its own rounded outline and the cheek line meets
    // it at a blunt angle; reshaping the lid itself made a pointed cusp. The
    // arch starts far below the eye, so it rises in continuously from happy 0.
    if (h > 0) {
      const cheek = (x: number) =>
        cy + 30 + (-34 + 5 * ((x - cx) / 12) ** 2) * h;
      const crop = (q: Point) => ({ x: q.x, y: Math.min(q.y, cheek(q.x)) });
      upper = upper.map(crop);
      lower = lower.map(crop);
    }
    // Squinting eyes don't dart around; the pupil rides up into the arch and
    // the raised lid crops its base, so it keeps its own size.
    const gazeScale = 1 - 0.5 * h,
      gazeX = p.gazeX * gazeScale,
      gazeY = p.gazeY * gazeScale;
    const bound = Math.max(1, Math.hypot(gazeX / 6.5, gazeY / 7.2));
    const pupilRx = 5.1 * p.pupil,
      pupilRy = 8.6 * p.pupil;
    // Asleep, the pupil keeps its size and rolls up behind the closing lid,
    // clear of the crescent.
    const sleepRoll = -9 * clamp(asleep * 1.4);
    const pupil = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return {
        x:
          cx +
          gazeX / bound +
          Math.cos(a) * (pupilRx + 0.15 * p.pupil * Math.sin(a)),
        y: cy + gazeY / bound - 4 * h + sleepRoll + Math.sin(a) * pupilRy,
      };
    });
    return {
      aperture: path([...upper, ...lower.slice().reverse()], project, true),
      upper: path(upper, project),
      lower: path(lower, project),
      pupil: path(pupil, project, true),
    };
  });
  let mouth = p.mouth;
  if (oldMouth) {
    const curve = (mouth.upperLeftCurve + mouth.upperRightCurve) / 2;
    mouth = {
      ...mouth,
      leftCornerY: 0.1,
      rightCornerY: -0.1,
      upperLeftCurve: curve,
      upperRightCurve: curve,
      lowerLeftCurve: curve,
      lowerRightCurve: curve,
      offsetX: 0,
      offsetY: 0,
    };
  }
  const m = mouthPoints(mouth);
  // Orthographic silhouette of the rotated ellipsoid, derived from its covariance.
  const rotate = rotator(p),
    axes = [
      rotate({ x: 27, y: 0, z: 0 }),
      rotate({ x: 0, y: 28, z: 0 }),
      rotate({ x: 0, y: 0, z: 24 }),
    ];
  const aa = axes.reduce((s, v) => s + v.x * v.x, 0),
    bb = axes.reduce((s, v) => s + v.x * v.y, 0),
    cc = axes.reduce((s, v) => s + v.y * v.y, 0),
    sx = Math.sqrt(aa),
    sy = Math.sqrt(cc - (bb * bb) / aa);
  const head = Array.from({ length: 96 }, (_, i) => {
    const t = (i / 96) * Math.PI * 2;
    return {
      x: 32 + (sx * Math.cos(t)) / p.squash + p.x,
      y: 31 + ((bb / sx) * Math.cos(t) + sy * Math.sin(t)) * p.squash + p.y,
    };
  });
  return {
    head: path(head, (q) => q, true),
    eyes,
    mouth: path([...m.upper, ...m.lower.slice().reverse()], project, true),
  };
}
export function bindCharacterRenderer(
  svg: SVGSVGElement,
  treatment: CharacterTreatment,
  flat = false,
  oldMouth = false,
) {
  const head = svg.querySelector<SVGPathElement>("[data-shell]")!,
    mouth = svg.querySelector<SVGPathElement>("[data-mouth]")!;
  const glassEdges = svg.querySelectorAll<SVGPathElement>("[data-glass-edge]");
  const eyes = [...svg.querySelectorAll<SVGGElement>("[data-eye]")].map(
    (el) => ({
      aperture: el.querySelector<SVGPathElement>("[data-aperture]")!,
      outline: el.querySelector<SVGPathElement>("[data-eye-outline]")!,
      fill: el.querySelector<SVGPathElement>("[data-eye-fill]")!,
      rim: el.querySelector<SVGPathElement>("[data-eye-rim]")!,
      bloom: el.querySelector<SVGPathElement>("[data-eye-bloom]")!,
      rimMask: el.querySelector<SVGPathElement>("[data-eye-rim-mask]")!,
      upper: el.querySelector<SVGPathElement>("[data-upper]")!,
      lower: el.querySelector<SVGPathElement>("[data-lower]")!,
      pupil: el.querySelector<SVGPathElement>("[data-pupil]")!,
    }),
  );
  return (pose: CharacterPose) => {
    const g = characterGeometry(pose, treatment, flat, oldMouth);
    head.setAttribute("d", g.head);
    glassEdges.forEach((edge) => edge.setAttribute("d", g.head));
    mouth.setAttribute("d", g.mouth);
    g.eyes.forEach((eye, i) => {
      const nodes = eyes[i]!;
      nodes.aperture.setAttribute("d", eye.aperture);
      nodes.outline.setAttribute("d", eye.aperture);
      nodes.fill.setAttribute("d", eye.aperture);
      nodes.rim.setAttribute("d", eye.aperture);
      nodes.bloom.setAttribute("d", eye.aperture);
      nodes.rimMask.setAttribute("d", eye.aperture);
      nodes.upper.setAttribute("d", eye.upper);
      nodes.lower.setAttribute("d", eye.lower);
      nodes.pupil.setAttribute("d", eye.pupil);
    });
  };
}
