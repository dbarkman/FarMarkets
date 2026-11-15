// The screens. All game rules live in ../engine/core.js; this file only shows
// the game and turns taps into engine calls.

import sail from '../packs/sail.js';
import silk from '../packs/silk.js';
import space from '../packs/space.js';
import * as E from '../engine/core.js';
import { icon, navIcons, vehicleArt, scene, hand, supplyIcon } from './art.js';
import { renderMap } from './map.js';

const PACKS = { sail, silk, space };
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plural = (n, word) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

let G = null; // { pack, s, tab }
let shown = {}; // numbers currently on screen, for counting up and down
let A = null; // the open amount sheet
let D = null; // the open destination sheet
let nextDone = null; // resolves when the player taps "carry on"
let encDone = null;

const W = () => G.pack.words;
const moneyL = () => W().money.toLowerCase();

// ---------- saving ----------

const KEY = 'farmarkets.v1';
const API = 'api/save.php';
const round = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(5) : v);
let store = { saves: {}, best: {}, id: null };
try {
  store = Object.assign(store, JSON.parse(localStorage.getItem(KEY)) || {});
} catch (e) { /* no saved games on this device */ }

let syncTimer = 0;
let dirty = false;
function writeLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store, round));
  } catch (e) { /* storage is full or blocked; the server copy still works */ }
}
function persist() {
  writeLocal();
  dirty = true;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushSync, 2500);
}
const payload = () => JSON.stringify({ data: { saves: store.saves, best: store.best } }, round);

async function pushSync() {
  if (!dirty) return;
  dirty = false;
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload() });
    if (!r.ok) return;
    const j = await r.json();
    if (j.id && j.id !== store.id) {
      store.id = j.id;
      writeLocal();
    }
  } catch (e) { /* offline: the save stays on this device */ }
}

function mergeRemote(d) {
  let changed = false;
  for (const era in d.saves || {}) {
    const mine = store.saves[era];
    if (PACKS[era] && (!mine || (d.saves[era].ts || 0) > mine.ts)) {
      store.saves[era] = d.saves[era];
      changed = true;
    }
  }
  for (const era in d.best || {}) {
    if (!store.best[era] || d.best[era].score > store.best[era].score) {
      store.best[era] = d.best[era];
      changed = true;
    }
  }
  if (changed) {
    writeLocal();
    if (!G) renderTitle();
  }
}

async function pullSync() {
  try {
    const r = await fetch(API, { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j.id) store.id = j.id;
    if (j.data) mergeRemote(j.data);
    writeLocal();
  } catch (e) { /* no server copy reachable */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && dirty && navigator.sendBeacon) {
    dirty = false;
    navigator.sendBeacon(API, new Blob([payload()], { type: 'application/json' }));
  }
});

function saveGame() {
  if (!G) return;
  store.saves[G.pack.id] = { ts: Date.now(), s: G.s };
  persist();
}

// ---------- title ----------

function renderTitle() {
  G = null;
  Tut.hide();
  document.body.dataset.era = 'title';
  const cards = Object.values(PACKS).map((p) => {
    const sv = store.saves[p.id];
    const best = store.best[p.id];
    let status = 'Begin';
    if (sv && sv.s.over) status = `Finished: ${sv.s.over.rank}`;
    else if (sv) status = `Continue · day ${sv.s.day} · ${fmt(sv.s.cash)} ${p.words.money.toLowerCase()}`;
    return `<button class="era-card" data-era="${p.id}" data-act="era" data-id="${p.id}">
<div class="era-art">${scene(p.id)}</div>
<div class="era-body"><div class="eyebrow">${p.setting}</div><h2>${p.name}</h2><p>${p.tagline}</p>
<div class="era-foot"><span class="go">${status}${icon('right')}</span>${best ? `<span class="best">Best: ${best.rank} · ${fmt(best.score)}</span>` : ''}</div></div></button>`;
  }).join('');
  app.innerHTML = `<div class="title"><header><div class="logo">Far Markets</div><p>Buy low. Sell high. Three ages of trade.</p></header>
<div class="eras">${cards}</div>
<footer><button class="link" data-act="code">Have a save code from another device?</button></footer>
<div class="layer" id="sheet" hidden></div><div id="toasts"></div></div>`;
}

function startEra(id, fresh) {
  const pack = PACKS[id];
  const sv = store.saves[id];
  let s;
  if (sv && !fresh) {
    try {
      s = E.migrate(pack, sv.s);
    } catch (e) {
      s = null;
    }
  }
  if (!s) s = E.newGame(pack, (Math.random() * 4294967296) >>> 0);
  G = { pack, s, tab: 'market' };
  saveGame();
  renderGame();
  if (s.over) showEnd();
  else if (s.trip) runTrip();
  else tutStep();
}

// ---------- the game frame ----------

function renderGame() {
  const { pack } = G;
  document.body.dataset.era = pack.id;
  app.innerHTML = `<div class="game" data-era="${pack.id}">
<header class="hud" id="hud"></header><main class="view" id="view"></main><nav class="tabs" id="tabs"></nav>
<div class="layer" id="sheet" hidden></div><div class="layer" id="over" hidden></div><div id="toasts"></div></div>`;
  shown = {};
  drawHud();
  drawTabs();
  drawView(true);
}

function drawHud() {
  const { pack, s } = G;
  const w = W();
  const p = E.here(pack, s);
  const sea = E.season(pack, s.day);
  const v = E.veh(pack, s);
  const used = E.cargoUsed(s);
  const sup = pack.supplies
    ? `<div class="gauge"><span>${pack.supplies.name}</span><i class="bar"><b style="width:${Math.round((s.supplies / E.supplyCap(pack, s)) * 100)}%"></b></i><em>${s.supplies}/${E.supplyCap(pack, s)}</em></div>`
    : '';
  $('#hud').innerHTML = `<div class="hud-top"><div class="where">
<div class="eyebrow">Day ${Math.min(s.day, pack.days)} of ${pack.days}${sea.name ? ' · ' + sea.name : ''}</div>
<h1>${p.name}</h1><div class="blurb">${p.kindLabel ? p.kindLabel + ' · ' : ''}${p.blurb}</div></div>
<button class="crest" data-act="tab" data-tab="port" aria-label="${w.vehicle}: ${v.name}">${vehicleArt[pack.id]}</button></div>
<div class="stats">
<div class="stat"><span class="k">${w.money}</span><span class="v" data-num="cash" data-val="${Math.round(s.cash)}"></span></div>
<div class="stat debt"><span class="k">Debt</span><span class="v" data-num="debt" data-val="${Math.ceil(s.debt)}"></span></div>
<div class="stat"><span class="k">${w.cargo}</span><span class="v"><span data-num="used" data-val="${used}"></span><small> / ${v.cap}</small></span></div></div>
<div class="gauges"><div class="gauge ${s.hull < 40 ? 'low' : ''}"><span>${w.hull}</span><i class="bar"><b style="width:${s.hull}%"></b></i><em>${s.hull}%</em></div>${sup}</div>`;
  tweenNums($('#hud'));
}

