import { notFound } from "next/navigation";
import { BrandHandoffLab } from "@/components/lab/brand-handoff/brand-handoff-lab";

export const metadata = {
  title: "Brand handoff study",
  robots: { index: false, follow: false },
};
export default function BrandHandoffPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BrandHandoffLab />;
}
