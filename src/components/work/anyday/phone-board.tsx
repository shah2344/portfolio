import type { EffectsConfig } from "@lisse/core";

import { SmoothSurface } from "@/components/ui/smooth-surface";

import { Tilt } from "@/components/motion-primitives/tilt";
import {
  type CaseStudyAnnotation,
  CaseStudyAnnotationMarks,
  CaseStudyAnnotationNotes,
} from "@/components/work/case-study-annotations";
import { InlineDemoVideo } from "@/components/work/inline-demo-video";

/** The original app's screen recordings, cropped to the phone's screen. */
const PHONE_CLIP = { width: 648, height: 1442 };

export interface AnyDayPhoneClip {
  /** What happens in the clip, for the screen-reader description. */
  description: string;
  src: string;
  title: string;
}

/**
 * A white rim and a soft, wide lift, both traced by Lisse on each clip's
 * smoothed outline so they follow the squircle rather than a CSS radius.
 * Lisse's blur is a Gaussian deviation: half a CSS box-shadow's blur.
 */
const CLIP_EFFECTS: EffectsConfig = {
  outerBorder: { width: 1, color: "#ffffff", opacity: 1 },
  shadow: [
    {
      offsetX: 0,
      offsetY: 12,
      blur: 20,
      spread: 0,
      color: "#000000",
      opacity: 0.12,
    },
    {
      offsetX: 0,
      offsetY: 2,
      blur: 3,
      spread: 0,
      color: "#000000",
      opacity: 0.05,
    },
  ],
};

/** A desktop recording set beside the phones, at its own export size. */
export interface AnyDayScreenClip extends AnyDayPhoneClip {
  height: number;
  ground: string;
  width: number;
}

/**
 * The old-app still's composition, played: walkthroughs of the original app
 * side by side on its grey plate, each screen rounded like an iPhone's, with
 * the handwritten teardown over and beside them. A desktop recording can sit
 * to the right of the phones at their height.
 */
export function AnyDayPhoneBoard({
  annotations,
  clips,
  description,
  id,
  screen,
  title,
}: {
  annotations: readonly CaseStudyAnnotation[];
  clips: readonly AnyDayPhoneClip[];
  description: string;
  id: string;
  screen?: AnyDayScreenClip;
  title: string;
}) {
  return (
    <figure className="humi-story-media">
      <Tilt className="humi-story-media__tilt" rotationFactor={3}>
        <div className="humi-story-media__stage anyday-phone-board-stage">
          <SmoothSurface
            as="div"
            className="humi-story-media__frame anyday-phone-board"
          >
            <div className="anyday-phone-board__phones">
              {clips.map((clip, index) => (
                <div className="anyday-phone" key={clip.src}>
                  <InlineDemoVideo
                    describedBy={`${id}-clip-${index}`}
                    effects={CLIP_EFFECTS}
                    flat
                    ground="#ffffff"
                    height={PHONE_CLIP.height}
                    src={clip.src}
                    title={clip.title}
                    width={PHONE_CLIP.width}
                  />
                  <p className="sr-only" id={`${id}-clip-${index}`}>
                    {clip.description}
                  </p>
                </div>
              ))}
              {screen ? (
                <div className="anyday-phone-board__screen">
                  <InlineDemoVideo
                    describedBy={`${id}-screen`}
                    effects={CLIP_EFFECTS}
                    flat
                    ground={screen.ground}
                    height={screen.height}
                    src={screen.src}
                    title={screen.title}
                    width={screen.width}
                  />
                  <p className="sr-only" id={`${id}-screen`}>
                    {screen.description}
                  </p>
                </div>
              ) : null}
            </div>
            <CaseStudyAnnotationMarks annotations={annotations} />
          </SmoothSurface>
          <CaseStudyAnnotationNotes annotations={annotations} />
        </div>
      </Tilt>
      <figcaption>
        <p>
          <strong>{title}</strong> <span>{description}</span>
        </p>
      </figcaption>
    </figure>
  );
}
