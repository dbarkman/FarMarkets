// Plays many whole games with the bots and prints how each era pays out.
// Run: tools/run.sh tools/balance.js

import sail from '../public/js/packs/sail.js';
import silk from '../public/js/packs/silk.js';
import space from '../public/js/packs/space.js';
import { play, median } from './bots.js';

const out = typeof print === 'function' ? print : console.log;
const N = 120;
const k = (n) => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.round(n / 1000) + 'k');

for (const pack of [sail, silk, space]) {
  out(`\n${pack.name}  (goal ${k(pack.goal)}, ${pack.days} days)`);
  for (const mode of ['expert', 'seen', 'habit']) {
    const runs = [];
    for (let i = 0; i < N; i++) runs.push(play(pack, 1000 + i * 7919, mode));
    const scores = runs.map((r) => r.score);
    const sorted = scores.slice().sort((a, b) => a - b);
    const tiers = {};
    runs.forEach((r) => (tiers[r.vehicle] = (tiers[r.vehicle] || 0) + 1));
    out(
      `  ${mode.padEnd(7)} median ${k(median(scores)).padStart(7)}  p10 ${k(sorted[Math.floor(N * 0.1)]).padStart(7)}  p90 ${k(sorted[Math.floor(N * 0.9)]).padStart(7)}` +
        `  trips ${median(runs.map((r) => r.trips))}  top route ${(median(runs.map((r) => r.topShare)) * 100).toFixed(0)}%` +
        `  reached goal ${((scores.filter((x) => x >= pack.goal).length / N) * 100).toFixed(0)}%  ends ${JSON.stringify(tiers)}`
    );
  }
}
