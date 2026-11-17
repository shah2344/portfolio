import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomeLab, homeStudies } from "@/components/lab/home/home-lab";

export const metadata: Metadata = {
  title: "Homepage studies",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return homeStudies.map(({ slug }) => ({ style: slug }));
}

/* A working surface for comparing homepage directions: development only. */
export default async function HomeLabPage({
  params,
}: {
  params: Promise<{ style: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { style } = await params;
  return <HomeLab slug={style} />;
}
