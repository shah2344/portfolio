"use client";

import { useLayoutEffect, useId, useRef } from "react";
import { startHomeCharacter } from "./baseline-motion";
import styles from "./baseline.module.css";

const upper = "M-13 0C-13.4-21.5 13.2-20.8 13 .25";
const lower = "M-13 0C-12.7 23.3 13.5 23.9 13 .25";
const aperture = `${upper}C13.5 23.9-12.7 23.3-13 0Z`;

/** The homepage's quietly curious, hand-drawn masthead character. */
export function BaselineCharacter({ paused = false }: { paused?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  useLayoutEffect(() => {
    if (ref.current) return startHomeCharacter(ref.current, paused);
  }, [paused]);
  return (
    <svg
      ref={ref}
      className={styles.character}
      width="44"
      height="44"
      viewBox="90 86 60 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <g data-head="">
        {[0, 1].map((index) => (
          <g
            key={index}
            data-eye=""
            transform={
              index === 0 ? "translate(108.5 110.7)" : "translate(131.5 109.3)"
            }
            strokeWidth={index === 0 ? 2.35 : 2.45}
          >
            <defs>
              <clipPath id={`${id}-eye-${index}`}>
                <path data-aperture="" d={aperture} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id}-eye-${index})`}>
              <ellipse rx="14" ry="20" fill="currentColor" stroke="none" />
              <path
                data-pupil=""
                d="M-5.2 .1C-5.5-5.5-3.1-8.9 .2-8.7C3.7-8.6 5.5-4.9 5.3 .3C5.4 5.6 3.1 8.9-.2 8.7C-3.7 8.8-5.5 5.1-5.2 .1Z"
                fill="var(--site-background)"
                stroke="none"
              />
            </g>
            <path data-upper="" d={upper} />
            <path data-lower="" d={lower} />
          </g>
        ))}
        <path data-mouth="" d="M116 143.15Q119.7 144.8 124 142.85" />
      </g>
    </svg>
  );
}
