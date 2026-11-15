// Space: thirty-six star systems in the 2300s. There are no fixed routes: a
// ship can jump to any system its fuel tank can reach. The systems are laid
// out once, from a fixed seed, on a 100 by 100 chart.

import { rnd, shuffle } from '../engine/rng.js';

const good = (id, name, base, depth, icon, vol = 0.05) => ({ id, name, base, depth, icon, vol });

const goods = [
  good('water', 'Water', 20, 600, 'drop'),
  good('greens', 'Greens', 35, 500, 'leaf'),
  good('ore', 'Ore', 55, 480, 'ingot'),
  good('weave', 'Weave', 90, 350, 'cloth'),
  good('alloys', 'Alloys', 140, 300, 'ingot'),
  good('medicine', 'Medicine', 420, 160, 'vial'),
  good('machinery', 'Machinery', 600, 140, 'gear'),
  good('cores', 'Logic cores', 900, 110, 'chip', 0.06),
  good('starglass', 'Starglass', 1500, 60, 'gem', 0.06),
];

// What each kind of world makes cheaply (below 1) and pays well for (above 1).
const kinds = {
  ice: { label: 'Ice world', danger: 0.25, fuel: 1.1, services: [],
    mods: { water: 0.45, greens: 1.3, ore: 1.0, weave: 1.3, alloys: 1.2, medicine: 1.4, machinery: 1.5, cores: 1.3, starglass: 1.2 } },
  agri: { label: 'Farm world', danger: 0.2, fuel: 1.0, services: [],
    mods: { water: 0.9, greens: 0.5, ore: 1.2, weave: 0.6, alloys: 1.3, medicine: 1.2, machinery: 1.5, cores: 1.4, starglass: 1.3 } },
  mining: { label: 'Mining belt', danger: 0.35, fuel: 1.2, services: [],
    mods: { water: 1.6, greens: 1.5, ore: 0.45, weave: 1.3, alloys: 0.8, medicine: 1.5, machinery: 1.4, cores: 1.2, starglass: 1.1 } },
  forge: { label: 'Forge world', danger: 0.15, fuel: 0.8, services: ['yard'],
    mods: { water: 1.3, greens: 1.3, ore: 1.6, weave: 1.1, alloys: 0.55, medicine: 1.1, machinery: 0.6, cores: 1.1, starglass: 1.2 } },
  lab: { label: 'Research station', danger: 0.12, fuel: 1.0, services: ['yard'],
    mods: { water: 1.1, greens: 1.2, ore: 1.3, weave: 1.2, alloys: 1.5, medicine: 0.55, machinery: 0.9, cores: 0.55, starglass: 1.5 } },
  reef: { label: 'Crystal reef', danger: 0.3, fuel: 1.3, services: [],
    mods: { water: 1.2, greens: 1.3, ore: 1.1, weave: 1.2, alloys: 1.2, medicine: 1.3, machinery: 1.3, cores: 1.2, starglass: 0.5 } },
  haven: { label: 'Haven', danger: 0.08, fuel: 0.9, services: ['yard'],
    mods: { water: 1.3, greens: 1.4, ore: 0.9, weave: 1.5, alloys: 1.0, medicine: 1.4, machinery: 1.2, cores: 1.3, starglass: 1.8 } },
  frontier: { label: 'Frontier colony', danger: 0.45, fuel: 1.5, services: [],
    mods: { water: 0.8, greens: 0.8, ore: 0.8, weave: 1.3, alloys: 1.4, medicine: 1.7, machinery: 1.8, cores: 1.5, starglass: 0.9 } },
};

const names = [
  'Verdance', 'Kestrel Reach', 'Ombra', 'Tallis', 'Veyra', 'Quillon', 'Sable Drift', 'Marrow', 'Corvane',
  'Lumen Deep', 'Ishka', 'Brannoch', 'Solace', 'Pellucid', 'Cinder', 'Harrow', 'Wend', 'Aubade',
  'Nacre', 'Tamsin', 'Vigil', 'Orrery', 'Halcyon', 'Rime', 'Fathom', 'Gossamer', 'Larkspur',
  'Meridian', 'Petrichor', 'Quorum', 'Rookery', 'Saffron Gap', 'Tinder', 'Umbral', 'Yarrow', 'Zenith Hold',
];

