import { ContactLink } from "@/components/home/footer/contact-link";
import { FooterSignature } from "@/components/home/footer/signature";
import { HomeReplyNote } from "@/components/home/footer/reply-note";

/** The homepage's footer: the contact note, then the copyright and signature. */
export function HomeFooter({ className }: { className?: string }) {
  return (
    <footer className={["home-footer", className].filter(Boolean).join(" ")}>
      <div className="home-contact">
        <p>
          I&rsquo;m looking for my next hard product problem.{" "}
          <span className="home-contact__ask">
            Tell me about yours at{" "}
            <ContactLink
              data-track="contact"
              data-track-channel="email"
              data-track-place="footer"
              href="mailto:hello@muhammad.design"
            >
              hello@muhammad.design
            </ContactLink>
            .
          </span>
        </p>
        <HomeReplyNote className="home-contact__reply" />
      </div>
      <p className="home-footer__rule" />
      <div className="home-footer__row">
        <div className="home-footer__text">
          <p>Designed and built by me.</p>
        </div>
        <FooterSignature />
      </div>
    </footer>
  );
}
