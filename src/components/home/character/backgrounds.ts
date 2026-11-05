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

const LAST_BACKGROUND_KEY = "home-character-background";
/** Materials the first reveal flicks through before landing on this load's. */
export const CHARACTER_SHUFFLE_LENGTH = 9;

/*
 * Choose seeds before hydration without importing the browser-only renderer
 * into the root layout. The client generates the meshes locally; this script
 * never fetches images. Keep the per-load choice across client navigation.
 */
export const characterBackgroundScript = `(function(){var b=${JSON.stringify(CHARACTER_BACKGROUNDS)},p,n;try{p=sessionStorage.getItem(${JSON.stringify(LAST_BACKGROUND_KEY)})}catch(e){}var c=b.filter(function(x){return String(x)!==p});n=c[Math.floor(Math.random()*c.length)];try{sessionStorage.setItem(${JSON.stringify(LAST_BACKGROUND_KEY)},String(n))}catch(e){}var s=b.filter(function(x){return x!==n}).sort(function(){return Math.random()-0.5}).slice(0,${CHARACTER_SHUFFLE_LENGTH});var d=document.documentElement.dataset;d.characterBackground=n;d.characterShuffle=s.join(",")})()`;

let current: number | undefined;

const isBackground = (index: number) => CHARACTER_BACKGROUNDS.includes(index);

/** One material per full load, kept across client navigations and remounts. */
export function currentCharacterBackground() {
  if (current !== undefined) return current;
  const early = Number(document.documentElement.dataset.characterBackground);
  if (isBackground(early)) return (current = early);
  // Without the head script (tests, unusual embeds), still choose at random.
  return (current =
    CHARACTER_BACKGROUNDS[
      Math.floor(Math.random() * CHARACTER_BACKGROUNDS.length)
    ]!);
}

/** The head script's shuffle for this load, or a fresh one without it. */
export function characterShuffle(initial: number) {
  const early = (document.documentElement.dataset.characterShuffle ?? "")
    .split(",")
    .map(Number)
    .filter((index) => isBackground(index) && index !== initial);
  if (early.length) return early;
  return CHARACTER_BACKGROUNDS.filter((index) => index !== initial)
    .map((index) => ({ index, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, CHARACTER_SHUFFLE_LENGTH)
    .map(({ index }) => index);
}

export function followingCharacterBackground(index: number) {
  const position = CHARACTER_BACKGROUNDS.indexOf(index);
  return CHARACTER_BACKGROUNDS[(position + 1) % CHARACTER_BACKGROUNDS.length]!;
}

export function rememberCharacterBackground(index: number) {
  if (isBackground(index)) current = index;
}
