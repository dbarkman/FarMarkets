// Every picture in the game is drawn here as inline SVG, so the three eras
// can recolor the same shapes from their themes.

const svg = (d, cls = 'ico', box = '0 0 24 24') =>
  `<svg class="${cls}" viewBox="${box}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const shapes = {
  // goods
  sack: '<path d="M8 4h8l-1.5 3.5c3 2 4.5 5 4.5 8.5 0 3-2.5 5-7 5s-7-2-7-5c0-3.500 1.500-6.500 4.500-8.500z"/><path d="M9.500 7.500h5"/>',
  leaf: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z"/><path d="M5 19l9-9"/>',
  ingot: '<path d="M6.500 8h11l3 9h-17z"/><path d="M8 12.500h8"/>',
  jar: '<path d="M9 3h6v2.500c2.500 1.500 4 4 4 7.500 0 4.500-3 8-7 8s-7-3.500-7-8c0-3.500 1.500-6 4-7.500z"/><path d="M9 5.500h6"/>',
  log: '<ellipse cx="6" cy="12" rx="2.500" ry="5"/><path d="M6 7h11c1.400 0 2.500 2.200 2.500 5s-1.100 5-2.500 5H6"/>',
  cloth: '<path d="M4 7c3-2 5 2 8 0s5-2 8 0v10c-3-2-5 2-8 0s-5-2-8 0z"/><path d="M4 12c3-2 5 2 8 0s5-2 8 0"/>',
  box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  spice: '<path d="M12 3c2 3 2 5 0 7-2-2-2-4 0-7z"/><path d="M5 13h14l-1.500 6a2 2 0 0 1-2 1.500h-7a2 2 0 0 1-2-1.500z"/>',
  gem: '<path d="M7 4h10l4 6-9 10L3 10z"/><path d="M3 10h18M9 4l-2 6 5 10 5-10-2-6"/>',
  scroll: '<path d="M8 4h10v13a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2v-1h9v1a2 2 0 0 0 2 2"/><path d="M8 4a2 2 0 0 0-2 2v10M10.500 9h5M10.500 12.500h5"/>',
  pelt: '<path d="M8 3l2 3h4l2-3 1 5 4 2-3 3 1 7-4-2-3 3-3-3-4 2 1-7-3-3 4-2z"/>',
  horse: '<path d="M5 21v-6c0-3 2-5 5-5h3l2-4 3-2 1 4 2 3-2 2-3-1-1 3v6"/><path d="M9 21v-5"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  vial: '<path d="M9 3h6M10 3v6l-4.500 8.500A2.400 2.400 0 0 0 7.700 21h8.600a2.400 2.400 0 0 0 2.200-3.500L14 9V3"/><path d="M7.500 15h9"/>',
  gear: '<circle cx="12" cy="12" r="3.200"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.500"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  // navigation
  basket: '<path d="M4 9h16l-1.500 11h-13z"/><path d="M8 9a4 4 0 0 1 8 0"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.500 8.500l-2 5-5 2 2-5z"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M9 10h6"/>',
  book: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  road: '<path d="M3 19q5-9 9-5t9-9"/><circle cx="3.500" cy="19" r="1.500"/><circle cx="20.500" cy="5" r="1.500"/>',
  arch: '<path d="M4 21V11a8 8 0 0 1 16 0v10z"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/>',
  chart: '<path d="M4 18l5-6 4 3 7-9M4 21h16"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
  rocket: '<path d="M12 3l5 9v6l-5-2-5 2v-6z"/><path d="M12 16v5"/>',
  // interface
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  swords: '<path d="M5 4l10 10M19 4L9 14M4 16l4 4M20 16l-4 4M6 18l3-3M18 18l-3-3"/>',
  cloud: '<path d="M7 17a4 4 0 0 1 .500-8 5.500 5.500 0 0 1 10.500 1.500A3.300 3.300 0 0 1 17.500 17z"/><path d="M9 20l1-1.500M13 20l1-1.500"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1.500"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
  wind: '<path d="M3 9h10a3 3 0 1 0-3-3M3 14h14a3 3 0 1 1-3 3M3 11.500h6"/>',
  heart: '<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.500 10h4a1.500 1.500 0 0 1 0 3h-3a1.500 1.500 0 0 0 0 3h4"/>',
  crate: '<path d="M4 7h16v12H4z"/><path d="M4 7l16 12M20 7L4 19"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  flag: '<path d="M6 21V4M6 5h11l-2.500 3.500L17 12H6"/>',
  news: '<path d="M5 5h11v14H7a2 2 0 0 1-2-2zM16 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 12.500h5M8 16h3"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
};

export const icon = (name, cls) => svg(shapes[name] || shapes.crate, cls);

export const navIcons = {
  sail: ['basket', 'compass', 'anchor', 'book'],
  silk: ['basket', 'road', 'arch', 'book'],
  space: ['chart', 'target', 'rocket', 'book'],
};

export const supplyIcon = { silk: 'drop', space: 'drop' };

// The tapping hand used by the first-game guide.
export const hand =
  '<svg class="hand" viewBox="0 0 48 56" aria-hidden="true"><path d="M17 26V8a4 4 0 0 1 8 0v14l10.500 2.500A6 6 0 0 1 40 30.300V38c0 7-5 13-12 13h-3c-4 0-7-2-9-5L8 34a3.500 3.500 0 0 1 5.500-4.300z" fill="#fff" stroke="#1a1a1a" stroke-width="2.500" stroke-linejoin="round"/></svg>';

// ---------- vehicles ----------

const junk = `<svg class="veh" viewBox="0 0 120 90" aria-hidden="true">
<g fill="currentColor"><path d="M4 56l16 4h78l18-10-9 26q-44 8-88 0z"/>
<path d="M36 18q14-5 22 3v32H34z"/><path d="M62 7q20-6 30 5v41H60z"/><path d="M96 24q8-3 12 3v21H95z"/></g>
<g stroke="var(--scene-bg, #fff)" stroke-width="1.500" fill="none" opacity=".75"><path d="M35 28h23M35 36h23M35 44h23M61 18h31M61 27h31M61 36h31M61 45h31M96 32h12M96 40h12"/></g>
<path d="M76 7V1l9 3-9 3" fill="var(--accent)"/></svg>`;

const camel = `<svg class="veh" viewBox="0 0 100 72" aria-hidden="true"><g fill="currentColor">
<path d="M12 36C13 26 19 23 24 27 27 13 37 13 40 25 43 13 53 13 56 25c4 2 7 2 9-2 2-8 5-14 11-16 5-2 11 0 13 4l4 3-4 3c-4 0-8 0-10 3-2 8-4 16-8 21v2c-11 4-35 4-47 0-6-1-10-3-12-7z"/>
<path d="M25 42h4l-1 26h-3zM33 43h4l-.500 25h-3zM59 43h4l-.500 25h-3zM67 41h4l-1 27h-3z"/>
<path d="M12 36q-4 5-2 13l2 0q-1-7 2-11z"/></g>
<path d="M30 24h20l3 12H27z" fill="var(--accent)"/></svg>`;

const ship = `<svg class="veh" viewBox="0 0 120 60" aria-hidden="true"><g fill="currentColor">
<path d="M10 30l20-13 50-2 34 15-34 15-50-2z"/><path d="M34 17l8-12h14l6 11zM34 43l8 12h14l6-11z"/></g>
<path d="M84 24l14 6-14 6z" fill="var(--accent)"/><path class="flame" d="M10 24L-8 30l18 6z" fill="var(--accent-2)"/></svg>`;

export const vehicleArt = { sail: junk, silk: camel, space: ship };

// ---------- travel scenes ----------

// A filled band with a wavy or jagged top, drawn twice end to end so it can
// slide left forever.
function band(cls, w, h, top, seed) {
  let d = `M0 ${h}`;
  const n = top.n;
  const pts = [];
  let r = seed;
  const rand = () => ((r = (r * 9301 + 49297) % 233280), r / 233280);
  for (let i = 0; i < n; i++) pts.push(top.base + (top.jag ? rand() * top.amp : 0));
  for (let rep = 0; rep < 2; rep++) {
    for (let i = 0; i < n; i++) {
      const x0 = rep * w + (i * w) / n;
      const x1 = x0 + w / n;
      const y0 = pts[i];
      const y1 = pts[(i + 1) % n];
      if (top.jag) d += ` L${x0.toFixed(1)} ${y0.toFixed(1)} L${(x0 + (w / n) * 0.5).toFixed(1)} ${(Math.min(y0, y1) - top.amp * (0.4 + rand() * 0.6)).toFixed(1)}`;
      else d += `${rep + i === 0 ? ` L0 ${y0}` : ''} Q${(x0 + w / n / 2).toFixed(1)} ${(y0 - top.amp).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
  }
  d += ` L${2 * w} ${h} Z`;
  return `<svg class="band ${cls}" viewBox="0 0 ${2 * w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}

function stars(cls, n, seed) {
  let r = seed;
  const rand = () => ((r = (r * 9301 + 49297) % 233280), r / 233280);
  let dots = '';
  for (let i = 0; i < n; i++) {
    const x = rand() * 400, y = rand() * 200, rad = 0.4 + rand() * 1.1;
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}"/><circle cx="${(x + 400).toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}"/>`;
  }
  return `<svg class="band ${cls}" viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden="true">${dots}</svg>`;
}