function tweenNums(root) {
  root.querySelectorAll('[data-num]').forEach((el) => {
    const key = el.dataset.num;
    const to = +el.dataset.val;
    const from = shown[key] ?? to;
    shown[key] = to;
    if (from === to) {
      el.textContent = fmt(to);
      return;
    }
    const t0 = performance.now();
    el.classList.add(to > from ? 'rise' : 'fall');
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 650);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
      else el.classList.remove('rise', 'fall');
    };
    requestAnimationFrame(step);
  });
}

function drawTabs() {
  const w = W();
  const ids = ['market', 'map', 'port', 'ledger'];
  $('#tabs').innerHTML = ids.map((id, i) =>
    `<button data-act="tab" data-tab="${id}" class="${G.tab === id ? 'on' : ''}" ${G.tab === id ? 'aria-current="page"' : ''}>${icon(navIcons[G.pack.id][i])}<span>${w[id]}</span></button>`
  ).join('');
}

function drawView(enter) {
  const view = $('#view');
  const top = view.scrollTop;
  view.innerHTML = { market: viewMarket, map: viewMap, port: viewPort, ledger: viewLedger }[G.tab]();
  view.className = 'view v-' + G.tab + (enter ? ' enter' : '');
  if (enter) view.scrollTop = 0;
  else view.scrollTop = top;
  if (G.tab === 'map') fitMap();
}

// ---------- market ----------

function viewMarket() {
  const { pack, s } = G;
  const w = W();
  const rows = pack.goods.map((g) => {
    const lv = E.level(pack, s, s.place, g.id);
    const c = s.cargo[g.id];
    const ev = s.events.find((e) => e.k === 'price' && e.place === s.place && e.good === g.id);
    return `<button class="item ${lv.tag}${c ? ' held' : ''}" data-act="trade" data-good="${g.id}">
<span class="gi">${icon(g.icon)}</span>
<span class="gn"><b>${g.name}</b><small class="tag">${w.tags[lv.tag]}${ev ? ` · ${ev.kind === 'boom' ? w.boom : w.glut}` : ''}</small>${c ? `<small class="own">${w.carry} ${fmt(c.q)} · ${c.cost ? 'paid ' + fmt(c.cost / c.q) : 'found'}</small>` : ''}</span>
<span class="meter" style="--pos:${Math.round(lv.pos * 100)}%"><i></i></span>
<span class="gp">${fmt(E.mid(pack, s, s.place, g.id))}</span></button>`;
  }).join('');
  return `<div class="view-head"><h2>${w.marketTitle}</h2><span class="hint">price per ${w.unit}</span></div><div class="goods">${rows}</div>`;
}

function openTrade(gid) {
  const { pack, s } = G;
  const w = W();
  const g = E.I(pack).good[gid];
  const lv = E.level(pack, s, s.place, gid);
  const held = () => (s.cargo[gid] ? s.cargo[gid].q : 0);
  const canBuy = E.maxBuy(pack, s, gid) > 0;
  openAmount({
    icon: g.icon, title: g.name,
    sub: `${w.tags[lv.tag]} · usually about ${fmt(g.base * E.I(pack).ref[gid].mean)}`,
    side: held() > 0 && (lv.tag !== 'low' || !canBuy) ? 'sell' : 'buy',
    sides: [
      {
        id: 'buy', label: 'Buy', max: () => E.maxBuy(pack, s, gid),
        calc: (n) => {
          const q = E.quote(pack, s, gid, n, 'buy');
          const one = E.quote(pack, s, gid, 1, 'buy').total;
          let note = n > 1 && q.unit > one * 1.04 ? 'The price climbs as you buy more.' : '';
          if (n === 0) note = E.cargoFree(pack, s) <= 0 ? `The ${w.cargo.toLowerCase()} is full.` : `Not enough ${moneyL()} for even one.`;
          return { rows: [['Each', fmt(n ? q.unit : one)], ['Cost', fmt(q.total)], [`${w.money} left`, fmt(s.cash - q.total)]], note, cta: `Buy ${fmt(n)} for ${fmt(q.total)}` };
        },
        go: (n) => {
          if (!E.buy(pack, s, gid, n)) return;
          toast(`Bought ${fmt(n)} ${g.name.toLowerCase()}`);
          if (s.tut === 2 && gid === s.tutGood) s.tut = 3;
        },
      },
      {
        id: 'sell', label: 'Sell', max: held,
        calc: (n) => {
          const q = E.quote(pack, s, gid, n, 'sell');
          const one = E.quote(pack, s, gid, 1, 'sell').total;
          const c = s.cargo[gid];
          const pr = q.total - (c ? (c.cost * n) / c.q : 0);
          let note = c && c.cost ? `You paid ${fmt(c.cost / c.q)} each.` : '';
          if (n > 1 && q.unit < one * 0.96) note = 'The price drops as you sell more.';
          return {
            rows: [['Each', fmt(n ? q.unit : one)], ['You get', fmt(q.total)], [pr >= 0 ? 'Profit' : 'Loss', (pr >= 0 ? '+' : '−') + fmt(Math.abs(pr)), pr >= 0 ? 'up' : 'down']],
            note, cta: `Sell ${fmt(n)} for ${fmt(q.total)}`,
          };
        },
        go: (n) => {
          const r = E.sell(pack, s, gid, n);
          if (!r) return;
          toast(`${r.profit >= 0 ? 'Profit' : 'Loss'}: ${r.profit >= 0 ? '+' : '−'}${fmt(Math.abs(r.profit))} ${moneyL()}`, r.profit >= 0 ? 'good' : 'bad');
          if (r.profit > 0) coins();
          if (s.tut === 4 && gid === s.tutGood) s.tut = 5;
        },
      },
    ],
    flash: `.item[data-good="${gid}"]`,
  });
}

// ---------- amount sheet (trading, banking, repairs) ----------

const curSide = () => A.sides.find((x) => x.id === A.side);

function openAmount(cfg) {
  A = cfg;
  D = null;
  A.side = cfg.side || cfg.sides[0].id;
  if (curSide().max() <= 0) {
    const other = A.sides.find((x) => x.max() > 0);
    if (other) A.side = other.id;
  }
  A.n = null;
  drawAmount(true);
}

