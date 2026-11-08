// Checks the load model against the statics it is built on, on many generated setups, rather than
// against hand-worked numbers: every result must balance forces and moments, and the weight
// distribution hitch must restore exactly the share of the front axle load it is set to.

import { describe, expect, it } from 'vitest';
import { compute, ownWeightAt } from './calc';
import { axleShares, caravanCogHeight, loadCentre, uteCogHeight } from './geometry';
import { ITEM_TEMPLATES, applyTrailerKind, applyVehicle, itemFromTemplate, newSetup } from './presets';
import { TRAILER_KINDS } from './trailers';
import type { LoadItem, Setup } from './types';
import { VEHICLES } from './vehicles';

/** A deterministic pseudo-random sequence, so failures can be reproduced. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

function setups(count: number): { s: Setup; grade: number }[] {
  const r = rng(7);
  const out: { s: Setup; grade: number }[] = [];
  for (let n = 0; n < count; n++) {
    const s = newSetup('physics');
    applyVehicle(s, VEHICLES[Math.floor(r() * VEHICLES.length)].id);
    applyTrailerKind(s, TRAILER_KINDS[Math.floor(r() * TRAILER_KINDS.length)].kind);
    if (r() < 0.5) s.caravan.axles = [3500 + r() * 1500];
    else s.caravan.axles = [3800 + r() * 800, 4900 + r() * 900];
    s.caravan.suspension = r() < 0.5 ? 'independent' : 'leaf';
    s.caravan.weighedAxles = r() < 0.3 ? s.caravan.axles.map((x) => x - 200) : [...s.caravan.axles];
    s.hitch.ballOffset = 900 + r() * 700;
    s.hitch.ballHeight = 400 + r() * 200;
    s.hitch.wdh = { enabled: r() < 0.6, restorePct: Math.round(r() * 150) };
    s.uteReadings = r() < 0.5 ? { total: null, front: 1300 + r() * 300, rear: 1000 + r() * 400, fl: null, fr: null, rl: null, rr: null } : s.uteReadings;
    for (let i = 0; i < 6; i++) {
      const it: LoadItem = itemFromTemplate(ITEM_TEMPLATES[Math.floor(r() * ITEM_TEMPLATES.length)], s);
      it.pos = { ...it.pos, y: (r() - 0.5) * 800 };
      if (r() < 0.3) it.measured = { host: it.host, pos: { ...it.pos, x: it.pos.x + (r() - 0.5) * 1000 } };
      if (r() < 0.15) it.enabled = false;
      s.items.push(it);
    }
    out.push({ s, grade: r() < 0.5 ? 0 : Math.round((r() - 0.5) * 50) });
  }
  return out;
}

const sum = (w: { fl: number; fr: number; rl: number; rr: number }) => w.fl + w.fr + w.rl + w.rr;

/** Σ mass × (x, y, z) of the items on one host: each where it is now, less where it was weighed. */
function itemMoments(s: Setup, host: 'ute' | 'caravan') {
  const m = { mass: 0, x: 0, y: 0, z: 0 };
  const add = (pos: { x: number; y: number; z: number }, mass: number) => {
    m.mass += mass;
    m.x += mass * pos.x;
    m.y += mass * pos.y;
    m.z += mass * pos.z;
  };
  for (const it of s.items) {
    if (!(it.mass > 0)) continue;
    if (it.enabled && it.host === host) add(it.pos, it.mass);
    if (it.measured && it.measured.host === host) add(it.measured.pos, -it.mass);
  }
  return m;
}

