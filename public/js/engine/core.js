// The shared trading rules. Nothing here knows about the screen or about any
// one era: an era is a data pack (see ../packs) and the game is a plain object
// `s` that can be saved as JSON.

import { rnd, rint, pick, gauss } from './rng.js';

export const SPREAD = 0.08; // gap between a market's buying and selling price
export const MAX_GUARDS = 6;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));

// ---------- pack lookups ----------

const cache = new WeakMap();
export function I(pack) {
  let c = cache.get(pack);
  if (c) return c;
  c = { good: {}, place: {}, veh: {}, tier: {}, ref: {} };
  pack.goods.forEach((g) => (c.good[g.id] = g));
  pack.places.forEach((p) => (c.place[p.id] = p));
  pack.vehicles.forEach((v, i) => ((c.veh[v.id] = v), (c.tier[v.id] = i)));
  for (const g of pack.goods) {
    const mods = pack.places.map((p) => p.mods[g.id] ?? 1);
    const mean = Math.exp(mods.reduce((a, m) => a + Math.log(m), 0) / mods.length);
    c.ref[g.id] = { lo: Math.min(...mods), hi: Math.max(...mods), mean };
  }
  cache.set(pack, c);
  return c;
}

export const veh = (pack, s) => I(pack).veh[s.vehicle];
export const here = (pack, s) => I(pack).place[s.place];
export const cargoUsed = (s) => Object.values(s.cargo).reduce((a, c) => a + c.q, 0);
export const cargoFree = (pack, s) => veh(pack, s).cap - cargoUsed(s);
export const defense = (pack, s) => veh(pack, s).def + s.guards;

export function season(pack, day) {
  if (!pack.seasons) return { id: 'none', name: '', storm: 1 };
  const doy = ((day - 1) % pack.yearLen) + 1;
  return pack.seasons.find((x) => doy >= x.from && doy <= x.to) || pack.seasons[0];
}

export function hasService(pack, s, svc) {
  return (pack.everywhere || []).includes(svc) || (here(pack, s).services || []).includes(svc);
}

function news(s, text, kind) {
  s.news.push({ d: s.day, t: text, k: kind || 'note' });
}

// ---------- new game ----------

export function newGame(pack, seed) {
  const s = {
    v: 1, era: pack.id, r: seed >>> 0, day: 1, place: pack.start.place,
    cash: pack.start.cash, debt: pack.start.debt, bank: 0,
    vehicle: pack.start.vehicle, guards: 0, hull: 100,
    supplies: pack.supplies ? pack.supplies.start : 0,
    cargo: {}, mk: {}, events: [], news: [], seen: {},
    trip: null, pending: null, over: null, tut: 1, tutPlan: null,
    stats: { trades: 0, profit: 0, trips: 0, won: 0, lost: 0, visited: {}, worth: [], routes: {} },
  };
  for (const p of pack.places) {
    s.mk[p.id] = {};
    for (const g of pack.goods) s.mk[p.id][g.id] = { d: gauss(s) * 0.1, t: gauss(s) * 0.1, p: 0, m: 0 };
  }
  spawnEvent(pack, s);
  spawnEvent(pack, s);
  s.stats.visited[s.place] = 1;
  s.stats.worth.push([1, worth(pack, s)]);
  see(pack, s);
  return s;
}

// Fill in anything a save from an older build is missing, so it still loads.
export function migrate(pack, s) {
  const d = newGame(pack, s.r || 1);
  for (const k in d) if (!(k in s)) s[k] = d[k];
  for (const k in d.stats) if (!(k in s.stats)) s.stats[k] = d.stats[k];
  for (const p of pack.places) {
    if (!s.mk[p.id]) s.mk[p.id] = d.mk[p.id];
    for (const g of pack.goods) if (!s.mk[p.id][g.id]) s.mk[p.id][g.id] = { d: 0, t: 0, p: 0, m: 0 };
  }
  for (const gid of Object.keys(s.cargo)) if (!I(pack).good[gid]) delete s.cargo[gid];
  if (!I(pack).veh[s.vehicle]) s.vehicle = pack.start.vehicle;
  if (!I(pack).place[s.place]) s.place = pack.start.place;
  return s;
}

// ---------- prices ----------

