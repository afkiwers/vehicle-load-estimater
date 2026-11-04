// A cab-over panel van like the Toyota HiAce: a rounded box body with a short sloping nose and a long raked
// windscreen, the front seats over the front axle, a bulkhead, and the cargo area running to a lift-up tailgate.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HitchSpec, UteSpec } from '../model/types';
import { toWorld, uteGeometry } from '../model/geometry';
import { archPoints, surfaceData, useArchFlare } from './parts';
import { RBox, Strut, Wheel, useMaterials, type Materials } from './kit';

type G = ReturnType<typeof uteGeometry>;

/** Invisible but clickable: lets items be dropped on the roof. */
const pickOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

/** Rounding of the body's edges (mm). */
const EDGE = 35;

const shapeOf = (points: [number, number][]) =>
  new THREE.Shape(
    points.map(([x, z]) => {
      const [wx, wy] = toWorld('ute', { x, y: 0, z }, 0);
      return new THREE.Vector2(wx, wy);
    }),
  );

/** The body's side silhouette with the wheel arches cut out, extruded across the width with rounded edges. */
function useBody(g: G, archR: number) {
  return useMemo(() => {
    const zb = g.bumperBottom;
    const sF = g.sFront + EDGE;
    const sR = g.sRear - EDGE;
    const top = g.zRoof - EDGE;
    const pts: [number, number][] = [
      // Nose: an almost upright front face, a short sloping bonnet up to the cowl.
      [sF + 40, zb + 60],
      [sF, zb + 180],
      [sF + 15, g.zBonnetFront - 40],
      [sF + 70, g.zBonnetFront + 20],
      [g.sWindscreen, g.zCowl],
      // Windscreen, rounding over into the roof.
      [g.sWindscreenTop - 60, top - 60],
      [g.sWindscreenTop + 60, top],
      [sR - 90, top],
      [sR, top - 80],
      // Rear face and bottom, with both wheel arches.
      [sR, zb + 120],
      [sR - 40, zb + 60],
      ...archPoints(g.L, g.wheelR, archR, zb + 60),
      ...archPoints(0, g.wheelR, archR, zb + 60),
    ];
    const depth = (g.bodyW - 2 * EDGE) / 1000;
    const geo = new THREE.ExtrudeGeometry(shapeOf(pts), {
      depth,
      bevelEnabled: true,
      bevelThickness: EDGE / 1000,
      bevelSize: EDGE / 1000,
      bevelSegments: 4,
      curveSegments: 16,
    });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    return geo;
  }, [g, archR]);
}

/** A flat panel in a side profile (x, z points, mm), set just proud of the side at y = ±side. */
function SidePanel({ points, side, y, material }: { points: [number, number][]; side: number; y: number; material: THREE.Material }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shapeOf(points), { depth: 0.006, bevelEnabled: false });
    g.translate(0, 0, -0.003);
    return g;
  }, [JSON.stringify(points)]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} position={[0, 0, (side * y) / 1000]} />;
}

