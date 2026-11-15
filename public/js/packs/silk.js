// The Silk Road: ten cities from Chang'an to Constantinople. Caravans carry
// water, and the high passes close in winter. Map positions are longitude (x)
// and latitude (y).

const good = (id, name, base, depth, icon, vol = 0.05) => ({ id, name, base, depth, icon, vol });

export default {
  id: 'silk',
  name: 'The Silk Road',
  tagline: 'Ten cities. Six camels. A desert in between.',
  setting: "Chang'an to Constantinople, around 800",
  days: 480,
  yearLen: 360,
  goal: 100000,
  scale: 1,
  guardCost: 500,
  luckMax: 180,
  eventRate: 0.22,
  maxEvents: 5,
  rates: { debt: 0.003, bank: 0.0006 },
  start: { place: 'changan', cash: 1500, debt: 4000, vehicle: 'six' },
  travel: { mode: 'graph' },
  supplies: { name: 'Water', unit: 'days of water', per: 'day', price: 6, start: 10 },
  everywhere: ['repair'],

  words: {
    departTo: 'Set out for',
    tags: { low: 'Cheap here', mid: 'Fair price', high: 'Dear here' }, boom: 'in demand', glut: 'flooded', ashore: 'Enter the city', hostile: 'bandits', weather: 'sandstorms', noWay: 'No road leads there directly from here.',
    money: 'Dirhams', unit: 'bale', cargo: 'Packs', vehicle: 'Caravan', hull: 'Animals',
    market: 'Bazaar', map: 'Road', port: 'Inn', ledger: 'Ledger',
    marketTitle: 'The bazaar', depart: 'Set out', travelling: 'On the road', day: 'day on the road',
    yard: 'Animal market', guards: 'Guards', guardOne: 'Hire a guard', lender: 'Moneylender', bank: 'Merchant house',
    repair: 'Rest and tend the animals', places: 'cities', carry: 'you carry',
  },

  seasons: [
    { id: 'spring', name: 'Spring', from: 1, to: 90, storm: 1 },
    { id: 'summer', name: 'High summer', from: 91, to: 180, storm: 1.8 },
    { id: 'autumn', name: 'Autumn', from: 181, to: 270, storm: 0.8 },
    { id: 'winter', name: 'Winter', from: 271, to: 360, storm: 0.6 },
  ],

  goods: [
    good('grain', 'Grain', 12, 700, 'sack'),
    good('paper', 'Paper', 45, 450, 'scroll'),
    good('cotton', 'Cotton', 60, 420, 'cloth'),
    good('glass', 'Glassware', 130, 300, 'jar'),
    good('furs', 'Furs', 170, 240, 'pelt'),
    good('incense', 'Frankincense', 240, 200, 'spice'),
    good('horses', 'Horses', 280, 160, 'horse'),
    good('silk', 'Silk', 400, 180, 'cloth'),
    good('saffron', 'Saffron', 520, 120, 'spice', 0.06),
    good('jade', 'Jade', 700, 70, 'gem', 0.06),
  ],

  places: [
    { id: 'changan', name: "Chang'an", blurb: 'Capital of a million souls', x: 108.9, y: 34.3, size: 1.4, supplyMod: 0.6, services: ['lender', 'bank', 'yard'],
      mods: { grain: 0.8, paper: 0.55, cotton: 1.2, glass: 1.8, furs: 1.5, incense: 1.8, horses: 1.9, silk: 0.5, saffron: 1.6, jade: 1.9 } },
    { id: 'dunhuang', name: 'Dunhuang', blurb: 'Last gate before the sands', x: 94.7, y: 40.1, size: 0.8, supplyMod: 1.5, services: [],
      mods: { grain: 1.3, paper: 0.75, cotton: 1.0, glass: 1.6, furs: 1.3, incense: 1.6, horses: 1.5, silk: 0.7, saffron: 1.5, jade: 1.4 } },
    { id: 'turfan', name: 'Turfan', blurb: 'Vineyards under the Flaming Mountains', x: 89.2, y: 42.9, size: 0.9, supplyMod: 1.2, services: [],
      mods: { grain: 0.9, paper: 0.95, cotton: 0.6, glass: 1.5, furs: 0.75, incense: 1.5, horses: 1.1, silk: 0.9, saffron: 1.4, jade: 1.2 } },
    { id: 'khotan', name: 'Khotan', blurb: 'Jade from the white river', x: 79.9, y: 37.1, size: 0.8, supplyMod: 1.3, services: [],
      mods: { grain: 1.2, paper: 1.1, cotton: 0.7, glass: 1.5, furs: 1.3, incense: 1.4, horses: 1.2, silk: 0.95, saffron: 1.3, jade: 0.45 } },
    { id: 'kashgar', name: 'Kashgar', blurb: 'Market at the foot of the passes', x: 76.0, y: 39.5, size: 1.0, supplyMod: 1.0, services: ['yard', 'lender'],
      mods: { grain: 1.0, paper: 1.2, cotton: 0.8, glass: 1.35, furs: 1.0, incense: 1.3, horses: 0.85, silk: 1.15, saffron: 1.2, jade: 0.8 } },
    { id: 'samarkand', name: 'Samarkand', blurb: 'Crossroads of the Sogdian merchants', x: 67.0, y: 39.7, size: 1.2, supplyMod: 0.7, services: ['lender', 'bank', 'yard'],
      mods: { grain: 0.85, paper: 0.9, cotton: 0.9, glass: 1.15, furs: 0.7, incense: 1.1, horses: 0.5, silk: 1.4, saffron: 0.9, jade: 1.5 } },
    { id: 'merv', name: 'Merv', blurb: 'Oasis queen of the Black Sands', x: 62.2, y: 37.7, size: 1.0, supplyMod: 0.9, services: ['bank'],
      mods: { grain: 0.9, paper: 1.3, cotton: 0.75, glass: 1.0, furs: 1.2, incense: 0.9, horses: 0.8, silk: 1.55, saffron: 0.6, jade: 1.6 } },
    { id: 'baghdad', name: 'Baghdad', blurb: 'The round city on the Tigris', x: 44.4, y: 33.3, size: 1.4, supplyMod: 0.6, services: ['lender', 'bank', 'yard'],
      mods: { grain: 1.1, paper: 1.5, cotton: 1.0, glass: 0.8, furs: 1.6, incense: 0.5, horses: 1.2, silk: 1.8, saffron: 0.7, jade: 1.7 } },
    { id: 'antioch', name: 'Antioch', blurb: 'Glass-blowers by the Orontes', x: 36.2, y: 36.2, size: 0.9, supplyMod: 0.7, services: [],
      mods: { grain: 0.9, paper: 1.6, cotton: 1.1, glass: 0.55, furs: 1.5, incense: 0.8, horses: 1.3, silk: 2.0, saffron: 1.2, jade: 1.6 } },
    { id: 'constantinople', name: 'Constantinople', blurb: 'The city of the world’s desire', x: 29.0, y: 41.0, size: 1.4, supplyMod: 0.6, services: ['lender', 'bank', 'yard'],
      mods: { grain: 1.0, paper: 1.7, cotton: 1.2, glass: 0.65, furs: 1.7, incense: 1.2, horses: 1.4, silk: 2.3, saffron: 1.5, jade: 1.7 } },
  ],

  routes: [
    { a: 'changan', b: 'dunhuang', days: 8, danger: 0.15, weather: 0.12, name: 'Hexi Corridor' },
    { a: 'changan', b: 'turfan', days: 11, danger: 0.35, weather: 0.2, name: 'Gobi road' },
    { a: 'dunhuang', b: 'turfan', days: 5, danger: 0.25, weather: 0.25, name: 'Northern road' },
    { a: 'dunhuang', b: 'khotan', days: 9, danger: 0.15, weather: 0.35, name: 'Southern sands' },
    { a: 'turfan', b: 'kashgar', days: 8, danger: 0.25, weather: 0.18, name: 'Foot of the Tian Shan' },
    { a: 'khotan', b: 'kashgar', days: 4, danger: 0.2, weather: 0.2, name: 'Oasis road' },
    { a: 'kashgar', b: 'samarkand', days: 6, danger: 0.3, weather: 0.2, closed: ['winter'], pass: true, name: 'Pamir passes' },
    { a: 'turfan', b: 'samarkand', days: 11, danger: 0.4, weather: 0.1, closed: ['winter'], pass: true, name: 'Steppe road' },
    { a: 'samarkand', b: 'merv', days: 4, danger: 0.2, weather: 0.22, name: 'Black Sands' },
    { a: 'merv', b: 'baghdad', days: 9, danger: 0.25, weather: 0.15, name: 'Khorasan road' },
    { a: 'baghdad', b: 'antioch', days: 6, danger: 0.2, weather: 0.15, name: 'Euphrates road' },
    { a: 'antioch', b: 'constantinople', days: 6, danger: 0.2, weather: 0.1, name: 'Anatolian road' },
    { a: 'baghdad', b: 'constantinople', days: 10, danger: 0.3, weather: 0.1, name: 'Armenian highlands' },
  ],

  vehicles: [
    { id: 'six', name: 'Six camels', blurb: 'Yours, mostly. The moneylender owns the rest', cap: 40, speed: 1, def: 1, water: 10, thirst: 1, price: 2000 },
    { id: 'string', name: 'Camel string', blurb: 'Fifteen camels nose to tail', cap: 90, speed: 1, def: 2, water: 12, thirst: 2, price: 8000 },
    { id: 'train', name: 'Horse and camel train', blurb: 'Quicker on the road, thirstier too', cap: 160, speed: 1.25, def: 4, water: 12, thirst: 3.5, price: 28000 },
    { id: 'great', name: 'Great caravan', blurb: 'A moving town of drivers and beasts', cap: 280, speed: 1.1, def: 6, water: 14, thirst: 6, price: 80000 },
    { id: 'bells', name: 'Caravan of a thousand bells', blurb: 'Heard a day before it arrives', cap: 440, speed: 1.1, def: 9, water: 16, thirst: 9, price: 200000 },
  ],

  eventText: {
    boom: [
      'A royal wedding in {place}: {good} is selling dear.',
      'Pilgrims fill {place} and the bazaar is short of {good}.',
      'An embassy in {place} is buying every load of {good}.',
    ],
    glut: [
      'Four caravans reached {place} together: {good} is going cheap.',
      'A rich harvest near {place}. Storehouses overflow with {good}.',
      'A merchant of {place} has died in debt, and his {good} is being sold off.',
    ],
    peril: ['Bandits are raiding the roads around {place}.', 'A robber band has taken the hills near {place}.'],
    calm: ['Soldiers escort travelers near {place}. The bandits have gone to ground.'],
  },

  hazards: {
    hostile: {
      title: 'Bandits',
      intro: [
        'Riders line the ridge ahead, and more are closing in behind.',
        'A dust cloud on the horizon turns into horsemen with drawn bows.',
        'Men step out from the rocks of a narrow gully and block the road.',
      ],
      fight: 'Stand and fight', flee: 'Ride for it', pay: 'Pay the toll',
      win: ['Your guards hold the line. The bandits scatter, dropping their loot.', 'A short, hard fight. The riders flee and leave a full saddlebag behind.'],
      lose: ['They ride through your line and cut loose the best loads.', 'Too many of them. They take bales and coin, and vanish into the dust.'],
      fled: ['You whip the animals into a run and lose them among the dunes.', 'Dusk falls, and you slip away down a dry riverbed.'],
      caught: ['They run you down within the hour and take their pick of the packs.', 'The laden beasts are too slow. The riders help themselves.'],
      paid: ['Their chief weighs the purse, grins, and waves the caravan through.'],
      short: 'You cannot pay the full toll, so they take the purse and part of the load.',
    },
    weather: {
      title: 'Sandstorm',
      intro: [
        'A brown wall is climbing the sky. The camels kneel and will not move.',
        'The wind rises to a shriek and the road disappears.',
      ],
      push: 'Push on through', wait: 'Camp and wait',
      safe: ['Heads down and scarves tight, you walk out the other side unharmed.'],
      hit: ['Animals bolt in the dark and loads are torn away before the storm passes.', 'Sand flays beast and driver alike. The caravan staggers out, the worse for it.'],
      waited: ['You circle the animals and wait it out, sipping from the water skins.'],
    },
    luck: {
      title: 'Abandoned loads',
      intro: ['Half buried beside the road lie the packs of some unlucky caravan.'],
      ok: 'Load them up',
      found: ['You dig out {n} bales of {good}, still good.'],
      reward: ['Your packs are full, so you guide a lost pilgrim to the next well. He pays you in coin.'],
    },
    wreck: 'The caravan is broken. The loads are lost, and herdsmen lead you into {place}.',
    dry: 'The water skins are empty. Animals falter and loads are left behind.',
  },

  ranks: [
    { min: -1e9, title: 'Deep in debt' },
    { min: 0, title: 'Camel boy' },
    { min: 0.03, title: 'Bazaar peddler' },
    { min: 0.1, title: 'Caravan trader' },
    { min: 0.3, title: 'Respected merchant' },
    { min: 0.6, title: 'Caravan master' },
    { min: 1, title: 'Prince of the bazaars' },
    { min: 2, title: 'Legend of the Silk Road' },
  ],
};
