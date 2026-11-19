import { ContactLink } from "@/components/home/footer/contact-link";
import { FooterSignature } from "@/components/home/footer/signature";
import { HomeReplyNote } from "@/components/home/footer/reply-note";

/** The homepage's footer: the contact note, then the copyright and signature. */
export function HomeFooter({ className }: { className?: string }) {
  return (
    <footer className={["home-footer", className].filter(Boolean).join(" ")}>
      <div className="home-contact">
        <p>
          For new roles or collaborations, reach me at{" "}
          <ContactLink href="mailto:hello@muhammad.design">
            hello@muhammad.design
          </ContactLink>
          .
        </p>
        <HomeReplyNote className="home-contact__reply" />
      </div>
      <p className="home-footer__rule" />
      <div className="home-footer__row">
        <div className="home-footer__text">
          <p>© 2026 Muhammad Shahid</p>
        </div>
        <FooterSignature />
      </div>
    </footer>
  );
}
