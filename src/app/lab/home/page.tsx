import { notFound, redirect } from "next/navigation";

/* The studies live one per page; the bare address opens the first. */
export default function HomeLabIndexPage() {
  if (process.env.NODE_ENV === "production") notFound();
  redirect("/lab/home/1");
}
