/** One occasional idle nap: heavy lids, a slow close, rest, then reopen. */
export const CHARACTER_SLEEP_MS = 14500;

const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function characterSleep(elapsed: number) {
  if (elapsed < 0 || elapsed >= CHARACTER_SLEEP_MS)
    return { tired: 0, closure: 0 };
  const waking = 1 - ease((elapsed - 13600) / 900);
  return {
    tired: ease(elapsed / 6000) * waking,
    closure: ease((elapsed - 6000) / 2800) * waking,
  };
}