function drawAmount(first) {
  const sd = curSide();
  const max = sd.max();
  if (A.n == null || A.n > max) A.n = sd.start ? Math.min(max, sd.start()) : max;
  const seg = A.sides.length > 1
    ? `<div class="seg">${A.sides.map((x) => `<button data-act="side" data-side="${x.id}" class="${x.id === A.side ? 'on' : ''}" ${x.max() <= 0 ? 'disabled' : ''}>${x.label}</button>`).join('')}</div>`
    : '';
  openSheet(`<div class="sheet-head">${A.icon ? `<span class="gi lg">${icon(A.icon)}</span>` : ''}<div><h3>${A.title}</h3><p>${A.sub || ''}</p></div></div>${seg}
<div class="qty"><button class="rnd" data-act="step" data-d="-1" aria-label="Less">${icon('minus')}</button><output id="a-n"></output><button class="rnd" data-act="step" data-d="1" aria-label="More">${icon('plus')}</button></div>
<input type="range" id="a-r" min="0" max="${max}" value="${A.n}" aria-label="Amount" ${max <= 0 ? 'disabled' : ''}>
<div class="chips"><button data-act="qset" data-f="0.25">Quarter</button><button data-act="qset" data-f="0.5">Half</button><button data-act="qset" data-f="1">All</button></div>
<dl class="sum" id="a-sum"></dl><p class="note" id="a-note"></p><button class="cta" data-act="confirm" id="a-go"></button>`, first);
  updAmount();
}

function updAmount() {
  const c = curSide().calc(A.n);
  $('#a-n').textContent = fmt(A.n);
  $('#a-r').value = A.n;
  $('#a-sum').innerHTML = c.rows.map(([k, v, cls]) => `<div><dt>${k}</dt><dd class="${cls || ''}">${v}</dd></div>`).join('');
  $('#a-note').textContent = c.note || '';
  const go = $('#a-go');
  go.textContent = c.cta;
  go.disabled = A.n <= 0;
}

function openSheet(html, animate = true) {
  const el = $('#sheet');
  el.hidden = false;
  el.innerHTML = `<div class="scrim" data-act="close"></div><div class="sheet${animate ? ' in' : ''}" role="dialog" aria-modal="true"><button class="x" data-act="close" aria-label="Close">${icon('close')}</button>${html}</div>`;
}

function closeSheet() {
  const el = $('#sheet');
  if (!el || el.hidden) return;
  A = null;
  D = null;
  el.classList.add('closing');
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove('closing');
    el.innerHTML = '';
    if (G) tutStep();
  }, 200);
}

function refresh(flash) {
  saveGame();
  drawHud();
  drawView(false);
  if (flash) {
    const row = $(flash);
    if (row) row.classList.add('flash');
  }
}

// ---------- map and travel ----------

function riskLabel(p) {
  return p < 0.18 ? ['Quiet', 'good'] : p < 0.33 ? ['Some risk', 'mid'] : ['Dangerous', 'bad'];
}

// What everyone knows about a place: what it makes and what it lacks.
function rumor(p) {
  const goods = G.pack.goods.map((g) => ({ n: g.name.toLowerCase(), m: p.mods[g.id] })).sort((a, b) => a.m - b.m);
  const cheap = goods.filter((g) => g.m < 0.8).slice(0, 2).map((g) => g.n);
  const dear = goods.slice(-2).reverse().map((g) => g.n);
  return `${cheap.length ? `Traders say ${cheap.join(' and ')} ${cheap.length > 1 ? 'are' : 'is'} cheap there, and` : 'Traders say'} ${dear.join(' and ')} sell well.`;
}

// The best thing the player knows they could carry from here to there.
function bestTip(to) {
  const { pack, s } = G;
  const seen = s.seen[to];
  if (!seen) return null;
  let best = null;
  for (const g of pack.goods) {
    const here = E.mid(pack, s, s.place, g.id);
    const ratio = seen.p[g.id] / here;
    if (ratio > 1.15 && (!best || ratio > best.ratio)) best = { g, ratio, here, there: seen.p[g.id] };
  }
  return best;
}

function viewMap() {
  const { pack, s } = G;
  const w = W();
  const m = renderMap(pack, s);
  const P = E.I(pack).place;
  const list = E.routes(pack, s).filter((r) => !r.tooFar || pack.travel.mode === 'graph').sort((a, b) => a.days - b.days);
  const cards = list.map((r) => {
    const p = P[r.to];
    const [dl, dc] = riskLabel(r.danger);
    const tip = bestTip(r.to);
    const line = r.tooFar ? `${icon('lock')} Needs ${r.need} ${pack.supplies.unit}. You can carry ${E.supplyCap(pack, s)}.`
      : r.closed ? `${icon('lock')} Snowed in until spring`
      : tip ? `${tip.g.name}: ${fmt(tip.here)} here, ${fmt(tip.there)} there`
      : s.seen[r.to] ? 'Nothing here sells for more there' : 'Not visited yet';
    return `<button class="dest-card${r.closed || r.tooFar ? ' closed' : ''}" data-act="dest" data-to="${r.to}">
<span class="dn"><b>${p.name}</b><small>${line}</small></span>
<span class="dd"><b>${r.days}</b><small>${r.days === 1 ? 'day' : 'days'}</small></span>
<span class="risk ${dc}">${dl}</span></button>`;
  }).join('');
  return `<div class="view-head"><h2>${w.map}</h2><span class="hint">tap a place to go</span></div>
<div class="mapwrap" id="mapwrap" data-w="${m.w}" data-h="${m.h}" data-fx="${m.focus[0]}" data-fy="${m.focus[1]}">${m.svg}</div>
<div class="dests">${cards}</div>`;
}

function fitMap() {
  const wrap = $('#mapwrap');
  if (!wrap) return;
  const svg = $('svg', wrap);
  const w = +wrap.dataset.w, h = +wrap.dataset.h;
  let scale;
  if (G.pack.id === 'sail') scale = wrap.clientWidth / w;
  else if (G.pack.id === 'silk') scale = 310 / h;
  else scale = Math.max(0.8, wrap.clientWidth / 520);
  svg.style.width = w * scale + 'px';
  svg.style.height = h * scale + 'px';
  wrap.scrollLeft = +wrap.dataset.fx * scale - wrap.clientWidth / 2;
  wrap.scrollTop = +wrap.dataset.fy * scale - wrap.clientHeight / 2;
}

function openDest(to) {
  const { pack, s } = G;
  if (to === s.place) return;
  const r = E.routeTo(pack, s, to);
  const minBuy = r ? Math.max(0, r.need - s.supplies) : 0;
  const room = pack.supplies ? E.supplyCap(pack, s) - s.supplies : 0;
  const margin = pack.supplies && pack.supplies.per === 'day' ? 2 : 0;
  const price = E.supplyPrice(pack, s);
  let buy = Math.min(room, minBuy + margin);
  while (buy > minBuy && buy * price > s.cash) buy--;
  D = { to, r, buy, minBuy, room };
  A = null;
  drawDest(true);
}

