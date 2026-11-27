/*
 * Curated palettes for locally generated @outpacelabs/avatars meshes. The
 * library's own harmonies are all saturated, so each material brings its
 * colours; the numeric seed still drives the mesh layout. Three stops each:
 * at the character's size the mesh only paints the first three.
 */
const CHARACTER_PALETTES = [
  [4, ["#4B2FA8", "#F27A54", "#F9C784"]],
  [5, ["#1A6FA3", "#2EC4B6", "#7FE3D8"]],
  [6, ["#FFB4A2", "#E5989B", "#9B4FD1"]],
  [8, ["#F9E04B", "#FF8C42", "#FFB347"]],
  [10, ["#1B7A8C", "#3AE374", "#7D5FFF"]],
  [20, ["#FF4D8D", "#FF9EBB", "#5B2A86"]],
  [22, ["#1446A0", "#4CC9F0", "#8FD8FF"]],
  [23, ["#2E8B57", "#7BD389", "#D4E86A"]],
  [29, ["#9B1D2A", "#E63946", "#FFB703"]],
  [30, ["#B8A1FF", "#C9A6FF", "#4A35C4"]],
  [31, ["#FF6B6B", "#FFD93D", "#7A4FC2"]],
  // Vibrant
  [35, ["#06D6A0", "#118AB2", "#FFD166"]],
  [36, ["#FF006E", "#FFBE0B", "#3A86FF"]],
  [41, ["#00F5A0", "#00D9F5", "#7B2FF7"]],
  [42, ["#FF5F6D", "#FFC371", "#00C9A7"]],
  [44, ["#8338EC", "#FF4FD8", "#00E5FF"]],
  [48, ["#FF7A00", "#FFD60A", "#FF2D55"]],
] as const satisfies readonly (readonly [number, readonly string[]])[];

export const CHARACTER_BACKGROUNDS: readonly number[] = CHARACTER_PALETTES.map(
  ([seed]) => seed,
);
const paletteBySeed = new Map<number, readonly string[]>(CHARACTER_PALETTES);

export function characterBackgroundColors(seed: number) {
  return [...(paletteBySeed.get(seed) ?? [])];
}

/**
 * Every load starts on the same material, so the mark reads as one thing
 * rather than a different object on each visit. A tap still steps through
 * the rest; the choice lasts until the next full load.
 */
export const HOME_CHARACTER_BACKGROUND = 30;

let current: number | undefined;

const isBackground = (index: number) => CHARACTER_BACKGROUNDS.includes(index);

/** The material in use, kept across client navigations and remounts. */
export function currentCharacterBackground() {
  return current ?? HOME_CHARACTER_BACKGROUND;
}

export function followingCharacterBackground(index: number) {
  const position = CHARACTER_BACKGROUNDS.indexOf(index);
  return CHARACTER_BACKGROUNDS[(position + 1) % CHARACTER_BACKGROUNDS.length]!;
}

export function rememberCharacterBackground(index: number) {
  if (isBackground(index)) current = index;
}