function Interior({ g, m }: { g: G; m: Materials }) {
  const half = g.bodyW / 2;
  const [driver] = g.seats;
  const seat = (s: { x: number; y: number; z: number }, w: number, key: string) => (
    <group key={key}>
      <RBox b={{ x0: s.x - 240, x1: s.x + 200, y0: s.y - w / 2, y1: s.y + w / 2, z0: s.z - 330, z1: s.z - 210 }} r={40} material={m.interior} surface="seat" />
      <RBox b={{ x0: s.x + 150, x1: s.x + 260, y0: s.y - w / 2, y1: s.y + w / 2, z0: s.z - 220, z1: s.z + 400 }} r={45} material={m.interior} surface="seat" />
      <RBox b={{ x0: s.x + 165, x1: s.x + 250, y0: s.y - 110, y1: s.y + 110, z0: s.z + 420, z1: s.z + 560 }} r={35} material={m.interior} />
    </group>
  );
  const dashX = g.sWindscreen + (g.zBelt - 60 - g.zCowl) * 0.62;
  return (
    <group>
      {g.seats.map((s, i) => seat(s, i === 2 ? 380 : 470, `seat${i}`))}
      {/* Engine cover under the seats, dashboard, a near-flat steering wheel in front of the driver */}
      <RBox b={{ x0: driver.x - 420, x1: driver.x + 260, y0: -half + 120, y1: half - 120, z0: g.tubFloor, z1: driver.z - 330 }} r={40} material={m.interior} />
      <RBox b={{ x0: dashX - 40, x1: dashX + 380, y0: -half + 90, y1: half - 90, z0: g.zBelt - 260, z1: g.zBelt + 10 }} r={60} material={m.interior} />
      <mesh position={toWorld('ute', { x: dashX + 430, y: driver.y, z: g.zBelt - 40 }, 0)} rotation={[0, Math.PI / 2, -0.95]}>
        <torusGeometry args={[0.19, 0.022, 12, 36]} />
        <meshStandardMaterial color="#121315" roughness={0.6} />
      </mesh>

      {/* Bulkhead behind the seats, cargo floor (drop target) and the rear wheel tubs inside */}
      <RBox b={{ x0: g.sCabBack - 25, x1: g.sCabBack + 15, y0: -half + 70, y1: half - 70, z0: g.tubFloor, z1: g.zRoof - 70 }} r={10} material={m.interior} />
      <RBox b={{ x0: g.tubFront, x1: g.tubRear, y0: -g.tubInnerW / 2, y1: g.tubInnerW / 2, z0: g.tubFloor - 40, z1: g.tubFloor }} r={8} material={m.bedliner} surface="tub" />
      {[-1, 1].map((side) => (
        <RBox
          key={side}
          b={{ x0: g.L - g.wheelR - 120, x1: g.L + g.wheelR + 120, y0: Math.min(side * (g.tubInnerW / 2 - 260), side * g.tubInnerW / 2), y1: Math.max(side * (g.tubInnerW / 2 - 260), side * g.tubInnerW / 2), z0: g.tubFloor, z1: g.wheelR * 2 + 60 }}
          r={60}
          material={m.interior}
          surface="tub"
        />
      ))}
    </group>
  );
}

/**
 * The whole van: body, glazing, lights, bumpers, mirrors, door lines (a sliding door on the kerb side),
 * roof drop surface, interior and cargo floor, underbody, tow bar and wheels. Glass and trim sit just
 * outside the body's rounded edge (EDGE), which grows the body past its outline.
 */