export function mid(pack, s, placeId, goodId) {
  const g = I(pack).good[goodId];
  const m = s.mk[placeId][goodId];
  let x = g.base * (I(pack).place[placeId].mods[goodId] ?? 1) * Math.exp(m.d + m.t + m.p + m.m);
  for (const e of s.events) if (e.k === 'price' && e.place === placeId && e.good === goodId) x *= e.mult;
  return Math.max(1, x);
}

export const buyPrice = (pack, s, placeId, goodId) => Math.max(1, Math.round(mid(pack, s, placeId, goodId) * (1 + SPREAD / 2)));
export const sellPrice = (pack, s, placeId, goodId) => Math.max(1, Math.round(mid(pack, s, placeId, goodId) * (1 - SPREAD / 2)));

// Where a price sits against what the good costs across the whole era.
export function level(pack, s, placeId, goodId) {
  const ref = I(pack).ref[goodId];
  const x = mid(pack, s, placeId, goodId) / I(pack).good[goodId].base;
  const lo = Math.log(ref.lo * 0.7);
  const hi = Math.log(ref.hi * 1.35);
  return {
    pos: clamp((Math.log(x) - lo) / (hi - lo), 0, 1),
    tag: x / ref.mean < 0.82 ? 'low' : x / ref.mean > 1.22 ? 'high' : 'mid',
  };
}

export const depthOf = (pack, placeId, goodId) => I(pack).good[goodId].depth * (I(pack).place[placeId].size ?? 1);

// Cost (or proceeds) of trading `qty` units here. Every unit moves the price:
// buying pushes it up, selling pushes it down.
export function quote(pack, s, goodId, qty, side, placeId = s.place) {
  if (qty <= 0) return { total: 0, unit: 0, shift: 0 };
  const sign = side === 'buy' ? 1 : -1;
  const f = 1 + (sign * SPREAD) / 2;
  const r = Math.exp(sign / depthOf(pack, placeId, goodId));
  const sum = (mid(pack, s, placeId, goodId) * f * (Math.pow(r, qty) - 1)) / (r - 1);
  const total = side === 'buy' ? Math.max(qty, Math.ceil(sum)) : Math.max(0, Math.floor(sum));
  return { total, unit: total / qty, shift: (sign * qty) / depthOf(pack, placeId, goodId) };
}

export function maxBuy(pack, s, goodId) {
  let lo = 0;
  let hi = Math.max(0, cargoFree(pack, s));
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (quote(pack, s, goodId, m, 'buy').total <= s.cash) lo = m;
    else hi = m - 1;
  }
  return lo;
}

function press(s, goodId, shift) {
  const m = s.mk[s.place][goodId];
  m.p += shift * 0.7; // fades in about a week
  m.m += shift * 0.3; // lingers for a couple of months
}

export function buy(pack, s, goodId, qty) {
  qty = Math.floor(qty);
  if (qty <= 0 || qty > cargoFree(pack, s) || s.trip || s.over) return null;
  const q = quote(pack, s, goodId, qty, 'buy');
  if (q.total > s.cash) return null;
  s.cash -= q.total;
  const c = s.cargo[goodId] || (s.cargo[goodId] = { q: 0, cost: 0 });
  c.q += qty;
  c.cost += q.total;
  press(s, goodId, q.shift);
  s.stats.trades++;
  see(pack, s);
  return { qty, total: q.total };
}

export function sell(pack, s, goodId, qty) {
  qty = Math.floor(qty);
  const c = s.cargo[goodId];
  if (!c || qty <= 0 || qty > c.q || s.trip || s.over) return null;
  const q = quote(pack, s, goodId, qty, 'sell');
  const basis = Math.round((c.cost * qty) / c.q);
  s.cash += q.total;
  c.q -= qty;
  c.cost -= basis;
  if (c.q <= 0) delete s.cargo[goodId];
  press(s, goodId, q.shift);
  s.stats.trades++;
  s.stats.profit += q.total - basis;
  see(pack, s);
  return { qty, total: q.total, profit: q.total - basis };
}

// Remember what this market charged, for the map.
export function see(pack, s) {
  const p = {};
  for (const g of pack.goods) p[g.id] = Math.round(mid(pack, s, s.place, g.id));
  s.seen[s.place] = { d: s.day, p };
}

// ---------- the passing of days ----------

