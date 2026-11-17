import { notFound } from "next/navigation";

import { FeedTagsLab } from "@/components/lab/feed-tags/feed-tags-lab";

export const metadata = {
  title: "Feed contribution tags",
  robots: { index: false, follow: false },
};

export default function FeedTagsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FeedTagsLab />;
}
