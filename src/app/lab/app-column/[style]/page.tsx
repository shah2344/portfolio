import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AppColumnLab,
  columnStudies,
} from "@/components/lab/app-column/app-column-lab";

export const metadata: Metadata = {
  title: "App column studies",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return columnStudies.map(({ slug }) => ({ style: slug }));
}

/* Ways to rework the app grid's right column: development only. */
export default async function AppColumnLabPage({
  params,
}: {
  params: Promise<{ style: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { style } = await params;
  return <AppColumnLab slug={style} />;
}
