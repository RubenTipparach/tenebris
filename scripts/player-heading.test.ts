// The walker's look never snap-turns (openspec player-heading).
// Run: npx tsx scripts/player-heading.test.ts
import * as THREE from 'three';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WalkerLook, newWalkerLook, transportUp, turnLook, lookAlong, lookQuaternion, lookDirection, tangentHeading,
} from '../src/player/WalkerLook';
import { PlayerConfig } from '../src/config/PlayerConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const LIMIT = THREE.MathUtils.degToRad(PlayerConfig.PITCH_LIMIT_DEG);
const DEG = 180 / Math.PI;
const finite = (v: THREE.Vector3) => [v.x, v.y, v.z].every(Number.isFinite);
const camForward = (l: WalkerLook) => new THREE.Vector3(0, 0, -1).applyQuaternion(lookQuaternion(l, new THREE.Quaternion()));
const camRight = (l: WalkerLook) => new THREE.Vector3(1, 0, 0).applyQuaternion(lookQuaternion(l, new THREE.Quaternion()));
const tangentAndUnit = (l: WalkerLook) =>
  finite(l.heading) && Math.abs(l.heading.length() - 1) < 1e-9 && Math.abs(l.heading.dot(l.up)) < 1e-9;

// ---- 1. walk straight over the north pole, turning the mouse steadily
{
  const R = 100;
  const steps = 2000;
  const stepArc = Math.PI / steps;          // half a great circle: equator, pole, far equator
  const yawPerStep = 0.002;                 // a steady mouse turn
  // Start on the equator at +X, heading north (+Y), walk in the X-Y plane
  const look = newWalkerLook(new THREE.Vector3(1, 0, 0));
  lookAlong(look, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), LIMIT);
  let prev = camForward(look);
  let worst = 0, bad = 0;
  for (let i = 1; i <= steps; i++) {
    const a = i * stepArc;
    const pos = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    transportUp(look, pos.clone().normalize());
    turnLook(look, yawPerStep, 0, LIMIT);
    const f = camForward(look);
    const d = prev.angleTo(f);
    worst = Math.max(worst, d);
    if (!tangentAndUnit(look)) bad++;
    prev = f;
  }
  ok(bad === 0, 'walking over the pole the heading stays a unit tangent every step');
  ok(worst <= stepArc + yawPerStep + 1e-9, `camera forward never turns more than walk arc + mouse a step (worst ${(worst * DEG).toFixed(4)} deg, bound ${((stepArc + yawPerStep) * DEG).toFixed(4)})`);
}

// ---- 2. the same walk passing EXACTLY through the pole (up = +Y, where
// Y x up = 0 and an axis-derived heading is undefined)
{
  const look = newWalkerLook(new THREE.Vector3(0, 0, 1));
  lookAlong(look, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), LIMIT);
  let prev = camForward(look), worst = 0;
  const steps = 360;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    transportUp(look, new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
    const f = camForward(look);
    worst = Math.max(worst, prev.angleTo(f));
    prev = f;
  }
  ok(worst <= Math.PI / steps + 1e-9, `exactly through the pole: no jump (worst ${(worst * DEG).toFixed(4)} deg a step)`);
  ok(look.heading.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-6, 'came out the far side still heading along the meridian (now -Y, away from the pole)');
}

// ---- 3. a walk round a hex planet's pentagon/odd tiles: up is radial, so
// tile shape never enters - a random wiggly path keeps every step bounded
{
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pos = new THREE.Vector3(0, 100, 0.5);
  const look = newWalkerLook(pos.clone().normalize());
  let prev = camForward(look), worst = 0, worstBound = 0, bad = 0;
  for (let i = 0; i < 20000; i++) {
    const yaw = (rnd() - 0.5) * 0.05, pitch = (rnd() - 0.5) * 0.05;
    const prevUp = look.up.clone();
    pos.addScaledVector(look.heading, 0.07).setLength(100);
    transportUp(look, pos.clone().normalize());
    turnLook(look, yaw, pitch, LIMIT);
    const f = camForward(look);
    const d = prev.angleTo(f);
    const bound = prevUp.angleTo(look.up) + Math.abs(yaw) + Math.abs(pitch) + 1e-9;
    if (d > bound) bad++;
    worst = Math.max(worst, d); worstBound = Math.max(worstBound, bound);
    prev = f;
  }
  ok(bad === 0, `20000 random walk+look steps near the pole: every camera step within walk arc + mouse (worst ${(worst * DEG).toFixed(3)} deg)`);
}

