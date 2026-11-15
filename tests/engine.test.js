// Engine tests. Run: tools/run.sh tests/engine.test.js

import sail from '../public/js/packs/sail.js';
import silk from '../public/js/packs/silk.js';
import space from '../public/js/packs/space.js';
import * as E from '../public/js/engine/core.js';
import { play, median } from '../tools/bots.js';

const out = typeof print === 'function' ? print : console.log;
const packs = [sail, silk, space];
let failed = 0;
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    out(`FAIL  ${name}\n      ${e.message}`);
  }
}
const ok = (cond, msg) => {
  if (!cond) throw new Error(msg || 'expected true');
};
const eq = (a, b, msg) => ok(a === b, `${msg || 'not equal'}: ${a} vs ${b}`);

function sailTo(pack, s, to) {
  ok(E.depart(pack, s, to), `could not depart for ${to}`);
  let n = 0;
  while (s.trip && n++ < 300) {
    const r = E.travelDay(pack, s);
    if (r.type === 'encounter') E.resolve(pack, s, s.pending.choices[s.pending.choices.length - 1].id);
  }
  ok(!s.trip, 'trip never ended');
}

for (const pack of packs) {
  const tag = `[${pack.id}] `;

  test(tag + 'pack data is complete', () => {
    for (const p of pack.places) for (const g of pack.goods) ok(p.mods[g.id] > 0, `${p.id} has no price for ${g.id}`);
    ok(E.I(pack).place[pack.start.place], 'start place exists');
    ok(E.I(pack).veh[pack.start.vehicle], 'start vehicle exists');
    for (const r of pack.routes) ok(E.I(pack).place[r.a] && E.I(pack).place[r.b], `route ${r.a}-${r.b} names a missing place`);
    eq(new Set(pack.places.map((p) => p.id)).size, pack.places.length, 'place ids are unique');
    for (const k of ['boom', 'glut', 'peril', 'calm']) ok(pack.eventText[k].length > 0, `event text for ${k}`);
  });

  test(tag + 'same seed gives the same game', () => {
    const a = E.newGame(pack, 42), b = E.newGame(pack, 42), c = E.newGame(pack, 43);
    eq(JSON.stringify(a), JSON.stringify(b));
    ok(JSON.stringify(a) !== JSON.stringify(c), 'different seeds differ');
  });

  test(tag + 'every place can be left from day one', () => {
    const s = E.newGame(pack, 7);
    for (const p of pack.places) {
      s.place = p.id;
      ok(E.routes(pack, s).some((r) => !r.tooFar), `${p.id} is a dead end`);
    }
  });

  test(tag + 'buying then selling at once loses money', () => {
    const s = E.newGame(pack, 5);
    const g = pack.goods[1].id;
    const before = s.cash;
    const n = E.maxBuy(pack, s, g);
    ok(n > 0, 'can afford something');
    ok(E.buy(pack, s, g, n));
    ok(E.sell(pack, s, g, n));
    ok(s.cash < before, 'round trip in one market should cost money');
  });

  test(tag + 'big orders move the price, and it recovers', () => {
    const s = E.newGame(pack, 9);
    s.cash = 1e9;
    s.vehicle = pack.vehicles[pack.vehicles.length - 1].id;
    const g = pack.goods[pack.goods.length - 1].id;
    ok(E.quote(pack, s, g, 50, 'buy').unit > E.quote(pack, s, g, 1, 'buy').unit, 'unit price rises with size');
    ok(E.quote(pack, s, g, 50, 'sell').unit < E.quote(pack, s, g, 1, 'sell').unit, 'unit proceeds fall with size');
    const p0 = E.mid(pack, s, s.place, g);
    E.buy(pack, s, g, 50);
    const p1 = E.mid(pack, s, s.place, g);
    ok(p1 > p0 * 1.2, 'price jumped after a big buy');
    const m = s.mk[s.place][g];
    const pushed = m.p + m.m;
    for (let i = 0; i < 30; i++) E.tickDay(pack, s);
    ok(m.p + m.m < pushed * 0.3, 'most of the push has faded after a month');
    ok(m.m > 0.01, 'some of it lingers');
  });

  test(tag + 'maxBuy never overspends or overfills', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = E.newGame(pack, seed);
      for (const g of pack.goods) {
        const n = E.maxBuy(pack, s, g.id);
        ok(n <= E.cargoFree(pack, s), 'fits');
        if (n > 0) ok(E.quote(pack, s, g.id, n, 'buy').total <= s.cash, 'affordable');
        ok(n === E.cargoFree(pack, s) || E.quote(pack, s, g.id, n + 1, 'buy').total > s.cash, 'is the most possible');
      }
    }
  });

  test(tag + 'the guided first trade always pays and nothing goes wrong', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = E.newGame(pack, seed * 13);
      const plan = E.tutorialPlan(pack, s);
      ok(plan, `no tutorial plan for seed ${seed}`);
      s.tutPlan = { good: plan.good, to: plan.to };
      const n = E.maxBuy(pack, s, plan.good);
      ok(n >= 4, 'can buy a few');
      const cash0 = s.cash;
      E.buy(pack, s, plan.good, n);
      ok(E.depart(pack, s, plan.to), 'can depart with starting supplies');
      eq(s.trip.enc.length, 0, 'first trip has no encounters');
      while (s.trip) E.travelDay(pack, s);
      eq(s.place, plan.to);
      const sale = E.sell(pack, s, plan.good, n);
      ok(sale.profit > 0 && s.cash > cash0, `seed ${seed}: first sale lost money`);
      eq(s.hull, 100, 'no damage');
    }
  });

  test(tag + 'travel advances the calendar and lands', () => {
    const s = E.newGame(pack, 3);
    s.tut = 0;
    const r = E.routes(pack, s).find((x) => !x.tooFar && !x.closed);
    if (r.need > s.supplies) E.buySupplies(pack, s, r.need - s.supplies);
    sailTo(pack, s, r.to);
    eq(s.place, r.to);
    ok(s.day >= 1 + r.days, 'days passed');
    ok(s.seen[r.to], 'prices remembered on arrival');
  });

  test(tag + 'debt grows, can be repaid, and credit has a limit', () => {
    const s = E.newGame(pack, 3);
    const d0 = s.debt;
    for (let i = 0; i < 30; i++) E.tickDay(pack, s);
    ok(s.debt > d0 * 1.08 && s.debt < d0 * 1.12, 'about nine percent a month');
    ok(!E.borrow(pack, s, 1e9), 'cannot borrow without limit');
    s.cash = 1e6;
    ok(E.repay(s, 1e9));
    eq(s.debt, 0);
    ok(E.deposit(s, 1000) && E.withdraw(s, 1000));
  });

  test(tag + 'a saved game loads and carries on identically', () => {
    const a = E.newGame(pack, 77);
    a.tut = 0;
    const r = E.routes(pack, a).find((x) => !x.tooFar && !x.closed);
    if (r.need > a.supplies) E.buySupplies(pack, a, r.need - a.supplies);
    E.depart(pack, a, r.to);
    E.travelDay(pack, a);
    const b = E.migrate(pack, JSON.parse(JSON.stringify(a)));
    for (const s of [a, b]) {
      let n = 0;
      while (s.trip && n++ < 300) {
        const o = E.travelDay(pack, s);
        if (o.type === 'encounter') E.resolve(pack, s, s.pending.choices[0].id);
      }
    }
    eq(JSON.stringify(a), JSON.stringify(b));
  });

  test(tag + 'a save from an older build still loads', () => {
    const old = { v: 1, era: pack.id, r: 5, day: 12, place: pack.places[1].id, cash: 900, debt: 100,
      vehicle: pack.start.vehicle, cargo: { [pack.goods[0].id]: { q: 3, cost: 30 }, gone: { q: 1, cost: 1 } }, mk: {}, stats: {} };
    const s = E.migrate(pack, old);
    eq(s.cash, 900, 'kept its cash');
    eq(s.day, 12, 'kept its day');
    ok(!s.cargo.gone, 'dropped a good that no longer exists');
    ok(E.buyPrice(pack, s, s.place, pack.goods[0].id) > 0, 'markets work');
    ok(E.routes(pack, s).length > 0, 'can travel');
  });

  test(tag + 'whole games finish, and no single route keeps paying', () => {
    const expert = [], habit = [], share = [];
    for (let i = 0; i < 40; i++) {
      const e = play(pack, 900 + i * 101, 'seen');
      eq(e.reason, 'time', 'game ran to its last day');
      ok(Number.isFinite(e.score), 'score is a number');
      expert.push(e.score);
      share.push(e.topShare);
      habit.push(play(pack, 900 + i * 101, 'habit').score);
    }
    ok(median(habit) < median(expert) * 0.7, `repeating one route earns too much: ${median(habit)} vs ${median(expert)}`);
    ok(median(share) < 0.5, `one route carries ${Math.round(median(share) * 100)}% of trips`);
    ok(median(expert) > pack.goal * 0.5 && median(expert) < pack.goal * 4, `goal is out of line with what play earns: ${median(expert)}`);
  });
}

