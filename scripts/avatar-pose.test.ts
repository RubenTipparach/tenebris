// Other players' avatars: body upright, head pitched, actions on the pose
// frame (openspec avatar-anims).
// Run: npx tsx scripts/avatar-pose.test.ts
import * as THREE from 'three';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  AVATAR_FROM_WALKER, ActionFrame, IDLE_ACTION, LocalAction, LoopAction, OneShotTracker, ShotAction,
  avatarTransforms, decodeAction, encodeAction,
} from '../src/net/AvatarPose';
import { lookQuaternion } from '../src/player/WalkerLook';
import { AvatarConfig } from '../src/config/AvatarConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;
const DEG = Math.PI / 180;
const HEAD_LIMIT = AvatarConfig.HEAD_PITCH_LIMIT_DEG * DEG;
const WALK_LIMIT = PlayerConfig.PITCH_LIMIT_DEG * DEG;
const root = new URL('..', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');

/**
 * The pose frame's q for a walker on the surface with up `up`, whose CAMERA
 * looks along heading `hc` (tangent) pitched `pc` above the horizon - built
 * the way the game builds it: the walker look is held in its -look
 * convention (PlanetPlayer: the camera looks along -localForward), turned
 * by lookQuaternion, then AVATAR_FROM_WALKER (mainPlanet getPose).
 */
function wireQ(up: THREE.Vector3, hc: THREE.Vector3, pc: number): THREE.Quaternion {
  const o = lookQuaternion({ heading: hc.clone().negate(), up: up.clone(), pitch: -pc }, new THREE.Quaternion());
  return o.multiply(AVATAR_FROM_WALKER);
}

// Deterministic pseudo-random
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const randUnit = () => new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();

// ---- 1. the wire q really is the camera (guards the test's own model)
{
  const up = new THREE.Vector3(0, 1, 0), hc = new THREE.Vector3(1, 0, 0), pc = 30 * DEG;
  const q = wireQ(up, hc, pc);
  const look = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const expect = hc.clone().multiplyScalar(Math.cos(pc)).addScaledVector(up, Math.sin(pc));
  ok(look.distanceTo(expect) < 1e-9, 'wire q: avatar -Z is the camera look');
}

// ---- 2. body stays upright, faces the heading; head takes the clamped pitch
{
  let worstUp = 0, worstFwd = 0, worstPitch = 0, finite = true;
  for (let i = 0; i < 2000; i++) {
    const up = randUnit();
    const hc = randUnit().projectOnPlane(up).normalize();
    // pitches across the whole walker range, the limits included
    const pc = i % 10 === 0 ? (i % 20 === 0 ? WALK_LIMIT : -WALK_LIMIT) : (rnd() * 2 - 1) * WALK_LIMIT;
    const t = avatarTransforms(wireQ(up, hc, pc), up);
    const bodyUp = new THREE.Vector3(0, 1, 0).applyQuaternion(t.body);
    const bodyFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(t.body);
    finite &&= [t.body.x, t.body.y, t.body.z, t.body.w, t.headPitch].every(Number.isFinite);
    worstUp = Math.max(worstUp, bodyUp.distanceTo(up));
    worstFwd = Math.max(worstFwd, bodyFwd.distanceTo(hc));
    worstPitch = Math.max(worstPitch, Math.abs(t.headPitch - THREE.MathUtils.clamp(pc, -HEAD_LIMIT, HEAD_LIMIT)));
  }
  ok(finite, 'body / head finite for every pose');
  ok(worstUp < 1e-6, `body up == surface up at every pitch (worst ${worstUp.toExponential(1)})`);
  ok(worstFwd < 1e-6, `body faces the heading at every pitch, straight down included (worst ${worstFwd.toExponential(1)})`);
  ok(worstPitch < 1e-6, `head pitch == look pitch clamped to +-${AvatarConfig.HEAD_PITCH_LIMIT_DEG} deg (worst ${worstPitch.toExponential(1)})`);
}

// ---- 3. the owner's screenshot: looking down tips only the head
{
  const up = new THREE.Vector3(0, 0, 1), hc = new THREE.Vector3(0, 1, 0);
  const down = avatarTransforms(wireQ(up, hc, -WALK_LIMIT), up);
  const upLook = avatarTransforms(wireQ(up, hc, 40 * DEG), up);
  const tilt = (t: { body: THREE.Quaternion }) => new THREE.Vector3(0, 1, 0).applyQuaternion(t.body).angleTo(up);
  ok(tilt(down) < 1e-6 && near(down.headPitch, -HEAD_LIMIT), 'looking straight down: body level, head at -limit');
  ok(tilt(upLook) < 1e-6 && near(upLook.headPitch, 40 * DEG), 'looking 40 deg up: body level, head at +40 deg');
  // A pose with the body already upright (pitch 0) is unchanged
  const level = wireQ(up, hc, 0);
  ok(avatarTransforms(level, up).body.angleTo(level) < 1e-6, 'a level pose keeps its orientation');
}

// ---- 4. the action field: round trip, old clients, junk
{
  const frames: ActionFrame[] = [
    { ...IDLE_ACTION },
    { loop: LoopAction.MINE, shotKind: ShotAction.PLACE, shotSeq: 17, held: 1 },
    { loop: LoopAction.IDLE, shotKind: ShotAction.INTERACT, shotSeq: AvatarConfig.SHOT_SEQ_MOD - 1, held: 300 },
    { loop: LoopAction.MINE, shotKind: ShotAction.SWING, shotSeq: 0, held: 0 },
  ];
  ok(frames.every(f => JSON.stringify(decodeAction(JSON.parse(JSON.stringify(encodeAction(f))))) === JSON.stringify(f)),
    'encode -> JSON -> decode round-trips every field');
  ok(encodeAction(frames[1]).length === 4 && encodeAction(frames[1]).every(Number.isInteger), 'encoded as four integers');
  const idle = JSON.stringify(IDLE_ACTION);
  const junk: unknown[] = [undefined, null, 5, 'mine', {}, [1, 2, 3], [1, 2, 3, 4, 5], [9, 0, 0, 0], [0, 9, 0, 0],
    [0, 0, AvatarConfig.SHOT_SEQ_MOD, 0], [0, 0, 0, -1], [0, 0, 0.5, 0], [0, 0, 0, AvatarConfig.ACTION_FIELD_MAX + 1], ['1', 0, 0, 0]];
  ok(junk.every(j => JSON.stringify(decodeAction(j)) === idle), 'missing (old client) or malformed `a` decodes as idle, empty hand');
}

// ---- 5. one-shots: a missed frame still plays exactly one, repeats none
{
  const sender = new LocalAction();
  const rx = new OneShotTracker();
  const plays: ShotAction[] = [];
  const recv = (f: ActionFrame) => { const s = rx.next(f); if (s !== ShotAction.NONE) plays.push(s); };
  recv(sender.frame(0, 0));                 // primes, plays nothing
  sender.shot(ShotAction.PLACE);
  sender.frame(0.1, 0);                     // this frame is lost
  recv(sender.frame(0.2, 0));               // the next one carries the same counter
  recv(sender.frame(0.3, 0));
  recv(sender.frame(0.4, 0));
  ok(plays.length === 1 && plays[0] === ShotAction.PLACE, `missed frame: exactly one place (${plays.join(',')})`);

  // two one-shots between frames play once (latest kind), then one more
  sender.shot(ShotAction.PLACE);
  sender.shot(ShotAction.INTERACT);
  recv(sender.frame(0.5, 0));
  recv(sender.frame(0.6, 0));
  sender.shot(ShotAction.SWING);
  recv(sender.frame(0.7, 0));
  ok(JSON.stringify(plays) === JSON.stringify([ShotAction.PLACE, ShotAction.INTERACT, ShotAction.SWING]),
    `coalesced shots play once each frame they change (${plays.join(',')})`);

  // joining mid-session never replays an old swing
  const late = new OneShotTracker();
  ok(late.next(sender.frame(0.8, 0)) === ShotAction.NONE, 'a joiner primes on the first frame');

  // the counter wraps and still triggers
  const w = new LocalAction();
  const wrx = new OneShotTracker();
  wrx.next(w.frame(0, 0));
  let count = 0;
  for (let i = 0; i < AvatarConfig.SHOT_SEQ_MOD + 3; i++) {
    w.shot(ShotAction.PLACE);
    if (wrx.next(decodeAction(encodeAction(w.frame(i, 0)))) !== ShotAction.NONE) count++;
  }
  ok(count === AvatarConfig.SHOT_SEQ_MOD + 3, `counter wrap keeps triggering (${count})`);
}

// ---- 6. mining is continuous across the break-frame gap; held item passes through
{
  const a = new LocalAction();
  a.mining(1.0);
  ok(a.frame(1.0 + AvatarConfig.MINE_GRACE_S * 0.5, 0).loop === LoopAction.MINE, 'mining within the grace: still mining');
  ok(a.frame(1.0 + AvatarConfig.MINE_GRACE_S * 2, 0).loop === LoopAction.IDLE, 'mining released: idle after the grace');
  const slow = new LocalAction();
  slow.frameAt(4.0);     // 1 fps
  slow.frameAt(5.0);
  slow.mining(5.0);
  ok(slow.frame(5.9, 0).loop === LoopAction.MINE, 'at 1 fps the grace covers the frame gap');
  ok(a.frame(0, 42).held === 42 && a.frame(0, -3).held === 0 && a.frame(0, 1.5).held === 0, 'held item id: valid ids only');
}

// ---- 7. the baked clips exist (the shipped file, not a copy)
{
  const f = JSON.parse(read('public/animations/player.anim.json'));
  for (const clip of ['idle', 'move', 'mine', 'place', 'interact']) {
    const c = f.clips[clip];
    ok(!!c && c.duration > 0 && Array.isArray(c.tracks?.armR ?? c.tracks?.armL) &&
      Object.values(c.tracks as Record<string, number[][]>).every(t => t.length === f.frames && t.every(k => k.length === 4)),
      `player.anim.json has a well-formed '${clip}' clip`);
  }
  ok(read('scripts/gen-fauna-anims.py').includes("'mine': ("), 'the clips come from gen-fauna-anims.py');
}

// ---- 8. one path: every right-click action reports a one-shot; the pose carries `a`
{
  const pbi = read('src/player/PlanetBlockInteraction.ts');
  const bare = pbi.match(/rightClickCooldown = this\.CLICK_COOLDOWN/g) ?? [];
  ok(bare.length === 1 && /usedRightClick\(kind: ShotAction\): void \{\s*this\.rightClickCooldown = this\.CLICK_COOLDOWN/.test(pbi),
    'the click cooldown is set only in usedRightClick (every right-click action is a one-shot)');
  ok(/updateMiningUI\(progress: number\): void \{\s*if \(progress > 0\) this\.action\.mining/.test(pbi), 'mining noticed at updateMiningUI');
  const mp = read('src/net/Multiplayer.ts');
  ok(/t: 'pose'[^}]*a: encodeAction\(pose\.a\)/.test(mp), 'Multiplayer sends `a` on the existing pose frame');
  ok(!/group\.quaternion\.slerp\(r\.targetQ/.test(mp), 'the avatar body no longer slerps onto the raw (pitched) q');
}

// ---- 9. the real server relays `a` (and still relays a pose without one)
async function serverRelay(): Promise<void> {
  const serverDir = new URL('server-js/', root);
  const req = createRequire(new URL('package.json', serverDir));
  let WS: any;
  try { WS = req('ws'); } catch {
    console.log('SKIP server relay (run `npm ci` in server-js/ to include it)');
    return;
  }
  const port = 18000 + Math.floor(rnd() * 1000);
  const dataDir = mkdtempSync(join(tmpdir(), 'avatar-pose-'));
  const proc = spawn(process.execPath, [new URL('server.js', serverDir).pathname],
    { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir }, stdio: 'ignore' });
  try {
    const t0 = Date.now();
    while (!(await fetch(`http://127.0.0.1:${port}/health`).then(r => r.ok).catch(() => false))) {
      if (Date.now() - t0 > 10000) throw new Error('server did not start');
      await new Promise(r => setTimeout(r, 100));
    }
    const open = () => new Promise<any>((res, rej) => {
      const ws = new WS(`ws://127.0.0.1:${port}/`);
      const inbox: any[] = [];
      ws.on('message', (d: any) => inbox.push(JSON.parse(String(d))));
      ws.on('open', () => { ws.send(JSON.stringify({ t: 'hello', name: 'x', look: {} })); res({ ws, inbox }); });
      ws.on('error', rej);
    });
    const A = await open(), B = await open();
    await new Promise(r => setTimeout(r, 300));
    const pose = { t: 'pose', planet: 'earth', p: [1, 2, 3], q: [0, 0, 0, 1] };
    A.ws.send(JSON.stringify({ ...pose, a: [1, 2, 7, 33] }));
    A.ws.send(JSON.stringify({ ...pose, a: [1, 2, 'x', 33] }));
    A.ws.send(JSON.stringify(pose));
    await new Promise(r => setTimeout(r, 400));
    const got = B.inbox.filter((m: any) => m.t === 'pose');
    ok(got.length === 3, `server relays all three poses (${got.length})`);
    ok(JSON.stringify(got[0]?.a) === '[1,2,7,33]', 'server relays a valid `a` unchanged');
    ok(got[1] && got[1].a === undefined && got[2] && got[2].a === undefined, 'server drops a bad `a`, keeps the pose; no `a` stays no `a`');
    A.ws.close(); B.ws.close();
  } finally {
    proc.kill();
  }
}
if (existsSync(new URL('server-js/server.js', root))) await serverRelay();