function drawDest(first) {
  const { pack, s } = G;
  const w = W();
  const { to, r } = D;
  const p = E.I(pack).place[to];
  const price = E.supplyPrice(pack, s);
  let facts = '', sup = '', cta = '';
  if (!r || r.tooFar) {
    facts = `<p class="note">${r ? `It is ${r.need} ${pack.supplies.unit} away. This ${w.vehicle.toLowerCase()} carries ${E.supplyCap(pack, s)}.` : w.noWay}</p>`;
  } else {
    const [dl, dc] = riskLabel(r.danger);
    const [wl, wc] = riskLabel(r.weather);
    facts = `<div class="facts"><div>${icon('clock')}<b>${r.days} ${r.days === 1 ? 'day' : 'days'}</b><small>the journey</small></div>
<div class="${dc}">${icon('swords')}<b>${dl}</b><small>${w.hostile}</small></div><div class="${wc}">${icon('cloud')}<b>${wl}</b><small>${w.weather}</small></div></div>`;
    if (pack.supplies) {
      const cost = D.buy * price;
      sup = `<div class="supply">${icon(supplyIcon[pack.id])}<div class="st"><b>${pack.supplies.name}: need ${r.need}, have ${s.supplies}</b>
<small>${D.buy ? `Buying ${D.buy} for ${fmt(cost)} ${moneyL()}` : 'Nothing to buy'} · ${fmt(price)} each</small></div>
<button class="rnd" data-act="sup" data-d="-1" aria-label="Buy less" ${D.buy <= D.minBuy ? 'disabled' : ''}>${icon('minus')}</button>
<button class="rnd" data-act="sup" data-d="1" aria-label="Buy more" ${D.buy >= D.room || (D.buy + 1) * price > s.cash ? 'disabled' : ''}>${icon('plus')}</button></div>`;
    }
    const broke = D.minBuy * price > s.cash;
    cta = r.closed
      ? `<button class="cta" disabled>${icon('lock')} Snowed in until spring</button>`
      : broke
        ? `<button class="cta" disabled>Not enough ${moneyL()} for ${pack.supplies.name.toLowerCase()}</button>`
        : `<button class="cta" data-act="go">${w.departTo} ${p.name}</button>`;
  }
  const seen = s.seen[to];
  let know;
  if (!seen) know = `<p class="note">You have not been to ${p.name} yet. ${rumor(p)}</p>`;
  else {
    const rows = pack.goods.map((g) => ({ g, here: E.mid(pack, s, s.place, g.id), there: seen.p[g.id] }))
      .sort((a, b) => b.there / b.here - a.there / a.here)
      .map(({ g, here, there }) => {
        const k = there / here;
        const cls = k > 1.15 ? 'up' : k < 0.87 ? 'down' : '';
        return `<tr class="${cls}"><th>${g.name}${s.cargo[g.id] ? ` <em>${fmt(s.cargo[g.id].q)}</em>` : ''}</th><td>${fmt(here)}</td><td>${fmt(there)}</td><td>${cls === 'up' ? icon('up') : cls === 'down' ? icon('down') : ''}</td></tr>`;
      }).join('');
    know = `<table class="know"><thead><tr><th>Prices seen on day ${seen.d}</th><td>Here</td><td>There</td><td></td></tr></thead><tbody>${rows}</tbody></table>`;
  }
  const tidings = s.events.filter((e) => e.place === to).map((e) => `<li>${e.text}</li>`).join('');
  openSheet(`<div class="sheet-head"><div><h3>${p.name}</h3><p>${p.kindLabel ? p.kindLabel + ' · ' : ''}${p.blurb}</p></div></div>
${facts}${sup}${tidings ? `<ul class="tidings">${tidings}</ul>` : ''}${know}${cta}`, first);
}

async function runTrip() {
  const { pack, s } = G;
  const P = E.I(pack).place;
  const over = $('#over');
  Tut.hide();
  over.hidden = false;
  over.innerHTML = `<div class="travel">${scene(pack.id)}<div class="trip"><div class="eyebrow">${W().travelling}</div>
<h2>${P[s.trip.from].name} <span>to</span> ${P[s.trip.to].name}</h2>
<div class="track"><i id="tr-bar"></i></div><div class="daycount" id="tr-day"></div></div><div id="enc"></div></div>`;
  const upd = () => {
    const t = s.trip;
    if (!t) return;
    const total = t.el + t.left;
    $('#tr-bar').style.width = (total ? (t.el / total) * 100 : 100) + '%';
    $('#tr-day').textContent = t.el === 0 ? `${plural(total, 'day')} ahead` : `Day ${t.el} of ${total}`;
  };
  upd();
  let arrived = null;
  while (!arrived && s.trip) {
    if (s.pending) {
      await encounterUI();
      upd();
      continue;
    }
    await sleep(s.trip.el === 0 ? 1000 : 700);
    const r = E.travelDay(pack, s);
    if (!r) break;
    if (r.type === 'arrive') arrived = r;
    else {
      upd();
      if (r.dry) toast(r.dry.text, 'bad');
    }
    saveGame();
  }
  await arrivalUI(arrived || { days: 0 });
}

function oddsLabel(p) {
  return p >= 0.7 ? ['Good odds', 'good'] : p >= 0.45 ? ['Even odds', 'mid'] : ['Long odds', 'bad'];
}

function encounterUI() {
  return new Promise((done) => {
    const { pack, s } = G;
    const enc = s.pending;
    const sc = $('.travel .scene');
    sc.classList.add('is-' + enc.type);
    const box = $('#enc');
    const choices = enc.choices.map((c) => {
      let sub = '';
      if (c.odds != null) {
        const [l, k] = oddsLabel(c.odds);
        sub = `<small class="odds ${k}">${l}</small>`;
      } else if (c.cost != null) sub = `<small class="odds mid">${fmt(c.cost)} ${moneyL()}</small>`;
      else if (c.days) sub = `<small class="odds mid">${plural(c.days, 'day')} lost</small>`;
      return `<button class="choice" data-act="enc" data-c="${c.id}"><b>${c.label}</b>${sub}</button>`;
    }).join('');
    const ico = enc.type === 'hostile' ? 'swords' : enc.type === 'weather' ? 'cloud' : 'crate';
    box.innerHTML = `<div class="enc-card in"><div class="enc-ico">${icon(ico)}</div><h3>${enc.title}</h3><p>${enc.text}</p><div class="choices">${choices}</div></div>`;
    encDone = (choice) => {
      encDone = null;
      const out = E.resolve(pack, s, choice);
      saveGame();
      const good = E.I(pack).good;
      const chips = [];
      if (out.cash) chips.push(`<span class="${out.cash > 0 ? 'up' : 'down'}">${out.cash > 0 ? '+' : '−'}${fmt(Math.abs(out.cash))} ${moneyL()}</span>`);
      if (out.hull) chips.push(`<span class="down">${W().hull} −${-out.hull}</span>`);
      if (out.days) chips.push(`<span class="mid">+${plural(out.days, 'day')}</span>`);
      for (const gid in out.lost) chips.push(`<span class="down">−${out.lost[gid]} ${good[gid].name.toLowerCase()}</span>`);
      for (const gid in out.gained) chips.push(`<span class="up">+${out.gained[gid]} ${good[gid].name.toLowerCase()}</span>`);
      sc.classList.remove('is-' + enc.type);
      box.innerHTML = `<div class="enc-card in tone-${out.tone}"><h3>${out.title}</h3><p>${out.text}</p><div class="deltas">${chips.join('')}</div><button class="cta" data-act="next">Carry on</button></div>`;
      nextDone = () => {
        box.innerHTML = '';
        done();
      };
    };
  });
}