test('[silk] the high passes close in winter and reopen', () => {
  const s = E.newGame(silk, 1);
  s.place = 'kashgar';
  s.day = 100;
  ok(!E.routeTo(silk, s, 'samarkand').closed, 'open in summer');
  s.day = 300;
  ok(E.routeTo(silk, s, 'samarkand').closed, 'closed in winter');
  ok(!E.depart(silk, s, 'samarkand'), 'cannot set out on a closed road');
  s.day = 380;
  ok(!E.routeTo(silk, s, 'samarkand').closed, 'open again next spring');
});

test('[silk] running out of water costs cargo and animals', () => {
  const s = E.newGame(silk, 2);
  s.tut = 0;
  E.buy(silk, s, 'paper', 30);
  s.supplies = 8;
  ok(E.depart(silk, s, 'dunhuang'));
  s.trip.enc = [];
  s.trip.left += 3; // a delay the water does not cover
  while (s.trip) E.travelDay(silk, s);
  ok(s.hull < 100, 'animals suffered');
  ok(s.cargo.paper.q < 30, 'loads were left behind');
});

test('[space] a ship cannot jump past its tank, and fuel is spent', () => {
  const s = E.newGame(space, 1);
  const all = E.routes(space, s);
  ok(all.some((r) => r.tooFar) && all.some((r) => !r.tooFar), 'some systems in range, some not');
  const far = all.find((r) => r.tooFar);
  ok(!E.depart(space, s, far.to), 'out of range');
  s.tut = 0;
  const near = all.filter((r) => !r.tooFar).sort((a, b) => a.need - b.need)[0];
  const fuel = s.supplies;
  ok(E.depart(space, s, near.to));
  eq(s.supplies, fuel - near.need, 'fuel burned at the jump');
});

test('[all] a wreck loses the cargo but not the game', () => {
  const s = E.newGame(sail, 4);
  s.tut = 0;
  E.buy(sail, s, 'tea', 10);
  s.hull = 1;
  E.depart(sail, s, 'hoian');
  s.trip.enc = [{ day: 0, type: 'weather' }];
  let wrecked = false;
  for (let i = 0; i < 400 && !wrecked; i++) {
    const t = JSON.parse(JSON.stringify(s));
    t.r = i * 977 + 1;
    E.travelDay(sail, t);
    const o = E.resolve(sail, t, 'push');
    if (o.wrecked) {
      wrecked = true;
      eq(Object.keys(t.cargo).length, 0, 'cargo gone');
      ok(t.hull > 0, 'patched up');
      while (t.trip) E.travelDay(sail, t);
      eq(t.place, 'hoian', 'towed to the destination');
      ok(!t.over, 'game goes on');
    }
  }
  ok(wrecked, 'never managed to wreck');
});

out(`${passed} passed, ${failed} failed`);
if (failed) throw new Error(`${failed} test(s) failed`);