function spawnEvent(pack, s) {
  const kind = pick(s, ['boom', 'glut', 'boom', 'glut', 'peril', 'calm']);
  const pl = pick(s, pack.places);
  const until = s.day + rint(s, 9, 18);
  if (kind === 'boom' || kind === 'glut') {
    const g = pick(s, pack.goods);
    if (s.events.some((e) => e.place === pl.id && e.good === g.id)) return;
    const mult = kind === 'boom' ? 1.45 + rnd(s) * 0.6 : 0.5 + rnd(s) * 0.18;
    const text = fill(pick(s, pack.eventText[kind]), { place: pl.name, good: g.name.toLowerCase(), Good: g.name });
    s.events.push({ k: 'price', kind, place: pl.id, good: g.id, mult, until, text });
    news(s, text, kind);
  } else {
    if (s.events.some((e) => e.k === 'danger' && e.place === pl.id)) return;
    const text = fill(pick(s, pack.eventText[kind]), { place: pl.name });
    s.events.push({ k: 'danger', kind, place: pl.id, mult: kind === 'peril' ? 2 : 0.4, until, text });
    news(s, text, kind);
  }
}

export function tickDay(pack, s) {
  s.day++;
  if (s.debt > 0) s.debt *= 1 + pack.rates.debt;
  if (s.bank > 0) s.bank *= 1 + pack.rates.bank;
  const goods = I(pack).good;
  for (const pid in s.mk) {
    const row = s.mk[pid];
    for (const gid in row) {
      const m = row[gid];
      const vol = goods[gid].vol;
      m.d = m.d * 0.92 + vol * gauss(s);
      m.t = m.t * 0.988 + vol * 0.35 * gauss(s);
      m.p *= 0.88;
      m.m *= 0.985;
    }
  }
  s.events = s.events.filter((e) => e.until >= s.day);
  if (s.events.length < pack.maxEvents && rnd(s) < pack.eventRate) spawnEvent(pack, s);
}

// ---------- supplies (water on the road, fuel in space) ----------

export function supplyCap(pack, s) {
  if (!pack.supplies) return 0;
  return pack.supplies.per === 'day' ? veh(pack, s).water : veh(pack, s).range;
}

export function supplyPrice(pack, s) {
  if (!pack.supplies) return 0;
  return Math.max(1, Math.round(pack.supplies.price * (here(pack, s).supplyMod ?? 1) * (veh(pack, s).thirst ?? 1)));
}

export function buySupplies(pack, s, n) {
  n = Math.floor(n);
  const cost = n * supplyPrice(pack, s);
  if (n <= 0 || s.supplies + n > supplyCap(pack, s) || cost > s.cash || s.trip) return false;
  s.cash -= cost;
  s.supplies += n;
  return true;
}

// ---------- travel ----------

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function dangerMult(s, a, b) {
  let m = 1;
  for (const e of s.events) if (e.k === 'danger' && (e.place === a || e.place === b)) m *= e.mult;
  return m;
}

// The way from here to `to`, or null when there is no direct way.
export function routeTo(pack, s, to) {
  const v = veh(pack, s);
  const P = I(pack).place;
  const sea = season(pack, s.day);
  let days, danger, weather, d = 0, closed = false;
  if (pack.travel.mode === 'graph') {
    const r = pack.routes.find((x) => (x.a === s.place && x.b === to) || (x.b === s.place && x.a === to));
    if (!r) return null;
    days = Math.max(1, Math.ceil(r.days / v.speed));
    danger = r.danger;
    weather = r.weather * (r.calm ? 1 : sea.storm ?? 1);
    closed = !!(r.closed && r.closed.includes(sea.id));
  } else {
    if (to === s.place || !P[to]) return null;
    d = dist(P[s.place], P[to]);
    days = Math.max(1, Math.ceil(d / (pack.travel.perDay * v.speed)));
    danger = (P[s.place].danger + P[to].danger) / 2;
    weather = pack.travel.weather;
  }
  const need = !pack.supplies ? 0 : pack.supplies.per === 'day' ? days : Math.ceil(d);
  return {
    to, days, need, closed, dist: d,
    danger: clamp(danger * dangerMult(s, s.place, to), 0, 0.9),
    weather: clamp(weather, 0, 0.9),
    tooFar: need > supplyCap(pack, s),
  };
}

