import { navigateWithZoom } from "./page-wipe";

const onCaseStudy = () => document.querySelector(".case-study-page") !== null;

/** Moves from the open case study back to the homepage. */
export function closeCaseStudy(navigate: () => void) {
  navigateWithZoom(
    navigate,
    "close",
    () => window.location.pathname === "/" && !onCaseStudy(),
  );
}