const blurbs = {
  ice: 'Comet miners and frozen seas', agri: 'Green terraces under glass', mining: 'Rock, dust and ore barges',
  forge: 'Foundries that never cool', lab: 'Quiet corridors, bright minds', reef: 'Singing crystal in the shallows',
  haven: 'Old money and bright towers', frontier: 'New roofs and long odds',
};

function buildPlaces() {
  const s = { r: 20261115 };
  const kindList = shuffle(s, [
    ...Array(5).fill('ice'), ...Array(5).fill('agri'), ...Array(6).fill('mining'), ...Array(5).fill('forge'),
    ...Array(4).fill('lab'), ...Array(3).fill('reef'), ...Array(3).fill('haven'), ...Array(4).fill('frontier'),
  ]);
  const cells = [];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) cells.push({ gx, gy });
  // The start system sits near the middle and is always a farm world.
  const startCell = cells.findIndex((c) => c.gx === 2 && c.gy === 3);
  const rest = shuffle(s, names.slice(1));
  let k = 0;
  return cells.map((c, i) => {
    const isStart = i === startCell;
    const kind = isStart ? 'agri' : kindList[k++];
    const name = isStart ? names[0] : rest.pop();
    const def = kinds[kind];
    const mods = {};
    for (const g of goods) mods[g.id] = +(def.mods[g.id] * (0.88 + rnd(s) * 0.24)).toFixed(3);
    return {
      id: name.toLowerCase().replace(/[^a-z]/g, ''), name, kind, kindLabel: def.label, blurb: blurbs[kind],
      x: +(8 + c.gx * 16.8 + (rnd(s) - 0.5) * 10).toFixed(1),
      y: +(8 + c.gy * 16.8 + (rnd(s) - 0.5) * 10).toFixed(1),
      size: kind === 'haven' ? 1.4 : kind === 'frontier' ? 0.7 : 1,
      danger: def.danger, supplyMod: def.fuel,
      services: isStart ? ['yard'] : def.services, mods,
    };
  });
}

const places = buildPlaces();

