import Image from "next/image";

import { PlaygroundTile } from "@/components/home/playground/tile";
import launchPhoto from "../../../../public/media/humi/launch-photo.jpg";

/** The results followed by a compact launch keepsake. */
export function HumiImpact() {
  return (
    <section aria-label="Impact" className="humi-impact">
      <div className="humi-impact__intro">
        <p className="humi-impact__lede">
          The redesign shipped to all customers. Humi grew from 1,400 to over{" "}
          <strong>4,000</strong> businesses across Canada, and half of monthly
          active employees used the platform <strong>every day</strong>. V2
          helped Humi move beyond 10-person startups and serve businesses with
          50 to 200 employees.
        </p>
        <p className="humi-impact__lede">
          When I joined AnyDay years later, my onboarding brought me back to
          Humi. The familiar screens reminded me how much I&rsquo;d cared about
          getting them right. It felt good to see them still in use, now helping
          me settle into a new job.
        </p>
      </div>

      <figure className="humi-impact__keepsake" hidden>
        <PlaygroundTile
          className="humi-impact__photo"
          label="Humi launch photo"
          maxScale={16}
        >
          <div className="humi-impact__print">
            <Image
              alt="A framed print of every screen designed for Humi v2, resting on an office air purifier"
              placeholder="blur"
              sizes="(max-width: 40rem) 80vw, 480px"
              src={launchPhoto}
            />
          </div>
        </PlaygroundTile>
        <figcaption className="humi-impact__note">
          <p>Every screen I designed, framed by my PM to celebrate launch.</p>
        </figcaption>
      </figure>
    </section>
  );
}
