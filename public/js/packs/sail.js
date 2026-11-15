// Age of Sail: eight ports of the eastern seas in the 1500s. Map positions
// are longitude (x) and latitude (y).

const good = (id, name, base, depth, icon, vol = 0.05) => ({ id, name, base, depth, icon, vol });

export default {
  id: 'sail',
  name: 'Age of Sail',
  tagline: 'Eight ports. One small junk. A debt to clear.',
  setting: 'The eastern seas, 1500s',
  days: 360,
  yearLen: 360,
  goal: 250000,
  scale: 1,
  guardCost: 500,
  luckMax: 160,
  eventRate: 0.22,
  maxEvents: 4,
  rates: { debt: 0.003, bank: 0.0006 },
  start: { place: 'macau', cash: 1500, debt: 4000, vehicle: 'junk' },
  travel: { mode: 'graph' },
  supplies: null,
  everywhere: ['repair'],

  words: {
    departTo: 'Set sail for',
    tags: { low: 'Cheap here', mid: 'Fair price', high: 'Dear here' }, boom: 'in demand', glut: 'flooded', ashore: 'Go ashore', hostile: 'pirates', weather: 'storms', noWay: 'No ship sails there directly from here.',
    money: 'Silver', unit: 'chest', cargo: 'Hold', vehicle: 'Ship', hull: 'Hull',
    market: 'Market', map: 'Chart', port: 'Harbor', ledger: 'Ledger',
    marketTitle: 'The market', depart: 'Set sail', travelling: 'At sea', day: 'day at sea',
    yard: 'Shipyard', guards: 'Cannon', guardOne: 'Mount a cannon', lender: 'Moneylender', bank: 'Merchant house',
    repair: 'Careen and repair', places: 'ports', carry: 'you hold',
  },

  seasons: [
    { id: 'spring', name: 'Spring calm', from: 1, to: 90, storm: 0.7 },
    { id: 'typhoon', name: 'Typhoon season', from: 91, to: 200, storm: 2.2 },
    { id: 'autumn', name: 'Autumn monsoon', from: 201, to: 280, storm: 1.1 },
    { id: 'winter', name: 'Winter monsoon', from: 281, to: 360, storm: 0.9 },
  ],

  goods: [
    good('rice', 'Rice', 12, 700, 'sack'),
    good('tea', 'Tea', 40, 500, 'leaf'),
    good('copper', 'Copper', 70, 380, 'ingot'),
    good('porcelain', 'Porcelain', 110, 300, 'jar'),
    good('pepper', 'Pepper', 150, 320, 'sack'),
    good('sandalwood', 'Sandalwood', 220, 200, 'log'),
    good('silk', 'Silk', 380, 170, 'cloth'),
    good('lacquer', 'Lacquerware', 520, 110, 'box', 0.06),
    good('cloves', 'Cloves', 700, 130, 'spice', 0.06),
    good('pearls', 'Pearls', 800, 60, 'gem', 0.06),
  ],

  places: [
    { id: 'hirado', name: 'Hirado', blurb: 'Island port of the sword-smiths', x: 129.5, y: 33.4, size: 0.9, services: ['yard'],
      mods: { rice: 1.2, tea: 1.1, copper: 0.6, porcelain: 1.3, pepper: 1.6, sandalwood: 1.5, silk: 1.5, lacquer: 0.6, cloves: 1.7, pearls: 1.5 } },
    { id: 'ningbo', name: 'Ningbo', blurb: 'Silk and tea from the great river', x: 121.9, y: 29.9, size: 1.3, services: ['bank', 'yard'],
      mods: { rice: 0.9, tea: 0.6, copper: 1.4, porcelain: 0.7, pepper: 1.5, sandalwood: 1.6, silk: 0.55, lacquer: 1.3, cloves: 1.7, pearls: 1.6 } },
    { id: 'macau', name: 'Macau', blurb: 'Mouth of the Pearl River', x: 113.5, y: 22.2, size: 1.2, services: ['lender', 'bank', 'yard'],
      mods: { rice: 1.0, tea: 0.8, copper: 1.2, porcelain: 0.6, pepper: 1.3, sandalwood: 1.35, silk: 0.75, lacquer: 1.2, cloves: 1.45, pearls: 1.35 } },
    { id: 'manila', name: 'Manila', blurb: 'Pearl divers and a wide bay', x: 120.9, y: 14.6, size: 1.0, services: ['lender'],
      mods: { rice: 1.15, tea: 1.3, copper: 1.1, porcelain: 1.4, pepper: 0.95, sandalwood: 0.9, silk: 1.5, lacquer: 1.5, cloves: 1.0, pearls: 0.55 } },
    { id: 'hoian', name: 'Hoi An', blurb: 'River town of lanterns', x: 108.4, y: 15.9, size: 0.8, services: [],
      mods: { rice: 0.7, tea: 1.1, copper: 1.3, porcelain: 1.15, pepper: 0.85, sandalwood: 0.7, silk: 0.95, lacquer: 1.25, cloves: 1.2, pearls: 1.25 } },
    { id: 'ayutthaya', name: 'Ayutthaya', blurb: 'City of canals and golden spires', x: 100.6, y: 13.6, size: 1.1, services: ['bank'],
      mods: { rice: 0.5, tea: 1.3, copper: 1.45, porcelain: 1.3, pepper: 0.8, sandalwood: 0.6, silk: 1.45, lacquer: 1.4, cloves: 1.1, pearls: 1.2 } },
    { id: 'malacca', name: 'Malacca', blurb: 'Where every monsoon fleet meets', x: 102.2, y: 2.2, size: 1.2, services: ['lender', 'bank', 'yard'],
      mods: { rice: 1.3, tea: 1.5, copper: 1.3, porcelain: 1.7, pepper: 0.6, sandalwood: 0.8, silk: 1.8, lacquer: 1.6, cloves: 0.6, pearls: 1.1 } },
    { id: 'banten', name: 'Banten', blurb: 'Pepper gardens by the strait', x: 106.1, y: -6.0, size: 0.9, services: [],
      mods: { rice: 1.1, tea: 1.6, copper: 1.35, porcelain: 1.75, pepper: 0.45, sandalwood: 0.9, silk: 1.9, lacquer: 1.6, cloves: 0.5, pearls: 1.0 } },
  ],

  routes: [
    { a: 'hirado', b: 'ningbo', days: 5, danger: 0.45, weather: 0.25 },
    { a: 'hirado', b: 'macau', days: 8, danger: 0.3, weather: 0.25 },
    { a: 'hirado', b: 'manila', days: 9, danger: 0.25, weather: 0.3 },
    { a: 'ningbo', b: 'macau', days: 5, danger: 0.3, weather: 0.2 },
    { a: 'ningbo', b: 'manila', days: 7, danger: 0.2, weather: 0.3 },
    { a: 'macau', b: 'manila', days: 4, danger: 0.2, weather: 0.25 },
    { a: 'macau', b: 'hoian', days: 3, danger: 0.2, weather: 0.2 },
    { a: 'hoian', b: 'manila', days: 5, danger: 0.2, weather: 0.25 },
    { a: 'hoian', b: 'ayutthaya', days: 5, danger: 0.25, weather: 0.12 },
    { a: 'hoian', b: 'malacca', days: 5, danger: 0.3, weather: 0.12 },
    { a: 'macau', b: 'malacca', days: 7, danger: 0.3, weather: 0.15 },
    { a: 'ayutthaya', b: 'malacca', days: 5, danger: 0.3, weather: 0.1, calm: true },
    { a: 'malacca', b: 'banten', days: 4, danger: 0.4, weather: 0.1, calm: true },
    { a: 'manila', b: 'banten', days: 9, danger: 0.35, weather: 0.15 },
    { a: 'hoian', b: 'banten', days: 8, danger: 0.3, weather: 0.12 },
  ],

  vehicles: [
    { id: 'junk', name: 'Coastal junk', blurb: 'Patched sails, a loyal crew of six', cap: 50, speed: 1, def: 1, price: 2000 },
    { id: 'trader', name: 'Trading junk', blurb: 'Three masts and a deeper hold', cap: 110, speed: 1, def: 2, price: 9000 },
    { id: 'redseal', name: 'Red-seal ship', blurb: 'Fast, licensed, and well armed', cap: 190, speed: 1.2, def: 4, price: 32000 },
    { id: 'great', name: 'Great junk', blurb: 'A floating warehouse', cap: 320, speed: 1, def: 6, price: 90000 },
    { id: 'carrack', name: 'Ocean carrack', blurb: 'High castles and thirty guns', cap: 480, speed: 1.1, def: 9, price: 220000 },
  ],

  eventText: {
    boom: [
      'A festival in {place}: {good} is selling dear.',
      'A noble wedding in {place} has emptied the stalls of {good}.',
      'Buyers from inland crowd {place}, asking for {good}.',
    ],
    glut: [
      'Three laden fleets reached {place}: {good} is going cheap.',
      'A bumper season near {place}. Warehouses overflow with {good}.',
      'A merchant house in {place} has failed and is dumping {good}.',
    ],
    peril: ['Pirate junks are gathering in the waters off {place}.', 'A pirate chief has made his lair near {place}.'],
    calm: ['War junks patrol the approaches to {place}. The pirates have scattered.'],
  },

  hazards: {
    hostile: {
      title: 'Pirates',
      intro: [
        'Dark sails slide out from behind a headland and turn toward you.',
        'A drum beats across the water. Two pirate junks are closing fast.',
        'A boat that looked like a fisherman runs up a black flag.',
      ],
      fight: 'Fight them off', flee: 'Outrun them', pay: 'Pay tribute',
      win: ['Your gunners find their mark. The pirates break off, leaving a prize behind.', 'After a sharp fight the pirates flee, and their strongbox is yours.'],
      lose: ['They swarm over the rail. The pirates take what they like and go.', 'Outgunned, you strike your sails. They carry off chests and coin.'],
      fled: ['You crowd on sail and leave them in your wake.', 'A squall hides you. When it lifts, the horizon is empty.'],
      caught: ['They catch you by nightfall and help themselves to the hold.', 'Too slow. They come alongside and take their pick.'],
      paid: ['The pirate chief counts the silver, bows, and waves you on.'],
      short: 'You cannot pay the full tribute, so they take the purse and part of the cargo.',
    },
    weather: {
      title: 'Storm',
      intro: [
        'The sky turns the color of slate and the swell begins to climb.',
        'The wind backs suddenly. The old hands tie everything down.',
      ],
      push: 'Sail through it', wait: 'Shelter in a cove',
      safe: ['Green water over the bow all night, but she rides it out untouched.'],
      hit: ['A wave like a wall. Spars crack and seams open before the storm passes.', 'The storm tears a sail away and batters the hull.'],
      waited: ['You wait at anchor in a quiet cove until the sea lies down.'],
    },
    luck: {
      title: 'Flotsam',
      intro: ['The lookout spots chests bobbing among broken timbers.'],
      ok: 'Haul it aboard',
      found: ['You fish out {n} chests of {good}, still dry inside.'],
      reward: ['The hold is full, so you tow a stranded fisherman home. His village pays you in silver.'],
    },
    wreck: 'The ship is a wreck. The cargo is lost, and fishermen tow you into {place}.',
    dry: '',
  },

  ranks: [
    { min: -1e9, title: 'Deep in debt' },
    { min: 0, title: 'Deckhand' },
    { min: 0.03, title: 'Harbor peddler' },
    { min: 0.1, title: 'Junk captain' },
    { min: 0.3, title: 'Respected merchant' },
    { min: 0.6, title: 'Master of ships' },
    { min: 1, title: 'Merchant prince' },
    { min: 2, title: 'Legend of the eastern seas' },
  ],
};
