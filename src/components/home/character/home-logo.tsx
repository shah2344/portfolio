"use client";

import { Fragment, useId, useLayoutEffect, useRef } from "react";
import { BrandMark } from "@/components/motion/brand-turn";
import { startHomeCharacter, type CharacterOptions } from "./motion";
import { HomeCharacterBackground } from "./background";
import { characterGeometry } from "./geometry";
import {
  restingPose,
  type CharacterBreathing,
  type CharacterTreatment,
} from "./pose";
import styles from "./home-logo.module.css";

export const HOME_CHARACTER_TREATMENT: CharacterTreatment = "filled";
// Compared at /lab/character; the homepage uses one.
export const HOME_CHARACTER_BREATHING: CharacterBreathing = "combined";

// These overlapping weights sum to one at every height. The filter adds the
// premultiplied bands, avoiding seams or repeated silhouettes between blur levels.
const diffusionMask = (stops: [number, number][]) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 96 96"><defs><linearGradient id="weight" gradientUnits="userSpaceOnUse" x1="0" y1="3" x2="0" y2="59">${stops.map(([offset, opacity]) => `<stop offset="${offset}" stop-color="white" stop-opacity="${opacity}"/>`).join("")}</linearGradient></defs><rect x="-16" y="-16" width="96" height="96" fill="url(#weight)"/></svg>`,
  )}`;
// Blur values are displayed pixels; convert to the 58-unit viewBox below. The
// radius roughly doubles per band, so each step reads as the same change, and
// each band peaks where its neighbours fall to zero.
const diffusionLevels = [
  { blur: 0, at: 0 },
  { blur: 0.75, at: 0.25 },
  { blur: 1.75, at: 0.5 },
  { blur: 3.25, at: 0.75 },
  { blur: 5.5, at: 1 },
];
const diffusionBands = diffusionLevels.map(({ blur, at }, index) => {
  const previous = diffusionLevels[index - 1]?.at;
  const next = diffusionLevels[index + 1]?.at;
  const stops: [number, number][] =
    previous === undefined
      ? [[0, 1]]
      : [
          [0, 0],
          [previous, 0],
        ];
  stops.push([at, 1]);
  if (next !== undefined) stops.push([next, 0], [1, 0]);
  return { blur, mask: diffusionMask(stops) };
});
// The grain tile is 128 device pixels, one noise dot to each pixel; in viewBox
// units that depends on the pixel ratio, so CSS shows the matching pattern.
const GRAIN_TILE = 128;
const grainPatterns = [1, 2].map((ratio) => ({
  ratio,
  size: ((GRAIN_TILE / ratio) * 58) / 44,
}));

/** The interactive shell stays outside the brand mark's frame. */
export function HomeLogo({
  treatment = HOME_CHARACTER_TREATMENT,
  preview = false,
  flat = false,
  oldMouth = false,
  breathing = HOME_CHARACTER_BREATHING,
  seed,
}: CharacterOptions = {}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  useLayoutEffect(() => {
    if (ref.current)
      return startHomeCharacter(ref.current, {
        treatment,
        preview,
        flat,
        oldMouth,
        breathing,
        seed,
      });
  }, [treatment, preview, flat, oldMouth, breathing, seed]);
  const geometry = characterGeometry(restingPose(), treatment, flat, oldMouth);
  const artwork = (
    <svg
      ref={ref}
      className={styles.character}
      width="44"
      height="44"
      viewBox={treatment === "filled" ? "3 2 58 58" : "0 0 64 64"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={`${id}-diffusion`}
          filterUnits="userSpaceOnUse"
          x="-16"
          y="-16"
          width="96"
          height="96"
          colorInterpolationFilters="sRGB"
        >
          {diffusionBands.map(({ blur, mask }, index) => (
            <Fragment key={index}>
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={(blur * 58) / 44}
                result={`blur-${index}`}
              />
              <feImage
                href={mask}
                x="-16"
                y="-16"
                width="96"
                height="96"
                preserveAspectRatio="none"
                result={`weight-${index}`}
              />
              <feComposite
                in={`blur-${index}`}
                in2={`weight-${index}`}
                operator="in"
                result={`band-${index}`}
              />
            </Fragment>
          ))}
          {diffusionBands.slice(1).map((_, index) => (
            <feComposite
              key={index}
              in={index ? `sum-${index}` : "band-0"}
              in2={`band-${index + 1}`}
              operator="arithmetic"
              k2="1"
              k3="1"
              result={`sum-${index + 1}`}
            />
          ))}
        </filter>
        <linearGradient
          id={`${id}-diffusion-opacity`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="3"
          x2="0"
          y2="59"
        >
          {/* Eased rather than linear, so the fade has no visible knee. The
              base stays mostly solid: the orb dissolves, it doesn't vanish. */}
          <stop offset="0" stopColor="white" />
          <stop offset="0.34" stopColor="white" />
          <stop
            offset="0.54"
            stopColor="white"
            style={{ stopOpacity: "var(--character-diffusion-middle, 0.94)" }}
          />
          <stop
            offset="0.74"
            stopColor="white"
            style={{ stopOpacity: "var(--character-diffusion-lower, 0.83)" }}
          />
          <stop
            offset="1"
            stopColor="white"
            style={{ stopOpacity: "var(--character-diffusion-bottom, 0.6)" }}
          />
        </linearGradient>
        <mask
          id={`${id}-diffusion-fade`}
          maskUnits="userSpaceOnUse"
          x="-16"
          y="-16"
          width="96"
          height="96"
          style={{ maskType: "alpha" }}
        >
          <rect
            x="-16"
            y="-16"
            width="96"
            height="96"
            fill={`url(#${id}-diffusion-opacity)`}
            stroke="none"
          />
        </mask>
        {/* Bare monochrome glass until the colour mesh arrives. */}
        <radialGradient id={`${id}-glass-base`} cx="28%" cy="22%" r="90%">
          <stop offset="0" stopColor="#f5f5f3" />
          <stop offset="0.5" stopColor="#c4c4c6" />
          <stop offset="0.82" stopColor="#8a8a8e" />
          <stop offset="1" stopColor="#4a4a4e" />
        </radialGradient>
        {/* Light caught inside the edge: strongest at the top, gone through
            the middle, and a weaker bounce along the bottom. */}
        <linearGradient
          id={`${id}-glass-glow`}
          data-glass="glow"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.3" stopColor="white" stopOpacity="0.4" />
          <stop offset="0.55" stopColor="white" stopOpacity="0" />
          <stop offset="0.7" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="0.6" />
        </linearGradient>
        {/* The specular arc, toward the light at the upper left. */}
        <linearGradient
          id={`${id}-glass-specular`}
          data-glass="specular"
          x1="0.1"
          y1="0"
          x2="0.72"
          y2="0.68"
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.45" stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id={`${id}-glass-sheen`}
          data-glass="sheen"
          cx="0.36"
          cy="0.1"
          r="0.85"
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        {/* Orb volume: the material darkens toward the limb away from the
            light, so the disc reads as a sphere rather than a sticker. */}
        <radialGradient
          id={`${id}-glass-shade`}
          data-glass="shade"
          cx="0.4"
          cy="0.34"
          r="0.78"
        >
          <stop offset="0" stopColor="#0a0d24" stopOpacity="0" />
          <stop offset="0.38" stopColor="#0a0d24" stopOpacity="0" />
          <stop offset="0.7" stopColor="#0a0d24" stopOpacity="0.3" />
          <stop offset="1" stopColor="#0a0d24" stopOpacity="0.8" />
        </radialGradient>
        {/* Light through a glass sphere gathers on the side opposite it. */}
        <radialGradient
          id={`${id}-glass-caustic`}
          data-glass="caustic"
          cx="0.6"
          cy="0.9"
          r="0.58"
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.35" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        {/* The hot spot of the light source, tucked into the upper left. */}
        <radialGradient
          id={`${id}-glass-hotspot`}
          data-glass="hotspot"
          cx="0.28"
          cy="0.18"
          r="0.28"
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.25" stopColor="white" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter
          id={`${id}-glass-soften`}
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        {/* The eye rim catches light on two opposite corners, upper right and
            lower left, and fades along the sides between them. Bounding-box
            units keep the shine on those corners as each eye squashes. */}
        <linearGradient
          id={`${id}-eye-shine`}
          data-eye-shine=""
          x1="1"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0" stopColor="white" />
          <stop offset="0.24" stopColor="white" stopOpacity="0.45" />
          <stop offset="0.42" stopColor="white" stopOpacity="0.12" />
          <stop offset="0.58" stopColor="white" stopOpacity="0.12" />
          <stop offset="0.76" stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" stopOpacity="0.9" />
        </linearGradient>
        <filter
          id={`${id}-eye-shine-bloom`}
          filterUnits="userSpaceOnUse"
          x="-16"
          y="-16"
          width="96"
          height="96"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        <clipPath id={`${id}-glass-clip`}>
          <path data-glass-edge="" d={geometry.head} />
        </clipPath>
        {grainPatterns.map(({ ratio, size }) => (
          <pattern
            key={ratio}
            id={`${id}-glass-grain-${ratio}x`}
            patternUnits="userSpaceOnUse"
            width={size}
            height={size}
          >
            <image
              href="/images/character-grain.png"
              width={size}
              height={size}
              className={styles.grainTile}
            />
          </pattern>
        ))}
      </defs>
      <g
        filter={treatment === "filled" ? `url(#${id}-diffusion)` : undefined}
        mask={treatment === "filled" ? `url(#${id}-diffusion-fade)` : undefined}
      >
        <path
          id={`${id}-shell`}
          data-shell=""
          d={geometry.head}
          className={styles.shell}
          strokeWidth="2.9"
          style={
            treatment === "filled"
              ? { fill: `url(#${id}-glass-base)` }
              : undefined
          }
        />
        {treatment === "filled" && (
          <g
            clipPath={`url(#${id}-glass-clip)`}
            className={styles.glass}
            pointerEvents="none"
          >
            <HomeCharacterBackground />
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassShade}
              fill={`url(#${id}-glass-shade)`}
              stroke="none"
            />
            {/* Frosted grain in the material, under the surface lights so
                they stay clean. Fixed to the orb while the colour drifts. */}
            {grainPatterns.map(({ ratio }) => (
              <rect
                key={ratio}
                data-grain={`${ratio}x`}
                x="-16"
                y="-16"
                width="96"
                height="96"
                className={styles.glassGrain}
                fill={`url(#${id}-glass-grain-${ratio}x)`}
                stroke="none"
              />
            ))}
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassCaustic}
              fill={`url(#${id}-glass-caustic)`}
              stroke="none"
            />
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassSheen}
              fill={`url(#${id}-glass-sheen)`}
              stroke="none"
            />
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassHotspot}
              fill={`url(#${id}-glass-hotspot)`}
              stroke="none"
            />
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassEdge}
              fill="none"
              stroke="#171b30"
              strokeWidth="2.9"
            />
            {/* Strokes centred on the outline and clipped to it, so the light
                stays inside the edge wherever the head moves or squashes. */}
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassGlow}
              fill="none"
              stroke={`url(#${id}-glass-glow)`}
              strokeWidth="7"
              filter={`url(#${id}-glass-soften)`}
            />
            <path
              data-glass-edge=""
              d={geometry.head}
              className={styles.glassSpecular}
              fill="none"
              stroke={`url(#${id}-glass-specular)`}
              strokeWidth="1.7"
            />
          </g>
        )}
      </g>
      <g data-head="">
        {geometry.eyes.map((eye, index) => (
          <g key={index} data-eye="" strokeWidth={index ? 2.45 : 2.35}>
            <defs>
              <clipPath id={`${id}-eye-${index}`}>
                <path data-aperture="" d={eye.aperture} />
              </clipPath>
              <mask
                id={`${id}-eye-rim-${index}`}
                maskUnits="userSpaceOnUse"
                x="-16"
                y="-16"
                width="96"
                height="96"
              >
                <rect x="-16" y="-16" width="96" height="96" fill="white" />
                <path
                  data-eye-rim-mask=""
                  d={eye.aperture}
                  fill="black"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </mask>
            </defs>
            {/* A wide, blurred copy of the rim lets the shine spread past the
                edge; the mask keeps both outside the eye. */}
            <path
              data-eye-bloom=""
              d={eye.aperture}
              mask={`url(#${id}-eye-rim-${index})`}
              className={styles.eyeBloom}
              fill="none"
              stroke={`url(#${id}-eye-shine)`}
              strokeWidth="3.2"
              strokeLinejoin="round"
              filter={`url(#${id}-eye-shine-bloom)`}
            />
            <path
              data-eye-rim=""
              d={eye.aperture}
              mask={`url(#${id}-eye-rim-${index})`}
              className={styles.eyeRim}
              fill="none"
              stroke={`url(#${id}-eye-shine)`}
              strokeWidth="1.32"
              strokeLinejoin="round"
            />
            <path
              data-eye-fill=""
              d={eye.aperture}
              fill="currentColor"
              stroke="none"
            />
            <path
              data-eye-outline=""
              d={eye.aperture}
              clipPath={`url(#${id}-eye-${index})`}
              fill="none"
              stroke="var(--character-eye-outline)"
              strokeWidth="5.8"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${id}-eye-${index})`}>
              <path
                data-pupil=""
                d={eye.pupil}
                className={styles.pupil}
                stroke="none"
              />
            </g>
            <path data-upper="" d={eye.upper} />
            <path data-lower="" d={eye.lower} />
          </g>
        ))}
        <path
          data-mouth=""
          d={geometry.mouth}
          fill="currentColor"
          strokeWidth="2.4"
        />
      </g>
    </svg>
  );
  return (
    <span
      className={styles.root}
      data-character-root=""
      data-treatment={treatment}
    >
      <button
        type="button"
        className={styles.play}
        data-character-play=""
        aria-describedby={`${id}-interaction`}
        aria-label={
          treatment === "filled"
            ? "Play with character and change its background"
            : "Play with character"
        }
      >
        {preview ? artwork : <BrandMark>{artwork}</BrandMark>}
      </button>
      <span id={`${id}-interaction`} className="sr-only">
        Tap to make it happy. Drag to pull the character, then release to let it
        spring home. It may wriggle free if held.
      </span>
    </span>
  );
}
