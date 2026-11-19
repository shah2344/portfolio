import { notFound, redirect } from "next/navigation";

/* The studies live one per page; the bare address opens the current one. */
export default function AppColumnLabIndexPage() {
  if (process.env.NODE_ENV === "production") notFound();
  redirect("/lab/app-column/0");
}
