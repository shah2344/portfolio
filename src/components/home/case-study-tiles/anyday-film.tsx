import Image, { type StaticImageData } from "next/image";

import anydayCardStill from "../../../../public/media/anyday/anyday-card-still.webp";

import styles from "./anyday-film.module.css";
import { ReflectedFilm } from "./reflected-film";

export type FilmScene = { src: StaticImageData; alt: string };

/**
 * The product film plays over its opening still. The still's baked reflection
 * remains behind the copy, preserving the warm haze without per-frame drawing.
 */
export function AnyDayFilm({
  className,
  film,
  priority = false,
  sizes,
}: {
  className?: string;
  film: { src: string; width: number; height: number; title: string };
  /** The film is on the first screen, so its stand-in paints with the page. */
  priority?: boolean;
  sizes: string;
}) {
  return (
    /* The stage is exactly the film's box; everything else in it is laid
       over it. */
    <div className={`${styles.stage} ${className ?? ""}`}>
      {/* The stand-in also holds the film's place while Safari decodes the
          arriving frame. */}
      <div aria-hidden="true" className={styles.still}>
        <Image
          alt=""
          fetchPriority={priority ? "high" : undefined}
          fill
          preload={priority}
          sizes={sizes}
          src={anydayCardStill}
        />
      </div>

      <ReflectedFilm
        height={film.height}
        src={film.src}
        title={film.title}
        width={film.width}
      />
    </div>
  );
}
