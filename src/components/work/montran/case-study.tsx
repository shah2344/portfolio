import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";
import montranLogoImage from "../../../../public/media/montran/logo-mark.svg";
import montranShowcase from "../../../../public/media/montran/showcase.png";

import {
  CaseStudy,
  CaseStudyCard,
  CaseStudyEnding,
  CaseStudyMedia,
  CaseStudySection,
  type TocSection,
} from "@/components/work/case-study";

const MONTRAN_SECTIONS: readonly TocSection[] = [
  { id: "problem", label: "Problem" },
  { id: "research", label: "Discovery" },
  { id: "solution", label: "Solution" },
  { id: "impact", label: "Impact" },
];

/**
 * A blank scaffold in the shape of the AnyDay and Humi stories: the same rail,
 * dividers, frames, and ending, with the media and copy still to be written.
 */
export function MontranCaseStudy() {
  return (
    <CaseStudy
      brand={{
        mark: (
          <SmoothSurface
            as="span"
            className="montran-logo montran-logo--header"
          >
            <Image
              alt=""
              height={24}
              loading="eager"
              src={montranLogoImage}
              width={24}
            />
          </SmoothSurface>
        ),
        name: "Montran",
      }}
      date="Sep 2018 – Present"
      heading="Building Montran's design system."
      lede="I joined Montran as a contractor to rebuild the front end of its brand as a system — the variables, foundations, and components behind a bank-grade marketing site."
      mainId="montran-story"
      sections={MONTRAN_SECTIONS}
    >
      <CaseStudyCard>
        <CaseStudyMedia
          alt="A curated Montran design-system showcase with editorial cards, teal buttons, arrow controls, text input, and upload components."
          lead
          src={montranShowcase}
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia />
      </CaseStudyCard>

      <CaseStudySection id="problem">Problem</CaseStudySection>

      <CaseStudyCard>
        <CaseStudyMedia />
      </CaseStudyCard>

      <CaseStudySection id="research">Discovery</CaseStudySection>

      <CaseStudyCard>
        <CaseStudyMedia />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia />
      </CaseStudyCard>

      <CaseStudySection id="solution">Solution</CaseStudySection>

      <CaseStudyCard>
        <CaseStudyMedia />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia />
      </CaseStudyCard>

      <CaseStudyEnding
        heading="Impact"
        next={{ href: "/work/humi", label: "Humi" }}
      />
    </CaseStudy>
  );
}