async function arrivalUI(r) {
  const { pack, s } = G;
  const p = E.here(pack, s);
  const fresh = s.news.filter((n) => n.d > s.day - r.days - 1).slice(-3).reverse();
  const over = $('#over');
  over.innerHTML = `<div class="arrive"><div class="arrive-card in"><div class="eyebrow">${plural(r.days, 'day')} · ${W().travelling.toLowerCase()}</div>
<h2>${p.name}</h2><p class="blurb">${p.blurb}</p>
${fresh.length ? `<ul class="tidings">${fresh.map((n) => `<li>${n.t}</li>`).join('')}</ul>` : ''}
<button class="cta" data-act="next">${W().ashore}</button></div></div>`;
  await new Promise((res) => (nextDone = res));
  over.hidden = true;
  over.innerHTML = '';
  if (s.tut === 3) s.tut = s.place === s.tutTo ? 4 : 0;
  G.tab = 'market';
  saveGame();
  drawHud();
  drawTabs();
  drawView(true);
  if (s.over) showEnd();
  else tutStep();
}

// ---------- port ----------

// Where a service can be found, for places that lack it.
function where(svc) {
  const names = G.pack.places.filter((p) => (p.services || []).includes(svc)).map((p) => p.name);
  if (!names.length) return '';
  return names.length <= 5 ? `Try ${names.slice(0, -1).join(', ')}${names.length > 1 ? ' or ' : ''}${names[names.length - 1]}.` : W().yardWhere || '';
}

function viewPort() {
  const { pack, s } = G;
  const w = W();
  const v = E.veh(pack, s);
  const m = moneyL();
  const cards = [];
  const rp = E.repairPrice(pack, s);
  cards.push(`<section class="card"><div class="card-art">${vehicleArt[pack.id]}</div><h3>${v.name}</h3><p>${v.blurb}</p>
<div class="specs"><span>${icon('crate')}<b>${v.cap}</b> ${w.cargo.toLowerCase()}</span><span>${icon('wind')}<b>${v.speed === 1 ? 'Steady' : v.speed > 1 ? 'Fast' : 'Slow'}</b></span><span>${icon('shield')}<b>${E.defense(pack, s)}</b> defense</span></div>
<div class="gauge wide ${s.hull < 40 ? 'low' : ''}"><span>${w.hull}</span><i class="bar"><b style="width:${s.hull}%"></b></i><em>${s.hull}%</em></div>
${s.hull < 100 ? `<button class="btn" data-act="repair" ${s.cash < rp ? 'disabled' : ''}>${w.repair} · ${fmt(Math.min(100 - s.hull, Math.floor(s.cash / rp)) * rp)} ${m}</button>` : `<p class="fine">${icon('check')} In good order</p>`}</section>`);

  if (pack.supplies) {
    const cap = E.supplyCap(pack, s);
    const price = E.supplyPrice(pack, s);
    cards.push(`<section class="card"><h3>${pack.supplies.name}</h3><p>${fmt(price)} ${m} each here. Prices differ from place to place.</p>
<div class="gauge wide"><span>${s.supplies} of ${cap}</span><i class="bar"><b style="width:${Math.round((s.supplies / cap) * 100)}%"></b></i></div>
<button class="btn" data-act="supplies" ${s.supplies >= cap || s.cash < price ? 'disabled' : ''}>Buy ${pack.supplies.name.toLowerCase()}</button></section>`);
  }

  if (E.hasService(pack, s, 'lender')) {
    const room = Math.floor(E.creditLimit(pack, s) - s.debt);
    cards.push(`<section class="card"><h3>${w.lender}</h3><p>${s.debt > 0 ? `You owe ${fmt(Math.ceil(s.debt))} ${m}. It grows by about nine in every hundred each month.` : 'You owe nothing.'}</p>
<div class="row2"><button class="btn" data-act="repay" ${s.debt <= 0 || s.cash < 1 ? 'disabled' : ''}>Repay</button><button class="btn ghost" data-act="borrow" ${room < 1 ? 'disabled' : ''}>Borrow</button></div></section>`);
  } else cards.push(`<section class="card off"><h3>${w.lender}</h3><p>None here. ${where('lender')} You owe ${fmt(Math.ceil(s.debt))} ${m}.</p></section>`);

  if (E.hasService(pack, s, 'bank')) {
    cards.push(`<section class="card"><h3>${w.bank}</h3><p>${s.bank >= 1 ? `${fmt(Math.floor(s.bank))} ${m} in safe keeping, earning a little.` : `${w.money} kept here is safe from ${w.hostile}, and earns a little.`}</p>
<div class="row2"><button class="btn" data-act="deposit" ${s.cash < 1 ? 'disabled' : ''}>Deposit</button><button class="btn ghost" data-act="withdraw" ${s.bank < 1 ? 'disabled' : ''}>Withdraw</button></div></section>`);
  } else if (s.bank >= 1) cards.push(`<section class="card off"><h3>${w.bank}</h3><p>No merchant house here. Your ${fmt(Math.floor(s.bank))} ${m} waits in safe keeping.</p></section>`);

  if (E.hasService(pack, s, 'yard')) {
    const used = E.cargoUsed(s);
    const offers = pack.vehicles.filter((x) => x.id !== s.vehicle).map((x) => {
      const cost = E.vehicleCost(pack, s, x.id);
      const why = cost > s.cash ? `Need ${fmt(cost - s.cash)} more` : used > x.cap ? 'Too small for your cargo' : '';
      return `<button class="offer" data-act="buyveh" data-id="${x.id}" ${why ? 'disabled' : ''}>
<span class="on"><b>${x.name}</b><small>${x.cap} ${w.cargo.toLowerCase()} · ${x.speed === 1 ? 'steady' : x.speed > 1 ? 'fast' : 'slow'} · defense ${x.def}${x.range ? ` · range ${x.range}` : ''}${x.water ? ` · ${x.water} days of water` : ''}</small></span>
<span class="oc"><b>${cost >= 0 ? fmt(cost) : '+' + fmt(-cost)}</b><small>${why || 'after trade-in'}</small></span></button>`;
    }).join('');
    const gc = E.guardCost(pack, s);
    cards.push(`<section class="card"><h3>${w.yard}</h3><p>Trade in your ${v.name.toLowerCase()} for something bigger.</p><div class="offers">${offers}</div>
<div class="guards"><span>${icon('shield')} ${w.guards}: <b>${s.guards}</b> of ${E.MAX_GUARDS}</span>
<button class="btn" data-act="guard" ${s.guards >= E.MAX_GUARDS || s.cash < gc ? 'disabled' : ''}>${s.guards >= E.MAX_GUARDS ? 'Fully armed' : `${w.guardOne} · ${fmt(gc)}`}</button></div></section>`);
  } else cards.push(`<section class="card off"><h3>${w.yard}</h3><p>Nothing for sale here. ${where('yard')}</p></section>`);

  return `<div class="view-head"><h2>${w.port}</h2><span class="hint">${E.here(pack, s).name}</span></div><div class="cards">${cards.join('')}</div>`;
}

