import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { PlaygroundTile } from "@/components/home/playground/tile";

/**
 * The three widths a figure row can take, mirroring the editorial layout: the
 * reading column itself, a step past it, and the full page. Every row centres
 * on the page rather than breaking out of the column, so the prose above and
 * the frames below share one axis.
 */
type FigureRowWidth = "column" | "wide" | "full";

/**
 * A centred row of one to three figures. `joined` closes the row up to the one
 * above it, so the two read as a single set.
 */
export function AnyDayFigureRow({
  children,
  joined = false,
  width = "column",
}: {
  children: ReactNode;
  joined?: boolean;
  width?: FigureRowWidth;
}) {
  const className = ["anyday-row", `anyday-row--${width}`];
  if (joined) className.push("anyday-row--joined");

  return <div className={className.join(" ")}>{children}</div>;
}

interface AnyDayFigureProps {
  alt?: string;
  /** `width / height` of the frame, so a placeholder holds the real export's shape. */
  aspect: string;
  caption?: string;
  eager?: boolean;
  /** The artwork's ground, filling any transparent exported corners. */
  ground?: string;
  height?: number;
  /**
   * What belongs in this frame. Shown inside the placeholder while the export
   * is still missing, and dropped once `src` arrives.
   */
  label: string;
  sizes?: string;
  src?: string;
  /** Serve the file as exported, skipping a second lossy encode of fine UI text. */
  unoptimized?: boolean;
  width?: number;
}

/**
 * One screen in a rounded frame with its caption underneath. Without `src` the
 * frame renders as a labelled placeholder that holds the export's aspect
 * ratio, so the page reads at its final rhythm before the artwork lands.
 */
export function AnyDayFigure({
  alt = "",
  aspect,
  caption,
  eager = false,
  ground,
  height,
  label,
  sizes = "(min-width: 64rem) 984px, calc(100vw - 2.5rem)",
  src,
  unoptimized = false,
  width,
}: AnyDayFigureProps) {
  return (
    <figure className="anyday-figure">
      {/* The frame clips its media, so the lift is cast here. */}
      <div className="anyday-figure__lift">
        <SmoothSurface
          as="div"
          className={[
            "anyday-figure__frame",
            src ? null : "anyday-figure__frame--empty",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            {
              aspectRatio: aspect,
              ...(ground ? { "--anyday-plate": ground } : {}),
            } as CSSProperties
          }
        >
          {src && width && height ? (
            <PlaygroundTile
              asContainer
              className="anyday-figure__zoom"
              label={label}
              style={{ aspectRatio: `${width} / ${height}` }}
            >
              <Image
                alt={alt}
                fetchPriority={eager ? "high" : "auto"}
                height={height}
                loading={eager ? "eager" : "lazy"}
                sizes={sizes}
                src={src}
                unoptimized={unoptimized}
                width={width}
              />
            </PlaygroundTile>
          ) : (
            <span aria-hidden="true" className="anyday-figure__placeholder">
              {label}
            </span>
          )}
        </SmoothSurface>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
