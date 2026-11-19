/**
 * A load that resumes partway down the homepage: a refresh or a history visit
 * the browser is about to put back where the reader left it, or a link to a
 * section. CSS cannot know where the page will land, so this inline script
 * runs before the masthead is parsed and marks the root; the stylesheet then
 * paints every entrance finished and keeps the character in its slot instead
 * of greeting at the centre of the screen over the content.
 *
 * The browser restores the scroll itself and does not say where to, so the
 * position is remembered here as the page is left.
 */
export const HOME_RESUME_KEY = "home-scroll";

export const homeResumeScript = `try{var n=performance.getEntriesByType("navigation")[0],y=Number(sessionStorage.getItem("${HOME_RESUME_KEY}"));if(location.hash||(n&&(n.type==="reload"||n.type==="back_forward")&&y>0))document.documentElement.dataset.homeResume=""}catch(e){}`;

/** Whether this document load skipped the opening; stable for the load. */
export function isHomeResume() {
  return document.documentElement.hasAttribute("data-home-resume");
}

/** Remember the scroll as the document is unloaded, for the next load. */
export function rememberHomeResume() {
  const save = () => {
    try {
      sessionStorage.setItem(HOME_RESUME_KEY, String(Math.round(scrollY)));
    } catch {}
  };
  window.addEventListener("pagehide", save);
  return () => {
    window.removeEventListener("pagehide", save);
    // Leaving home inside the app: a later load must not read a stale place.
    try {
      sessionStorage.removeItem(HOME_RESUME_KEY);
    } catch {}
  };
}
