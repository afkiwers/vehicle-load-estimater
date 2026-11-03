// Dual-cab utes, SUVs and vans as sold in Australia: the GWM Cannon and Cannon Alpha, the
// Isuzu D-MAX and the Isuzu MU-X, the 2009 Toyota HiAce LWB van, plus a generic ute and car
// for any other make.
//
// The current GWM range comes from GWM Australia's brochures (Cannon Alpha, current at
// 14/10/2026; Cannon, 16/10/2026). Earlier GWM models are no longer in a brochure; their
// kerb weight, GVM, GCM, payload and towing come from Australian spec listings
// (CarExpert, carsales, Drive, CarsGuide, 4X4 Australia). The Isuzus come from Isuzu UTE
// Australia's 25.5MY D-MAX and MU-X brochures. The 2009 HiAce figures come from Australian
// spec listings (GoAuto, CarsGuide, carsales); Toyota's axle ratings and tow ball download
// for it are not in them.
//
// Each model lists the setup paths that hold typical rather than published values, so
// the app marks them as placeholders to check against the vehicle's placard.

import type { UteLimits, UteSpec } from './types';

export type VehicleGroup =
  | 'BYD Shark 6'
  | 'BYD SUVs'
  | 'Ford Ranger'
  | 'Ford F-150'
  | 'GWM Cannon Alpha'
  | 'GWM Cannon'
  | 'Earlier GWM models'
  | 'Isuzu D-MAX'
  | 'Isuzu MU-X'
  | 'Toyota HiAce'
  | 'Other makes';

export type VehicleMake = 'BYD' | 'Ford' | 'GWM' | 'Isuzu' | 'Toyota' | 'Other';

export interface VehicleModel {
  id: string;
  make: VehicleMake;
  group: VehicleGroup;
  /** As listed in the picker. */
  label: string;
  spec: () => Omit<UteSpec, 'paint'>;
  /** Setup paths under "ute." holding typical rather than published values. */
  placeholders: string[];
}

export const DEFAULT_VEHICLE = 'alpha-vanta-30d';

