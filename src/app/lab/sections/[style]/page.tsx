import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  SectionLab,
  separatorStudies,
} from "@/components/lab/sections/section-lab";

export const metadata: Metadata = {
  title: "Section separators",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return separatorStudies.map(({ slug }) => ({ style: slug }));
}

/* Ways to divide the homepage's sections: development only. */
export default async function SectionLabPage({
  params,
}: {
  params: Promise<{ style: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { style } = await params;
  return <SectionLab slug={style} />;
}