function moneySheet(title, sub, max, verb, fn, extra) {
  const m = W().money;
  openAmount({
    title, sub, icon: 'coin',
    sides: [{
      id: 'x', label: verb, max: () => max,
      calc: (n) => ({ rows: [[verb, fmt(n)], ...(extra ? extra(n) : []), [`${m} after`, fmt(G.s.cash + (verb === 'Borrow' || verb === 'Withdraw' ? n : -n))]], cta: `${verb} ${fmt(n)}` }),
      go: fn,
    }],
  });
}

// ---------- ledger ----------

function viewLedger() {
  const { pack, s } = G;
  const w = W();
  const worth = E.worth(pack, s);
  const pts = s.stats.worth.concat([[s.day, worth]]);
  const lo = Math.min(0, ...pts.map((p) => p[1]));
  const hi = Math.max(pack.goal * 0.05, ...pts.map((p) => p[1]));
  const line = pts.map(([d, v]) => `${((d / pack.days) * 300).toFixed(1)},${(70 - ((v - lo) / (hi - lo || 1)) * 64).toFixed(1)}`).join(' ');
  const prog = Math.max(0, Math.min(1, worth / pack.goal));
  const live = s.events.map((e) => `<li class="live"><em>${plural(Math.max(1, e.until - s.day + 1), 'day')} left</em>${e.text}</li>`).reverse().join('');
  const liveText = new Set(s.events.map((e) => e.text));
  const old = s.news.filter((n) => !liveText.has(n.t)).slice().reverse().map((n) => `<li><em>Day ${n.d}</em>${n.t}</li>`).join('');
  const cargo = Object.keys(s.cargo).map((gid) => `<li><b>${E.I(pack).good[gid].name}</b><span>${fmt(s.cargo[gid].q)} · ${s.cargo[gid].cost ? 'paid ' + fmt(s.cargo[gid].cost / s.cargo[gid].q) : 'found'}</span></li>`).join('');
  return `<div class="view-head"><h2>${w.ledger}</h2><span class="hint">${plural(Math.max(0, pack.days - s.day), 'day')} left</span></div>
<section class="card worth"><div class="eyebrow">Your fortune</div><div class="big ${worth < 0 ? 'neg' : ''}">${worth < 0 ? '−' : ''}${fmt(Math.abs(worth))}</div>
<p>${E.rank(pack, worth)}</p>
<svg class="spark" viewBox="0 0 300 74" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}"/></svg>
<div class="goalbar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div><p class="fine">${worth >= pack.goal ? `You have passed the ${fmt(pack.goal)} it takes to retire in style.` : `Retire in style at ${fmt(pack.goal)}.`}</p></section>
${cargo ? `<section class="card"><h3>In the ${w.cargo.toLowerCase()}</h3><ul class="plain">${cargo}</ul></section>` : ''}
<section class="card"><h3>News</h3><ul class="news">${live}${old || (live ? '' : '<li>No news yet.</li>')}</ul></section>
<section class="card"><h3>The story so far</h3><ul class="plain"><li><b>Journeys</b><span>${s.stats.trips}</span></li><li><b>${pack.places.length} ${w.places}</b><span>${Object.keys(s.stats.visited).length} visited</span></li>
<li><b>Trading profit</b><span>${fmt(s.stats.profit)}</span></li><li><b>Fights</b><span>${s.stats.won} won, ${s.stats.lost} lost</span></li></ul></section>
<section class="card"><h3>Save code</h3><p>${store.id ? `Your games are saved online too. To carry on with them on another phone, enter this code there:` : 'Your games are saved on this device.'}</p>
${store.id ? `<div class="code">${store.id.slice(0, 5)}-${store.id.slice(5)}</div>` : ''}</section>
<div class="row2 pad"><button class="btn" data-act="retire">Retire now</button><button class="btn ghost" data-act="home">All eras</button></div>`;
}

function showEnd() {
  const { pack, s } = G;
  Tut.hide();
  const o = s.over;
  const prev = store.best[pack.id];
  const isBest = !prev || o.score > prev.score;
  if (isBest) {
    store.best[pack.id] = { score: o.score, rank: o.rank };
    persist();
  }
  const over = $('#over');
  over.hidden = false;
  over.innerHTML = `<div class="arrive end"><div class="arrive-card in"><div class="eyebrow">${o.reason === 'retire' ? `Retired on day ${o.day}` : `${pack.days} days have passed`}</div>
<h2>${o.rank}</h2><div class="big ${o.score < 0 ? 'neg' : ''}">${o.score < 0 ? '−' : ''}${fmt(Math.abs(o.score))}</div><p class="blurb">${W().money.toLowerCase()} to your name</p>
<ul class="plain"><li><b>Journeys</b><span>${s.stats.trips}</span></li><li><b>Trading profit</b><span>${fmt(s.stats.profit)}</span></li>
<li><b>Best ever</b><span>${isBest && prev ? 'New best!' : fmt((store.best[pack.id] || o).score)}</span></li></ul>
<button class="cta" data-act="restart">Play ${pack.name} again</button><button class="btn ghost" data-act="home">All eras</button></div></div>`;
  if (o.score >= pack.goal) coins();
}

// ---------- small effects ----------

function toast(text, tone = '') {
  const box = $('#toasts');
  if (!box || !text) return;
  const el = document.createElement('div');
  el.className = 'toast ' + tone;
  el.textContent = text;
  box.append(el);
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2700);
}

function coins() {
  const box = $('#toasts');
  if (!box) return;
  for (let i = 0; i < 12; i++) {
    const c = document.createElement('i');
    c.className = 'coin';
    c.style.setProperty('--x', (Math.random() * 240 - 120).toFixed(0) + 'px');
    c.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's');
    box.append(c);
    setTimeout(() => c.remove(), 1400);
  }
}

