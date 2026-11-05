import { SmoothSurface } from "@/components/ui/smooth-surface";
import Image from "next/image";

import discoveryImage from "../../../../public/media/humi/discovery.webp";
import employeesScreen from "../../../../public/media/humi/employees.png";
import importerImage from "../../../../public/media/humi/importer.webp";
import humiLogoImage from "../../../../public/media/humi/logo.svg";
import payrollHighlightImage from "../../../../public/media/humi/payroll-highlight.webp";
import payrollScreen from "../../../../public/media/humi/payroll.png";
import peopleDirectoryImage from "../../../../public/media/humi/people-directory.webp";
import peopleImage from "../../../../public/media/humi/people.webp";
import profileHighlightImage from "../../../../public/media/humi/profile-highlight.webp";
import researchImage from "../../../../public/media/humi/research.webp";
import timeOffScreen from "../../../../public/media/humi/time-off.png";
import timeoffHighlightImage from "../../../../public/media/humi/timeoff-highlight.webp";

import { HumiImpact } from "@/components/work/humi/impact";
import {
  type CaseStudyAnnotation,
  CaseStudy,
  CaseStudyCard,
  CaseStudyEnding,
  CaseStudyMedia,
  CaseStudySection,
  type TocSection,
} from "@/components/work/case-study";

const HUMI_SECTIONS: readonly TocSection[] = [
  { id: "problem", label: "Problem" },
  { id: "research", label: "Discovery" },
  { id: "solution", label: "Solution" },
  { id: "impact", label: "Impact" },
];

/*
 * The teardown over the legacy screens. Each mark names one problem the
 * Solution section below goes on to answer — the policy prose and the balances
 * against the time-off redesign, the manual payroll sync against payroll
 * running on the employee record, the flat employee table and the piled-up
 * actions against onboarding and the single record. Nothing here says what it
 * became: that is what the rest of the story is for.
 *
 * A bracket hugs the thing it describes and its note follows straight after,
 * in white space or the gutter beside the panel, running past the frame's edge
 * when it must rather than over the screen's content. The left margin is kept
 * narrow enough to clear the section rail.
 */
const TIME_OFF_MARKS: readonly CaseStudyAnnotation[] = [
  {
    mark: { x: 0.775, y: 0.322, h: 0.104, shape: "chevron" },
    note: { x: 0.792, w: 0.112, tilt: 1 },
    text: "Important information has weak hierarchy.",
  },
  {
    mark: { x: 0.903, y: 0.605, h: 0.16, shape: "chevron" },
    note: { x: 0.926, w: 0.17, tilt: -0.8 },
    text: "Policy rules were compressed into prose.",
  },
];

const PAYROLL_MARKS: readonly CaseStudyAnnotation[] = [
  {
    mark: { x: 0.905, y: 0.315, h: 0.08, shape: "chevron" },
    note: { x: 0.926, w: 0.17, tilt: -1 },
    text: "Payroll ran somewhere else.",
  },
  {
    mark: { x: 0.383, y: 0.645, h: 0.29, side: "left", shape: "chevron" },
    note: { x: 0.084, w: 0.27, tilt: 1 },
    text: "Syncing changes depended on admins noticing, transferring, and marking each task complete.",
  },
];

const EMPLOYEES_MARKS: readonly CaseStudyAnnotation[] = [
  {
    mark: { x: 0.904, y: 0.291, h: 0.096, shape: "chevron" },
    note: { x: 0.926, w: 0.19, tilt: -0.7 },
    text: "Understanding or managing an employee required moving between disconnected areas.",
  },
  {
    mark: { x: 0.088, y: 0.585, h: 0.295, side: "left", shape: "chevron" },
    note: { x: -0.12, w: 0.19, tilt: -1 },
    text: "As functionality grew, new actions were added beside existing ones instead of fitting into a clear hierarchy.",
  },
];

