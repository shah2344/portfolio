import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";

/**
 * The brand tile the experience list and case-study headers already draw —
 * same classes, same corner, same lighting — at whatever size a layout needs.
 */
export function ProjectMark({
  className,
  project,
  size = 44,
}: {
  className?: string;
  project: { id: string; logo: StaticImageData };
  size?: number;
}) {
  return (
    <SmoothSurface
      as="span"
      aria-hidden="true"
      className={`experience-item__mark experience-item__mark--${project.id} ${className ?? ""}`}
      style={{ "--mark-size": `${size}px` } as CSSProperties}
    >
      <Image
        alt=""
        src={project.logo}
        style={
          project.id === "humi" ? { height: "var(--mark-size)" } : undefined
        }
      />
    </SmoothSurface>
  );
}
