import type { CSSProperties } from "react";

import { FooterSignature } from "@/components/home/footer/signature";
import { HomeReplyNote } from "@/components/home/footer/reply-note";

/**
 * The shared footer used by the homepage and case studies. Case studies end on
 * the contact note alone, without the copyright and signature row.
 */
export function HomeFooter({
  className,
  entrance = false,
  contactOnly = false,
  style,
}: {
  className?: string;
  entrance?: boolean;
  contactOnly?: boolean;
  style?: CSSProperties;
}) {
  return (
    <footer
      className={["home-footer", className].filter(Boolean).join(" ")}
      data-home-enter={entrance ? "idle" : undefined}
      data-home-enter-kind={entrance ? "surface" : undefined}
      style={style}
    >
      <div className="home-contact">
        <p>
          For new roles or collaborations, reach me at{" "}
          <a href="mailto:shahrozm1@gmail.com">shahrozm1@gmail.com</a>.
        </p>
        <HomeReplyNote className="home-contact__reply" />
      </div>
      {contactOnly ? null : (
        <>
          <p className="home-footer__rule" />
          <div className="home-footer__row">
            <div className="home-footer__text">
              <p>© 2026 Muhammad Shahid</p>
            </div>
            <FooterSignature />
          </div>
        </>
      )}
    </footer>
  );
}