export function routes(pack, s) {
  const out = [];
  for (const p of pack.places) {
    const r = p.id === s.place ? null : routeTo(pack, s, p.id);
    if (r) out.push(r);
  }
  return out;
}

export function depart(pack, s, to) {
  const r = routeTo(pack, s, to);
  if (!r || r.closed || r.tooFar || s.supplies < r.need || s.pending || s.trip || s.over) return false;
  if (pack.supplies && pack.supplies.per !== 'day') s.supplies -= r.need;
  const enc = [];
  const safe = s.tut && s.stats.trips === 0; // the first trip never goes wrong
  if (!safe) {
    if (rnd(s) < r.danger) enc.push({ day: rint(s, 1, r.days), type: 'hostile' });
    if (rnd(s) < r.weather) enc.push({ day: rint(s, 1, r.days), type: 'weather' });
    if (rnd(s) < 0.1) enc.push({ day: rint(s, 1, r.days), type: 'luck' });
  }
  const key = [s.place, to].sort().join('~');
  s.stats.routes[key] = (s.stats.routes[key] || 0) + 1;
  s.trip = { from: s.place, to, days: r.days, left: r.days, el: 0, enc };
  return true;
}

// One step of a journey. Returns {type: 'day' | 'encounter' | 'arrive'}; the
// screen keeps calling until it arrives, stopping to ask whenever s.pending
// is set.
export function travelDay(pack, s) {
  const t = s.trip;
  if (!t || s.pending) return null;
  const e = t.enc.find((x) => !x.done && x.day <= t.el);
  if (e) {
    e.done = 1;
    s.pending = makeEncounter(pack, s, e.type);
    return { type: 'encounter' };
  }
  if (t.left <= 0) return arrive(pack, s);
  tickDay(pack, s);
  t.left--;
  t.el++;
  let dry = null;
  if (pack.supplies && pack.supplies.per === 'day') {
    if (s.supplies > 0) s.supplies--;
    else {
      dry = { cargo: loseCargo(s, 0.08), text: pack.hazards.dry };
      hurt(pack, s, 8);
    }
  }
  return { type: 'day', dry };
}

function arrive(pack, s) {
  const t = s.trip;
  s.place = t.to;
  s.trip = null;
  s.stats.trips++;
  s.stats.visited[s.place] = 1;
  if (s.tutPlan && s.tutPlan.to === s.place) {
    // The guided first sale always pays.
    const c = s.cargo[s.tutPlan.good];
    if (c) {
      const want = (c.cost / c.q) * 1.35;
      const have = mid(pack, s, s.place, s.tutPlan.good) * (1 - SPREAD / 2);
      if (have < want) s.mk[s.place][s.tutPlan.good].d += Math.log(want / have);
    }
    s.tutPlan = null;
  }
  see(pack, s);
  s.stats.worth.push([s.day, worth(pack, s)]);
  if (s.day > pack.days) finish(pack, s, 'time');
  return { type: 'arrive', days: t.el, from: t.from };
}

// ---------- trouble on the way ----------

function loseCargo(s, frac) {
  const lost = {};
  for (const gid of Object.keys(s.cargo)) {
    const c = s.cargo[gid];
    const n = Math.min(c.q, Math.round(c.q * frac + rnd(s) * 0.6));
    if (n <= 0) continue;
    c.cost -= Math.round((c.cost * n) / c.q);
    c.q -= n;
    lost[gid] = n;
    if (c.q <= 0) delete s.cargo[gid];
  }
  return lost;
}

// Damage. At zero the ship or caravan is wrecked: the cargo is gone, and what
// is left limps to the destination.
function hurt(pack, s, n) {
  s.hull = Math.max(0, s.hull - n);
  if (s.hull > 0) return false;
  s.cargo = {};
  s.cash -= Math.round(s.cash * 0.2);
  s.hull = 30;
  if (s.trip) {
    s.trip.left = 0;
    s.trip.enc.forEach((x) => (x.done = 1));
  }
  news(s, fill(pack.hazards.wreck, { place: I(pack).place[s.trip ? s.trip.to : s.place].name }), 'peril');
  return true;
}