// ---- 4. teleport / planet switch: up jumps far, even to the antipode
{
  for (const target of [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 1, 1).normalize()]) {
    const look = newWalkerLook(new THREE.Vector3(0, 1, 0));
    lookAlong(look, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), LIMIT);
    transportUp(look, target);
    ok(tangentAndUnit(look) && look.up.distanceTo(target) < 1e-9, `teleport to up (${target.toArray().map(v => v.toFixed(2)).join(',')}): heading is a finite unit tangent there`);
  }
  // The case that broke the old projection: up turns 90 deg ALONG the heading,
  // so the old world-space forward is parallel to the new up
  const look = newWalkerLook(new THREE.Vector3(0, 1, 0));
  lookAlong(look, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), LIMIT);
  transportUp(look, new THREE.Vector3(0, 0, -1));
  ok(look.heading.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-9, 'up turned 90 deg along the heading: the heading is carried (now -Y), not replaced by a world axis');
  const projected = tangentHeading(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), new THREE.Vector3());
  ok(projected.distanceTo(look.heading) > 1, 'the old projection would have fallen back to an unrelated axis there (the snap)');
}

// ---- 5. NaN / zero guards: a bad frame cannot poison the look
{
  const look = newWalkerLook(new THREE.Vector3(0, 1, 0));
  const before = { h: look.heading.clone(), u: look.up.clone(), p: look.pitch };
  transportUp(look, new THREE.Vector3(NaN, 1, 0));
  transportUp(look, new THREE.Vector3(0, 0, 0));
  turnLook(look, NaN, 0.1, LIMIT);
  turnLook(look, 0.1, Infinity, LIMIT);
  lookAlong(look, new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(0, 1, 0), LIMIT);
  ok(look.heading.equals(before.h) && look.up.equals(before.u) && look.pitch === before.p, 'NaN / zero ups and deltas leave the look unchanged');
}

// ---- 6. raw mouse: a fast swipe lands in full this frame; pitch clamps
{
  const look = newWalkerLook(new THREE.Vector3(0, 1, 0));
  const h0 = look.heading.clone();
  turnLook(look, 2.5, 0, LIMIT);
  ok(Math.abs(h0.angleTo(look.heading) - 2.5) < 1e-9, 'a 2.5 rad swipe turns the heading 2.5 rad in one call');
  turnLook(look, 0, 10, LIMIT);
  ok(Math.abs(look.pitch - LIMIT) < 1e-12, 'pitch clamps at PlayerConfig.PITCH_LIMIT_DEG');
  const r = camRight(look);
  ok(Math.abs(r.dot(look.up)) < 1e-9, 'at the pitch limit the camera has no roll (right is perpendicular to up)');
  ok(camForward(look).angleTo(lookDirection(look, new THREE.Vector3())) < 1e-6, 'the camera looks along heading cos(pitch) + up sin(pitch)');
}

// ---- 7. hand-offs (load, rocket exit, end of the roll): look along a view
{
  // Looking straight down with the view's own up: the heading is the top of the screen
  const look = newWalkerLook(new THREE.Vector3(0, 1, 0));
  lookAlong(look, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0), LIMIT, new THREE.Vector3(1, 0, 0));
  ok(look.heading.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9 && Math.abs(look.pitch + LIMIT) < 1e-12, 'straight down: heading = the view\'s up, pitch at the limit');
  // Straight down without a view up keeps the current heading
  const keep = newWalkerLook(new THREE.Vector3(0, 1, 0));
  const h = keep.heading.clone();
  lookAlong(keep, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0), LIMIT);
  ok(keep.heading.distanceTo(h) < 1e-9, 'straight down with no view up: the heading is kept, not invented');
  // A level-ish view round-trips through the camera exactly
  const v = new THREE.Vector3(0.3, 0.2, -0.9).normalize();
  const rt = newWalkerLook(new THREE.Vector3(0, 1, 0));
  lookAlong(rt, v, new THREE.Vector3(0, 1, 0), LIMIT);
  ok(camForward(rt).angleTo(v) < 1e-9, 'a saved / handed-over view is the first frame\'s view');
}

// ---- 8. the one path: the walker uses this module, not a second copy
{
  const src = readFileSync(new URL('../src/player/PlanetPlayer.ts', import.meta.url), 'utf8');
  ok(!/surfaceForward/.test(src), 'PlanetPlayer no longer keeps a world-space surfaceForward');
  ok(/transportUp\(this\.look/.test(src) && /lookQuaternion\(this\.look/.test(src), 'PlanetPlayer builds its surface camera from the transported look');
  ok(!/lookAt\(eye/.test(src), 'no lookAt-built surface camera left');
  const main = readFileSync(new URL('../src/mainPlanet.ts', import.meta.url), 'utf8');
  ok(!/player\.position\.copy\(/.test(main), 'mainPlanet places the walker only through placeAt');
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : []);
  const srcDir = fileURLToPath(new URL('../src', import.meta.url));
  const direct = walk(srcDir).flatMap(f => readFileSync(f, 'utf8').split('\n')
    .filter(l => /\.requestPointerLock\(/.test(l) && !/this\.requestPointerLock\(/.test(l))
    .map(l => `${f}: ${l.trim()}`))
    .filter(l => !l.includes('InputManager.ts: const r = el.requestPointerLock()'));
  if (direct.length) console.log(direct.join('\n'));
  ok(direct.length === 0, 'every pointer lock goes through lockPointer (raw movement)');
}
