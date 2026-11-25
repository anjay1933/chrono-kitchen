// All tuning numbers for Chrono Kitchen live here: room size, station spots,
// ingredient colours, timings and scoring, so balance changes touch one file.
export const KITCHEN_CONFIG = {
  room: { width: 14, depth: 10, wallHeight: 4.2 },
  chef: { speed: 5.2, radius: 0.42 },
  shiftSeconds: 150,
  targetScore: 300,
  maxHearts: 3,
  maxOrders: 4,
  orderFirstDelaySeconds: 4,
  orderSpawnMinSeconds: 8,
  orderSpawnMaxSeconds: 14,
  orderDeadlineSeconds: 55,
  plateSlots: 4,
  stationProcessSeconds: { firePit: 4, hearth: 5, nanoCooker: 2 },
  score: { basePerItem: 40, timeBonusMax: 60, wrongServePenalty: 0 },
  combo: { stepEveryServes: 2, maxMultiplier: 3 },
  colors: {
    floor: 0x8a6a4a,
    wallBack: 0x3d2f4a,
    wallSide: 0x4a3550,
    counter: 0x6b4a2f,
    counterTop: 0xd9c1a0,
    firePitStone: 0x5c5c66,
    fireEmber: 0xff6a1a,
    hearthBrick: 0x9a4a30,
    nanoBody: 0x2a4a5a,
    nanoGlow: 0x33e0ff,
    plate: 0xf2f2ee,
    chefCoat: 0xf5f2e8,
    chefHat: 0xffffff,
    chefSkin: 0xe8b88a,
  },
  ingredientColors: {
    rawMeat: 0xc0392b,
    dough: 0xe8d5a8,
    veg: 0x3fae5a,
    spice: 0x8e44ad,
    grilled: 0x7a3b12,
    bread: 0xd9a45b,
    smoked: 0x6e2f1d,
    salad: 0x7ed957,
    sauce: 0xe67e22,
  },
};

/** Station catalogue: id, display name, era flavour and floor position. */
export const STATION_DEFS = [
  { id: 'pantry', label: 'Pantry', era: 'all eras', x: -5.6, z: -3.4, kind: 'pantry' },
  { id: 'firePit', label: 'Fire-Pit Grill', era: 'prehistoric', x: -5.6, z: 0.4, kind: 'firePit' },
  { id: 'hearth', label: 'Hearth Oven', era: 'medieval', x: -5.6, z: 3.4, kind: 'hearth' },
  { id: 'nanoCooker', label: 'Nano-Cooker', era: 'futuristic', x: 5.6, z: -3.4, kind: 'nanoCooker' },
  { id: 'plate', label: 'Assembly Counter', era: 'all eras', x: 5.6, z: 0.4, kind: 'plate' },
  { id: 'serve', label: 'Serve Window', era: 'all eras', x: 5.6, z: 3.4, kind: 'serve' },
];

/** Where the chef starts each shift, in front of the assembly counter. */
export const CHEF_SPAWN = { x: 2.2, z: 0.6 };
