import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";

import { companyMarks } from "@/components/home/experience/list";

/** A company named in running prose, led by its mark at the text's size. */
export function Company({ name }: { name: string }) {
  const mark = companyMarks[name];
  return (
    // The mark and the name wrap as one word, so a line never ends on a logo.
    <span className="intro-company">
      <SmoothSurface
        as="span"
        aria-hidden="true"
        className={
          mark
            ? `intro-company__mark intro-company__mark--${mark.slug}`
            : "intro-company__mark"
        }
      >
        {mark ? <Image alt="" sizes="40px" src={mark.src} /> : name.charAt(0)}
      </SmoothSurface>
      {name}
    </span>
  );
}
