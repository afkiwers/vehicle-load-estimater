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
  | 'Toyota HiLux'
  | 'Toyota Tundra'
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
  // CarExpert's pages give neither the tub (or cargo floor) nor how the kerb weight splits.
  Ford: ['ute.tub.length', 'ute.tub.width', 'ute.tub.depth', 'ute.tub.floorHeight', 'ute.kerbFrontPct'],
  BYD: ['ute.tub.length', 'ute.tub.width', 'ute.tub.depth', 'ute.tub.floorHeight', 'ute.kerbFrontPct'],
  GWM: ['ute.trackFront', 'ute.trackRear', 'ute.frontOverhang', 'ute.tub.floorHeight'],
  Isuzu: ['ute.tub.floorHeight', 'ute.kerbFrontPct'],
  Toyota: ['ute.tub.length', 'ute.tub.width', 'ute.tub.depth', 'ute.tub.floorHeight', 'ute.kerbFrontPct'],
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

/** [GVM, GCM, front axle, rear axle, kerb, tare, braked tow, unbraked tow, tow ball] in kg. */
type Ratings = [number, number, number, number, number, number, number, number, number];

const ratings = ([gvm, gcm, frontAxle, rearAxle, kerb, tare, brakedTow, unbrakedTow, towBallMax]: Ratings): UteLimits => ({
  gvm,
  gcm,
  frontAxle,
  rearAxle,
  kerb,
  tare,
  payload: gvm - kerb,
  brakedTow,
  unbrakedTow,
  towBallMax,
});

/** The 2009 HiAce figures not in the listings it comes from. */
const HIACE_TYPICAL = ['ute.trackFront', 'ute.trackRear', 'ute.frontOverhang', 'ute.tyre.loadIndex', 'ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax'];

// Toyota utes in Australia: every HiLux dual cab pick-up, including the electric SR and SR5, and the
// remanufactured right-hand drive Tundra. Figures are CarExpert's specification pages for the current
// model year: kerb and tare weight, GVM, GCM, payload, towing, dimensions, track, front overhang and
// tyres as published, with the axle ratings where given (the 4x2s and the Tundra). Toyota's tow ball
// download is not on those pages, so it is typical (a tenth of the braked towing), as are the other
// axle ratings, the electric HiLux's and the Tundra's GCM, and the tub and kerb weight split.
const hilux = (id: string, grade: string, z: { W: number; H: number; track: [number, number]; fo: number }, r: Ratings, tyre: Def['tyre'], typical: string[]): Def => ({
  id,
  group: 'Toyota HiLux',
  name: `Toyota HiLux ${grade}`,
  body: {
    bodyStyle: 'ute',
    wheelbase: 3085,
    trackFront: z.track[0],
    trackRear: z.track[1],
    overallLength: 5320,
    overallWidth: z.W,
    overallHeight: z.H,
    frontOverhang: z.fo,
    tub: { length: 1555, width: 1540, depth: 480, floorHeight: 850 },
    kerbFrontPct: 57,
  },
  limits: ratings(r),
  tyre,
  typical,
});

const tundra = (id: string, grade: string): Def => ({
  id,
  group: 'Toyota Tundra',
  name: `Toyota Tundra ${grade}`,
  body: {
    bodyStyle: 'ute',
    wheelbase: 3700,
    trackFront: 1737,
    trackRear: 1737,
    overallLength: 5955,
    overallWidth: 2040,
    overallHeight: 1985,
    frontOverhang: 990,
    tub: { length: 1670, width: 1600, depth: 530, floorHeight: 950 },
    kerbFrontPct: 56,
  },
  // CarExpert: kerb 2,778, tare 2,694, GVM 3,536 kg, axles 1,850 kg each, 4,500 kg braked. No GCM.
  limits: ratings([3536, 8000, 1850, 1850, 2778, 2694, 4500, 750, 450]),
  tyre: { size: '265/60R20', loadIndex: 115 },
  typical: ['ute.limits.gcm', 'ute.limits.towBallMax', 'ute.frontOverhang', 'ute.tyre.loadIndex'],
});

