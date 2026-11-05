import { navigateWithZoom } from "./page-wipe";

const onCaseStudy = () => document.querySelector(".case-study-page") !== null;

/** Moves into the case study at `href`. */
export function openCaseStudy(navigate: () => void, href: string) {
  navigateWithZoom(
    navigate,
    "open",
    () => window.location.pathname === href && onCaseStudy(),
  );
}

/** Moves from the open case study back to the homepage. */
export function closeCaseStudy(navigate: () => void) {
  navigateWithZoom(
    navigate,
    "close",
    () => window.location.pathname === "/" && !onCaseStudy(),
  );
}