function makeEncounter(pack, s, type) {
  const h = pack.hazards[type];
  const v = veh(pack, s);
  const enc = { type, title: h.title, text: pick(s, h.intro), choices: [] };
  if (type === 'hostile') {
    const prog = clamp(worth(pack, s) / pack.goal, 0, 1);
    const E = Math.max(1, Math.round((1 + 8 * Math.sqrt(prog)) * (0.6 + 0.8 * rnd(s))));
    const D = defense(pack, s);
    const load = cargoUsed(s) / v.cap;
    enc.E = E;
    enc.toll = Math.max(Math.round(E * 40 * pack.scale), Math.round(s.cash * 0.12));
    enc.choices = [
      { id: 'fight', label: h.fight, odds: clamp((D / (D + E)) * 1.1 + 0.05, 0.1, 0.92) },
      { id: 'flee', label: h.flee, odds: clamp(0.35 + 0.5 * (v.speed - 1) + 0.2 * (1 - load), 0.15, 0.92) },
      { id: 'pay', label: h.pay, cost: enc.toll },
    ];
  } else if (type === 'weather') {
    enc.wait = rint(s, 1, 2);
    enc.choices = [
      { id: 'push', label: h.push, odds: 0.5 },
      { id: 'wait', label: h.wait, days: enc.wait },
    ];
  } else {
    enc.choices = [{ id: 'ok', label: h.ok }];
  }
  return enc;
}

// Answer the question an encounter asked. Returns what happened.
export function resolve(pack, s, choiceId) {
  const enc = s.pending;
  if (!enc) return null;
  const h = pack.hazards[enc.type];
  const c = enc.choices.find((x) => x.id === choiceId) || enc.choices[0];
  const out = { title: enc.title, text: '', tone: 'bad', cash: 0, hull: 0, days: 0, lost: {}, gained: {} };
  const hull0 = s.hull;
  const cash0 = s.cash;
  let wrecked = false;
  if (enc.type === 'hostile') {
    if (c.id === 'fight') {
      if (rnd(s) < c.odds) {
        s.cash += Math.round(enc.E * pack.scale * (60 + rnd(s) * 90));
        wrecked = hurt(pack, s, rint(s, 3, 9));
        s.stats.won++;
        out.text = pick(s, h.win);
        out.tone = 'good';
      } else {
        out.lost = loseCargo(s, 0.25 + rnd(s) * 0.2);
        s.cash -= Math.round(s.cash * (0.1 + rnd(s) * 0.1));
        wrecked = hurt(pack, s, rint(s, 12, 24));
        s.stats.lost++;
        out.text = pick(s, h.lose);
      }
    } else if (c.id === 'flee') {
      if (rnd(s) < c.odds) {
        out.text = pick(s, h.fled);
        out.tone = 'good';
      } else {
        out.lost = loseCargo(s, 0.12 + rnd(s) * 0.13);
        wrecked = hurt(pack, s, rint(s, 6, 14));
        out.text = pick(s, h.caught);
      }
    } else if (s.cash >= enc.toll) {
      s.cash -= enc.toll;
      out.text = pick(s, h.paid);
      out.tone = 'note';
    } else {
      s.cash = 0;
      out.lost = loseCargo(s, 0.2);
      out.text = h.short;
    }
  } else if (enc.type === 'weather') {
    if (c.id === 'wait') {
      s.trip.left += enc.wait;
      out.days = enc.wait;
      out.text = pick(s, h.waited);
      out.tone = 'note';
    } else if (rnd(s) < c.odds) {
      out.text = pick(s, h.safe);
      out.tone = 'good';
    } else {
      const tier = I(pack).tier[s.vehicle];
      if (rnd(s) < 0.3) out.lost = loseCargo(s, 0.05 + rnd(s) * 0.07);
      wrecked = hurt(pack, s, Math.round(rint(s, 9, 20) * (1 - tier * 0.08)));
      out.text = pick(s, h.hit);
    }
  } else {
    const free = cargoFree(pack, s);
    const g = pick(s, pack.goods.filter((x) => x.base <= pack.luckMax));
    const n = Math.min(free, rint(s, 3, 8));
    if (n > 0) {
      const cc = s.cargo[g.id] || (s.cargo[g.id] = { q: 0, cost: 0 });
      cc.q += n;
      out.gained[g.id] = n;
      out.text = fill(pick(s, h.found), { n, good: g.name.toLowerCase() });
    } else {
      s.cash += Math.round(pack.scale * rint(s, 80, 220));
      out.text = pick(s, h.reward);
    }
    out.tone = 'good';
  }
  if (wrecked) {
    out.text += ' ' + fill(pack.hazards.wreck, { place: I(pack).place[s.trip.to].name });
    out.tone = 'bad';
    out.wrecked = true;
  }
  out.cash = s.cash - cash0;
  out.hull = wrecked ? 0 : s.hull - hull0;
  s.pending = null;
  return out;
}

