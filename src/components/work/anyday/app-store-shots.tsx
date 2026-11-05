"use client";

import { SmoothSurface } from "@/components/ui/smooth-surface";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  BlossomCarousel,
  type BlossomCarouselHandle,
} from "@blossom-carousel/react";
import { createShotSnap, nearestSlide } from "./shot-snap";
import { PlaygroundTile } from "@/components/home/playground/tile";

import appStoreShot1 from "../../../../public/media/anyday/app_store/AppStore_6_5_01.webp";
import appStoreShot2 from "../../../../public/media/anyday/app_store/AppStore_6_5_02.webp";
import appStoreShot3 from "../../../../public/media/anyday/app_store/AppStore_6_5_03.webp";
import appStoreShot4 from "../../../../public/media/anyday/app_store/AppStore_6_5_04.webp";
import appStoreShot5 from "../../../../public/media/anyday/app_store/AppStore_6_5_05.webp";
import appStoreShot6 from "../../../../public/media/anyday/app_store/AppStore_6_5_06.webp";
import appStoreShot7 from "../../../../public/media/anyday/app_store/AppStore_6_5_07.webp";

/** The 6.5" App Store set, in the order it shipped on the listing. */
const SHOTS = [
  {
    alt: "App Store screenshot — “Get your pay, AnyDay.” over the app home, showing a spendable balance and an incoming payout from Urban Kitchen.",
    src: appStoreShot1,
  },
  {
    alt: "App Store screenshot — “Always on your terms.” over the choice between instant payouts to an AnyDay wallet and scheduled bank transfers.",
    src: appStoreShot2,
  },
  {
    alt: "App Store screenshot — “Send money with ease.” over the transfers screen with e-Transfer, a recent transfer, and saved contacts.",
    src: appStoreShot3,
  },
  {
    alt: "App Store screenshot — “Shop online and in-stores.” over the virtual card, with card details, lock card, and Apple Wallet.",
    src: appStoreShot4,
  },
  {
    alt: "App Store screenshot — “Get cash at fee-free ATMs.” over the in-app ATM locator map.",
    src: appStoreShot5,
  },
  {
    alt: "App Store screenshot — “Stay safe with card controls.” over locking the card and a real-time payment notification.",
    src: appStoreShot6,
  },
  {
    alt: "App Store screenshot — “Chat with us in the app.” over a support conversation inside the app.",
    src: appStoreShot7,
  },
] as const;

// Keep the visible rail in the middle set so native scrolling can loop
// without a reverse sweep. Duplicate images are hidden from screen readers.
const COPIES = 3;
const HOME = SHOTS.length;
const HOLD = 3200;
const AUTOPLAY_DURATION = 650;
const CAROUSEL_ID = "anyday-app-store-shots";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const getServerMotion = () => true;

