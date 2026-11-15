// Seeded random numbers. Every function takes an object with an integer `r`
// field (the game state, or any {r: seed}) and advances it, so a saved game
// replays the same way.

export function rnd(s) {
  let t = (s.r = (s.r + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Whole number from a to b, both included.
export const rint = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));

export const pick = (s, list) => list[Math.floor(rnd(s) * list.length)];

// Standard normal value (Box-Muller).
export function gauss(s) {
  const u = Math.max(rnd(s), 1e-9);
  const v = rnd(s);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function shuffle(s, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