// ---------- the first-game guide ----------

const Tut = {
  el: null, sel: null, allow: null, raf: 0,
  show(sel, text, allow) {
    if (this.sel === sel && this.el && this.el.dataset.text === text) return;
    this.hide();
    const host = $('.game');
    if (!host) return;
    this.sel = sel;
    this.allow = allow || null;
    this.el = document.createElement('div');
    this.el.className = 'tut';
    this.el.dataset.text = text;
    this.el.innerHTML = `<div class="tut-hole"></div><div class="tut-hand">${hand}</div><div class="tut-cap"><span>${text}</span><button data-act="tutskip">Skip the guide</button></div>`;
    host.append(this.el);
    const hole = $('.tut-hole', this.el), handEl = $('.tut-hand', this.el), cap = $('.tut-cap', this.el);
    const place = () => {
      if (!this.el) return;
      const t = document.querySelector(this.sel);
      const hostBox = host.getBoundingClientRect();
      if (t) {
        const b = t.getBoundingClientRect();
        this.el.classList.add('on');
        hole.style.cssText = `left:${b.left - hostBox.left - 6}px;top:${b.top - hostBox.top - 6}px;width:${b.width + 12}px;height:${b.height + 12}px`;
        handEl.style.cssText = `left:${b.left - hostBox.left + b.width * 0.62}px;top:${b.top - hostBox.top + b.height * 0.45}px`;
        const below = b.top - hostBox.top < hostBox.height * 0.42;
        cap.style.cssText = below ? `top:${b.bottom - hostBox.top + 62}px` : `top:${Math.max(8, b.top - hostBox.top - 96)}px`;
      } else this.el.classList.remove('on');
      this.raf = requestAnimationFrame(place);
    };
    place();
  },
  hide() {
    cancelAnimationFrame(this.raf);
    if (this.el) this.el.remove();
    this.el = null;
    this.sel = null;
  },
  blocks(target) {
    if (!this.el || !this.el.classList.contains('on')) return false;
    if (target.closest('.tut-cap')) return false;
    const t = document.querySelector(this.sel);
    if (t && t.contains(target)) return false;
    if (this.allow && target.closest(this.allow)) return false;
    return true;
  },
};

function tutStep() {
  if (!G) return;
  const { pack, s } = G;
  if (!s.tut || s.trip || s.over) return Tut.hide();
  const good = s.tutGood && E.I(pack).good[s.tutGood];
  const sheetOpen = !$('#sheet').hidden;
  if (s.tut === 1) {
    Tut.hide();
    const w = W();
    const over = $('#over');
    over.hidden = false;
    over.innerHTML = `<div class="arrive intro"><div class="arrive-card in"><div class="eyebrow">${pack.setting}</div><h2>${pack.name}</h2>
<p class="blurb">You owe the moneylender ${fmt(s.debt)} ${moneyL()}. Trade your way out, and then some.</p>
<div class="how"><div>${icon('basket')}<b>Buy cheap</b></div>${icon('right')}<div>${icon(navIcons[pack.id][1])}<b>Travel</b></div>${icon('right')}<div>${icon('coin')}<b>Sell dear</b></div></div>
<button class="cta" data-act="tutgo">Show me how</button><button class="btn ghost" data-act="tutskip">I know how to play</button></div></div>`;
    return;
  }
  if (!good) {
    s.tut = 0;
    return Tut.hide();
  }
  if (s.tut === 2) {
    if (sheetOpen && A) Tut.show('#a-go', 'Fill up, then buy', '.sheet');
    else if (G.tab !== 'market') Tut.show('#tabs [data-tab="market"]', `Back to the ${W().market.toLowerCase()}`);
    else Tut.show(`.item[data-good="${good.id}"]`, `${good.name} is cheap here. Tap it.`);
  } else if (s.tut === 3) {
    const to = E.I(pack).place[s.tutTo];
    if (sheetOpen && D && D.to === s.tutTo) Tut.show('#sheet .cta', 'Off you go', '.sheet');
    else if (sheetOpen) Tut.hide();
    else if (G.tab !== 'map') Tut.show('#tabs [data-tab="map"]', 'Now find a buyer');
    else Tut.show(`.dest-card[data-to="${s.tutTo}"]`, `${to.name} pays more for ${good.name.toLowerCase()}`);
  } else if (s.tut === 4) {
    if (!s.cargo[good.id]) {
      s.tut = 0;
      return Tut.hide();
    }
    if (sheetOpen && A) Tut.show('#a-go', 'Sell the lot', '.sheet');
    else if (G.tab !== 'market') Tut.show('#tabs [data-tab="market"]', `Back to the ${W().market.toLowerCase()}`);
    else Tut.show(`.item[data-good="${good.id}"]`, `Sell your ${good.name.toLowerCase()} here`);
  } else if (s.tut === 5) {
    Tut.hide();
    s.tut = 0;
    saveGame();
    const over = $('#over');
    over.hidden = false;
    over.innerHTML = `<div class="arrive intro"><div class="arrive-card in"><div class="eyebrow">That is the whole trade</div><h2>A fine first profit</h2>
<div class="how tips"><div>${icon(navIcons[pack.id][2])}<b>${W().port}</b><small>Repay the lender, buy a bigger ${W().vehicle.toLowerCase()}</small></div>
<div>${icon('book')}<b>${W().ledger}</b><small>News of shortages and gluts</small></div></div>
<p class="blurb">You have ${pack.days} days. Prices shift, so no route pays forever.</p>
<button class="cta" data-act="tutdone">Start trading</button></div></div>`;
  }
}

// ---------- taps ----------

