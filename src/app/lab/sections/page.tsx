import { notFound, redirect } from "next/navigation";

/* The studies live one per page; the bare address opens the first. */
export default function SectionLabIndexPage() {
  if (process.env.NODE_ENV === "production") notFound();
  redirect("/lab/sections/1");
}
