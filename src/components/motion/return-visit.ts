/* A return restores home immediately. Module state resets on a full reload. */
let caseStudySeen = false;
let homeScroll: number | undefined;

export function markCaseStudySeen() {
  caseStudySeen = true;
}

export function isReturnVisit() {
  return caseStudySeen;
}

/** Remember where the homepage was as it is left. */
export function rememberHomeScroll(y: number) {
  homeScroll = y;
}

/** Where to put the homepage back on a return; taken once. */
export function takeHomeScroll() {
  const y = homeScroll;
  homeScroll = undefined;
  return y;
}