/** Not in any of the maker's brochures. Isuzu gives the track and front overhang, but not how the kerb weight splits. */
const UNPUBLISHED = {
  // Ford's and BYD's spec sheets are not reachable here; these are rarely in the listings the figures come from.
  Ford: ['ute.trackFront', 'ute.trackRear', 'ute.frontOverhang', 'ute.tub.length', 'ute.tub.width', 'ute.tub.depth', 'ute.tub.floorHeight', 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  BYD: ['ute.trackFront', 'ute.trackRear', 'ute.frontOverhang', 'ute.tub.length', 'ute.tub.width', 'ute.tub.depth', 'ute.tub.floorHeight', 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  GWM: ['ute.trackFront', 'ute.trackRear', 'ute.frontOverhang', 'ute.tub.floorHeight'],
  Isuzu: ['ute.tub.floorHeight', 'ute.kerbFrontPct'],
  Toyota: [
    'ute.trackFront',
    'ute.trackRear',
    'ute.frontOverhang',
    'ute.tub.length',
    'ute.tub.width',
    'ute.tub.depth',
    'ute.tub.floorHeight',
    'ute.kerbFrontPct',
    'ute.tyre.loadIndex',
    'ute.limits.frontAxle',
    'ute.limits.rearAxle',
    'ute.limits.towBallMax',
  ],
  Generic: [],
};
const TUB = ['ute.tub.length', 'ute.tub.width', 'ute.tub.depth'];
const OVERALL = ['ute.overallLength', 'ute.overallWidth', 'ute.overallHeight'];
const AXLES = ['ute.limits.frontAxle', 'ute.limits.rearAxle'];
const LIMITS = ['gvm', 'gcm', 'frontAxle', 'rearAxle', 'kerb', 'tare', 'payload', 'brakedTow', 'unbrakedTow', 'towBallMax'].map((k) => `ute.limits.${k}`);
/** Every figure: the generic vehicles have no published ones. */
const EVERYTHING = ['ute.wheelbase', 'ute.trackFront', 'ute.trackRear', ...OVERALL, 'ute.frontOverhang', ...TUB, 'ute.tub.floorHeight', 'ute.kerbFrontPct', 'ute.tyre.size', 'ute.tyre.loadIndex', ...LIMITS];

const makeOf = (group: VehicleGroup): keyof typeof UNPUBLISHED =>
  (['BYD', 'Ford', 'GWM', 'Isuzu', 'Toyota'] as const).find((make) => group.includes(make)) ?? 'Generic';

const MAKE: Record<keyof typeof UNPUBLISHED, VehicleMake> = { BYD: 'BYD', Ford: 'Ford', GWM: 'GWM', Isuzu: 'Isuzu', Toyota: 'Toyota', Generic: 'Other' };

type Body = Pick<
  UteSpec,
  'bodyStyle' | 'wheelbase' | 'trackFront' | 'trackRear' | 'overallLength' | 'overallWidth' | 'overallHeight' | 'frontOverhang' | 'tub' | 'kerbFrontPct'
>;

const ALPHA: Body = {
  bodyStyle: 'ute',
  wheelbase: 3350,
  trackFront: 1635,
  trackRear: 1635,
  overallLength: 5445,
  overallWidth: 1991,
  overallHeight: 1924,
  frontOverhang: 950,
  tub: { length: 1485, width: 1520, depth: 540, floorHeight: 880 },
  kerbFrontPct: 56,
};

const CANNON: Body = {
  bodyStyle: 'ute',
  wheelbase: 3230,
  trackFront: 1600,
  trackRear: 1600,
  overallLength: 5416,
  overallWidth: 1947,
  overallHeight: 1884,
  frontOverhang: 920,
  tub: { length: 1520, width: 1520, depth: 540, floorHeight: 860 },
  kerbFrontPct: 58,
};

/** Front axle share of the kerb weight from the published axle loads at kerb, in %. */
const split = (front: number, rear: number) => Math.round((front / (front + rear)) * 1000) / 10;

interface Def {
  id: string;
  group: VehicleGroup;
  name: string;
  /** Model years, shown for earlier models. */
  years?: string;
  body: Body;
  limits: UteLimits;
  tyre: { size: string; loadIndex: number };
  /** Panoramic sunroof as standard (brochure "Panoramic Sunroof" or "Sunroof"). */
  sunroof?: true;
  /** Paths whose values here are typical, on top of the maker's UNPUBLISHED ones. */
  typical: string[];
}

const ALPHA_30D: UteLimits = {
  gvm: 3495,
  gcm: 6555,
  frontAxle: 1680,
  rearAxle: 2026,
  kerb: 2550,
  tare: 2458,
  payload: 945,
  brakedTow: 3500,
  unbrakedTow: 750,
  towBallMax: 350,
};

const ALPHA_PHEV: UteLimits = {
  gvm: 3495,
  gcm: 6745,
  frontAxle: 1680,
  rearAxle: 2250,
  kerb: 2810,
  tare: 2761,
  payload: 685,
  brakedTow: 3500,
  unbrakedTow: 750,
  towBallMax: 350,
};

const CANNON_24D: UteLimits = {
  gvm: 3225,
  gcm: 6200,
  frontAxle: 1500,
  rearAxle: 1950,
  kerb: 2230,
  tare: 2173,
  payload: 995,
  brakedTow: 3500,
  unbrakedTow: 750,
  towBallMax: 350,
};

const CANNON_PHEV: UteLimits = {
  gvm: 3420,
  gcm: 6400,
  frontAxle: 1500,
  rearAxle: 2005,
  kerb: 2585,
  tare: 2525,
  payload: 835,
  brakedTow: 3500,
  unbrakedTow: 750,
  towBallMax: 350,
};

const CANNON_20D_EARLIER: UteLimits = {
  gvm: 3150,
  gcm: 5545,
  frontAxle: 1500,
  rearAxle: 1915,
  kerb: 2100,
  tare: 2025,
  payload: 1050,
  brakedTow: 3000,
  unbrakedTow: 750,
  towBallMax: 300,
};

const CANNON_24D_BODY: Body = { ...CANNON, kerbFrontPct: split(1295, 935) };
const CANNON_PHEV_BODY: Body = { ...CANNON, overallHeight: 1886, tub: { ...CANNON.tub, depth: 517.5 }, kerbFrontPct: split(1305, 1280) };

const DEFS: Def[] = [
  // Current Cannon Alpha range (brochure, 14/10/2026). Tub sizes and the kerb weight split are not given.
  {
    id: 'alpha-vanta-30d',
    sunroof: true,
    group: 'GWM Cannon Alpha',
    name: 'GWM Cannon Alpha Vanta 3.0L diesel',
    body: ALPHA,
    limits: ALPHA_30D,
    tyre: { size: '265/55R19', loadIndex: 109 },
    typical: [...TUB, 'ute.kerbFrontPct'],
  },
  {
    id: 'alpha-lux-30d',
    group: 'GWM Cannon Alpha',
    name: 'GWM Cannon Alpha Lux 3.0L diesel',
    body: ALPHA,
    limits: ALPHA_30D,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  },
  {
    id: 'alpha-ultra-phev',
    sunroof: true,
    group: 'GWM Cannon Alpha',
    name: 'GWM Cannon Alpha Ultra PHEV',
    body: ALPHA,
    limits: ALPHA_PHEV,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  },
  {
    id: 'alpha-lux-phev',
    group: 'GWM Cannon Alpha',
    name: 'GWM Cannon Alpha Lux PHEV',
    body: ALPHA,
    limits: ALPHA_PHEV,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  },

  // Current Cannon range (brochure, 16/10/2026), including the axle loads at kerb weight.
  {
    id: 'cannon-xsr-24d',
    sunroof: true,
    group: 'GWM Cannon',
    name: 'GWM Cannon XSR 2.4L diesel',
    body: { ...CANNON, overallLength: 5439, overallWidth: 1958, overallHeight: 1893, kerbFrontPct: split(1345, 985) },
    limits: { gvm: 3205, gcm: 6300, frontAxle: 1585, rearAxle: 1850, kerb: 2330, tare: 2273, payload: 875, brakedTow: 3500, unbrakedTow: 750, towBallMax: 350 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-vanta-24d',
    sunroof: true,
    group: 'GWM Cannon',
    name: 'GWM Cannon Vanta 2.4L diesel',
    body: CANNON_24D_BODY,
    limits: CANNON_24D,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-ultra-24d',
    sunroof: true,
    group: 'GWM Cannon',
    name: 'GWM Cannon Ultra 2.4L diesel',
    body: CANNON_24D_BODY,
    limits: CANNON_24D,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-lux-24d',
    group: 'GWM Cannon',
    name: 'GWM Cannon Lux 2.4L diesel',
    body: CANNON_24D_BODY,
    limits: CANNON_24D,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },
  {
    // The tray is modelled as a low-sided tub. The brochure's axle loads at kerb add up to
    // the Premium's kerb weight rather than this one's, so the split is the dual cab's.
    id: 'cannon-lux-cc-24d',
    group: 'GWM Cannon',
    name: 'GWM Cannon Lux 2.4L diesel dual cab chassis',
    body: { ...CANNON, overallLength: 5531, overallWidth: 2043, overallHeight: 1997, tub: { length: 1730, width: 1895, depth: 250, floorHeight: 950 }, kerbFrontPct: split(1295, 935) },
    limits: { ...CANNON_24D, rearAxle: 1915 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex', 'ute.kerbFrontPct'],
  },
  {
    id: 'cannon-ultra-phev',
    sunroof: true,
    group: 'GWM Cannon',
    name: 'GWM Cannon Ultra PHEV',
    body: CANNON_PHEV_BODY,
    limits: { ...CANNON_PHEV, tare: 2530 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-lux-phev',
    group: 'GWM Cannon',
    name: 'GWM Cannon Lux PHEV',
    body: CANNON_PHEV_BODY,
    limits: CANNON_PHEV,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-premium-20d',
    group: 'GWM Cannon',
    name: 'GWM Cannon Premium 2.0L diesel',
    body: { ...CANNON, kerbFrontPct: split(1245, 895) },
    limits: { gvm: 3135, gcm: 5830, frontAxle: 1500, rearAxle: 1915, kerb: 2140, tare: 2083, payload: 995, brakedTow: 3200, unbrakedTow: 750, towBallMax: 320 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: ['ute.tyre.loadIndex'],
  },

  // Earlier GWM models, from spec listings. Axle limits, tare and tub sizes are typical
  // values from the closest current model.
  {
    id: 'alpha-ultra-24d',
    sunroof: true,
    group: 'Earlier GWM models',
    name: 'GWM Cannon Alpha Ultra 2.4L diesel',
    years: '2024–2026',
    body: ALPHA,
    limits: { ...ALPHA_30D, gvm: 3310, kerb: 2550, tare: 2458, payload: 760 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, ...AXLES, 'ute.limits.tare', 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  },
  {
    id: 'alpha-lux-24d',
    group: 'Earlier GWM models',
    name: 'GWM Cannon Alpha Lux 2.4L diesel',
    years: '2024–2026',
    body: ALPHA,
    limits: { ...ALPHA_30D, gvm: 3310, kerb: 2489, tare: 2397, payload: 821 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, ...AXLES, 'ute.limits.tare', 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  },
  {
    id: 'alpha-ultra-hybrid',
    sunroof: true,
    group: 'Earlier GWM models',
    name: 'GWM Cannon Alpha Ultra Hybrid 2.0L petrol',
    years: '2024–2025',
    body: ALPHA,
    limits: { ...ALPHA_30D, gvm: 3310, kerb: 2575, tare: 2483, payload: 735 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, ...AXLES, 'ute.limits.tare', 'ute.kerbFrontPct', 'ute.tyre.size', 'ute.tyre.loadIndex', 'ute.limits.towBallMax'],
  },
  {
    id: 'cannon-vanta-20d',
    group: 'Earlier GWM models',
    name: 'GWM Cannon Vanta 2.0L diesel',
    years: '2023–2024',
    body: CANNON,
    limits: CANNON_20D_EARLIER,
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: [...TUB, ...AXLES, ...OVERALL, 'ute.kerbFrontPct', 'ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-x-20d',
    group: 'Earlier GWM models',
    name: 'GWM Cannon-X 2.0L diesel',
    years: '2021–2024',
    body: CANNON,
    limits: CANNON_20D_EARLIER,
    tyre: { size: '265/65R17', loadIndex: 112 },
    typical: [...TUB, ...AXLES, ...OVERALL, 'ute.limits.tare', 'ute.limits.gcm', 'ute.limits.towBallMax', 'ute.kerbFrontPct', 'ute.tyre.size', 'ute.tyre.loadIndex'],
  },
  {
    id: 'cannon-l-20d',
    group: 'Earlier GWM models',
    name: 'GWM Cannon-L 2.0L diesel',
    years: '2021–2024',
    body: CANNON,
    limits: CANNON_20D_EARLIER,
    tyre: { size: '265/65R17', loadIndex: 112 },
    typical: [...TUB, ...AXLES, ...OVERALL, 'ute.limits.tare', 'ute.limits.towBallMax', 'ute.kerbFrontPct', 'ute.tyre.size', 'ute.tyre.loadIndex'],
  },
];

// Isuzu D-MAX crew cab utes and MU-X SUVs (25.5MY brochures). The cab chassis D-MAX are left
// out: their published kerb weight is without the tray. Isuzu gives the kerb weight with a
// full tank, so the tare (10 L of fuel) is taken as that less the rest of the diesel. For the
// D-MAX this matches the tare in Australian listings (carsales, trucksales: SX 4x4 crew cab
// ute 1,980 kg, crew cab chassis 1,855 to 1,860 kg); for the MU-X the only current listing
// is 2 kg off, so its tare stays a placeholder.

/** Isuzu's limits: payload is GVM less kerb weight; every model tows 3,500 kg braked with a 350 kg tow ball download. */
function isuzuLimits(gvm: number, gcm: number, kerb: number, tankL: number, frontAxle: number, rearAxle: number): UteLimits {
  const tare = kerb - Math.round((tankL - 10) * 0.835);
  return { gvm, gcm, frontAxle, rearAxle, kerb, tare, payload: gvm - kerb, brakedTow: 3500, unbrakedTow: 750, towBallMax: 350 };
}

const DMAX: Body = {
  bodyStyle: 'ute',
  wheelbase: 3125,
  trackFront: 1570,
  trackRear: 1570,
  overallLength: 5280,
  overallWidth: 1870,
  overallHeight: 1785,
  frontOverhang: 905,
  tub: { length: 1570, width: 1530, depth: 490, floorHeight: 850 },
  kerbFrontPct: 58,
};

const MUX: Body = {
  bodyStyle: 'suv',
  wheelbase: 2855,
  trackFront: 1570,
  trackRear: 1570,
  overallLength: 4860,
  overallWidth: 1870,
  overallHeight: 1825,
  frontOverhang: 905,
  // Drawn as a five seater with the third row folded flat. The cargo floor is not given in mm.
  tub: { length: 1100, width: 1300, depth: 850, floorHeight: 830 },
  kerbFrontPct: 52,
};

// Tyre load indexes are not in the brochures. 255/65R17 110 is Michelin's fitment for the D-MAX SX.
// 265/60R18 110 (one listing says 112, so 110 errs low), 265/50R20 107 and the BLADE's Goodyear
// Wrangler DuraTrac RT 275/65R17 121 are what those tyres are made with, so they stay placeholders.
const R17 = { size: '255/65R17', loadIndex: 110 };
const R18 = { size: '265/60R18', loadIndex: 110 };
const R20 = { size: '265/50R20', loadIndex: 107 };
const R17_BLADE = { size: '275/65R17', loadIndex: 121 };
const loadIndexTypical = (tyre: Def['tyre']) => (tyre === R17 ? [] : ['ute.tyre.loadIndex']);

type Drive = '4x2' | '4x4';

// The brochures give the front axle rating with the 4x4's driven front axle.
const dmax = (id: string, name: string, drive: Drive, kerb: number, body: Partial<Body>, tyre: Def['tyre']): Def => ({
  id,
  group: 'Isuzu D-MAX',
  name: `Isuzu D-MAX ${name} ${drive}`,
  body: { ...DMAX, ...body },
  limits: drive === '4x4' ? isuzuLimits(3100, 6000, kerb, 76, 1450, 1910) : isuzuLimits(3000, 5850, kerb, 76, 1450, 1910),
  tyre,
  typical: [...loadIndexTypical(tyre), ...(drive === '4x2' ? ['ute.limits.frontAxle'] : [])],
});

const mux = (id: string, name: string, drive: Drive, kerb: number, body: Partial<Body>, tyre: Def['tyre']): Def => ({
  id,
  group: 'Isuzu MU-X',
  name: `Isuzu MU-X ${name} ${drive}`,
  body: { ...MUX, ...body },
  limits: isuzuLimits(drive === '4x4' ? 2800 : 2700, 5900, kerb, 80, 1450, 1650),
  tyre,
  typical: [...TUB, 'ute.limits.tare', ...loadIndexTypical(tyre), ...(drive === '4x2' ? ['ute.limits.frontAxle'] : [])],
});

const LS_U: Partial<Body> = { overallLength: 5285, overallHeight: 1790 };
const X_RIDER: Partial<Body> = { overallLength: 5305, frontOverhang: 930 };
const LS_M: Partial<Body> = { overallHeight: 1815 };

const ISUZU: Def[] = [
  dmax('dmax-sx-22d-4x2', 'SX 2.2L diesel', '4x2', 1895, {}, R17),
  dmax('dmax-sx-30d-4x2', 'SX 3.0L diesel', '4x2', 1950, {}, R17),
  dmax('dmax-lsu-30d-4x2', 'LS-U 3.0L diesel', '4x2', 2015, LS_U, R18),
  dmax('dmax-sx-22d', 'SX 2.2L diesel', '4x4', 1980, {}, R17),
  dmax('dmax-sx-30d', 'SX 3.0L diesel', '4x4', 2035, {}, R17),
  dmax('dmax-xrider-22d', 'X-RIDER 2.2L diesel', '4x4', 2010, X_RIDER, R17),
  dmax('dmax-xrider-30d', 'X-RIDER 3.0L diesel', '4x4', 2060, X_RIDER, R17),
  dmax('dmax-lsu-30d', 'LS-U 3.0L diesel', '4x4', 2105, LS_U, R18),
  dmax('dmax-lsu-plus-30d', 'LS-U+ 3.0L diesel', '4x4', 2105, LS_U, R18),
  dmax('dmax-xterrain-30d', 'X-TERRAIN 3.0L diesel', '4x4', 2170, { overallLength: 5310, overallWidth: 1880, overallHeight: 1810, frontOverhang: 930 }, R18),
  dmax(
    'dmax-blade-30d',
    'BLADE 3.0L diesel',
    '4x4',
    2204,
    { overallLength: 5308, overallWidth: 1910, overallHeight: 1810, frontOverhang: 928, trackFront: 1602, trackRear: 1602 },
    R17_BLADE,
  ),
  mux('mux-lsm-22d-4x2', 'LS-M 2.2L diesel', '4x2', 1995, LS_M, R17),
  mux('mux-lsm-22d', 'LS-M 2.2L diesel', '4x4', 2085, LS_M, R17),
  mux('mux-lsm-30d', 'LS-M 3.0L diesel', '4x4', 2140, LS_M, R17),
  mux('mux-lsu-22d', 'LS-U 2.2L diesel', '4x4', 2105, {}, R18),
  mux('mux-lsu-30d', 'LS-U 3.0L diesel', '4x4', 2160, {}, R18),
  mux('mux-lst-22d', 'LS-T 2.2L diesel', '4x4', 2130, {}, R20),
  mux('mux-lst-30d', 'LS-T 3.0L diesel', '4x4', 2185, {}, R20),
  mux('mux-xterrain-30d', 'X-TERRAIN 3.0L diesel', '4x4', 2195, {}, R20),
];

// 2009 Toyota HiAce LWB panel van (H200): 2,570 mm wheelbase, low roof. GVM 2,800 kg and 1,400 kg
// braked towing are in every listing; the petrol's tare and kerb weight are from carsales. The
// diesel's kerb weight and GCM come from a GoAuto review of a later year, so they stay typical, and
// its tare allows for 60 L of diesel below the full tank. Track, front overhang, the cargo area, the
// kerb weight split, axle ratings, tyre load index, ball download and the petrol's GCM are typical.
const HIACE: Body = {
  bodyStyle: 'van',
  wheelbase: 2570,
  trackFront: 1470,
  trackRear: 1460,
  overallLength: 4695,
  overallWidth: 1695,
  overallHeight: 1980,
  frontOverhang: 935,
  // The cargo area behind the front seats: floor length, width and inside height.
  tub: { length: 2900, width: 1520, depth: 1320, floorHeight: 620 },
  kerbFrontPct: 54,
};
const HIACE_TYRE = { size: '195/70R15C', loadIndex: 104 };
const hiaceLimits = (kerb: number, tare: number, gcm: number): UteLimits => ({
  gvm: 2800,
  gcm,
  frontAxle: 1350,
  rearAxle: 1800,
  kerb,
  tare,
  payload: 2800 - kerb,
  brakedTow: 1400,
  unbrakedTow: 400,
  towBallMax: 140,
});

const TOYOTA: Def[] = [
  {
    id: 'hiace-lwb-27p-2009',
    group: 'Toyota HiAce',
    name: 'Toyota HiAce LWB van 2.7L petrol',
    years: '2009',
    body: HIACE,
    limits: hiaceLimits(1665, 1620, 4200),
    tyre: HIACE_TYRE,
    typical: ['ute.limits.gcm', 'ute.limits.unbrakedTow'],
  },
  {
    id: 'hiace-lwb-30d-2009',
    group: 'Toyota HiAce',
    name: 'Toyota HiAce LWB van 3.0L diesel',
    years: '2009',
    body: HIACE,
    limits: hiaceLimits(1905, 1855, 3800),
    tyre: HIACE_TYRE,
    typical: ['ute.limits.kerb', 'ute.limits.tare', 'ute.limits.payload', 'ute.limits.gcm'],
  },
];

// Ford utes in Australia: the Ranger dual cab pick-up, Raptor, PHEV and Super Duty, and the
// remanufactured right-hand drive F-150. Figures are from Australian spec listings and launch
// coverage (carsales, CarExpert, CarsGuide, Drive, 4X4 Australia, Caravan World, Carsauce);
// payload is GVM less kerb weight, as for every model here. Ford's spec sheets were not
// reachable, so axle ratings, tare and the kerb weights no listing agreed on are typical.
const RANGER: Body = {
  bodyStyle: 'ute',
  wheelbase: 3270,
  trackFront: 1620,
  trackRear: 1620,
  overallLength: 5370,
  overallWidth: 1918,
  overallHeight: 1884,
  frontOverhang: 950,
  tub: { length: 1564, width: 1584, depth: 528, floorHeight: 840 },
  kerbFrontPct: 56,
};
const RAPTOR: Body = { ...RANGER, trackFront: 1710, trackRear: 1710, overallLength: 5360, overallWidth: 2028, overallHeight: 1926, tub: { ...RANGER.tub, floorHeight: 900 } };
const SUPER_DUTY: Body = { ...RANGER, trackFront: 1710, trackRear: 1710, overallLength: 5470, overallWidth: 2000, overallHeight: 1985, tub: { ...RANGER.tub, floorHeight: 900 }, kerbFrontPct: 55 };
const F150 = (wheelbase: number, length: number, box: number): Body => ({
  bodyStyle: 'ute',
  wheelbase,
  trackFront: 1745,
  trackRear: 1745,
  overallLength: length,
  overallWidth: 2030,
  overallHeight: 1960,
  frontOverhang: 980,
  tub: { length: box, width: 1656, depth: 544, floorHeight: 900 },
  kerbFrontPct: 57,
});

const rangerLimits = (gvm: number, gcm: number, kerb: number, tare: number, frontAxle: number, rearAxle: number, brakedTow = 3500, towBallMax = 350): UteLimits => ({
  gvm,
  gcm,
  frontAxle,
  rearAxle,
  kerb,
  tare,
  payload: gvm - kerb,
  brakedTow,
  unbrakedTow: 750,
  towBallMax,
});
const R18_RANGER = { size: '255/65R18', loadIndex: 111 };
const R20_RANGER = { size: '255/60R20', loadIndex: 113 };
const AXLES_TYPICAL = ['ute.limits.frontAxle', 'ute.limits.rearAxle'];

// F-150 (2025 update): GVM/GCM 3,315/7,365 kg short and 3,360/7,410 kg long wheelbase, payloads by
// grade from Carsauce and 4X4 Australia, so the kerb weight is GVM less payload. 4,500 kg braked with
// the 70 mm ball, 450 kg on the ball (carsales).
const f150 = (id: string, grade: string, lwb: boolean, payload: number, tyre: Def['tyre']): Def => {
  const gvm = lwb ? 3360 : 3315;
  return {
    id,
    group: 'Ford F-150',
    name: `Ford F-150 ${grade} ${lwb ? 'LWB' : 'SWB'}`,
    body: lwb ? F150(3987, 6184, 1981) : F150(3683, 5884, 1676),
    limits: { gvm, gcm: lwb ? 7410 : 7365, frontAxle: 1700, rearAxle: 2000, kerb: gvm - payload, tare: gvm - payload - 85, payload, brakedTow: 4500, unbrakedTow: 750, towBallMax: 450 },
    tyre,
    typical: [...AXLES_TYPICAL, 'ute.limits.tare', 'ute.overallHeight', 'ute.overallWidth'],
  };
};

const FORD: Def[] = [
  {
    id: 'ranger-xlt-20bt',
    group: 'Ford Ranger',
    name: 'Ford Ranger XLT 2.0L bi-turbo 4x4',
    // carsales: tare 2,212, kerb 2,360, GVM 3,230, GCM 6,350 kg. Axle ratings as listed for the bi-turbo Wildtrak.
    body: RANGER,
    limits: rangerLimits(3230, 6350, 2360, 2212, 1490, 1959),
    tyre: R18_RANGER,
    typical: AXLES_TYPICAL,
  },
  {
    id: 'ranger-wildtrak-20bt',
    group: 'Ford Ranger',
    name: 'Ford Ranger Wildtrak 2.0L bi-turbo 4x4',
    // carsales: GVM 3,280, GCM 6,350, kerb 2,360 kg; front 1,490 and rear 1,959 kg axles.
    body: RANGER,
    limits: rangerLimits(3280, 6350, 2360, 2212, 1490, 1959),
    tyre: R20_RANGER,
    typical: ['ute.limits.tare'],
  },
  {
    id: 'ranger-xlt-v6',
    group: 'Ford Ranger',
    name: 'Ford Ranger XLT 3.0L V6 4x4',
    // GVM 3,350 and GCM 6,400 kg as for every V6; no listing agreed on the XLT V6's kerb weight.
    body: RANGER,
    limits: rangerLimits(3350, 6400, 2390, 2300, 1550, 1959),
    tyre: R18_RANGER,
    typical: [...AXLES_TYPICAL, 'ute.limits.kerb', 'ute.limits.tare', 'ute.limits.payload'],
  },
  {
    id: 'ranger-wildtrak-v6',
    group: 'Ford Ranger',
    name: 'Ford Ranger Wildtrak 3.0L V6 4x4',
    // GVM 3,350, GCM 6,400, kerb 2,427 kg, so 923 kg payload (The Beep's Wildtrak V6 review).
    body: RANGER,
    limits: rangerLimits(3350, 6400, 2427, 2335, 1550, 1959),
    tyre: R20_RANGER,
    typical: [...AXLES_TYPICAL, 'ute.limits.tare'],
  },
  {
    id: 'ranger-platinum-v6',
    group: 'Ford Ranger',
    name: 'Ford Ranger Platinum 3.0L V6 4x4',
    // carsales: tare 2,325, kerb 2,416, GVM 3,350, GCM 6,400 kg.
    body: RANGER,
    limits: rangerLimits(3350, 6400, 2416, 2325, 1550, 1959),
    tyre: R20_RANGER,
    typical: AXLES_TYPICAL,
  },
  {
    id: 'ranger-raptor',
    group: 'Ford Ranger',
    name: 'Ford Ranger Raptor 3.0L V6 petrol',
    // CarExpert: kerb 2,413, GVM 3,130, GCM 5,370 kg; 2,500 kg braked. 285/70R17 all-terrains.
    body: RAPTOR,
    limits: rangerLimits(3130, 5370, 2413, 2360, 1500, 1800, 2500, 250),
    tyre: { size: '285/70R17', loadIndex: 121 },
    typical: [...AXLES_TYPICAL, 'ute.limits.tare', 'ute.limits.towBallMax'],
  },
  {
    id: 'ranger-phev-xlt',
    group: 'Ford Ranger',
    name: 'Ford Ranger XLT PHEV',
    // Ford: GVM 3,500, GCM 6,580 kg, 3,500 kg braked; payload 973 kg at the XLT's minimum kerb weight.
    body: RANGER,
    limits: rangerLimits(3500, 6580, 2527, 2497, 1600, 2100),
    tyre: R18_RANGER,
    typical: [...AXLES_TYPICAL, 'ute.limits.tare', 'ute.limits.towBallMax'],
  },
  {
    id: 'ranger-phev-wildtrak',
    group: 'Ford Ranger',
    name: 'Ford Ranger Wildtrak PHEV',
    // Ford: payload 885 kg at minimum kerb weight.
    body: RANGER,
    limits: rangerLimits(3500, 6580, 2615, 2585, 1600, 2100),
    tyre: R20_RANGER,
    typical: [...AXLES_TYPICAL, 'ute.limits.tare', 'ute.limits.towBallMax'],
  },
  {
    id: 'ranger-super-duty-pickup',
    group: 'Ford Ranger',
    name: 'Ford Ranger Super Duty XLT double cab pick-up',
    // GVM 4,500, GCM 8,000 kg, 4,500 kg braked; the pick-up's payload is 1,697 kg. 3,270 mm wheelbase,
    // 1,710 mm track, 275/70R18 tyres.
    body: SUPER_DUTY,
    limits: rangerLimits(4500, 8000, 2803, 2700, 1800, 3000, 4500, 450),
    tyre: { size: '275/70R18', loadIndex: 125 },
    typical: [...AXLES_TYPICAL, 'ute.limits.tare', 'ute.limits.towBallMax', 'ute.overallLength', 'ute.overallWidth'],
  },
  f150('f150-xlt-swb', 'XLT', false, 853, { size: '275/65R18', loadIndex: 116 }),
  f150('f150-xlt-lwb', 'XLT', true, 878, { size: '275/65R18', loadIndex: 116 }),
  f150('f150-lariat-swb', 'Lariat', false, 769, { size: '275/60R20', loadIndex: 115 }),
  f150('f150-lariat-lwb', 'Lariat', true, 794, { size: '275/60R20', loadIndex: 115 }),
  f150('f150-platinum-swb', 'Platinum', false, 704, { size: '275/60R20', loadIndex: 115 }),
  f150('f150-platinum-lwb', 'Platinum', true, 724, { size: '275/60R20', loadIndex: 115 }),
];

// BYD in Australia: the Shark 6 plug-in hybrid ute and three SUVs. Figures from BYD Australia's
// press material as reported (Auto International, The Driven, Drive, The Beep) and CarExpert,
// CarsGuide and AEVA listings. The electric Atto 3 and Sealion 7 carry no fuel, so their tare is
// their kerb weight.
const SHARK: Body = {
  bodyStyle: 'ute',
  wheelbase: 3260,
  trackFront: 1660,
  trackRear: 1660,
  overallLength: 5457,
  overallWidth: 1971,
  overallHeight: 1925,
  frontOverhang: 1000,
  tub: { length: 1500, width: 1520, depth: 517, floorHeight: 920 },
  kerbFrontPct: 52,
};
const SHARK_TYRE = { size: '265/65R18', loadIndex: 114 };

const suv = (wheelbase: number, length: number, width: number, height: number, frontOverhang: number, track: number, tub: Body['tub'], kerbFrontPct: number): Body => ({
  bodyStyle: 'suv',
  wheelbase,
  trackFront: track,
  trackRear: track,
  overallLength: length,
  overallWidth: width,
  overallHeight: height,
  frontOverhang,
  tub,
  kerbFrontPct,
});
const ATTO3 = suv(2720, 4455, 1875, 1615, 880, 1575, { length: 900, width: 1100, depth: 750, floorHeight: 760 }, 50);
const SEALION6 = suv(2765, 4775, 1890, 1670, 950, 1620, { length: 1000, width: 1150, depth: 780, floorHeight: 800 }, 54);
const SEALION7 = suv(2930, 4830, 1925, 1620, 940, 1630, { length: 1050, width: 1200, depth: 720, floorHeight: 780 }, 48);

const BYD: Def[] = [
  {
    id: 'shark6-premium',
    group: 'BYD Shark 6',
    name: 'BYD Shark 6 Premium',
    // Kerb 2,710, GVM 3,500, GCM 5,750 kg, 790 kg payload; 2,500 kg braked, 250 kg on the ball;
    // axles 1,651 front and 1,927 kg rear (BYD Australia).
    body: SHARK,
    limits: { gvm: 3500, gcm: 5750, frontAxle: 1651, rearAxle: 1927, kerb: 2710, tare: 2675, payload: 790, brakedTow: 2500, unbrakedTow: 750, towBallMax: 250 },
    tyre: SHARK_TYRE,
    typical: ['ute.limits.tare'],
  },
  {
    id: 'shark6-performance',
    group: 'BYD Shark 6',
    name: 'BYD Shark 6 Performance',
    years: '2026',
    // 2026 addition: 3,500 kg braked, GCM 6,650 kg, 350 kg on the ball, rear axle 1,900 kg. The Beep
    // gives a 2,775 kg kerb weight; payload figures disagree.
    body: SHARK,
    limits: { gvm: 3500, gcm: 6650, frontAxle: 1651, rearAxle: 1900, kerb: 2775, tare: 2740, payload: 725, brakedTow: 3500, unbrakedTow: 750, towBallMax: 350 },
    tyre: SHARK_TYRE,
    typical: ['ute.limits.frontAxle', 'ute.limits.kerb', 'ute.limits.tare', 'ute.limits.payload'],
  },
  {
    id: 'atto3-standard',
    group: 'BYD SUVs',
    name: 'BYD Atto 3 Standard Range',
    years: '2022–2025',
    // Kerb 1,680, GVM 2,090 kg; 750 kg braked, 700 kg unbraked.
    body: ATTO3,
    limits: { gvm: 2090, gcm: 2840, frontAxle: 1150, rearAxle: 1050, kerb: 1680, tare: 1680, payload: 410, brakedTow: 750, unbrakedTow: 700, towBallMax: 75 },
    tyre: { size: '215/55R18', loadIndex: 95 },
    typical: [...AXLES_TYPICAL, 'ute.limits.gcm', 'ute.limits.towBallMax'],
  },
  {
    id: 'atto3-extended',
    group: 'BYD SUVs',
    name: 'BYD Atto 3 Extended Range',
    years: '2022–2025',
    // Kerb 1,750, GVM 2,160 kg; 750 kg braked, 700 kg unbraked.
    body: ATTO3,
    limits: { gvm: 2160, gcm: 2910, frontAxle: 1150, rearAxle: 1050, kerb: 1750, tare: 1750, payload: 410, brakedTow: 750, unbrakedTow: 700, towBallMax: 75 },
    tyre: { size: '215/55R18', loadIndex: 95 },
    typical: [...AXLES_TYPICAL, 'ute.limits.gcm', 'ute.limits.towBallMax'],
  },
  {
    id: 'sealion6-dynamic',
    group: 'BYD SUVs',
    name: 'BYD Sealion 6 Dynamic',
    // Kerb 1,940 kg; 750 kg braked and unbraked.
    body: SEALION6,
    limits: { gvm: 2350, gcm: 3100, frontAxle: 1250, rearAxle: 1200, kerb: 1940, tare: 1905, payload: 410, brakedTow: 750, unbrakedTow: 750, towBallMax: 75 },
    tyre: { size: '235/50R19', loadIndex: 99 },
    typical: [...AXLES_TYPICAL, 'ute.limits.gvm', 'ute.limits.gcm', 'ute.limits.tare', 'ute.limits.payload', 'ute.limits.towBallMax'],
  },
  {
    id: 'sealion6-premium',
    group: 'BYD SUVs',
    name: 'BYD Sealion 6 Premium AWD',
    // Kerb 2,100, tare 2,065, GVM 2,510 kg; 1,300 kg braked, 750 kg unbraked.
    body: SEALION6,
    limits: { gvm: 2510, gcm: 3810, frontAxle: 1300, rearAxle: 1300, kerb: 2100, tare: 2065, payload: 410, brakedTow: 1300, unbrakedTow: 750, towBallMax: 130 },
    tyre: { size: '235/50R19', loadIndex: 99 },
    typical: [...AXLES_TYPICAL, 'ute.limits.gcm', 'ute.limits.towBallMax'],
  },
  {
    id: 'sealion7-premium',
    group: 'BYD SUVs',
    name: 'BYD Sealion 7 Premium RWD',
    // Kerb 2,225, GVM 2,635 kg; 750 kg braked and unbraked; 75 kg trailer nose weight.
    body: SEALION7,
    limits: { gvm: 2635, gcm: 3385, frontAxle: 1250, rearAxle: 1450, kerb: 2225, tare: 2225, payload: 410, brakedTow: 750, unbrakedTow: 750, towBallMax: 75 },
    tyre: { size: '255/45R19', loadIndex: 104 },
    typical: [...AXLES_TYPICAL, 'ute.limits.gcm'],
  },
  {
    id: 'sealion7-performance',
    group: 'BYD SUVs',
    name: 'BYD Sealion 7 Performance AWD',
    // Kerb 2,340, GVM 2,750 kg; 1,500 kg braked, 750 kg unbraked; 150 kg trailer nose weight.
    body: SEALION7,
    limits: { gvm: 2750, gcm: 4250, frontAxle: 1300, rearAxle: 1500, kerb: 2340, tare: 2340, payload: 410, brakedTow: 1500, unbrakedTow: 750, towBallMax: 150 },
    tyre: { size: '255/45R19', loadIndex: 104 },
    typical: [...AXLES_TYPICAL, 'ute.limits.gcm'],
  },
];

// For any other make: round figures typical of a mid-size 4x4 diesel dual cab ute (Hilux, Ranger,
// BT-50, Triton class) and of a large five-seat SUV that tows, all placeholders for the placard's.
const GENERIC: Def[] = [
  {
    id: 'generic-ute',
    group: 'Other makes',
    name: 'Generic dual cab ute',
    body: {
      bodyStyle: 'ute',
      wheelbase: 3220,
      trackFront: 1600,
      trackRear: 1600,
      overallLength: 5350,
      overallWidth: 1900,
      overallHeight: 1850,
      frontOverhang: 920,
      tub: { length: 1550, width: 1530, depth: 500, floorHeight: 850 },
      kerbFrontPct: 57,
    },
    limits: { gvm: 3200, gcm: 6000, frontAxle: 1500, rearAxle: 1950, kerb: 2200, tare: 2140, payload: 1000, brakedTow: 3500, unbrakedTow: 750, towBallMax: 350 },
    tyre: { size: '265/65R17', loadIndex: 112 },
    typical: EVERYTHING,
  },
  {
    id: 'generic-car',
    group: 'Other makes',
    name: 'Generic car (5-seat SUV)',
    body: {
      bodyStyle: 'suv',
      wheelbase: 2850,
      trackFront: 1600,
      trackRear: 1600,
      overallLength: 4850,
      overallWidth: 1900,
      overallHeight: 1800,
      frontOverhang: 900,
      tub: { length: 1050, width: 1250, depth: 800, floorHeight: 800 },
      kerbFrontPct: 53,
    },
    limits: { gvm: 2750, gcm: 5500, frontAxle: 1350, rearAxle: 1600, kerb: 2100, tare: 2040, payload: 650, brakedTow: 3000, unbrakedTow: 750, towBallMax: 300 },
    tyre: { size: '265/60R18', loadIndex: 110 },
    typical: EVERYTHING,
  },
];

export const VEHICLES: VehicleModel[] = [...BYD, ...FORD, ...DEFS, ...ISUZU, ...TOYOTA, ...GENERIC].map((d) => ({
  id: d.id,
  make: MAKE[makeOf(d.group)],
  group: d.group,
  label: d.name.replace(/^(BYD|Ford|GWM|Isuzu|Toyota) /, '') + (d.years ? ` (${d.years})` : ''),
  spec: () => ({
    model: d.id,
    name: d.name,
    ...structuredClone(d.body),
    tyre: { size: d.tyre.size, loadIndex: d.tyre.loadIndex, loadKg: null },
    limits: { ...d.limits },
    sunroof: !!d.sunroof,
  }),
  placeholders: [...new Set([...UNPUBLISHED[makeOf(d.group)], ...d.typical])],
}));

/** Makes in picker order, as shown. */
export const VEHICLE_MAKES: { make: VehicleMake; label: string }[] = [
  { make: 'BYD', label: 'BYD' },
  { make: 'Ford', label: 'Ford' },
  { make: 'GWM', label: 'GWM' },
  { make: 'Isuzu', label: 'Isuzu' },
  { make: 'Toyota', label: 'Toyota' },
  { make: 'Other', label: 'Other make (generic)' },
];

export const VEHICLE_GROUPS: VehicleGroup[] = ['BYD Shark 6', 'BYD SUVs', 'Ford Ranger', 'Ford F-150', 'GWM Cannon Alpha', 'GWM Cannon', 'Earlier GWM models', 'Isuzu D-MAX', 'Isuzu MU-X', 'Toyota HiAce', 'Other makes'];

export function vehicleModel(id: string): VehicleModel {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES.find((v) => v.id === DEFAULT_VEHICLE)!;
}