const acts = {
  era: (el) => startEra(el.dataset.id),
  tab(el) {
    if (G.tab === el.dataset.tab) return;
    G.tab = el.dataset.tab;
    drawTabs();
    drawView(true);
    tutStep();
  },
  trade(el) {
    openTrade(el.dataset.good);
    tutStep();
  },
  close: closeSheet,
  side(el) {
    A.side = el.dataset.side;
    A.n = null;
    drawAmount(false);
  },
  step(el) {
    const max = curSide().max();
    const by = max > 400 ? Math.ceil(max / 100) : 1;
    A.n = Math.max(0, Math.min(max, A.n + by * +el.dataset.d));
    updAmount();
  },
  qset(el) {
    A.n = Math.max(curSide().max() > 0 ? 1 : 0, Math.floor(curSide().max() * +el.dataset.f));
    updAmount();
  },
  confirm() {
    const cfg = A;
    curSide().go(A.n);
    closeSheet();
    refresh(cfg.flash);
  },
  dest(el) {
    openDest(el.dataset.to);
    tutStep();
  },
  sup(el) {
    D.buy = Math.max(D.minBuy, Math.min(D.room, D.buy + +el.dataset.d));
    drawDest(false);
  },
  go() {
    const { pack, s } = G;
    const d = D;
    if (d.buy > 0 && !E.buySupplies(pack, s, d.buy)) return;
    if (!E.depart(pack, s, d.to)) return toast('You cannot leave just now.', 'bad');
    closeSheet();
    saveGame();
    runTrip();
  },
  enc: (el) => encDone && encDone(el.dataset.c),
  next() {
    const fn = nextDone;
    nextDone = null;
    if (fn) fn();
  },
  repair() {
    const { pack, s } = G;
    E.repair(pack, s, 100 - s.hull);
    toast('Repairs done', 'good');
    refresh();
  },
  supplies() {
    const { pack, s } = G;
    const price = E.supplyPrice(pack, s);
    openAmount({
      title: pack.supplies.name, icon: supplyIcon[pack.id], sub: `${fmt(price)} ${moneyL()} each`,
      sides: [{
        id: 'x', label: 'Buy', max: () => Math.min(E.supplyCap(pack, s) - s.supplies, Math.floor(s.cash / price)),
        calc: (n) => ({ rows: [['Buying', fmt(n)], ['Cost', fmt(n * price)], ['You will carry', `${s.supplies + n} of ${E.supplyCap(pack, s)}`]], cta: `Buy ${fmt(n)} for ${fmt(n * price)}` }),
        go: (n) => E.buySupplies(pack, s, n),
      }],
    });
  },
  repay() {
    const s = G.s;
    moneySheet(W().lender, `You owe ${fmt(Math.ceil(s.debt))}`, Math.min(Math.floor(s.cash), Math.ceil(s.debt)), 'Repay', (n) => {
      E.repay(s, n);
      toast(s.debt <= 0 ? 'Debt cleared!' : `Repaid ${fmt(n)}`, 'good');
      if (s.debt <= 0) coins();
    }, (n) => [['Still owed', fmt(Math.max(0, Math.ceil(s.debt) - n))]]);
  },
  borrow() {
    const { pack, s } = G;
    moneySheet(W().lender, 'Interest is about nine in every hundred each month', Math.floor(E.creditLimit(pack, s) - s.debt), 'Borrow', (n) => E.borrow(pack, s, n),
      (n) => [['You will owe', fmt(Math.ceil(s.debt) + n)]]);
    A.sides[0].start = () => Math.min(1000 * pack.scale, Math.floor(E.creditLimit(pack, s) - s.debt));
    A.n = null;
    drawAmount(false);
  },
  deposit() {
    const s = G.s;
    moneySheet(W().bank, 'Safe from thieves, and it earns a little', Math.floor(s.cash), 'Deposit', (n) => E.deposit(s, n), (n) => [['In safe keeping', fmt(Math.floor(s.bank) + n)]]);
    A.sides[0].start = () => Math.floor(s.cash / 2);
    A.n = null;
    drawAmount(false);
  },
  withdraw() {
    const s = G.s;
    moneySheet(W().bank, `${fmt(Math.floor(s.bank))} in safe keeping`, Math.floor(s.bank), 'Withdraw', (n) => E.withdraw(s, n), (n) => [['Left in safe keeping', fmt(Math.floor(s.bank) - n)]]);
  },
  buyveh(el) {
    const { pack, s } = G;
    const v = E.I(pack).veh[el.dataset.id];
    if (!E.buyVehicle(pack, s, v.id)) return;
    toast(`The ${v.name.toLowerCase()} is yours`, 'good');
    coins();
    refresh();
  },
  guard() {
    const { pack, s } = G;
    if (E.hireGuard(pack, s)) toast(`${W().guards}: ${s.guards}`, 'good');
    refresh();
  },
  retire() {
    const { pack, s } = G;
    const worth = E.worth(pack, s);
    openSheet(`<div class="sheet-head"><div><h3>Retire now?</h3><p>The game ends here and your fortune is counted.</p></div></div>
<dl class="sum"><div><dt>Fortune</dt><dd>${fmt(worth)}</dd></div><div><dt>You would be</dt><dd>${E.rank(pack, worth)}</dd></div><div><dt>Days left</dt><dd>${Math.max(0, pack.days - s.day)}</dd></div></dl>
<button class="cta" data-act="retireyes">Retire</button><button class="btn ghost" data-act="close">Keep trading</button>`);
  },
  retireyes() {
    E.finish(G.pack, G.s, 'retire');
    saveGame();
    closeSheet();
    showEnd();
  },
  restart() {
    const id = G.pack.id;
    delete store.saves[id];
    startEra(id, true);
  },
  home() {
    saveGame();
    renderTitle();
  },
  tutgo() {
    const { pack, s } = G;
    const plan = E.tutorialPlan(pack, s);
    $('#over').hidden = true;
    $('#over').innerHTML = '';
    if (!plan) s.tut = 0;
    else {
      s.tutPlan = { good: plan.good, to: plan.to };
      s.tutGood = plan.good;
      s.tutTo = plan.to;
      s.tut = 2;
    }
    saveGame();
    tutStep();
  },
  tutskip() {
    G.s.tut = 0;
    G.s.tutPlan = null;
    $('#over').hidden = true;
    $('#over').innerHTML = '';
    Tut.hide();
    saveGame();
  },
  tutdone() {
    $('#over').hidden = true;
    $('#over').innerHTML = '';
  },
  code() {
    openSheet(`<div class="sheet-head"><div><h3>Save code</h3><p>Find the code at the bottom of the Ledger on your other device.</p></div></div>
<label class="field"><span>Code</span><input id="code-in" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="abcde-fghjk" maxlength="14"></label>
<p class="note" id="code-note"></p><button class="cta" data-act="link">Bring my games here</button>`);
  },
  async link() {
    const note = $('#code-note');
    note.textContent = 'Looking…';
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link: $('#code-in').value }) });
      if (!r.ok) {
        note.textContent = 'That code was not found. Check it and try again.';
        return;
      }
      const j = await r.json();
      store.id = j.id;
      store.saves = {};
      store.best = {};
      mergeRemote(j.data || {});
      writeLocal();
      renderTitle();
    } catch (e) {
      note.textContent = 'Could not reach the server. Try again in a moment.';
    }
  },
};

document.addEventListener('click', (e) => {
  if (Tut.blocks(e.target)) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = acts[el.dataset.act];
  if (fn) fn(el);
}, true);

document.addEventListener('input', (e) => {
  if (e.target.id === 'a-r' && A) {
    A.n = +e.target.value;
    updAmount();
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-act]')) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  if (e.key === 'Escape') closeSheet();
});

window.addEventListener('resize', () => G && G.tab === 'map' && fitMap());

// Add ?debug to the address to reach the live game from the console.
if (new URLSearchParams(location.search).has('debug')) window.fm = { get G() { return G; }, E, store };

renderTitle();
pullSync();