export function HumiCaseStudy() {
  return (
    <CaseStudy
      brand={{
        mark: (
          <SmoothSurface as="span" className="humi-logo">
            <Image
              alt=""
              height={44}
              loading="eager"
              src={humiLogoImage}
              width={44}
            />
          </SmoothSurface>
        ),
        name: "Humi",
      }}
      className="humi-case-study--flat"
      date="2018 – 2019 · Team of 30"
      heading="One system for the work behind work."
      lede="I spent a year and a half at Humi, joining as a design intern and staying on as its first Product Designer, leading a redesign of the entire product"
      mainId="humi-story"
      sections={HUMI_SECTIONS}
    >
      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="Five illustrated people representing the teams and employees Humi served"
          card
          ground="#fdfbf9"
          description="It wasn't where you paid them, or covered them — those lived elsewhere, through disconnected systems."
          lead
          src={peopleImage}
          title="Humi started as a better way for bootstrap startups to store employee data."
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="The redesigned Humi people directory"
          description="Helping position it as the go-to platform for HR, payroll, and benefits in Canada."
          eager
          ground="#fdfbf9"
          scrollScale
          src={peopleDirectoryImage}
          title="I designed a new Humi from the ground up."
        />
      </CaseStudyCard>

      <CaseStudySection id="problem">Problem</CaseStudySection>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="The legacy Humi time off screen, showing an employee's PTO policy"
          annotations={TIME_OFF_MARKS}
          description="The experience was riddled with fragmented controls and inconsistent patterns, and built on debt."
          plate
          src={timeOffScreen}
          title="Over time, the platform became unclear and complex."
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="The legacy Humi payroll digest, a checklist of changes to sync by hand"
          annotations={PAYROLL_MARKS}
          description="Non-tech-savvy users and those with accessibility needs struggled to use Humi."
          plate
          src={payrollScreen}
          title="The UI was dated, and couldn't scale."
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="The legacy Humi employee directory"
          annotations={EMPLOYEES_MARKS}
          description="The IA and design system could not support the flexibility needed to support the whole employee lifecycle."
          plate
          src={employeesScreen}
          title="A barrier to growth."
        />
      </CaseStudyCard>

      <CaseStudySection id="research">Discovery</CaseStudySection>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="A research database of feedback from Humi administrators"
          description="A survey I helped design drew 130 responses, shaping our early hypotheses and who we recruited for formative and evaluative interviews."
          ground="#0076dd"
          scrollScale
          src={researchImage}
          title="I partnered with the PM to interview HR admins."
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="Whiteboards, sketches, and sticky notes from Humi product discovery"
          description="Onboarding, payroll, benefits, and performance ran through a fragmented ecosystem of siloed tools and manual processes admins had to bridge by hand."
          ground="#00808b"
          scrollScale
          src={discoveryImage}
          title="We found that small HR teams were managing a surprisingly broad workload."
        />
      </CaseStudyCard>

      <CaseStudySection id="solution">Solution</CaseStudySection>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="A redesigned Humi payroll summary with obligations and cancellation controls"
          description="bringing calculations, tax obligations, filings and direct deposits into one place."
          ground="#ff4100"
          scrollScale
          src={payrollHighlightImage}
          title="I redesigned payroll runs around a 10-minute workflow,"
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="The Humi employee importer, matching spreadsheet columns to Humi fields"
          description="So we built a flexible importer that could handle whatever shape an admin's data came in, while cutting down the time employees spent on all the boring HR stuff."
          ground="#00808b"
          scrollScale
          src={importerImage}
          title="Onboarding was painful for everyone."
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="A redesigned Humi time-off request with balances and overlapping requests"
          description="Before submitting, users now see exactly how much time they'd have left and who else was already away, without checking calendars or asking around."
          ground="#0076dd"
          scrollScale
          src={timeoffHighlightImage}
          title="We made time off easier to plan."
        />
      </CaseStudyCard>

      <CaseStudyCard>
        <CaseStudyMedia
          expandable
          tilt={false}
          alt="A unified Humi employee profile showing time-off policies and request history"
          description="When payroll, compliance, benefits, and HR all draw from the same source of truth, your data stays consistent without anyone having to manually sync it."
          ground="#00808b"
          scrollScale
          src={profileHighlightImage}
          title="I anchored all of it to a single employee record."
        />
      </CaseStudyCard>

      <CaseStudySection id="impact">Impact</CaseStudySection>

      <HumiImpact />

      <CaseStudyEnding
        id="ending"
        next={{ href: "/work/anyday", label: "AnyDay" }}
      />
    </CaseStudy>
  );
}