describe('the load model balances', () => {
  const cases = setups(400);

  it('vertically: everything weighs what the vehicle and trailer weigh, on any slope', () => {
    for (const { s, grade } of cases) {
      const r = compute(s, { grade });
      expect(sum(r.ute.total) + r.caravan!.axle).toBeCloseTo(r.ute.unhitchedGross + r.caravan!.mass, 6);
      // The ball and axle group carry the trailer before the WDH moves anything.
      expect(r.caravan!.loads.ball + r.caravan!.loads.left + r.caravan!.loads.right).toBeCloseTo(r.caravan!.mass, 6);
      // Tandem axles share the group.
      expect(r.caravan!.axleLoads.reduce((a, b) => a + b, 0)).toBeCloseTo(r.caravan!.axle, 6);
    }
  });

  it('in moments about the front axle: baseline, items, ball and WDH couple, and the slope', () => {
    for (const { s, grade } of cases) {
      const r = compute(s, { grade });
      const L = s.ute.wheelbase;
      const d = s.hitch.ballOffset;
      const tan = grade / 100;
      const base = r.ute.baseline.wheels;
      const items = itemMoments(s, 'ute');
      const baseMass = sum(base);
      // Rear axle × wheelbase = Σ (mass × lever). On a slope each mass acts z·tan further back, and the
      // trailer's pull on the ball (its weight along the slope) acts at ball height.
      const expected =
        (base.rl + base.rr) * L +
        items.x +
        (items.z + baseMass * uteCogHeight(s.ute)) * tan +
        r.hitch!.netHitch * (L + d) -
        r.hitch!.wdhMoment +
        r.caravan!.mass * tan * s.hitch.ballHeight;
      expect((r.ute.total.rl + r.ute.total.rr) * L).toBeCloseTo(expected, 3);
    }
  });

  it('sideways on each axle: wheel loads reproduce the items lateral moment', () => {
    for (const { s, grade } of cases) {
      const r = compute(s, { grade });
      const t = r.ute.total;
      const b = r.ute.baseline.wheels;
      const lateral = (w: typeof t) => ((w.fr - w.fl) * s.ute.trackFront) / 2 + ((w.rr - w.rl) * s.ute.trackRear) / 2;
      // The ball, WDH and slope all act on the centreline, so only items move load sideways.
      expect(lateral(t) - lateral(b)).toBeCloseTo(itemMoments(s, 'ute').y, 3);
    }
  });

  it('in moments about the tow ball: own weight, items, slope and WDH couple', () => {
    for (const { s, grade } of cases) {
      const r = compute(s, { grade });
      const a = loadCentre(s.caravan);
      const tan = grade / 100;
      const own = ownWeightAt(r.caravan!.baseline.loads, s.caravan);
      const ownMass = own.ball + own.left + own.right;
      const items = itemMoments(s, 'caravan');
      // Axle group × distance from the ball = Σ (mass × lever) + the WDH couple; heights count from the ball.
      const expected =
        (own.left + own.right) * a +
        items.x +
        (items.z - items.mass * s.hitch.ballHeight + ownMass * (caravanCogHeight(s.caravan) - s.hitch.ballHeight)) * tan +
        r.hitch!.wdhMoment;
      expect(r.caravan!.axle * a).toBeCloseTo(expected, 3);
    }
  });

  it('with the WDH restoring exactly the share of the front axle load it is set to', () => {
    for (const { s, grade } of cases) {
      if (!s.hitch.wdh.enabled) continue;
      const withWdh = compute(s, { grade });
      if (!(withWdh.hitch!.ball > 0)) continue;
      const without = compute({ ...s, hitch: { ...s.hitch, wdh: { ...s.hitch.wdh, enabled: false } } }, { grade });
      // What hitching takes off the front axle through the ball (the slope's drawbar pull is not the WDH's to restore).
      const lost = (without.hitch!.ball * s.hitch.ballOffset) / s.ute.wheelbase;
      const restored = withWdh.ute.front - without.ute.front;
      expect(restored).toBeCloseTo((Math.min(Math.max(s.hitch.wdh.restorePct, 0), 150) / 100) * lost, 6);
      // The static ball weight checked against the tow ball rating is the same with or without it.
      expect(withWdh.hitch!.ball).toBeCloseTo(without.hitch!.ball, 6);
    }
  });

  it('on independent tandem axles: each takes a change in proportion to its distance from the ball', () => {
    for (const { s, grade } of cases) {
      if (s.caravan.axles.length < 2) continue;
      const r = compute(s, { grade });
      const base = r.caravan!.baseline.axles;
      const changes = r.caravan!.axleLoads.map((x, i) => x - base[i]);
      const total = changes[0] + changes[1];
      const shares = axleShares(s.caravan);
      expect(changes[0]).toBeCloseTo(total * shares[0], 6);
      if (s.caravan.suspension === 'independent') {
        expect(shares[1] / shares[0]).toBeCloseTo(s.caravan.axles[1] / s.caravan.axles[0], 9);
        // The springs' moments about the ball add up to the group's change acting at the load centre.
        const [a1, a2] = s.caravan.axles;
        expect(changes[0] * a1 + changes[1] * a2).toBeCloseTo(total * loadCentre(s.caravan), 3);
      }
    }
  });

  it('a hand-worked independent suspension example', () => {
    // Axles 4,000 and 5,000 mm behind the ball: a 100 kg load 3,000 mm behind the ball. Tipping about the
    // ball compresses the springs by 4:5, so they push back 4k and 5k with 4k·4,000 + 5k·5,000 = 100·3,000:
    // k = 300,000 / 41,000,000 per mm, 29.27 kg on the front axle, 36.59 kg on the rear and 34.15 kg on the ball.
    const s = newSetup('independent');
    s.items = [];
    s.caravan.axles = [4000, 5000];
    s.caravan.weighedAxles = [4000, 5000];
    const leaf = compute(s);
    s.caravan.suspension = 'independent';
    const before = compute(s);
    s.items.push({ ...itemFromTemplate(ITEM_TEMPLATES[0], s), host: 'caravan', mass: 100, pos: { x: 3000, y: 0, z: 800 }, measured: null, enabled: true });
    const after = compute(s);
    expect(before.caravan!.axleLoads).toEqual(leaf.caravan!.axleLoads);
    expect(after.caravan!.axleLoads[0] - before.caravan!.axleLoads[0]).toBeCloseTo((4 * 300000) / 41000, 6);
    expect(after.caravan!.axleLoads[1] - before.caravan!.axleLoads[1]).toBeCloseTo((5 * 300000) / 41000, 6);
    expect(after.caravan!.loads.ball - before.caravan!.loads.ball).toBeCloseTo(100 - (9 * 300000) / 41000, 6);
  });

  it('a hand-worked WDH example', () => {
    // L 3,000, ball 1,200 behind the rear axle, axles 4,500 behind the ball, 300 kg on the ball, 50%:
    // the ball takes 300 × 1.2 / 3 = 120 kg off the front; M = 0.5 × 300 × 1200 × 4500 / 5700 = 142,105 kg·mm,
    // so the ute carries 300 − 142,105 / 4,500 = 268.4 kg and the front gets 60 kg back.
    const s = newSetup('wdh');
    s.items = [];
    s.ute.wheelbase = 3000;
    s.uteReadings = { total: null, front: 1400, rear: 1100, fl: 700, fr: 700, rl: 550, rr: 550 };
    s.hitch.ballOffset = 1200;
    s.hitch.wdh = { enabled: true, restorePct: 50 };
    s.caravan.axles = [4500];
    s.caravan.weighedAxles = [4500];
    s.caravanReadings = { total: 2500, ball: 300, axle: null, axleFront: null, axleRear: null, left: null, right: null };
    const r = compute(s);
    expect(r.hitch!.wdhMoment).toBeCloseTo((0.5 * 300 * 1200 * 4500) / 5700, 3);
    expect(r.hitch!.netHitch).toBeCloseTo(300 - 142105.263 / 4500, 2);
    expect(r.ute.front).toBeCloseTo(1400 - 120 + 60, 6);
    expect(r.ute.gross + r.caravan!.axle).toBeCloseTo(2500 + 2500, 6);
  });
});
