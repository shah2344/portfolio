"use client";

import { useEffect, useId, useRef } from "react";

import { M_STROKE, S_DOT, S_FLOURISH, S_LOOP } from "./signature-paths";

/**
 * Signs the footer once all of it is on screen. On the homepage the footer
 * waits pinned under the feed's sheet, so being inside the viewport is not
 * enough: the sheet has to have lifted clear of its top edge too.
 */
export function FooterSignature() {
  const ref = useRef<SVGSVGElement>(null);
  const inkId = `${useId()}-ink`;

  useEffect(() => {
    const signature = ref.current;
    const footer = signature?.closest("footer");
    if (!signature || !footer) return;
    const cover = footer.closest(".home-reveal")
      ? footer.previousElementSibling
      : null;

    let frame = 0;
    const check = () => {
      frame = 0;
      const box = footer.getBoundingClientRect();
      // A pixel of slack, for edges that land between device pixels.
      const inView =
        box.bottom <= window.innerHeight + 1 &&
        (box.top >= -1 || box.height > window.innerHeight);
      const uncovered =
        !cover || cover.getBoundingClientRect().bottom <= box.top + 1;
      if (!inView || !uncovered) return;
      signature.dataset.signed = "true";
      stop();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    // Captured, so a scroll in any container the page is read in counts.
    const options = { capture: true, passive: true } as const;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, options);
      window.removeEventListener("resize", schedule);
    };

    window.addEventListener("scroll", schedule, options);
    window.addEventListener("resize", schedule);
    schedule();
    return stop;
  }, []);

  return (
    <svg
      aria-label="Signed, Muhammad Shahid"
      className="home-footer__signature"
      data-signed="false"
      ref={ref}
      role="img"
      viewBox="75 95 312 210"
    >
      <defs>
        {/* Fine grain roughens the edges and a faint bleed lets the ink soak. */}
        <filter
          colorInterpolationFilters="sRGB"
          height="140%"
          id={inkId}
          width="120%"
          x="-10%"
          y="-20%"
        >
          <feTurbulence
            baseFrequency="0.7"
            numOctaves={2}
            result="grain"
            seed={7}
            type="fractalNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            result="rough"
            scale={1.8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feGaussianBlur in="rough" result="bleed" stdDeviation={0.6} />
          <feComponentTransfer in="bleed" result="halo">
            <feFuncA slope={0.45} type="linear" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="rough" />
          </feMerge>
        </filter>
      </defs>
      <g className="home-footer__ink" filter={`url(#${inkId})`}>
        <path
          className="home-footer__pen home-footer__pen--m"
          d={M_STROKE}
          pathLength={1}
        />
        <path
          className="home-footer__pen home-footer__pen--loop"
          d={S_LOOP}
          pathLength={1}
        />
        <path
          className="home-footer__pen home-footer__pen--flourish"
          d={S_FLOURISH}
          pathLength={1}
        />
        <circle
          className="home-footer__dot"
          cx={S_DOT.x}
          cy={S_DOT.y}
          r={S_DOT.r}
        />
      </g>
    </svg>
  );
}
