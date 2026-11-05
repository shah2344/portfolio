import type { StaticImageData } from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * A Remix Icon, imported from `remixicon/icons/...` as a static asset and
 * painted as a mask so it takes `currentColor` and follows hover and focus
 * colour like text. Sized at `1em` by default; set `width`/`height` or
 * `font-size` on it to change that. Always decorative: name the control that
 * holds it instead.
 *
 * The bundlers disagree on what an SVG import from a package is: webpack (the
 * build) gives image data with a `src`, Turbopack (dev) the bare URL.
 */
type IconAsset = StaticImageData | string;

const url = (icon: IconAsset) =>
  `url("${typeof icon === "string" ? icon : icon.src}")`;

export function RemixIcon({
  className,
  icon,
}: {
  className?: string;
  icon: IconAsset;
}) {
  const style = { "--remix-icon": url(icon) } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={cn("remix-icon", className)}
      style={style}
    />
  );
}
