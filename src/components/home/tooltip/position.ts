import type { Point } from "./motion";

/** The anchor sits at the pill's bottom centre, with room for its shadow. */
export function placeHomeTooltip(
  point: Point,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const gutter = 12;
  const half = Math.min(size.width / 2 + gutter, viewport.width / 2);
  return {
    x: Math.max(half, Math.min(viewport.width - half, point.x)),
    y: Math.max(
      size.height + gutter,
      Math.min(viewport.height - gutter, point.y),
    ),
  };
}

/** Focused cards can be partly outside the viewport after native Tab scroll. */
export function homeTooltipFocusPoint(
  box: { left: number; right: number; top: number; bottom: number },
  viewport: { width: number; height: number },
  placement: "top" | "bottom" = "top",
): Point | null {
  if (
    box.bottom <= 0 ||
    box.top >= viewport.height ||
    box.right <= 0 ||
    box.left >= viewport.width
  )
    return null;
  return {
    x: (Math.max(0, box.left) + Math.min(viewport.width, box.right)) / 2,
    // The follower is positioned by its bottom edge; the pill is 30px tall.
    y: placement === "bottom" ? box.bottom + 4 + 30 : box.top - 8,
  };
}