export default {
  id: 'space',
  name: 'Among the Stars',
  tagline: 'Thirty-six systems. One small ship. A loan to clear.',
  setting: 'The Reach, 2300s',
  days: 300,
  yearLen: 360,
  goal: 450000,
  scale: 3,
  guardCost: 2000,
  luckMax: 150,
  eventRate: 0.3,
  maxEvents: 7,
  rates: { debt: 0.003, bank: 0.0006 },
  start: { place: 'verdance', cash: 2500, debt: 6000, vehicle: 'mote' },
  travel: { mode: 'range', perDay: 9, weather: 0.12 },
  supplies: { name: 'Fuel', unit: 'fuel', per: 'dist', price: 8, start: 22 },
  everywhere: ['repair', 'lender', 'bank'],
  seasons: null,

  words: {
    departTo: 'Jump to',
    tags: { low: 'Low', mid: 'Typical', high: 'High' }, boom: 'shortage', glut: 'surplus', ashore: 'Dock', hostile: 'raiders', weather: 'ion storms', noWay: 'Too far for this ship’s fuel tank.',
    yardWhere: 'Forge worlds, research stations and havens have one.',
    money: 'Credits', unit: 'unit', cargo: 'Bay', vehicle: 'Ship', hull: 'Hull',
    market: 'Trade', map: 'Nav', port: 'Dock', ledger: 'Log',
    marketTitle: 'Exchange', depart: 'Jump', travelling: 'In transit', day: 'day in transit',
    yard: 'Shipyard', guards: 'Turrets', guardOne: 'Fit a turret', lender: 'Credit line', bank: 'Vault account',
    repair: 'Hull repair', places: 'systems', carry: 'holding',
  },

  goods,
  places,
  routes: [],

  vehicles: [
    { id: 'mote', name: 'Mote', blurb: 'A cockpit bolted to a cargo pod', cap: 30, speed: 1, def: 1, range: 22, price: 3000 },
    { id: 'skiff', name: 'Skiff', blurb: 'Nimble, and half paid for', cap: 55, speed: 1.2, def: 2, range: 26, price: 14000 },
    { id: 'packet', name: 'Packet', blurb: 'The workhorse of the inner lanes', cap: 90, speed: 1.1, def: 3, range: 30, price: 40000 },
    { id: 'longhauler', name: 'Longhauler', blurb: 'Slow, steady, cavernous', cap: 150, speed: 1, def: 4, range: 34, price: 95000 },
    { id: 'clipper', name: 'Clipper', blurb: 'Outruns almost anything', cap: 110, speed: 1.6, def: 5, range: 48, price: 150000 },
    { id: 'bulkrunner', name: 'Bulkrunner', blurb: 'More hold than ship', cap: 260, speed: 0.9, def: 6, range: 32, price: 260000 },
    { id: 'argosy', name: 'Argosy', blurb: 'A merchant house under one hull', cap: 380, speed: 1.1, def: 9, range: 40, price: 600000 },
    { id: 'leviathan', name: 'Leviathan', blurb: 'Stations make room when it docks', cap: 560, speed: 1, def: 12, range: 44, price: 1400000 },
  ],

  eventText: {
    boom: [
      'Founding Day on {place}: {good} is selling high.',
      'A supply convoy to {place} was delayed. They are short of {good}.',
      'A new habitat ring on {place} is buying up {good}.',
    ],
    glut: [
      'A freighter fleet unloaded at {place}: {good} is going cheap.',
      'Record output on {place}. The depots overflow with {good}.',
      'A trading house on {place} has folded and is dumping {good}.',
    ],
    peril: ['Raider wings are massing in the lanes near {place}.', 'A raider clan has set up a hidden base near {place}.'],
    calm: ['Patrol cutters are sweeping the lanes near {place}. The raiders have pulled back.'],
  },

  hazards: {
    hostile: {
      title: 'Raiders',
      intro: [
        'Three contacts light their drives behind you. No transponders.',
        'A voice on the open band: cut your engines and open the bay.',
        'What looked like a drifting wreck powers up and swings toward you.',
      ],
      fight: 'Open fire', flee: 'Burn hard', pay: 'Pay them off',
      win: ['Your turrets rake the lead ship. The raiders scatter and leave salvage behind.', 'A sharp exchange and the raiders break away, trailing sparks and dropped cargo.'],
      lose: ['Shields down. They clamp on, strip the bay, and go.', 'Outgunned. They take cargo and credits before you can limp away.'],
      fled: ['You push the drive past the red line and leave them behind.', 'You duck through a debris field and they lose your trail.'],
      caught: ['They overhaul you in an hour and help themselves to the bay.', 'Too heavy to run. They pull alongside and take their pick.'],
      paid: ['The transfer clears. The raiders peel away without a word.'],
      short: 'You cannot cover the demand, so they drain the account and take part of the cargo.',
    },
    weather: {
      title: 'Ion storm',
      intro: [
        'The hull begins to sing. A storm front is rolling across the lane.',
        'Every panel flickers at once. The sensors show a wall of charged dust.',
      ],
      push: 'Fly through it', wait: 'Power down and wait',
      safe: ['Sparks dance on the hull, but the ship slides through untouched.'],
      hit: ['A surge burns out half the relays and scores the plating.', 'Lightning walks across the hull. Systems fail one after another before you break clear.'],
      waited: ['You go dark and drift until the storm blows past.'],
    },
    luck: {
      title: 'Drifting cargo',
      intro: ['The scanner pings a cluster of sealed containers, no owner in sight.'],
      ok: 'Bring it in',
      found: ['You recover {n} units of {good}, seals intact.'],
      reward: ['The bay is full, so you tow a disabled shuttle to safety. Its owner pays you well.'],
    },
    wreck: 'The ship is crippled. The cargo is gone, and a salvage tug hauls you to {place}.',
    dry: '',
  },

  ranks: [
    { min: -1e9, title: 'Deep in debt' },
    { min: 0, title: 'Dock hand' },
    { min: 0.03, title: 'Lane peddler' },
    { min: 0.1, title: 'Free trader' },
    { min: 0.3, title: 'Respected merchant' },
    { min: 0.6, title: 'Fleet owner' },
    { min: 1, title: 'Merchant prince' },
    { min: 2, title: 'Legend of the Reach' },
  ],
};