// ---------- money ----------

export function worth(pack, s) {
  let w = s.cash + s.bank - s.debt + Math.round(veh(pack, s).price * 0.5);
  for (const gid in s.cargo) w += s.cargo[gid].q * I(pack).good[gid].base;
  return Math.round(w);
}

export const creditLimit = (pack, s) => Math.max(pack.start.debt * 1.5, Math.round(worth(pack, s) * 0.5));

export function borrow(pack, s, amount) {
  amount = Math.floor(amount);
  if (amount <= 0 || s.debt + amount > creditLimit(pack, s) + 0.5) return false;
  s.debt += amount;
  s.cash += amount;
  return true;
}

export function repay(s, amount) {
  amount = Math.min(Math.floor(amount), s.cash, Math.ceil(s.debt));
  if (amount <= 0) return false;
  s.cash -= amount;
  s.debt = Math.max(0, s.debt - amount);
  if (s.debt < 0.5) s.debt = 0;
  return true;
}

export function deposit(s, amount) {
  amount = Math.min(Math.floor(amount), s.cash);
  if (amount <= 0) return false;
  s.cash -= amount;
  s.bank += amount;
  return true;
}

export function withdraw(s, amount) {
  amount = Math.min(Math.floor(amount), Math.floor(s.bank));
  if (amount <= 0) return false;
  s.bank -= amount;
  s.cash += amount;
  if (s.bank < 1) s.bank = 0;
  return true;
}

// ---------- the yard ----------

export const vehicleCost = (pack, s, id) => I(pack).veh[id].price - Math.round(veh(pack, s).price * 0.5);

export function buyVehicle(pack, s, id) {
  const v = I(pack).veh[id];
  const cost = vehicleCost(pack, s, id);
  if (!v || id === s.vehicle || cost > s.cash || cargoUsed(s) > v.cap) return false;
  s.cash -= cost;
  s.vehicle = id;
  s.hull = 100;
  s.supplies = Math.min(s.supplies, supplyCap(pack, s));
  return true;
}

export const guardCost = (pack, s) => Math.round(pack.guardCost * Math.pow(s.guards + 1, 1.7));

export function hireGuard(pack, s) {
  const cost = guardCost(pack, s);
  if (s.guards >= MAX_GUARDS || cost > s.cash) return false;
  s.cash -= cost;
  s.guards++;
  return true;
}

export const repairPrice = (pack, s) => Math.max(1, Math.round(veh(pack, s).price * 0.0012 + pack.scale * 2));

export function repair(pack, s, points) {
  points = Math.min(Math.floor(points), 100 - s.hull, Math.floor(s.cash / repairPrice(pack, s)));
  if (points <= 0) return false;
  s.cash -= points * repairPrice(pack, s);
  s.hull += points;
  return true;
}

// ---------- the end ----------

export function rank(pack, score) {
  let r = pack.ranks[0];
  for (const x of pack.ranks) if (score >= x.min * pack.goal) r = x;
  return r.title;
}

export function finish(pack, s, reason) {
  const score = worth(pack, s);
  s.over = { reason, score, rank: rank(pack, score), day: s.day };
  return s.over;
}

// ---------- the guided first trade ----------

// The trade a first-time player is walked through: something affordable here
// that sells for clearly more one short trip away.
export function tutorialPlan(pack, s) {
  let best = null;
  for (const r of routes(pack, s)) {
    if (r.closed || r.tooFar || s.supplies < r.need) continue;
    for (const g of pack.goods) {
      const b = buyPrice(pack, s, s.place, g.id);
      if (b * 4 > s.cash) continue;
      const score = sellPrice(pack, s, r.to, g.id) / b / Math.sqrt(r.days);
      if (!best || score > best.score) best = { good: g.id, to: r.to, score };
    }
  }
  return best;
}
