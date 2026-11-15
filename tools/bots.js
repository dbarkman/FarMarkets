// Players made of code, for tests and for tuning the numbers.
//
//   expert  sees every market's true price and goes wherever pays best
//   seen    plans only from prices it has seen itself, like a careful person
//   habit   shuttles between two places for the whole game
//
// If `habit` kept up with `expert`, one route would always pay and the market
// would be solved. The tests check that it does not.

import * as E from '../public/js/engine/core.js';

function planBasket(pack, s, r, priceAt) {
  const v = E.veh(pack, s);
  let free = E.cargoFree(pack, s);
  let cash = s.cash * 0.97;
  const chunk = Math.max(1, Math.round(v.cap / 25));
  const basket = {};
  let profit = 0;
  while (free > 0) {
    let best = null;
    for (const g of pack.goods) {
      const k = basket[g.id] || 0;
      const b = E.mid(pack, s, s.place, g.id) * (1 + E.SPREAD / 2) * Math.exp(k / E.depthOf(pack, s.place, g.id));
      const sl = priceAt(r.to, g.id) * (1 - E.SPREAD / 2) * Math.exp(-k / E.depthOf(pack, r.to, g.id));
      const n = Math.min(chunk, free);
      if (b * n * 1.03 > cash) continue;
      const gain = sl - b;
      if (gain <= b * 0.04) continue;
      if (!best || gain > best.gain) best = { g, gain, b, n };
    }
    if (!best) break;
    basket[best.g.id] = (basket[best.g.id] || 0) + best.n;
    cash -= best.b * best.n * 1.03;
    free -= best.n;
    profit += best.gain * best.n;
  }
  return { basket, profit };
}

function answer(pack, s) {
  const enc = s.pending;
  if (enc.type === 'hostile') {
    const [fight, flee, pay] = enc.choices;
    if (fight.odds >= 0.6) return 'fight';
    if (flee.odds >= 0.5) return 'flee';
    return pay.cost < s.cash * 0.25 ? 'pay' : 'flee';
  }
  if (enc.type === 'weather') return s.hull < 50 ? 'wait' : 'push';
  return 'ok';
}

export function play(pack, seed, mode = 'expert') {
  const s = E.newGame(pack, seed);
  s.tut = 0;
  const P = E.I(pack);
  const priceAt = (placeId, goodId) => {
    if (mode !== 'seen') return E.mid(pack, s, placeId, goodId);
    const seen = s.seen[placeId];
    return seen ? seen.p[goodId] : P.good[goodId].base * (P.place[placeId].mods[goodId] ?? 1);
  };
  let pair = null; // habit bot's two places
  let guard = 0;
  while (!s.over && guard++ < 5000) {
    // sell everything
    for (const gid of Object.keys(s.cargo)) E.sell(pack, s, gid, s.cargo[gid].q);
    // housekeeping
    if (s.hull < 70 && E.repairPrice(pack, s) * (100 - s.hull) < s.cash * 0.25) E.repair(pack, s, 100 - s.hull);
    if (E.hasService(pack, s, 'lender') && s.debt > 0 && s.cash >= s.debt * 2) E.repay(s, s.debt + 1);
    if (E.hasService(pack, s, 'yard')) {
      let pickV = null;
      for (const v of pack.vehicles) {
        if (v.cap <= E.veh(pack, s).cap) continue;
        if (s.cash > E.vehicleCost(pack, s, v.id) * 1.5 && (!pickV || v.cap > pickV.cap)) pickV = v;
      }
      if (pickV) E.buyVehicle(pack, s, pickV.id);
      while (s.guards < E.MAX_GUARDS && s.cash > E.guardCost(pack, s) * 6) E.hireGuard(pack, s);
    }
    // choose where to go
    let options = E.routes(pack, s).filter((r) => !r.closed && !r.tooFar);
    if (mode === 'habit') {
      if (!pair) {
        let best = null;
        for (const r of options) {
          let sc = 0;
          for (const g of pack.goods) {
            const a = P.place[s.place].mods[g.id], b = P.place[r.to].mods[g.id];
            sc += Math.max(0, Math.max(a / b, b / a) - 1.15);
          }
          sc /= r.days;
          if (!best || sc > best.sc) best = { sc, to: r.to };
        }
        pair = [s.place, best.to];
      }
      const want = s.place === pair[0] ? pair[1] : pair[0];
      const only = options.filter((r) => r.to === want);
      if (only.length) options = only;
    }
    let best = null;
    const fuelPrice = E.supplyPrice(pack, s);
    for (const r of options) {
      const short = Math.max(0, r.need - s.supplies);
      if (short * fuelPrice > s.cash) continue;
      const saved = s.cash;
      s.cash -= short * fuelPrice;
      const plan = planBasket(pack, s, r, priceAt);
      s.cash = saved;
      const score = ((plan.profit - short * fuelPrice) / (r.days + 1)) * (1 - r.danger * 0.3);
      if (!best || score > best.score) best = { r, plan, score, short };
    }
    if (!best) { E.finish(pack, s, 'stuck'); break; }
    if (best.short > 0) {
      const extra = Math.min(E.supplyCap(pack, s) - s.supplies, best.short + (pack.supplies.per === 'day' ? 2 : 0));
      if (!E.buySupplies(pack, s, extra)) E.buySupplies(pack, s, best.short);
    }
    for (const gid in best.plan.basket) {
      const q = Math.min(best.plan.basket[gid], E.maxBuy(pack, s, gid));
      if (q > 0) E.buy(pack, s, gid, q);
    }
    if (!E.depart(pack, s, best.r.to)) { E.finish(pack, s, 'stuck'); break; }
    let steps = 0;
    while (s.trip && steps++ < 200) {
      const out = E.travelDay(pack, s);
      if (out && out.type === 'encounter') E.resolve(pack, s, answer(pack, s));
    }
  }
  if (!s.over) E.finish(pack, s, 'guard');
  const total = Object.values(s.stats.routes).reduce((a, b) => a + b, 0) || 1;
  const top = Math.max(0, ...Object.values(s.stats.routes)) / total;
  return { score: s.over.score, reason: s.over.reason, trips: s.stats.trips, topShare: top, vehicle: s.vehicle, s };
}

export const median = (list) => {
  const a = list.slice().sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
};
