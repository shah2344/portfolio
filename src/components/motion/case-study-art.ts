/*
 * The `sizes` an illustrated case study's artwork is requested at, shared by
 * the homepage tile and the story's lead frame. With the same file and the
 * same `sizes`, the browser picks the same candidate from the same srcset, so
 * opening the story finds the lead frame already in the cache rather than
 * uncovered as its blurred placeholder. It errs large —
 * the card's artwork overhangs the card, and the lead frame runs 864px — so
 * neither end is ever upscaled.
 */
export const CASE_STUDY_ART_SIZES = "(max-width: 40rem) 130vw, 864px";