const TOYOTA: Def[] = [
  hilux('hilux-workmate-4x2', 'WorkMate 2.8L diesel 4x2', { W: 1855, H: 1865, track: [1530, 1550], fo: 990 }, [2980, 5870, 1480, 1700, 2035, 1976, 2900, 750, 290], { size: '265/65R17', loadIndex: 112 }, ['ute.limits.towBallMax']),
  hilux('hilux-workmate-4x4', 'WorkMate 2.8L diesel 4x4', { W: 1855, H: 1875, track: [1530, 1550], fo: 990 }, [3500, 6300, 1600, 2050, 2105, 2045, 3500, 750, 350], { size: '265/65R17', loadIndex: 112 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax']),
  hilux('hilux-sr-4x2', 'SR 2.8L diesel 4x2', { W: 1855, H: 1865, track: [1530, 1550], fo: 990 }, [2980, 5880, 1480, 1700, 2045, 1986, 2900, 750, 290], { size: '265/65R17', loadIndex: 112 }, ['ute.limits.towBallMax']),
  hilux('hilux-sr-4x4', 'SR 2.8L diesel 4x4', { W: 1855, H: 1875, track: [1530, 1550], fo: 990 }, [3500, 6300, 1600, 2050, 2125, 2065, 3500, 750, 350], { size: '265/65R17', loadIndex: 112 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax']),
  hilux('hilux-sr-electric', 'SR electric', { W: 1855, H: 1845, track: [1530, 1550], fo: 990 }, [3145, 5145, 1500, 1900, 2420, 2420, 2000, 750, 200], { size: '265/65R17', loadIndex: 112 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax', 'ute.limits.gcm', 'ute.tyre.loadIndex']),
  hilux('hilux-sr5-4x4', 'SR5 2.8L diesel 4x4', { W: 1885, H: 1870, track: [1530, 1555], fo: 990 }, [3120, 6300, 1500, 1900, 2163, 2103, 3500, 750, 350], { size: '265/60R18', loadIndex: 110 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax']),
  hilux('hilux-sr5-4x4-manual', 'SR5 2.8L diesel 4x4 manual', { W: 1885, H: 1865, track: [1530, 1555], fo: 990 }, [3080, 6300, 1500, 1900, 2110, 2051, 3500, 750, 350], { size: '265/60R18', loadIndex: 110 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax']),
  hilux('hilux-sr5-electric', 'SR5 electric', { W: 1855, H: 1845, track: [1530, 1550], fo: 990 }, [3170, 5170, 1500, 1900, 2455, 2455, 2000, 750, 200], { size: '265/65R17', loadIndex: 112 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax', 'ute.limits.gcm', 'ute.tyre.loadIndex']),
  hilux('hilux-rogue', 'Rogue 2.8L diesel 4x4', { W: 1885, H: 1848, track: [1530, 1555], fo: 990 }, [3120, 6300, 1500, 1900, 2342, 2283, 3500, 750, 350], { size: '265/60R18', loadIndex: 110 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax']),
  hilux('hilux-rugged-x', 'Rugged X 2.8L diesel 4x4', { W: 1855, H: 1849, track: [1530, 1555], fo: 992 }, [3120, 6300, 1500, 1900, 2327, 2268, 3500, 750, 350], { size: '265/60R18', loadIndex: 110 }, ['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax']),
  tundra('tundra-limited', 'Limited'),
  tundra('tundra-platinum', 'Platinum'),
  {
    id: 'hiace-lwb-27p-2009',
    group: 'Toyota HiAce',
    name: 'Toyota HiAce LWB van 2.7L petrol',
    years: '2009',
    body: HIACE,
    limits: hiaceLimits(1665, 1620, 4200),
    tyre: HIACE_TYRE,
    typical: [...HIACE_TYPICAL, 'ute.limits.gcm', 'ute.limits.unbrakedTow'],
  },
  {
    id: 'hiace-lwb-30d-2009',
    group: 'Toyota HiAce',
    name: 'Toyota HiAce LWB van 3.0L diesel',
    years: '2009',
    body: HIACE,
    limits: hiaceLimits(1905, 1855, 3800),
    tyre: HIACE_TYRE,
    typical: [...HIACE_TYPICAL, 'ute.limits.kerb', 'ute.limits.tare', 'ute.limits.payload', 'ute.limits.gcm'],
  },
];

// Ford utes in Australia: every Ranger dual cab pick-up, and the remanufactured right-hand drive
// F-150. Figures are CarExpert's specification pages for the current model year (dated 1 September
// 2026): kerb and tare weight, GVM, GCM, payload, both axle ratings, towing, dimensions, track,
// front overhang and tyres are as published there. Ford does not publish the tow ball download on
// those pages, so it is typical, as are the tub and the kerb weight split.
type Size = { L: number; W: number; H: number; track: [number, number]; fo: number; floor: number };
const ranger = (id: string, grade: string, z: Size, r: Ratings, tyre: Def['tyre']): Def => ({
  id,
  group: 'Ford Ranger',
  name: `Ford Ranger ${grade}`,
  body: {
    bodyStyle: 'ute',
    wheelbase: 3270,
    trackFront: z.track[0],
    trackRear: z.track[1],
    overallLength: z.L,
    overallWidth: z.W,
    overallHeight: z.H,
    frontOverhang: z.fo,
    tub: { length: 1564, width: 1584, depth: 528, floorHeight: z.floor },
    kerbFrontPct: 56,
  },
  limits: ratings(r),
  tyre,
  typical: ['ute.limits.towBallMax'],
});

/** The F-150's GVM, GCM, axle ratings, kerb and tare weight (kg); 4,500 kg braked with the 70 mm ball. */
const f150 = (id: string, grade: string, z: { L: number; wb: number; box: number }, r: [number, number, number, number, number, number], size: string): Def => ({
  id,
  group: 'Ford F-150',
  name: `Ford F-150 ${grade}`,
  body: {
    bodyStyle: 'ute',
    wheelbase: z.wb,
    trackFront: 1725,
    trackRear: 1736,
    overallLength: z.L,
    overallWidth: 2030,
    overallHeight: 1995,
    frontOverhang: 955,
    tub: { length: z.box, width: 1656, depth: 544, floorHeight: 900 },
    kerbFrontPct: 57,
  },
  // carsales gives 450 kg on the ball; the unbraked rating and tyre load index are not on CarExpert's pages.
  limits: ratings([...r, 4500, 750, 450]),
  tyre: { size, loadIndex: 115 },
  typical: ['ute.limits.towBallMax', 'ute.limits.unbrakedTow', 'ute.tyre.loadIndex'],
});

const FORD: Def[] = [
  ranger('ranger-xl-20-4x2', 'XL 2.0L diesel 4x2', { L: 5370, W: 1910, H: 1875, track: [1620, 1620], fo: 865, floor: 840 }, [3200, 6200, 1400, 1959, 2030, 1971, 3500, 750, 350], { size: '255/70R16', loadIndex: 111 }),
  ranger('ranger-xl-20', 'XL 2.0L diesel 4x4', { L: 5370, W: 1910, H: 1875, track: [1620, 1620], fo: 865, floor: 840 }, [3250, 6200, 1490, 1959, 2126, 2067, 3500, 750, 350], { size: '255/70R16', loadIndex: 111 }),
  ranger('ranger-xl-v6', 'XL 3.0L V6 4x4', { L: 5370, W: 1910, H: 1875, track: [1620, 1620], fo: 865, floor: 840 }, [3250, 6400, 1490, 1959, 2215, 2156, 3500, 750, 350], { size: '255/70R17', loadIndex: 112 }),
  ranger('ranger-xl-phev', 'XL PHEV', { L: 5350, W: 1924, H: 1883, track: [1630, 1630], fo: 865, floor: 840 }, [3500, 6580, 1490, 2100, 2566, 2518, 3500, 750, 350], { size: '255/70R16', loadIndex: 111 }),
  ranger('ranger-xls-20', 'XLS 2.0L diesel 4x4', { L: 5370, W: 1918, H: 1875, track: [1620, 1620], fo: 865, floor: 840 }, [3230, 6350, 1450, 1959, 2172, 2113, 3500, 750, 350], { size: '255/70R16', loadIndex: 111 }),
  ranger('ranger-xlt-20-4x2', 'XLT 2.0L diesel 4x2', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3200, 6200, 1400, 1959, 2092, 2033, 3500, 750, 350], { size: '255/70R17', loadIndex: 112 }),
  ranger('ranger-xlt-20', 'XLT 2.0L diesel 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3230, 6350, 1450, 1959, 2209, 2150, 3500, 750, 350], { size: '255/70R17', loadIndex: 112 }),
  ranger('ranger-xlt-v6', 'XLT 3.0L V6 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3350, 6400, 1490, 1959, 2251, 2192, 3500, 750, 350], { size: '255/70R17', loadIndex: 112 }),
  ranger('ranger-xlt-phev', 'XLT PHEV', { L: 5350, W: 1924, H: 1871, track: [1630, 1630], fo: 865, floor: 840 }, [3500, 6580, 1490, 2100, 2527, 2479, 3500, 750, 350], { size: '255/70R17', loadIndex: 112 }),
  ranger('ranger-sport-20', 'Sport 2.0L diesel 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3230, 6350, 1450, 1959, 2220, 2161, 3500, 750, 350], { size: '255/65R18', loadIndex: 111 }),
  ranger('ranger-sport-v6', 'Sport 3.0L V6 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3280, 6400, 1490, 1959, 2276, 2217, 3500, 750, 350], { size: '255/65R18', loadIndex: 111 }),
  ranger('ranger-sport-phev', 'Sport PHEV', { L: 5350, W: 1924, H: 1883, track: [1630, 1630], fo: 865, floor: 840 }, [3500, 6580, 1490, 2100, 2566, 2518, 3500, 750, 350], { size: '255/65R18', loadIndex: 111 }),
  ranger('ranger-black-20', 'Black Edition 2.0L diesel 4x4', { L: 5370, W: 1918, H: 1875, track: [1620, 1620], fo: 865, floor: 840 }, [3250, 6200, 1490, 1959, 2190, 2131, 3500, 750, 350], { size: '255/70R17', loadIndex: 111 }),
  ranger('ranger-black-v6', 'Black Edition 3.0L V6 4x4', { L: 5370, W: 1918, H: 1875, track: [1620, 1620], fo: 865, floor: 840 }, [3250, 6400, 1490, 1959, 2254, 2195, 3500, 750, 350], { size: '255/70R17', loadIndex: 111 }),
  ranger('ranger-wildtrak-20', 'Wildtrak 2.0L diesel 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3280, 6350, 1490, 1959, 2283, 2279, 3500, 750, 350], { size: '255/65R18', loadIndex: 111 }),
  ranger('ranger-wildtrak-v6', 'Wildtrak 3.0L V6 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3350, 6400, 1490, 1959, 2331, 2272, 3500, 750, 350], { size: '255/65R18', loadIndex: 111 }),
  ranger('ranger-wildtrak-phev', 'Wildtrak PHEV', { L: 5350, W: 1924, H: 1878, track: [1630, 1630], fo: 865, floor: 840 }, [3500, 6580, 1490, 2100, 2615, 2567, 3500, 750, 350], { size: '255/65R18', loadIndex: 111 }),
  ranger('ranger-wolftrak-v6', 'Wolftrak 3.0L V6 4x4', { L: 5370, W: 1918, H: 1886, track: [1620, 1620], fo: 865, floor: 840 }, [3350, 6400, 1490, 1959, 2295, 2236, 3500, 750, 350], { size: '255/70R17', loadIndex: 111 }),
  ranger('ranger-tremor-v6', 'Tremor 3.0L V6 4x4', { L: 5370, W: 1949, H: 1914, track: [1650, 1650], fo: 865, floor: 840 }, [3350, 6400, 1490, 1959, 2317, 2258, 3500, 750, 350], { size: '255/70R17', loadIndex: 111 }),
  ranger('ranger-platinum-v6', 'Platinum 3.0L V6 4x4', { L: 5370, W: 1918, H: 1920, track: [1620, 1620], fo: 865, floor: 840 }, [3300, 6400, 1490, 1959, 2369, 2310, 3500, 750, 350], { size: '255/55R20', loadIndex: 110 }),
  ranger('ranger-raptor', 'Raptor 3.0L V6 petrol', { L: 5380, W: 2028, H: 1926, track: [1710, 1710], fo: 865, floor: 900 }, [3160, 5400, 1520, 1700, 2407, 2355, 2500, 750, 250], { size: '285/70R17', loadIndex: 116 }),
  ranger('ranger-super-duty', 'Super Duty double cab pick-up', { L: 5447, W: 2197, H: 1975, track: [1710, 1710], fo: 945, floor: 900 }, [4500, 8000, 1900, 2800, 2803, 2701, 4500, 750, 450], { size: '275/70R18', loadIndex: 125 }),
  ranger('ranger-super-duty-xlt', 'Super Duty XLT double cab pick-up', { L: 5447, W: 2197, H: 1975, track: [1710, 1710], fo: 945, floor: 900 }, [4500, 8000, 1900, 2800, 2803, 2701, 4500, 750, 450], { size: '275/70R18', loadIndex: 125 }),
  f150('f150-xlt-swb', 'XLT SWB', { L: 5884, wb: 3694, box: 1676 }, [3315, 7365, 1565, 1882, 2462, 2368], '275/60R20'),
  f150('f150-xlt-lwb', 'XLT LWB', { L: 6184, wb: 3994, box: 1981 }, [3360, 7410, 1633, 1882, 2482, 2388], '275/60R20'),
  f150('f150-lariat-swb', 'Lariat SWB', { L: 5884, wb: 3694, box: 1676 }, [3315, 7365, 1565, 1882, 2546, 2452], '275/60R20'),
  f150('f150-lariat-lwb', 'Lariat LWB', { L: 6184, wb: 3994, box: 1981 }, [3360, 7410, 1701, 1882, 2566, 2472], '275/60R20'),
  f150('f150-platinum-swb', 'Platinum SWB', { L: 5884, wb: 3694, box: 1676 }, [3315, 7365, 1565, 1882, 2611, 2517], '275/60R20'),
  f150('f150-platinum-lwb', 'Platinum LWB', { L: 6184, wb: 3994, box: 1981 }, [3360, 7410, 1701, 1882, 2636, 2542], '275/60R20'),
];

// BYD in Australia: the Shark 6 plug-in hybrid ute and the Atto 3, Sealion 6 and Sealion 7 SUVs.
// Weights, GVM, towing, dimensions, track and tyres are from CarExpert's specification pages; the
// Shark 6's GCM and tow ball download from BYD Australia's press material. CarExpert gives neither
// GCM, axle ratings nor front overhang for the SUVs, so those are typical, with the GCM taken as GVM
// plus braked towing. The electric Atto 3 and Sealion 7 carry no fuel, so their tare is their kerb weight.
const shark = (id: string, name: string, r: Ratings): Def => ({
  id,
  group: 'BYD Shark 6',
  name,
  body: {
    bodyStyle: 'ute',
    wheelbase: 3260,
    trackFront: 1660,
    trackRear: 1660,
    overallLength: 5457,
    overallWidth: 1971,
    overallHeight: 1925,
    frontOverhang: 927,
    tub: { length: 1500, width: 1520, depth: 517, floorHeight: 920 },
    kerbFrontPct: 52,
  },
  limits: ratings(r),
  tyre: { size: '265/65R18', loadIndex: 114 },
  typical: [],
});

const suvBody = (wheelbase: number, length: number, width: number, height: number, track: [number, number], frontOverhang: number, tub: Body['tub'], kerbFrontPct: number): Body => ({
  bodyStyle: 'suv',
  wheelbase,
  trackFront: track[0],
  trackRear: track[1],
  overallLength: length,
  overallWidth: width,
  overallHeight: height,
  frontOverhang,
  tub,
  kerbFrontPct,
});
const ATTO3 = suvBody(2720, 4455, 1875, 1615, [1575, 1580], 880, { length: 900, width: 1100, depth: 750, floorHeight: 760 }, 50);
const SEALION6 = suvBody(2765, 4775, 1890, 1670, [1630, 1630], 950, { length: 1000, width: 1150, depth: 780, floorHeight: 800 }, 54);
const SEALION7 = suvBody(2930, 4830, 1925, 1620, [1660, 1660], 940, { length: 1050, width: 1200, depth: 720, floorHeight: 780 }, 48);

/** [GVM, kerb, tare, braked tow, unbraked tow] in kg; the axle ratings are typical, split by the kerb weight. */
const bydSuv = (id: string, name: string, body: Body, [gvm, kerb, tare, brakedTow, unbrakedTow]: [number, number, number, number, number], tyre: Def['tyre']): Def => ({
  id,
  group: 'BYD SUVs',
  name,
  body,
  limits: {
    gvm,
    gcm: gvm + brakedTow,
    frontAxle: Math.round((gvm * body.kerbFrontPct) / 100 / 10) * 10 + 100,
    rearAxle: Math.round((gvm * (100 - body.kerbFrontPct)) / 100 / 10) * 10 + 150,
    kerb,
    tare,
    payload: gvm - kerb,
    brakedTow,
    unbrakedTow,
    towBallMax: Math.round(brakedTow / 10),
  },
  tyre,
  typical: ['ute.limits.gcm', 'ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax', 'ute.frontOverhang'],
});

const BYD: Def[] = [
  shark('shark6-premium', 'BYD Shark 6 Premium', [3500, 5750, 1595, 1905, 2710, 2673, 2500, 750, 250]),
  shark('shark6-performance', 'BYD Shark 6 Performance', [3500, 6650, 1700, 1900, 2775, 2738, 3500, 750, 350]),
  bydSuv('atto3-essential', 'BYD Atto 3 Essential', ATTO3, [2090, 1680, 1680, 750, 750], { size: '215/60R17', loadIndex: 95 }),
  bydSuv('atto3-premium', 'BYD Atto 3 Premium', ATTO3, [2160, 1750, 1750, 750, 750], { size: '235/50R18', loadIndex: 101 }),
  bydSuv('sealion6-essential', 'BYD Sealion 6 Essential', SEALION6, [2350, 1940, 1903, 750, 750], { size: '235/50R19', loadIndex: 99 }),
  bydSuv('sealion6-dynamic-extended', 'BYD Sealion 6 Dynamic Extended', SEALION6, [2405, 1995, 1958, 750, 750], { size: '235/50R19', loadIndex: 99 }),
  bydSuv('sealion6-premium', 'BYD Sealion 6 Premium AWD', SEALION6, [2510, 2100, 2063, 1300, 750], { size: '235/50R19', loadIndex: 99 }),
  bydSuv('sealion6-premium-extended', 'BYD Sealion 6 Premium Extended AWD', SEALION6, [2570, 2160, 2123, 1300, 750], { size: '235/50R19', loadIndex: 99 }),
  bydSuv('sealion7-premium', 'BYD Sealion 7 Premium RWD', SEALION7, [2635, 2225, 2225, 750, 750], { size: '255/45R19', loadIndex: 104 }),
  bydSuv('sealion7-performance', 'BYD Sealion 7 Performance AWD', SEALION7, [2750, 2340, 2340, 1500, 750], { size: '245/45R20', loadIndex: 103 }),
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

export const VEHICLE_GROUPS: VehicleGroup[] = ['BYD Shark 6', 'BYD SUVs', 'Ford Ranger', 'Ford F-150', 'GWM Cannon Alpha', 'GWM Cannon', 'Earlier GWM models', 'Isuzu D-MAX', 'Isuzu MU-X', 'Toyota HiLux', 'Toyota Tundra', 'Toyota HiAce', 'Other makes'];

export function vehicleModel(id: string): VehicleModel {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES.find((v) => v.id === DEFAULT_VEHICLE)!;
}