export function scene(era) {
  if (era === 'sail') {
    return `<div class="scene scene-sail"><div class="sun"></div>
${band('isles', 400, 200, { n: 5, base: 118, amp: 26, jag: true }, 7)}
${band('wave w1', 400, 200, { n: 8, base: 128, amp: 10 }, 1)}
<div class="rider">${junk}</div>
${band('wave w2', 400, 200, { n: 6, base: 150, amp: 13 }, 2)}
${band('wave w3', 400, 200, { n: 5, base: 174, amp: 15 }, 3)}
<div class="foe">${junk}</div><div class="rain"></div></div>`;
  }
  if (era === 'silk') {
    return `<div class="scene scene-silk"><div class="sun"></div>
${band('peaks', 400, 200, { n: 7, base: 120, amp: 46, jag: true }, 11)}
${band('dune d1', 400, 200, { n: 4, base: 138, amp: 16 }, 4)}
<div class="rider train">${camel}${camel}${camel}</div>
${band('dune d2', 400, 200, { n: 3, base: 166, amp: 20 }, 5)}
<div class="foe">${camel}</div><div class="rain"></div></div>`;
  }
  return `<div class="scene scene-space">${stars('s1', 40, 3)}${stars('s2', 26, 8)}${stars('s3', 12, 13)}
<div class="planet"></div><div class="rider">${ship}</div><div class="foe">${ship}</div><div class="rain"></div></div>`;
}
