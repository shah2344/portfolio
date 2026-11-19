"use client";

import { m } from "motion/react";

/* components/ui/highlight-text.tsx, verbatim (motion.span -> m.span). */

interface HighlightTextProps {
  text: string;
  highlight: string;
  className?: string;
}

export function HighlightText({
  text,
  highlight,
  className = "",
}: HighlightTextProps) {
  if (!highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  const searchWords = highlight
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const pattern = searchWords
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = searchWords.some(
          (word) => part.toLowerCase() === word.toLowerCase(),
        );

        return isMatch ? (
          <m.span
            key={`highlight-${index}-${part}`}
            initial={false}
            animate={{ backgroundSize: "100% 100%" }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
            style={{
              background: "linear-gradient(90deg, #fef08a 0%, #fef08a 100%)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "left center",
              backgroundSize: "100% 100%",
              padding: "0",
              borderRadius: "var(--radius-1)",
            }}
          >
            {part}
          </m.span>
        ) : (
          <span key={`text-${index}-${part}`}>{part}</span>
        );
      })}
    </span>
  );
}
