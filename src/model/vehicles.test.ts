import { describe, expect, it } from 'vitest';
import { applyVehicle, newSetup, PRESET_PLACEHOLDERS } from './presets';
import { DEFAULT_VEHICLE, VEHICLE_MAKES, VEHICLES, vehicleModel } from './vehicles';
import { uteGeometry } from './geometry';
import { compute } from './calc';

const at = (obj: unknown, path: string) => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);

describe('vehicle models', () => {
  it.each(VEHICLES.map((v) => [v.label, v.id]))('%s has consistent figures', (_label, id) => {
    const model = vehicleModel(id);
    const ute = { ute: model.spec() };
    const lim = ute.ute.limits;
    expect(ute.ute.model).toBe(id);
    expect(lim.kerb! + lim.payload!).toBe(lim.gvm);
    expect(lim.gcm!).toBeGreaterThan(lim.gvm!);
    // Tare is kerb less most of the fuel; an electric car has none, so its tare is its kerb weight.
    expect(lim.tare!).toBeLessThanOrEqual(lim.kerb!);
    expect(lim.towBallMax!).toBeLessThanOrEqual(lim.brakedTow! * 0.1);
    // Axle limits together must allow the GVM.
    expect(lim.frontAxle! + lim.rearAxle!).toBeGreaterThanOrEqual(lim.gvm!);
    for (const path of model.placeholders) expect(at(ute, path), path).not.toBeUndefined();
  });

  it('starts new setups on the Cannon Alpha Vanta 3.0L diesel, as in the brochure', () => {
    const s = newSetup();
    expect(DEFAULT_VEHICLE).toBe('alpha-vanta-30d');
    expect(s.ute).toMatchObject({ model: 'alpha-vanta-30d', name: 'GWM Cannon Alpha Vanta 3.0L diesel', wheelbase: 3350 });
    expect(s.ute.tyre).toMatchObject({ size: '265/55R19', loadIndex: 109 });
    expect(s.ute.limits).toEqual({ gvm: 3495, gcm: 6555, frontAxle: 1680, rearAxle: 2026, kerb: 2550, tare: 2458, payload: 945, brakedTow: 3500, unbrakedTow: 750, towBallMax: 350 });
    // Published in the brochure, so no placeholders; the tub and kerb split are not.
    expect(PRESET_PLACEHOLDERS).not.toEqual(expect.arrayContaining(['ute.limits.rearAxle']));
    expect(PRESET_PLACEHOLDERS).not.toContain('ute.limits.tare');
    expect(PRESET_PLACEHOLDERS).toEqual(expect.arrayContaining(['ute.tub.length', 'ute.kerbFrontPct', 'hitch.ballOffset']));
  });

  it('switches model, keeping paint, readings, items and the other placeholders', () => {
    const s = newSetup();
    s.ute.paint = '#141518';
    s.uteReadings.front = 1400;
    const items = s.items.length;
    applyVehicle(s, 'cannon-xsr-24d');
    expect(s.ute).toMatchObject({ model: 'cannon-xsr-24d', name: 'GWM Cannon XSR 2.4L diesel', wheelbase: 3230, overallWidth: 1958, paint: '#141518' });
    expect(s.ute.limits).toMatchObject({ gvm: 3205, gcm: 6300, frontAxle: 1585, rearAxle: 1850, payload: 875, tare: 2273 });
    // From the axle loads at kerb weight: 1345 / 985 kg.
    expect(s.ute.kerbFrontPct).toBe(57.7);
    expect(s.uteReadings.front).toBe(1400);
    expect(s.items).toHaveLength(items);
    expect(s.placeholders).not.toContain('ute.limits.rearAxle');
    expect(s.placeholders).not.toContain('ute.tub.length');
    expect(s.placeholders).toEqual(expect.arrayContaining(['ute.tyre.loadIndex', 'hitch.ballOffset', 'caravan.limits.atm']));
  });

  it('marks the typical axle limits of earlier models as placeholders', () => {
    const s = newSetup();
    applyVehicle(s, 'cannon-x-20d');
    expect(s.ute.limits).toMatchObject({ gvm: 3150, brakedTow: 3000, kerb: 2100, payload: 1050 });
    expect(s.placeholders).toEqual(expect.arrayContaining(['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.gcm']));
  });

  it('has the Isuzu D-MAX from its brochure, with the tare worked out from the full-tank kerb weight', () => {
    const s = newSetup();
    applyVehicle(s, 'dmax-lsu-30d');
    expect(s.ute).toMatchObject({ name: 'Isuzu D-MAX LS-U 3.0L diesel 4x4', bodyStyle: 'ute', wheelbase: 3125, trackFront: 1570, overallLength: 5285 });
    expect(s.ute.tub).toMatchObject({ length: 1570, width: 1530, depth: 490 });
    expect(s.ute.tyre).toMatchObject({ size: '265/60R18' });
    // 76 L tank: 66 L of diesel above the tare's 10 L is 55 kg.
    expect(s.ute.limits).toEqual({ gvm: 3100, gcm: 6000, frontAxle: 1450, rearAxle: 1910, kerb: 2105, tare: 2050, payload: 995, brakedTow: 3500, unbrakedTow: 750, towBallMax: 350 });
    // Isuzu publishes the track, front overhang and tub size, not the kerb split; listings confirm the D-MAX tare.
    expect(s.placeholders).not.toEqual(expect.arrayContaining(['ute.trackFront']));
    expect(s.placeholders).not.toContain('ute.frontOverhang');
    expect(s.placeholders).not.toContain('ute.tub.length');
    expect(s.placeholders).not.toContain('ute.limits.tare');
    expect(s.placeholders).toEqual(expect.arrayContaining(['ute.kerbFrontPct', 'ute.tyre.loadIndex', 'ute.tub.floorHeight']));
    // The 17-inch tyre's load index is Michelin's fitment for the SX.
    applyVehicle(s, 'dmax-sx-30d');
    expect(s.ute.tyre).toMatchObject({ size: '255/65R17', loadIndex: 110 });
    expect(s.placeholders).not.toContain('ute.tyre.loadIndex');
  });

  it('draws the Isuzu MU-X as an SUV', () => {
    const s = newSetup();
    applyVehicle(s, 'mux-lst-30d');
    expect(s.ute).toMatchObject({ name: 'Isuzu MU-X LS-T 3.0L diesel 4x4', bodyStyle: 'suv', wheelbase: 2855, overallLength: 4860, sunroof: false });
    expect(s.ute.tyre).toMatchObject({ size: '265/50R20' });
    expect(s.ute.limits).toMatchObject({ gvm: 2800, gcm: 5900, frontAxle: 1450, rearAxle: 1650, kerb: 2185, tare: 2127, payload: 615 });
    expect(s.placeholders).toEqual(expect.arrayContaining(['ute.tub.length', 'ute.tub.width', 'ute.limits.tare', 'ute.tyre.loadIndex']));
    applyVehicle(s, 'mux-lsm-22d-4x2');
    expect(s.ute.limits).toMatchObject({ gvm: 2700, kerb: 1995, payload: 705 });
    expect(s.placeholders).toContain('ute.limits.frontAxle');
  });

  it('puts the tow ball 200 mm behind the rear bumper until it has been measured', () => {
    const s = newSetup();
    // Cannon Alpha: 5,445 long, 3,350 wheelbase, 950 front overhang, so 1,145 behind the rear axle.
    expect(s.hitch.ballOffset).toBe(1350);
    applyVehicle(s, 'dmax-lsu-30d');
    expect(s.hitch.ballOffset).toBe(1460);
    applyVehicle(s, 'mux-lsu-30d');
    expect(s.hitch.ballOffset).toBe(1300);
    // Measured, so switching model leaves it alone.
    s.hitch.ballOffset = 1240;
    s.placeholders = s.placeholders.filter((p) => p !== 'hitch.ballOffset');
    applyVehicle(s, 'dmax-lsu-30d');
    expect(s.hitch.ballOffset).toBe(1240);
  });

  it('offers a generic ute and car for other makes, every figure a placeholder', () => {
    const s = newSetup();
    applyVehicle(s, 'generic-car');
    expect(s.ute).toMatchObject({ name: 'Generic car (5-seat SUV)', bodyStyle: 'suv' });
    expect(s.placeholders).toEqual(expect.arrayContaining(['ute.wheelbase', 'ute.trackFront', 'ute.limits.gvm', 'ute.limits.brakedTow', 'ute.tyre.size', 'ute.tub.length']));
    // Named after the owner's vehicle, which a reset keeps.
    s.ute.name = 'Toyota Prado GXL';
    s.ute.limits.gvm = 3000;
    applyVehicle(s, 'generic-car');
    expect(s.ute).toMatchObject({ name: 'Toyota Prado GXL' });
    expect(s.ute.limits.gvm).toBe(2750);
    applyVehicle(s, 'generic-ute');
    expect(s.ute).toMatchObject({ name: 'Generic dual cab ute', bodyStyle: 'ute' });
  });

  it('has the 2009 Toyota HiAce LWB van, drawn as a cab-over van', () => {
    const s = newSetup();
    applyVehicle(s, 'hiace-lwb-30d-2009');
    expect(s.ute).toMatchObject({ name: 'Toyota HiAce LWB van 3.0L diesel', bodyStyle: 'van', wheelbase: 2570, overallLength: 4695 });
    expect(s.ute.limits).toMatchObject({ gvm: 2800, brakedTow: 1400 });
    expect(vehicleModel('hiace-lwb-27p-2009').spec().limits).toMatchObject({ gvm: 2800, kerb: 1665, tare: 1620 });
    // Not published: shown as placeholders.
    expect(s.placeholders).toEqual(expect.arrayContaining(['ute.limits.frontAxle', 'ute.limits.rearAxle', 'ute.limits.towBallMax', 'ute.limits.kerb']));
    const g = uteGeometry(s.ute, s.hitch);
    // Three seats in the front row, close over the front axle; the cargo area behind them to the rear doors.
    expect(g.seats).toHaveLength(3);
    for (const seat of g.seats) expect(Math.abs(seat.x)).toBeLessThan(400);
    expect(g.tubFront).toBeGreaterThan(g.seats[0].x);
    expect(g.tubRear).toBeLessThan(g.sRear);
    expect(compute(s).checks.find((c) => c.id === 'gvm')!.limit).toBe(2800);
  });

  it('files every model under one of the makes in the picker', () => {
    const makes = VEHICLE_MAKES.map((m) => m.make);
    for (const v of VEHICLES) expect(makes).toContain(v.make);
    for (const make of makes) expect(VEHICLES.some((v) => v.make === make)).toBe(true);
    expect(vehicleModel('hiace-lwb-30d-2009').make).toBe('Toyota');
    expect(vehicleModel('mux-lst-30d').make).toBe('Isuzu');
    expect(vehicleModel('generic-car').make).toBe('Other');
  });

  it('has the Ford and BYD ranges under their own makes, with the published figures', () => {
    expect(vehicleModel('ranger-wildtrak-v6')).toMatchObject({ make: 'Ford', group: 'Ford Ranger' });
    expect(vehicleModel('ranger-wildtrak-v6').spec().limits).toMatchObject({ gvm: 3350, gcm: 6400, frontAxle: 1490, rearAxle: 1959, kerb: 2331, tare: 2272, payload: 1019 });
    expect(vehicleModel('ranger-raptor').spec()).toMatchObject({ trackFront: 1710, limits: { gvm: 3160, kerb: 2407, brakedTow: 2500 } });
    expect(vehicleModel('ranger-super-duty-xlt').spec().limits).toMatchObject({ gvm: 4500, gcm: 8000, payload: 1697, brakedTow: 4500 });
    expect(vehicleModel('f150-xlt-lwb').spec()).toMatchObject({ wheelbase: 3994, limits: { gvm: 3360, gcm: 7410, frontAxle: 1633, payload: 878, brakedTow: 4500 } });
    expect(vehicleModel('shark6-premium')).toMatchObject({ make: 'BYD', group: 'BYD Shark 6' });
    expect(vehicleModel('shark6-premium').spec().limits).toMatchObject({ gvm: 3500, frontAxle: 1595, rearAxle: 1905, kerb: 2710, payload: 790, brakedTow: 2500, towBallMax: 250 });
    expect(vehicleModel('sealion7-premium').spec()).toMatchObject({ bodyStyle: 'suv', limits: { gvm: 2635, kerb: 2225, tare: 2225 } });
    // Published axle ratings are not placeholders; the tow ball download Ford doesn't publish is.
    expect(vehicleModel('ranger-xlt-v6').placeholders).toContain('ute.limits.towBallMax');
    expect(vehicleModel('ranger-xlt-v6').placeholders).not.toContain('ute.limits.frontAxle');
    expect(vehicleModel('sealion6-premium').placeholders).toEqual(expect.arrayContaining(['ute.limits.gcm', 'ute.limits.rearAxle']));
  });

  it('has the HiLux and Tundra under Toyota, next to the HiAce', () => {
    expect(vehicleModel('hilux-sr5-4x4')).toMatchObject({ make: 'Toyota', group: 'Toyota HiLux' });
    expect(vehicleModel('hilux-sr5-4x4').spec()).toMatchObject({ wheelbase: 3085, trackFront: 1530, limits: { gvm: 3120, gcm: 6300, kerb: 2163, tare: 2103, payload: 957, brakedTow: 3500 } });
    // The 4x2s' axle ratings are published; the 4x4s' are not.
    expect(vehicleModel('hilux-sr-4x2').spec().limits).toMatchObject({ frontAxle: 1480, rearAxle: 1700, brakedTow: 2900 });
    expect(vehicleModel('hilux-sr-4x2').placeholders).not.toContain('ute.limits.frontAxle');
    expect(vehicleModel('hilux-rogue').placeholders).toContain('ute.limits.frontAxle');
    // The electric HiLux carries no fuel.
    expect(vehicleModel('hilux-sr-electric').spec().limits).toMatchObject({ kerb: 2420, tare: 2420, brakedTow: 2000 });
    expect(vehicleModel('tundra-platinum').spec()).toMatchObject({ wheelbase: 3700, limits: { gvm: 3536, frontAxle: 1850, brakedTow: 4500 } });
    // The HiAce keeps its own placeholders.
    expect(vehicleModel('hiace-lwb-30d-2009').placeholders).toEqual(expect.arrayContaining(['ute.limits.frontAxle', 'ute.trackFront']));
  });

  it('has the JAC, Kia, LDV, Mazda, MG, Mitsubishi and Nissan utes under their own makes', () => {
    const makes = new Set(VEHICLES.map((v) => v.make));
    for (const make of ['JAC', 'Kia', 'LDV', 'Mazda', 'MG', 'Mitsubishi', 'Nissan']) expect(makes).toContain(make);
    expect(vehicleModel('tasman-x-pro-4x4')).toMatchObject({ make: 'Kia', group: 'Kia Tasman' });
    expect(vehicleModel('tasman-x-pro-4x4').spec()).toMatchObject({ wheelbase: 3270, limits: { gvm: 3250, gcm: 6200, frontAxle: 1450, rearAxle: 2002, kerb: 2237, payload: 1013 } });
    expect(vehicleModel('triton-gsr-4x4').spec().limits).toMatchObject({ gvm: 3200, gcm: 6250, kerb: 2170, brakedTow: 3500 });
    expect(vehicleModel('bt50-xs-4x2').spec().limits).toMatchObject({ gvm: 3000, kerb: 1888 });
    expect(vehicleModel('navara-pro-4x-4x4')).toMatchObject({ make: 'Nissan' });
    expect(vehicleModel('u9-explore-pro-4x4')).toMatchObject({ make: 'MG', group: 'MG U9' });
    // Figures the source leaves out are placeholders, per model.
    expect(vehicleModel('jac-t9-haven-4x4').placeholders).toEqual(expect.arrayContaining(['ute.limits.frontAxle', 'ute.limits.tare', 'ute.frontOverhang']));
    expect(vehicleModel('u9-explore-4x4').placeholders).toContain('ute.limits.gcm');
    expect(vehicleModel('tasman-s-4x4').placeholders).not.toContain('ute.limits.frontAxle');
    // MG's make isn't mistaken inside other names.
    expect(vehicleModel('alpha-vanta-30d').make).toBe('GWM');
  });

  it('has the RAM and Chevrolet full-size pick-ups', () => {
    expect(vehicleModel('ram1500-laramie-sport')).toMatchObject({ make: 'RAM', group: 'RAM 1500' });
    expect(vehicleModel('ram1500-laramie-sport').spec()).toMatchObject({ wheelbase: 3672, limits: { gvm: 3505, gcm: 7713, frontAxle: 1770, rearAxle: 1860, kerb: 2642, payload: 863, brakedTow: 4500 } });
    expect(vehicleModel('ram3500-laramie').spec().limits).toMatchObject({ gvm: 5352, rearAxle: 3175, kerb: 3700 });
    expect(vehicleModel('silverado-hd-ltz-premium')).toMatchObject({ make: 'Chevrolet', group: 'Chevrolet Silverado' });
    expect(vehicleModel('silverado-zr2').spec().limits).toMatchObject({ gvm: 3300, brakedTow: 4200 });
    expect(vehicleModel('ram2500-laramie').placeholders).toEqual(expect.arrayContaining(['ute.frontOverhang', 'ute.overallWidth', 'ute.limits.towBallMax']));
    expect(vehicleModel('ram2500-laramie').placeholders).not.toContain('ute.limits.rearAxle');
  });
});
