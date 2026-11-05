import { notFound } from "next/navigation";
import { CharacterLab } from "@/components/home/character-lab/character-lab";

export const metadata = {
  title: "Character study",
  robots: { index: false, follow: false },
};
export default function CharacterPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CharacterLab />;
}
