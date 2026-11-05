"use client";

import { useEffect, useState } from "react";
import Scritto from "@scritto/react";

import { useAfterWipe } from "@/components/motion/use-after-wipe";

import {
  REPLY_NOTE_FALLBACK,
  replyParts,
  replySentence,
  type ReplyParts,
} from "./toronto-time";

/**
 * When to expect a reply, by the time in Toronto. Checked each minute; Scritto
 * rolls the time forward, and the words around it change only with the hour.
 * The flow slides the rest of the sentence along as the time changes width.
 * It splits its plain text into words when it mounts, so only the Scritto
 * values may change after that. Mounting it walks the page's styles, so a
 * page arriving through a zoom keeps the plain sentence until it has landed.
 */
export function HomeReplyNote({ className }: { className?: string }) {
  const [reply, setReply] = useState<ReplyParts | null>(null);
  const settled = useAfterWipe();

  useEffect(() => {
    if (!settled) return;
    const update = () => {
      if (document.hidden) return;
      const next = replyParts(new Date());
      // Keep the same object until the minute turns, so nothing re-renders.
      setReply((prev) =>
        prev && replySentence(prev) === replySentence(next) ? prev : next,
      );
    };
    update();
    // Read the current instant on each tick so the note recovers after suspension.
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [settled]);

  if (!reply) return <p className={className}>{REPLY_NOTE_FALLBACK}</p>;

  return (
    <p className={className}>
      <span className="sr-only">{replySentence(reply)}</span>
      <scritto-flow aria-hidden="true">
        It&rsquo;s{" "}
        <Scritto
          className="home-contact__time"
          respectMotionPreference
          trend={1}
          value={reply.day ? `${reply.time} ${reply.day}` : reply.time}
        />{" "}
        in Toronto &mdash;{" "}
        <Scritto respectMotionPreference value={reply.promise} />
      </scritto-flow>
    </p>
  );
}
