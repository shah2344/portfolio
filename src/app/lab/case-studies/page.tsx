import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseStudyLab } from "@/components/lab/case-studies/case-study-lab";

export const metadata: Metadata = {
  title: "Case study variations",
  robots: { index: false, follow: false },
};

/*
 * A working surface for comparing homepage directions, not a page of the
 * site: it exists in development only and 404s in a production build.
 */
export default function CaseStudyLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CaseStudyLab />;
}
