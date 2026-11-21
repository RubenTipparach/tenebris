// Air and suit tests (openspec wool-air-and-reentry, task 5.1).
// Run: npx tsx scripts/air.test.ts
import { AIR } from '../src/config/SurvivalConfig';
import { getBodyConfig } from '../src/config/SolarSystemConfig';
import { newAirState, tickAir, isExposed, airGauge, ExposureInput } from '../src/player/Survival';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const DT = 0.1;

/** Run `seconds` in DT steps; stops early on death. */
function run(s: ReturnType<typeof newAirState>, seconds: number, inp: { exposed: boolean; suitWorn: boolean; tanks: number }) {
  let t = 0, emptied = 0, tankAir = 0, died = false, diedAt = -1;
  let tanks = inp.tanks;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const fx = tickAir(s, DT, { exposed: inp.exposed, suitWorn: inp.suitWorn, oxygenTanks: tanks });
    t += DT;
    emptied += fx.tanksEmptied;
    tanks -= fx.tanksEmptied;
    tankAir += fx.tankAirS;
    if (fx.died) { died = true; diedAt = t; break; }
  }
  return { emptied, tankAir, died, diedAt, tanks };
}

// ---- held breath
{
  const s = newAirState();
  ok(s.breathS === AIR.BREATH_S && s.tankS === AIR.TANK_AIR_S, 'a fresh state has full breath and a full tank');
  const r = run(s, AIR.BREATH_S + 5, { exposed: true, suitWorn: false, tanks: 0 });
  ok(r.died && Math.abs(r.diedAt - AIR.BREATH_S) < DT + 1e-6, `no suit: breath runs out in BREATH_S (${AIR.BREATH_S} s) and the player dies (at ${r.diedAt.toFixed(1)} s)`);
}
{
  const s = newAirState();
  const r = run(s, AIR.BREATH_S + 5, { exposed: true, suitWorn: true, tanks: 0 });
  ok(r.died && r.tankAir === 0, 'a suit with no tanks still dies');
}
{
  const s = newAirState();
  const r = run(s, AIR.BREATH_S + 5, { exposed: true, suitWorn: false, tanks: 3 });
  ok(r.died && r.emptied === 0, 'tanks without a suit do nothing');
}

// ---- suit + tanks
{
  const s = newAirState();
  const before = run(s, AIR.TANK_AIR_S - 1, { exposed: true, suitWorn: true, tanks: 2 });
  ok(!before.died && before.emptied === 0, 'suit + tanks breathes: the first tank holds for nearly TANK_AIR_S');
  ok(s.breathS === AIR.BREATH_S, 'breath stays full on tank air');
  const g = airGauge(s, true);
  ok(Math.abs(g.seconds - 1) < 1e-6 && g.low, 'the gauge shows the tank running low');
  const swap = run(s, 2, { exposed: true, suitWorn: true, tanks: 2 });
  ok(swap.emptied === 1 && !swap.died, 'at TANK_AIR_S the tank runs out and is swapped for an empty one');
  ok(Math.abs(s.tankS - (AIR.TANK_AIR_S - 1)) < 1e-6, '...and the next tank is drawn at once');
  const total = before.tankAir + swap.tankAir;
  ok(Math.abs(total - (AIR.TANK_AIR_S + 1)) < 1e-6, `tank seconds are counted for the 'suited' mission (${total.toFixed(1)} s)`);
}
{
  // Two tanks last 2 x TANK_AIR_S, then held breath, then death
  const s = newAirState();
  const r = run(s, AIR.TANK_AIR_S * 2 + AIR.BREATH_S + 5, { exposed: true, suitWorn: true, tanks: 2 });
  ok(r.emptied === 2 && r.died && Math.abs(r.diedAt - (AIR.TANK_AIR_S * 2 + AIR.BREATH_S)) < 2 * DT,
    `two tanks last ${AIR.TANK_AIR_S * 2} s, then the breath, then death (at ${r.diedAt.toFixed(1)} s)`);
}
{
  // One big step that crosses a tank boundary: the leftover draws the next tank
  const s = newAirState();
  s.tankS = 1;
  const fx = tickAir(s, 3, { exposed: true, suitWorn: true, oxygenTanks: 2 });
  ok(fx.tanksEmptied === 1 && Math.abs(s.tankS - (AIR.TANK_AIR_S - 2)) < 1e-6 && Math.abs(fx.tankAirS - 3) < 1e-6, 'a step across a tank boundary carries on into the next tank');
}

// ---- recovery
{
  const s = newAirState();
  run(s, AIR.BREATH_S / 2, { exposed: true, suitWorn: false, tanks: 0 });
  ok(Math.abs(s.breathS - AIR.BREATH_S / 2) < 1e-6, 'half the breath held');
  const tankBefore = s.tankS;
  run(s, (AIR.BREATH_S / 2) / AIR.BREATH_RECOVER_RATE, { exposed: false, suitWorn: true, tanks: 3 });
  ok(Math.abs(s.breathS - AIR.BREATH_S) < 1e-6, `safe air refills it BREATH_RECOVER_RATE (${AIR.BREATH_RECOVER_RATE}x) faster`);
  ok(s.tankS === tankBefore, 'the suit draws no tank air where the air is safe');
  ok(!airGauge(s, false).low, 'a full breath is not low');
}

// ---- the exposure rule
{
  const at = (body: string, extra: Partial<ExposureInput> = {}): ExposureInput => ({
    inRocket: false, rocketPowered: false, inGravityWell: true, bodyBreathable: getBodyConfig(body)?.breathable === true, ...extra,
  });
  ok(!isExposed(at('earth')), 'on Earth (breathable): safe');
  ok(getBodyConfig('moon')?.breathable === false && isExposed(at('moon')), 'on the Moon (airless): exposed');
  ok(isExposed(at('earth', { inGravityWell: false, bodyBreathable: false })), 'open space outside a rocket: exposed');
  ok(!isExposed(at('moon', { inRocket: true, rocketPowered: true })), 'a powered rocket cabin on the Moon: safe');
  ok(!isExposed({ inRocket: true, rocketPowered: true, inGravityWell: false, bodyBreathable: false }), 'a powered rocket cabin in open space: safe');
  ok(isExposed(at('earth', { inRocket: true, rocketPowered: false })), 'an unpowered rocket cabin, even over Earth: exposed');
  for (const id of ['earth', 'sequoia', 'verdance', 'mirewood']) ok(getBodyConfig(id)?.breathable === true, `${id} is breathable`);
}