export function VanModel({ ute, hitch, xray }: { ute: UteSpec; hitch: HitchSpec; xray: boolean }) {
  const g = useMemo(() => uteGeometry(ute, hitch), [ute, hitch]);
  const archR = g.wheelR + 50;
  const body = useBody(g, archR);
  useEffect(() => () => body.dispose(), [body]);
  const m = useMaterials(ute.paint, xray);
  const ext = (name: string) => (xray ? null : name);
  const W = g.bodyW;
  const half = W / 2;
  const zb = g.bumperBottom;
  const sF = g.sFront;
  const linerF = useArchFlare(0, g.wheelR, archR - 6, archR + 10, zb + 60, W - 20);
  const linerR = useArchFlare(g.L, g.wheelR, archR - 6, archR + 10, zb + 60, W - 20);
  const ball = g.ball;
  const yy = (side: number, a: number, b: number) => ({ y0: Math.min(side * a, side * b), y1: Math.max(side * a, side * b) });

  // Windscreen glass on the raked front, just proud of the body.
  const rake = Math.atan2(g.sWindscreenTop - g.sWindscreen, g.zRoof - g.zCowl);
  // The rounded edges grow the body EDGE past its outline, so the glass sits just outside that.
  const out = { x: -Math.cos(rake) * (EDGE + 8), z: Math.sin(rake) * (EDGE + 8) };
  // Along the windscreen at a height.
  const aPillar = (z: number) => g.sWindscreen + ((z - g.zCowl) / (g.zRoof - g.zCowl)) * (g.sWindscreenTop - g.sWindscreen);
  const zWinTop = g.zRoof - 110;
  const zWinBot = g.zBelt + 20;
  const doorRear = g.sCabBack - 90;
  const sideGlass: [number, number][] = [
    [aPillar(zWinBot) + 110, zWinBot],
    [aPillar(zWinTop) + 70, zWinTop],
    [doorRear - 60, zWinTop],
    [doorRear - 60, zWinBot],
  ];
  // Front door from the A-pillar to just behind the seats; the sliding door on the kerb (left) side behind it.
  const slideEnd = Math.min(doorRear + 1100, g.L - archR - 120);
  const doorLines = (side: number) => (side < 0 ? [aPillar(g.zBelt) + 60, doorRear, slideEnd] : [aPillar(g.zBelt) + 60, doorRear]);

  return (
    <group>
      <mesh geometry={body} material={m.paint} castShadow receiveShadow userData={surfaceData(ext('body'), 'ute')} />
      <mesh geometry={linerF} material={m.plastic} />
      <mesh geometry={linerR} material={m.plastic} />

      {/* Glazing: windscreen, front door windows, tailgate window */}
      <Strut
        a={{ x: g.sWindscreen + 40 + out.x, y: 0, z: g.zCowl + 50 + out.z }}
        b={{ x: g.sWindscreenTop - 70 + out.x, y: 0, z: g.zRoof - 90 + out.z }}
        w={10}
        d={W - 170}
        material={m.glass}
      />
      {[-1, 1].map((side) => (
        <SidePanel key={side} points={sideGlass} side={side} y={half + EDGE + 4} material={m.glass} />
      ))}
      <RBox b={{ x0: g.sRear + 2, x1: g.sRear + 12, y0: -half + 150, y1: half - 150, z0: g.zBelt + 60, z1: g.zRoof - 140 }} r={40} material={m.glass} shadow={false} />

      {/* Front: grille between the headlights, indicators, bumper with number plate */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RBox b={{ x0: sF - 6, x1: sF + 60, ...yy(side, half - 330, half - 40), z0: g.zBonnetFront - 210, z1: g.zBonnetFront - 40 }} r={40} material={m.housing} />
          <RBox b={{ x0: sF - 12, x1: sF + 10, ...yy(side, half - 310, half - 140), z0: g.zBonnetFront - 190, z1: g.zBonnetFront - 60 }} r={30} material={m.led} />
          <RBox b={{ x0: sF - 10, x1: sF + 10, ...yy(side, half - 130, half - 60), z0: g.zBonnetFront - 190, z1: g.zBonnetFront - 60 }} r={20} material={m.amber} />
        </group>
      ))}
      <RBox b={{ x0: sF - 8, x1: sF + 40, y0: -half + 340, y1: half - 340, z0: g.zBonnetFront - 200, z1: g.zBonnetFront - 50 }} r={20} material={m.gloss} />
      <RBox b={{ x0: sF - 14, x1: sF + 10, y0: -110, y1: 110, z0: g.zBonnetFront - 160, z1: g.zBonnetFront - 90 }} r={20} material={m.chrome} />
      <RBox b={{ x0: sF - 45, x1: sF + 160, y0: -half + 20, y1: half - 20, z0: zb - 30, z1: zb + 210 }} r={50} material={m.plastic} surface={ext('front')} />
      <RBox b={{ x0: sF - 52, x1: sF - 40, y0: -250, y1: 250, z0: zb + 50, z1: zb + 160 }} r={8} material={m.chrome} />

      {/* Mirrors on the A-pillars, door shut lines, handles, rub strips */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RBox b={{ x0: aPillar(g.zBelt) + 60, x1: aPillar(g.zBelt) + 120, ...yy(side, half + 10, half + 120), z0: g.zBelt + 40, z1: g.zBelt + 80 }} r={15} material={m.plastic} />
          <RBox b={{ x0: aPillar(g.zBelt) + 40, x1: aPillar(g.zBelt) + 130, ...yy(side, half + 100, half + 230), z0: g.zBelt + 30, z1: g.zBelt + 280 }} r={30} material={m.plastic} />
          {doorLines(side).map((x, i) => {
            const y = side * (half + EDGE + 2);
            const z0 = x > archR && x < g.L - archR ? zb + 110 : g.wheelR + archR + 20;
            // The front door's leading edge follows the raked A-pillar above the beltline.
            const top = i === 0 ? { x: aPillar(g.zRoof - 70) + 60, z: g.zRoof - 70 } : { x, z: g.zRoof - 70 };
            return (
              <group key={x}>
                <Strut a={{ x, y, z: z0 }} b={{ x, y, z: g.zBelt }} w={5} d={4} material={m.plastic} />
                <Strut a={{ x, y, z: g.zBelt }} b={{ x: top.x, y, z: top.z }} w={5} d={4} material={m.plastic} />
              </group>
            );
          })}
          <RBox b={{ x0: doorRear - 260, x1: doorRear - 120, ...yy(side, half + EDGE - 6, half + EDGE + 14), z0: g.zBelt - 140, z1: g.zBelt - 105 }} r={12} material={m.chrome} />
          {side < 0 && <RBox b={{ x0: doorRear + 60, x1: doorRear + 200, ...yy(side, half + EDGE - 6, half + EDGE + 14), z0: g.zBelt - 140, z1: g.zBelt - 105 }} r={12} material={m.chrome} />}
          {side < 0 && <RBox b={{ x0: doorRear, x1: slideEnd, ...yy(side, half + EDGE - 4, half + EDGE + 8), z0: g.zBelt - 30, z1: g.zBelt - 10 }} r={6} material={m.plastic} />}
          <RBox b={{ x0: archR + 80, x1: g.L - archR - 80, ...yy(side, half + EDGE - 8, half + EDGE + 14), z0: zb + 200, z1: zb + 260 }} r={14} material={m.plastic} />
        </group>
      ))}

      {/* Rear: tall tail lights on the corners, tailgate handle, number plate, bumper with step */}
      {[-1, 1].map((side) => (
        <RBox key={side} b={{ x0: g.sRear - 30, x1: g.sRear + 10, ...yy(side, half - 150, half - 20), z0: zb + 230, z1: g.zBelt + 120 }} r={25} material={m.red} />
      ))}
      <RBox b={{ x0: g.sRear - 4, x1: g.sRear + 14, y0: -170, y1: 170, z0: g.zBelt - 60, z1: g.zBelt + 10 }} r={12} material={m.chrome} />
      <RBox b={{ x0: g.sRear - 2, x1: g.sRear + 12, y0: -250, y1: 250, z0: zb + 260, z1: zb + 380 }} r={10} material={m.plastic} />
      <RBox b={{ x0: g.sRear - 120, x1: g.sRear + 70, y0: -half + 20, y1: half - 20, z0: zb - 30, z1: zb + 190 }} r={45} material={m.plastic} surface="bumper" />

      {/* Roof: clickable surface and rain gutters */}
      <mesh position={toWorld('ute', { x: (g.sWindscreenTop + g.sRoofBack) / 2, y: 0, z: g.zRoof + 10 }, 0)} material={pickOnly} userData={surfaceData(ext('roof'), 'ute')}>
        <boxGeometry args={[(g.sRoofBack - g.sWindscreenTop) / 1000, 0.04, (2 * g.roofHalf) / 1000]} />
      </mesh>
      {[-1, 1].map((side) => (
        <RBox key={side} b={{ x0: g.sWindscreenTop + 60, x1: g.sRear - 80, ...yy(side, half - 10, half + EDGE + 6), z0: g.zRoof - 60, z1: g.zRoof - 35 }} r={8} material={m.plastic} />
      ))}

      <Interior g={g} m={m} />

      {/* Underbody: frame rails, rear axle on leaf springs, differential, exhaust */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RBox b={{ x0: -200, x1: g.sRear - 150, ...yy(side, 380, 450), z0: zb - 10, z1: zb + 90 }} r={8} material={m.chassis} />
          <RBox b={{ x0: g.L - 600, x1: g.L + 600, ...yy(side, 400, 460), z0: g.wheelR + 30, z1: g.wheelR + 80 }} r={10} material={m.chassis} />
        </group>
      ))}
      <Strut a={{ x: g.L, y: -ute.trackRear / 2 + 120, z: g.wheelR }} b={{ x: g.L, y: ute.trackRear / 2 - 120, z: g.wheelR }} w={90} d={90} material={m.chassis} />
      <mesh position={toWorld('ute', { x: g.L, y: 60, z: g.wheelR }, 0)} material={m.chassis}>
        <sphereGeometry args={[0.13, 20, 14]} />
      </mesh>
      <mesh position={toWorld('ute', { x: g.sRear - 40, y: -0.3 * W, z: zb - 30 }, 0)} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
        <cylinderGeometry args={[0.03, 0.03, 0.18, 18]} />
      </mesh>

      {/* Tow bar and ball */}
      <RBox b={{ x0: g.sRear - 260, x1: g.sRear - 150, y0: -480, y1: 480, z0: ball.z - 140, z1: ball.z - 60 }} r={10} material={m.chassis} surface="towbar" />
      <RBox b={{ x0: g.sRear - 200, x1: ball.x - 30, y0: -38, y1: 38, z0: ball.z - 120, z1: ball.z - 50 }} r={6} material={m.chassis} surface="towbar" />
      <mesh position={toWorld('ute', { x: ball.x, y: 0, z: ball.z - 20 }, 0)} material={m.chrome}>
        <cylinderGeometry args={[0.014, 0.018, 0.06, 16]} />
      </mesh>
      <mesh position={toWorld('ute', ball, 0)} castShadow material={m.chrome}>
        <sphereGeometry args={[0.025, 24, 16]} />
      </mesh>

      {g.wheels.map((w) => (
        <Wheel key={w.id} host="ute" offset={0} x={w.x} y={w.y} r={g.wheelR} rimR={g.rimR} width={g.tyreW} style="highway" />
      ))}
    </group>
  );
}
