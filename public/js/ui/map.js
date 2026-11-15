// The three maps. Each returns an SVG string whose places carry
// data-act="dest" so the app can open them, plus the spot to scroll to.

import * as E from '../engine/core.js';

const f = (n) => n.toFixed(1);

// Smooth line through points.
function spline(pts) {
  if (pts.length < 3) return `M${f(pts[0][0])} ${f(pts[0][1])} L${f(pts[1][0])} ${f(pts[1][1])}`;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const poly = (flat, proj) => {
  let d = '';
  for (let i = 0; i < flat.length; i += 2) {
    const [x, y] = proj(flat[i], flat[i + 1]);
    d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d + 'Z';
};

function placeMark(pack, s, p, x, y, opts) {
  const cur = p.id === s.place;
  const cls = ['place', opts.cls || '', cur ? 'here' : '', opts.reach ? 'reach' : 'far', opts.closed ? 'closed' : '', s.stats.visited[p.id] ? 'seen' : ''].join(' ');
  const lx = opts.dx ?? 9, ly = opts.dy ?? 4;
  return `<g class="${cls}" data-act="dest" data-to="${p.id}" role="button" tabindex="0" aria-label="${p.name}">
<circle class="hit" cx="${f(x)}" cy="${f(y)}" r="20"/>
${cur ? `<circle class="pulse" cx="${f(x)}" cy="${f(y)}" r="9"/>` : ''}
<circle class="dot" cx="${f(x)}" cy="${f(y)}" r="${cur ? 6 : 4.500}"/>
<text x="${f(x + lx)}" y="${f(y + ly)}" text-anchor="${opts.anchor || 'start'}">${p.name}</text>
${opts.sub ? `<text class="sub" x="${f(x + lx)}" y="${f(y + (opts.subDy ?? ly + 11))}" text-anchor="${opts.anchor || 'start'}">${opts.sub}</text>` : ''}</g>`;
}

// ---------- Age of Sail ----------

const SEA = {
  land: [
    [94, 40, 118.500, 40, 119, 37.300, 121, 37.600, 122.500, 37.200, 122.200, 36.800, 120.600, 36.200, 119.300, 35.200, 119.400, 34.500, 120.300, 33.800, 120.900, 32.800, 121.900, 31.800, 121.900, 30.900, 121, 30.500, 122, 29.900, 121.600, 29.100, 121.600, 28.300, 120.700, 27.700, 120, 26.700, 119.600, 25.900, 119, 25.200, 118.200, 24.500, 117, 23.600, 116.400, 23, 115, 22.700, 114.200, 22.300, 113.500, 22.200, 112.500, 21.800, 111.500, 21.500, 110.400, 21.300, 110.500, 20.300, 109.900, 20.300, 109.700, 21.400, 108.600, 21.700, 107.800, 21.500, 106.800, 20.800, 106, 19.900, 105.800, 18.900, 106.500, 17.700, 107.600, 16.600, 108.400, 15.900, 109, 15, 109.300, 13.500, 109.300, 12.200, 109, 11.400, 108, 10.800, 107, 10.400, 106.700, 9.600, 105.200, 8.700, 104.900, 9.800, 105.100, 10.300, 104.500, 10.500, 103.600, 10.900, 103, 11.600, 102.600, 12.200, 101.800, 12.700, 100.900, 12.800, 100.900, 13.400, 100.500, 13.600, 100, 13.300, 99.950, 12.500, 99.700, 11.500, 99.200, 10.600, 99.200, 9.400, 99.900, 9.200, 100.300, 8.400, 100.600, 7.200, 101.500, 6.800, 102.300, 6.100, 103.200, 5.200, 103.500, 4, 103.500, 2.800, 104.200, 1.500, 103.800, 1.300, 103.400, 1.400, 102.200, 2.200, 101.300, 2.900, 100.600, 4.200, 100.300, 5.400, 100.100, 6.500, 99.600, 7.200, 98.900, 8, 98.300, 8.300, 98.300, 9.500, 98.600, 10.500, 98.500, 12, 98.200, 13.500, 97.800, 15, 97.600, 16.500, 96.500, 17, 94, 17],
    [126, 40, 125, 38, 126.400, 37, 126.500, 36, 126.300, 35, 126.500, 34.400, 127.500, 34.600, 128.500, 35, 129.300, 35.300, 129.500, 36.500, 129.200, 37.500, 128.500, 38.500, 128, 40],
    [129.700, 33.600, 130.900, 33.900, 131.700, 33.600, 131.900, 32.800, 131.400, 31.400, 130.700, 31, 130.200, 31.300, 130.200, 32.200, 129.800, 32.600, 129.600, 33.200],
    [130.900, 34, 131.400, 34.500, 132.500, 35.300, 135, 35.800, 135, 34.500, 132.500, 34.200, 131.800, 33.950],
    [132.400, 33.900, 135, 34.300, 135, 33.300, 133, 33, 132.500, 33.200],
    [121.500, 25.300, 122, 25, 121.600, 24, 121.200, 22.800, 120.800, 21.900, 120.200, 22.700, 120.100, 23.500, 120.700, 24.600, 121, 25.100],
    [108.700, 19.300, 109.500, 20, 110.600, 20.100, 111, 19.600, 110.500, 18.700, 109.600, 18.200, 108.700, 18.500],
    [120.600, 18.500, 121.900, 18.400, 122.300, 17.200, 121.600, 15.900, 121.800, 14.500, 123.900, 13.800, 124.100, 12.600, 122.500, 13.600, 121, 13.700, 120.700, 14.500, 120.200, 14.900, 119.900, 16.200, 120.400, 16.800, 120.400, 17.800],
    [120.400, 13.400, 121.400, 13.300, 121.500, 12.400, 121, 12.200],
    [124.300, 12.500, 125.500, 12.400, 125.700, 11, 125.100, 10, 124.600, 10.900],
    [121.900, 11.900, 123.100, 11.500, 122.600, 10.500, 121.900, 10.500],
    [122.900, 10.900, 123.700, 11, 123.500, 9.400, 122.600, 9.400],
    [122, 7, 123.300, 8.600, 124.800, 8.500, 125.500, 9.800, 126.400, 8.200, 126.200, 6.400, 125.400, 5.600, 124, 6.600, 123.200, 7.500, 122.200, 6.900],
    [117.200, 8.300, 119.500, 11.300, 119.700, 10.600, 117.600, 8.200],
    [109.200, 0.400, 109, 1.600, 110.300, 1.800, 111.300, 2.600, 113, 3.200, 114, 4.500, 115.400, 5.400, 116.700, 7, 117.700, 6.400, 118.300, 5.700, 119.200, 5.200, 118, 4.300, 117.800, 2.800, 118.900, 1, 117.600, 0, 116.500, -1.500, 116.300, -3.500, 114.600, -4, 113, -3.300, 111.600, -3.200, 110.200, -2.800, 110, -1.300],
    [95.300, 5.600, 97.500, 5.200, 98.700, 3.800, 100.300, 2.500, 101.600, 1.800, 103, 0.600, 103.800, -0.900, 104.600, -2, 106, -3.200, 105.800, -5.800, 104.600, -5.700, 103, -4.600, 101.500, -2.800, 100.300, -0.900, 99, 0.500, 98, 2.200, 96.500, 3.800, 95.300, 5.300],
    [105.200, -6.800, 106.100, -5.900, 107, -5.950, 108.500, -6.600, 110.500, -6.500, 112.700, -6.900, 114.400, -7.600, 114.500, -8.500, 112, -8.300, 109.500, -7.800, 107.500, -7.700, 106.400, -7.400, 105.300, -6.900],
    [119.500, 0.800, 120.800, 1.300, 123, 0.900, 125, 1.600, 124.500, 0.400, 121.500, 0.500, 120.200, -0.800, 121.500, -0.900, 123.300, -0.900, 122, -1.800, 121.600, -2.800, 122.800, -4.300, 122.300, -5.300, 121, -3.500, 120.400, -5.500, 119.500, -5.500, 119.500, -3.400, 118.800, -2.600, 119.800, -0.200],
  ],
  via: {
    'ayutthaya~hoian': [[109.800, 11.500], [106, 7.300], [103, 9.800], [101, 12.200]],
    'ayutthaya~malacca': [[101.600, 9], [104.300, 4.500], [104.900, 1.300], [103.700, 0.900]],
    'hoian~malacca': [[110, 12], [106.500, 5.500], [104.900, 1.300], [103.700, 0.900]],
    'macau~malacca': [[112.800, 17], [110.800, 11], [106.800, 5.500], [105, 1.300], [103.700, 0.900]],
    'banten~malacca': [[103.700, 0.900], [105.300, 0.300], [106.500, -1.800], [107.300, -4.600]],
    'banten~manila': [[107.800, -3], [108.300, 2.200], [112, 6], [116, 10], [118.800, 13]],
    'banten~hoian': [[107.800, -3], [108.500, 4], [110.200, 11.500]],
    'macau~manila': [[118.500, 16.500]],
    'hoian~macau': [[110.300, 16.600], [112.200, 19.200]],
    'macau~ningbo': [[115.500, 21.600], [118.700, 23.300], [120.100, 25.200], [122.300, 28]],
    'hirado~macau': [[125, 28.500], [122.900, 24.500], [121.300, 21.300], [116.500, 20.900]],
    'hirado~manila': [[126, 27], [123.200, 21.500], [120.300, 19.400], [119.500, 17]],
    'manila~ningbo': [[119.500, 17], [120.300, 19.400], [122.700, 22], [123, 26]],
  },
  label: {
    hirado: { anchor: 'end', dx: -9 }, ningbo: {}, macau: { anchor: 'middle', dx: 0, dy: 17 }, manila: { anchor: 'end', dx: -9 },
    hoian: { dx: 9, dy: -3 }, ayutthaya: { dx: 2, dy: -9 }, malacca: { anchor: 'end', dx: -9, dy: 12 }, banten: { anchor: 'middle', dx: 0, dy: 18 },
  },
};

function sailMap(pack, s) {
  const proj = (lon, lat) => [(lon - 96) * 10, (37 - lat) * 10];
  const P = E.I(pack).place;
  const sea = E.season(pack, s.day);
  let routes = '';
  for (const r of pack.routes) {
    const key = [r.a, r.b].sort().join('~');
    const [a, b] = key.split('~');
    const pts = [proj(P[a].x, P[a].y), ...(SEA.via[key] || []).map((q) => proj(q[0], q[1])), proj(P[b].x, P[b].y)];
    const mine = r.a === s.place || r.b === s.place;
    routes += `<path class="route ${mine ? 'mine' : ''}" d="${spline(pts)}"/>`;
  }
  const reach = new Set(E.routes(pack, s).map((r) => r.to));
  let marks = '';
  for (const p of pack.places) {
    const [x, y] = proj(p.x, p.y);
    marks += placeMark(pack, s, p, x, y, { ...SEA.label[p.id], reach: reach.has(p.id) || p.id === s.place });
  }
  const [hx, hy] = proj(P[s.place].x, P[s.place].y);
  return {
    focus: [hx, hy], w: 380, h: 460,
    svg: `<svg class="map map-sail" viewBox="0 0 380 460" role="img" aria-label="Chart of the eastern seas">
<defs><pattern id="swell" width="36" height="14" patternUnits="userSpaceOnUse"><path d="M0 9q9-8 18 0t18 0" class="swell"/></pattern></defs>
<rect width="380" height="460" class="water"/><rect width="380" height="460" fill="url(#swell)"/>
<g class="land">${SEA.land.map((l) => `<path d="${poly(l, proj)}"/>`).join('')}</g>
<g class="rose" transform="translate(338 262)"><circle r="26"/><circle r="20"/><path d="M0-30L4-4 30 0 4 4 0 30-4 4-30 0-4-4z"/><text y="-34" text-anchor="middle">N</text></g>
<text class="legend" x="12" y="448">${sea.name}</text>
${routes}${marks}</svg>`,
  };
}

// ---------- Silk Road ----------

const LAND = {
  seas: [
    [25, 31.500, 25, 40.800, 26, 40.600, 27, 40.900, 28.900, 41.050, 29.300, 40.700, 27.300, 40.400, 26.400, 40, 27, 39.200, 26.500, 38.400, 27.300, 37.500, 27.300, 36.800, 28.200, 36.700, 30.500, 36.200, 31, 36.800, 32.500, 36.100, 34, 36.400, 35.800, 36.700, 36.100, 36, 35.800, 35, 35.900, 34, 35.500, 33.300, 35, 32.500, 34.500, 31.500, 34.200, 31.200, 32.500, 31.100, 31, 31.500, 29.800, 31, 27, 31],
    [28, 41.300, 29, 41.200, 31.500, 41.200, 33, 42, 35, 42, 36.500, 41.300, 38.500, 41, 41.500, 41.500, 41.500, 42.500, 39.500, 43.800, 37.500, 45, 36.500, 45.400, 35, 45.200, 33.500, 44.500, 32.500, 45.400, 31, 46.600, 30, 45.500, 29.500, 44.500, 28.500, 43.500, 27.800, 42.200],
    [47.500, 47, 52.500, 47, 53, 45.300, 52.500, 44.500, 51, 44.500, 50.300, 43.200, 52, 42.200, 52.800, 41.500, 53.800, 40.500, 53, 39.300, 53.900, 37.300, 52.500, 36.700, 50.500, 37.200, 49, 38.300, 49.300, 40.300, 48.500, 41.800, 47.500, 43, 46.800, 44.500],
    [58.500, 46.600, 60.500, 46.800, 61.500, 46, 61, 44.500, 59.500, 43.600, 58.300, 44.600],
    [47.800, 30.200, 48.800, 30.400, 50, 30, 51, 29, 48.200, 29],
  ],
  ranges: [
    [74, 41.300, 80, 42.400, 86, 43.800, 93, 44.200],
    [77, 35.800, 83, 35.600, 90, 36.200, 96, 36.500],
    [71.500, 36.600, 73.200, 38.800, 72.600, 41],
    [97, 38.600, 102.500, 37.200],
    [45.500, 36, 48.500, 33.300, 51.500, 30.800],
    [54.500, 37.300, 58.500, 38],
    [30, 37.300, 34, 37.400, 37.300, 37.900],
    [40, 43.200, 44, 42.500, 47.500, 41.300],
  ],
  deserts: [
    { name: 'Taklamakan', x: 83.500, y: 39, rx: 6, ry: 1.500 },
    { name: 'Gobi', x: 101, y: 42.500, rx: 6, ry: 1.300 },
    { name: 'Black Sands', x: 59, y: 39.700, rx: 3.500, ry: 1.100 },
    { name: 'Syrian Desert', x: 40, y: 33.300, rx: 3.200, ry: 1 },
  ],
  via: {
    'dunhuang~khotan': [[88, 38.300]], 'kashgar~turfan': [[82, 41.400]], 'kashgar~samarkand': [[72, 40]],
    'samarkand~turfan': [[72, 42.700], [80, 44.800]], 'changan~dunhuang': [[102, 38.200]], 'changan~turfan': [[101, 41.600]],
    'baghdad~merv': [[50, 35.200], [56, 36.200]], 'antioch~baghdad': [[40, 35.600]], 'antioch~constantinople': [[32.800, 38.800]],
    'baghdad~constantinople': [[41, 38.400], [34.500, 40.300]],
  },
  label: {
    constantinople: { dx: 6, dy: -9 }, antioch: { dx: 8, dy: 14 }, baghdad: { dx: 9, dy: 14 }, merv: { anchor: 'middle', dx: 0, dy: 19 },
    samarkand: { anchor: 'middle', dx: 0, dy: -11 }, kashgar: { anchor: 'middle', dx: 4, dy: -11 }, khotan: { anchor: 'middle', dx: 0, dy: 19 },
    turfan: { anchor: 'middle', dx: 0, dy: -11 }, dunhuang: { dx: 8, dy: 15 }, changan: { anchor: 'end', dx: -9, dy: 14 },
  },
};

function silkMap(pack, s) {
  const proj = (lon, lat) => [(lon - 25) * 10, (47 - lat) * 21];
  const P = E.I(pack).place;
  const sea = E.season(pack, s.day);
  let peaks = '';
  for (const r of LAND.ranges) {
    for (let i = 0; i < r.length - 2; i += 2) {
      const [x0, y0] = proj(r[i], r[i + 1]), [x1, y1] = proj(r[i + 2], r[i + 3]);
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 13));
      for (let k = 0; k < n; k++) {
        const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n + (k % 2 ? 3 : 0);
        peaks += `<path d="M${f(x - 7)} ${f(y + 6)}L${f(x)} ${f(y - 7)}L${f(x + 7)} ${f(y + 6)}"/>`;
      }
    }
  }
  const deserts = LAND.deserts.map((d) => {
    const [x, y] = proj(d.x, d.y);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${d.rx * 10}" ry="${d.ry * 21}" fill="url(#sand)"/><text class="geo" x="${f(x)}" y="${f(y + 4)}" text-anchor="middle">${d.name}</text>`;
  }).join('');
  let routes = '';
  for (const r of pack.routes) {
    const key = [r.a, r.b].sort().join('~');
    const [a, b] = key.split('~');
    const pts = [proj(P[a].x, P[a].y), ...(LAND.via[key] || []).map((q) => proj(q[0], q[1])), proj(P[b].x, P[b].y)];
    const mine = r.a === s.place || r.b === s.place;
    const shut = r.closed && r.closed.includes(sea.id);
    routes += `<path class="route ${mine ? 'mine' : ''} ${shut ? 'shut' : ''}" d="${spline(pts)}"/>`;
    if (shut) {
      const m = pts[Math.floor(pts.length / 2)];
      routes += `<text class="snow" x="${f(m[0])}" y="${f(m[1] - 6)}" text-anchor="middle">snowed in</text>`;
    }
  }
  const open = new Map(E.routes(pack, s).map((r) => [r.to, r]));
  let marks = '';
  for (const p of pack.places) {
    const [x, y] = proj(p.x, p.y);
    const r = open.get(p.id);
    marks += placeMark(pack, s, p, x, y, { ...LAND.label[p.id], reach: !!r || p.id === s.place, closed: r && r.closed });
  }
  return {
    focus: proj(P[s.place].x, P[s.place].y), w: 880, h: 380,
    svg: `<svg class="map map-silk" viewBox="0 0 880 380" role="img" aria-label="Map of the Silk Road">
<defs><pattern id="sand" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" class="grain"/><circle cx="6.500" cy="6.500" r=".9" class="grain"/></pattern></defs>
<rect width="880" height="380" class="ground"/>
<g class="water">${LAND.seas.map((l) => `<path d="${poly(l, proj)}"/>`).join('')}</g>
${deserts}<g class="peaks">${peaks}</g>
<text class="legend" x="12" y="368">${sea.name}</text>
${routes}${marks}</svg>`,
  };
}

// ---------- Space ----------

function spaceMap(pack, s) {
  const k = 8;
  const P = E.I(pack).place;
  const v = E.veh(pack, s);
  const cur = P[s.place];
  let dots = '';
  let r = 77;
  const rand = () => ((r = (r * 9301 + 49297) % 233280), r / 233280);
  for (let i = 0; i < 160; i++) dots += `<circle cx="${f(rand() * 800)}" cy="${f(rand() * 800)}" r="${f(0.3 + rand() * 0.9)}"/>`;
  let lanes = '', marks = '';
  for (const p of pack.places) {
    const reach = p.id !== s.place && Math.hypot(p.x - cur.x, p.y - cur.y) <= v.range;
    if (reach) lanes += `<path class="route mine" d="M${f(cur.x * k)} ${f(cur.y * k)}L${f(p.x * k)} ${f(p.y * k)}"/>`;
    marks += placeMark(pack, s, p, p.x * k, p.y * k, {
      reach: reach || p.id === s.place, anchor: 'middle', dx: 0, dy: -11, subDy: 19, cls: 'k-' + p.kind,
      sub: reach || p.id === s.place ? p.kindLabel : '',
    });
  }
  return {
    focus: [cur.x * k, cur.y * k], w: 800, h: 800,
    svg: `<svg class="map map-space" viewBox="0 0 800 800" role="img" aria-label="Star chart">
<rect width="800" height="800" class="void"/><g class="dust">${dots}</g>
<circle class="range" cx="${f(cur.x * k)}" cy="${f(cur.y * k)}" r="${f(v.range * k)}"/>
${lanes}${marks}</svg>`,
  };
}

export function renderMap(pack, s) {
  return pack.id === 'sail' ? sailMap(pack, s) : pack.id === 'silk' ? silkMap(pack, s) : spaceMap(pack, s);
}
