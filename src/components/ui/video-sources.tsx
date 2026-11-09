/**
 * Codec alternatives followed by a universally playable H.264 fallback.
 * Feed AV1 variants are encoded from archived sources at full resolution and
 * frame rate; their H.264 fallbacks preserve the source video without re-encoding.
 */
const VARIANTS: Record<string, readonly { src: string; codecs: string }[]> = {
  "/media/anyday/client-portal-01.mp4": [
    { src: "/media/anyday/client-portal-01.av1.mp4", codecs: "av01.0.09M.10" },
  ],
  "/media/anyday/client-portal-02.mp4": [
    { src: "/media/anyday/client-portal-02.av1.mp4", codecs: "av01.0.09M.10" },
  ],
  "/media/anyday/client-portal-03.mp4": [
    { src: "/media/anyday/client-portal-03.av1.mp4", codecs: "av01.0.09M.10" },
    {
      src: "/media/anyday/client-portal-03.hevc.mp4",
      codecs: "hvc1.2.4.L123.90",
    },
  ],
  "/media/anyday/client-portal-04.mp4": [
    { src: "/media/anyday/client-portal-04.av1.mp4", codecs: "av01.0.09M.10" },
    {
      src: "/media/anyday/client-portal-04.hevc.mp4",
      codecs: "hvc1.2.4.L123.90",
    },
  ],
  "/media/anyday/ewa_member.mp4": [
    { src: "/media/anyday/ewa_member.av1.mp4", codecs: "av01.0.12M.10" },
  ],
  "/media/anyday/migration.mp4": [
    { src: "/media/anyday/migration.av1.mp4", codecs: "av01.0.09M.10" },
  ],
  // `payout.mp4` stays H.264 only. Seeking its AV1 encode to the loop start made
  // Safari stall up to 1s, and capture the wrong frame, in a page transition.
  "/media/craft/app-launch.mp4": [
    { src: "/media/craft/app-launch.av1.mp4", codecs: "av01.0.09M.10" },
  ],
  "/media/craft/earnedpayclient.mp4": [
    { src: "/media/craft/earnedpayclient.av1.mp4", codecs: "av01.0.08M.10" },
  ],
  "/media/craft/shots-mockups-1080x60-2.mp4": [
    {
      src: "/media/craft/shots-mockups-1080x60-2.av1.mp4",
      codecs: "av01.0.09M.10",
    },
  ],
  "/media/craft/shots-mockups-1080x60.mp4": [
    {
      src: "/media/craft/shots-mockups-1080x60.av1.mp4",
      codecs: "av01.0.09M.10",
    },
  ],
  "/media/craft/shots-mockups-874.mp4": [
    { src: "/media/craft/shots-mockups-874.av1.mp4", codecs: "av01.0.09M.10" },
  ],
  "/media/craft/tip-summary.mp4": [
    { src: "/media/craft/tip-summary.av1.mp4", codecs: "av01.0.09M.10" },
  ],
};

/**
 * The `<source>` list for a clip: its AV1 and HEVC variants where they exist,
 * then the H.264 original, which every browser plays.
 *
 * A clip re-encoded in place takes a `?v=` on its URL, and the same version
 * rides along on each of its variants. Media is fetched in byte ranges and
 * cached an hour at a time, so without a new URL a returning browser could
 * splice ranges of the old encode into the new one.
 */
export function VideoSources({ src }: { src: string }) {
  const query = src.indexOf("?");
  const file = query < 0 ? src : src.slice(0, query);
  const version = query < 0 ? "" : src.slice(query);

  return (
    <>
      {VARIANTS[file]?.map((variant) => (
        <source
          key={variant.src}
          src={variant.src + version}
          type={`video/mp4; codecs="${variant.codecs}"`}
        />
      ))}
      <source src={src} type="video/mp4" />
    </>
  );
}