export function AnyDayAppStoreShots({
  aspectRatio = "1242 / 2208",
}: {
  aspectRatio?: string;
}) {
  const carouselRef = useRef<BlossomCarouselHandle>(null);
  const nextStepAtRef = useRef(0);
  const snapRef = useRef<ReturnType<typeof createShotSnap> | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerMotion,
  );
  useLayoutEffect(() => {
    const track = carouselRef.current?.element;
    if (!track) return;
    let homed = false;
    // Scale around the visible rail, clamped to each slide, so an incoming
    // shot stays small on its leading edge and grows as it reaches centre.
    const updateScales = () => {
      const centre = track.scrollLeft + track.clientWidth / 2;
      const still = getReducedMotion();
      Array.from(track.children).forEach((child) => {
        const slide = child as HTMLElement;
        const width = slide.offsetWidth;
        const originX = Math.min(width, Math.max(0, centre - slide.offsetLeft));
        const distance = Math.abs(slide.offsetLeft + width / 2 - centre);
        const progress = distance <= 1 ? 0 : Math.min(1, distance / width);
        // Quadratic in distance so neighbours start smaller and grow as they
        // enter, instead of stalling at min scale until they are nearly home.
        const scale = still ? 1 : 1 - 0.24 * progress * progress;
        slide.style.setProperty("--shot-origin", `${originX}px 50%`);
        slide.style.setProperty("--shot-scale", String(scale));
      });
    };
    const snap = createShotSnap(track, getReducedMotion, () => {
      updateScales();
      loop();
    });
    snapRef.current = snap;

    const loop = () => {
      if (snap.active) return;
      const index = nearestSlide(track);
      if (index < HOME || index >= HOME * 2) {
        snap.centre(HOME + (index % HOME), "instant");
        return;
      }
    };
    const resize = new ResizeObserver(() => {
      const home = track.children[HOME] as HTMLElement | undefined;
      if (!track.clientWidth || !home?.offsetWidth || !home.offsetLeft) return;
      snap.centre(
        homed ? HOME + (nearestSlide(track) % HOME) : HOME,
        "instant",
      );
      homed = true;
    });
    updateScales();
    const unsubscribeMotion = subscribeMotion(updateScales);
    track.addEventListener("scroll", updateScales, { passive: true });
    resize.observe(track);
    track.addEventListener("scrollend", loop);
    return () => {
      resize.disconnect();
      unsubscribeMotion();
      track.removeEventListener("scroll", updateScales);
      snap.cancel();
      snapRef.current = null;
      track.removeEventListener("scrollend", loop);
    };
  }, []);

  // Advance only while visible, with a full hold between each shot.
  // Reduced-motion preferences keep the sequence still.
  useEffect(() => {
    const track = carouselRef.current?.element;
    if (!track || reducedMotion) return;
    let inView = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        nextStepAtRef.current = Date.now() + HOLD;
      },
      { threshold: 0.4 },
    );
    const onVisibility = () => {
      nextStepAtRef.current = Date.now() + HOLD;
    };
    observer.observe(track);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => {
      if (
        !inView ||
        snapRef.current?.active ||
        document.hidden ||
        Date.now() < nextStepAtRef.current
      )
        return;
      let index = nearestSlide(track);
      // Resize or interrupted native scrolling can leave the rail in either
      // duplicate set without firing scrollend. Rebase before every step so
      // autoplay always has a following slide available.
      if (index < HOME || index >= HOME * 2) {
        index = HOME + (index % HOME);
        snapRef.current?.centre(index, "instant");
      }
      snapRef.current?.centre(index + 1, "smooth", AUTOPLAY_DURATION);
      nextStepAtRef.current = Date.now() + HOLD;
    }, 250);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  return (
    <figure className="anyday-figure">
      <PlaygroundTile
        asContainer
        className="anyday-shots__zoom"
        label="AnyDay App Store carousel"
        style={{ aspectRatio }}
      >
        <div className="anyday-figure__hairline">
          <div className="anyday-figure__frame anyday-shots">
            <BlossomCarousel
              aria-label="AnyDay App Store screenshots"
              aria-roledescription="carousel"
              aria-live="off"
              className="anyday-shots__track"
              id={CAROUSEL_ID}
              ref={carouselRef}
              role="group"
              tabIndex={-1}
            >
              {Array.from({ length: COPIES }, (_, copy) =>
                SHOTS.map((shot, index) => (
                  <div
                    aria-hidden={copy === 1 ? undefined : true}
                    aria-label={
                      copy === 1 ? `${index + 1} of ${SHOTS.length}` : undefined
                    }
                    aria-roledescription={copy === 1 ? "slide" : undefined}
                    className="anyday-shots__slide"
                    data-blossom-slide
                    key={`${copy}-${shot.src.src}`}
                    role="group"
                  >
                    {/* Load all seven assets before a fast swipe reaches them;
                        the repeated copies share the same cached URLs. Serve the
                        precompressed WebP files directly so each slide avoids
                        a runtime image-optimization request. */}
                    <SmoothSurface as="div" className="anyday-shots__content">
                      <Image
                        alt={copy === 1 ? shot.alt : ""}
                        loading="eager"
                        unoptimized
                        src={shot.src}
                      />
                    </SmoothSurface>
                  </div>
                )),
              )}
            </BlossomCarousel>
          </div>
        </div>
      </PlaygroundTile>
    </figure>
  );
}
