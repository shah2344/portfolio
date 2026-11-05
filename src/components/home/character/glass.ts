import { clamp, type CharacterPose } from "./pose";
import { updateCharacterMaterialLayers } from "./material-layers";

// The grab moves the button in CSS pixels; the artwork is 58 units over 44px.
const UNITS_PER_PX = 58 / 44;
// The head spans about this many units, so one unit of travel is 1/54 of the
// bounding box the gradients are drawn in.
const HEAD_UNITS = 54;
// The hot spot's resting centre, matching its gradient in `HomeLogo`.
const HOTSPOT = { x: 0.28, y: 0.18 };
const SLOSH_REACH = 5;
const SLOSH_STIFFNESS = 90;
const SLOSH_DAMPING = 8.5;

type GrabMotion = { x: number; y: number; roll: number };

const f = (n: number) => n.toFixed(4);

/**
 * The orb's light, re-aimed every frame (filled treatment only).
 *
 * Highlights belong to a light fixed in the room: they counter the grab's
 * spin, hold while the face turns beneath them and lean only slightly with
 * it, and smear along fast movement. The material sits deeper inside, so it
 * shifts against each turn and sloshes behind movement, swinging back past
 * rest before settling. Light focused through the sphere follows the slosh.
 * A colour change sweeps a glare across the front as a meridian of the orb:
 * curved to the outline at either side, straight through the middle.
 */
export function bindCharacterGlass(svg: SVGSVGElement) {
  const gradient = (name: string) =>
    svg.querySelector<SVGGradientElement>(`[data-glass="${name}"]`);
  const hotspot = gradient("hotspot"),
    specular = gradient("specular"),
    sheen = gradient("sheen"),
    glow = gradient("glow"),
    shade = gradient("shade"),
    caustic = gradient("caustic");
  const material = svg.querySelector<SVGGElement>(
    "[data-character-background]",
  );
  if (!hotspot) return null;

  let last: { x: number; y: number; time: number } | null = null;
  const slosh = { x: 0, y: 0, vx: 0, vy: 0 };
  // Direction of travel, smoothed so the smear never flips between frames.
  const heading = { x: 1, y: 0 };
  let energy = 0,
    shownEnergy = -1;

  const setEnergy = (value: number) => {
    if (Math.abs(value - shownEnergy) < 0.01) return;
    shownEnergy = value;
    svg.style.setProperty("--character-glass-energy", f(value));
  };

  return {
    update(pose: CharacterPose, grab: GrabMotion, time: number, dt: number) {
      // Turning the face reads as surface travel as much as moving does.
      const x = pose.x + grab.x * UNITS_PER_PX + pose.yaw * 0.35,
        y = pose.y + grab.y * UNITS_PER_PX + pose.pitch * 0.35;
      let vx = 0,
        vy = 0;
      // After a pause (hidden tab, reduced motion) start afresh, not with a lurch.
      if (last && dt > 0 && time - last.time < 120) {
        vx = (x - last.x) / dt;
        vy = (y - last.y) / dt;
      }
      last = { x, y, time };

      // The contents trail the shell, then swing back through rest.
      const targetX = -SLOSH_REACH * Math.tanh(vx / 90),
        targetY = -SLOSH_REACH * Math.tanh(vy / 90);
      slosh.vx +=
        (SLOSH_STIFFNESS * (targetX - slosh.x) - SLOSH_DAMPING * slosh.vx) * dt;
      slosh.vy +=
        (SLOSH_STIFFNESS * (targetY - slosh.y) - SLOSH_DAMPING * slosh.vy) * dt;
      slosh.x += slosh.vx * dt;
      slosh.y += slosh.vy * dt;

      const speed = Math.hypot(vx, vy);
      const drive = clamp(speed / 140);
      // Flares quickly with movement and fades more slowly once it stops.
      energy = clamp(
        energy + (drive > energy ? 12 : 2.5) * (drive - energy) * dt,
      );
      if (speed > 1) {
        const k = clamp(dt * 10);
        heading.x += (vx / speed - heading.x) * k;
        heading.y += (vy / speed - heading.y) * k;
      }
      const angle = (Math.atan2(heading.y, heading.x) * 180) / Math.PI;

      // Counter the grab's spin so the light stays put in the room. The head's
      // own roll needs nothing: its bounding box, and so its light, never turn.
      const turn = `rotate(${f(-grab.roll)} 0.5 0.5)`;
      // The head is flatter front to back than across, so its highlight leans
      // a little with the face; the surface also gives slightly with the slosh.
      const leanX =
          clamp(pose.yaw, -24, 24) * 0.004 + (slosh.x * 0.3) / HEAD_UNITS,
        leanY =
          clamp(pose.pitch, -16, 16) * 0.004 + (slosh.y * 0.3) / HEAD_UNITS;
      const lean = `translate(${f(leanX)} ${f(leanY)})`;

      hotspot.setAttribute(
        "gradientTransform",
        `${turn} ${lean} translate(${HOTSPOT.x} ${HOTSPOT.y}) rotate(${f(angle)}) scale(${f(1 + 0.8 * energy)} ${f(1 - 0.3 * energy)}) rotate(${f(-angle)}) translate(${-HOTSPOT.x} ${-HOTSPOT.y})`,
      );
      specular?.setAttribute("gradientTransform", `${turn} ${lean}`);
      sheen?.setAttribute("gradientTransform", `${turn} ${lean}`);
      glow?.setAttribute("gradientTransform", turn);
      shade?.setAttribute(
        "gradientTransform",
        `${turn} translate(${f(leanX * 0.6)} ${f(leanY * 0.6)})`,
      );
      // Light focused through the sphere lands opposite the hot spot.
      caustic?.setAttribute(
        "gradientTransform",
        `${turn} translate(${f((slosh.x * 1.4) / HEAD_UNITS - leanX * 0.5)} ${f((slosh.y * 1.4) / HEAD_UNITS - leanY * 0.5)})`,
      );
      // The material drifts on its own slow clock, sits behind the curved
      // front so it shifts against each turn, and rides the slosh.
      if (material) {
        // Keep the reveal edge fixed to the shell while the colour beneath it
        // continues to drift and slosh. Every tap has an independent sweep.
        updateCharacterMaterialLayers(material, pose, grab.roll, time);
        const transform = `translate(${f(2.4 * Math.sin(time / 5300) - pose.yaw * 0.16 + slosh.x)} ${f(1.8 * Math.sin(time / 7100 + 1) - pose.pitch * 0.16 + slosh.y)}) rotate(${f(7 * Math.sin(time / 9700))} 32 31)`;
        for (const field of material.querySelectorAll(
          "[data-character-material]",
        ))
          field.setAttribute("transform", transform);
      }
      setEnergy(energy);
    },
  };
}
