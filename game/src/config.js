// Neon Bay: Harbor Heat — tuning, city layout, story and palette.
// A top-down open-world crime game: one city, on foot and by car, traffic,
// pedestrians, police, five story missions, combat, HUD and minimap.
export const WORLD = { width: 3200, height: 2400 };
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;

// Streets run on a grid. ROAD_W is the asphalt width; blocks between hold
// buildings, the park, the beach (south) and the docks (east).
export const ROAD_W = 72;
export const VERTICAL_STREETS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const HORIZONTAL_STREETS = [200, 600, 1000, 1400, 1800, 2200];
export const PARK = { x: 1440, y: 1040, w: 320, h: 320 }; // central park block
export const BEACH_Y = 2260; // sand strip along the south edge
export const DOCKS_X = 2960; // harbour piers along the east edge

export const PLAYER = { radius: 14, walkSpeed: 210, runSpeed: 330, health: 100 };
export const CAR = { length: 54, width: 26, accel: 420, brake: 700, maxSpeed: 560, reverseMax: 180, turn: 2.6 };
export const BULLET = { speed: 760, range: 460, damage: 34 };
export const POLICE = { maxChasers: 6, bustSeconds: 1.4, ramDamage: 6 };
export const WANTED_DECAY_SECONDS = 14;

export const SAVE_KEY = 'neon-bay-harbor-heat.save.v1';
export const BEST_KEY = 'neon-bay-harbor-heat.best';

export const PALETTE = {
  grass: '#1d4d33', park: '#2c6b44', sand: '#c9a86a', water: '#0e4d6e',
  road: '#23262e', roadEdge: '#3a3f4d', lane: '#e8c33a', sidewalk: '#5b5f6b',
  buildingA: '#7a4a6b', buildingB: '#4a6b7a', buildingC: '#6b5a2e', buildingD: '#3f5a44',
  roof: '#2c2f38', window: '#ffd76a', player: '#ff5a5a', police: '#2f6df6',
  taxi: '#f2c94c', ped: '#e8e8e8', hud: '#10131a', text: '#f2f4f8', muted: '#9aa3b2',
  gold: '#f2c94c', red: '#e5534b', green: '#4ade80', blue: '#4fc3f7',
};

// Five-mission story arc: Mara Voss, a courier who owes the harbour crew.
export const MISSIONS = [
  {
    id: 'hot-wheels', title: '1 — Hot Wheels',
    brief: 'Mara needs wheels. Steal any car — press E next to one.',
    hint: 'Walk up to a parked car and press E.',
    reward: 150, target: null,
  },
  {
    id: 'the-package', title: '2 — The Package',
    brief: 'Pick up the package at the docks, east end of the city.',
    hint: 'Drive east to the yellow marker at the docks.',
    reward: 400, target: { x: 3050, y: 1000, label: 'DOCKS' },
  },
  {
    id: 'cool-off', title: '3 — Cool Off',
    brief: 'The heat is on. Lose the cops, then get the car repainted at Neon Garage.',
    hint: 'Lay low until the stars fade, then drive to the garage marker.',
    reward: 300, target: { x: 600, y: 600, label: 'GARAGE' },
  },
  {
    id: 'the-debt', title: '4 — The Debt',
    brief: 'Three rivals from the Kestrel crew wait in the plaza. Settle it — on foot.',
    hint: 'Get out of the car. Click to shoot, F to punch.',
    reward: 800, target: { x: 1600, y: 1200, label: 'PLAZA' },
  },
  {
    id: 'harbor-heist', title: '5 — Harbor Heist',
    brief: 'Hit the Harbor Bank, grab the cash, and make it to the hideout. The whole city will chase you.',
    hint: 'Drive to the bank, then escape to the hideout marker.',
    reward: 5000, target: { x: 1000, y: 1800, label: 'BANK' },
  },
];

export const HIDEOUT = { x: 2200, y: 2200, label: 'HIDEOUT' };
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
