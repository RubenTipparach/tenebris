// The launch pad's stack editor (and a refit): remove, insert or move a part
// anywhere in the stack, and parts stacking flush (no overlap = no z-fight).
// Run: npx tsx scripts/rocket-stack-edit.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const el = () => ({ style: {} as Record<string, string>, innerHTML: '', textContent: '', hidden: false, disabled: false, remove() {}, append() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
(globalThis as unknown as { document: unknown }).document = { getElementById: () => null, createElement: el, body: { appendChild() {} }, addEventListener() {}, head: { appendChild() {} } };
(globalThis as unknown as { requestAnimationFrame: () => number }).requestAnimationFrame = () => 0;

const THREE = await import('three');
const { ItemType, ITEM_DATA } = await import('../src/player/Inventory');
const { stackAfter, planRefit, padEditProblem, partAtSlot, partStartSlots, stackUnits, dropOp } = await import('../src/rocket/Refit');
const { stackPartHeights, ROCKET_SEGMENT_HEIGHT, LaunchPadManager } = await import('../src/planet/LaunchPad');
const { PlayerConfig } = await import('../src/config/PlayerConfig');
const { computeRocketStats } = await import('../src/rocket/RocketPerformance');
const I = ItemType;
const STACK = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.LARGE_FUEL_TANK, I.COMMAND_MODULE];

test('remove at: the part goes, the parts above slide down', () => {
  assert.deepEqual(stackAfter(STACK, { kind: 'remove', index: 1 }), [I.ROCKET_ENGINE, I.LARGE_FUEL_TANK, I.COMMAND_MODULE]);
  assert.deepEqual(stackAfter(STACK, { kind: 'remove', index: 0 }), [I.MEDIUM_FUEL_TANK, I.LARGE_FUEL_TANK, I.COMMAND_MODULE]);
});

test('insert at: the new part goes in at the index, the rest move up; at the length it goes on top', () => {
  assert.deepEqual(stackAfter(STACK, { kind: 'insert', index: 1, itemType: I.CARGO_BAY }), [I.ROCKET_ENGINE, I.CARGO_BAY, I.MEDIUM_FUEL_TANK, I.LARGE_FUEL_TANK, I.COMMAND_MODULE]);
  assert.deepEqual(stackAfter(STACK, { kind: 'insert', index: STACK.length, itemType: I.CARGO_BAY }), [...STACK, I.CARGO_BAY]);
  assert.deepEqual(stackAfter([], { kind: 'insert', index: 0, itemType: I.ROCKET_ENGINE }), [I.ROCKET_ENGINE]);
});

test('move: the part ends up at the target index, the ones between shift over', () => {
  assert.deepEqual(stackAfter(STACK, { kind: 'move', from: 3, to: 1 }), [I.ROCKET_ENGINE, I.COMMAND_MODULE, I.MEDIUM_FUEL_TANK, I.LARGE_FUEL_TANK]);
  assert.deepEqual(stackAfter(STACK, { kind: 'move', from: 1, to: 3 }), [I.ROCKET_ENGINE, I.LARGE_FUEL_TANK, I.COMMAND_MODULE, I.MEDIUM_FUEL_TANK]);
  assert.deepEqual(stackAfter(STACK, { kind: 'move', from: 2, to: 2 }), STACK);
  // A move takes nothing off and puts nothing on
  const plan = planRefit(STACK, { kind: 'move', from: 1, to: 2 });
  assert.equal(plan.takenOff, null);
  assert.equal(plan.putOn, null);
});

test('height slots: a two-unit part covers two slots, above the stack is -1', () => {
  assert.deepEqual(partStartSlots(STACK), [0, 1, 2, 4]);
  assert.equal(stackUnits(STACK), 5);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(s => partAtSlot(STACK, s)), [0, 1, 2, 2, 3, -1]);
});

test('a drop: a new part goes under the part it lands on, or on top above the stack; a dragged part takes the target\'s place', () => {
  assert.deepEqual(dropOp(STACK, 3, { itemType: I.CARGO_BAY }), { kind: 'insert', index: 2, itemType: I.CARGO_BAY });
  assert.deepEqual(dropOp(STACK, 6, { itemType: I.CARGO_BAY }), { kind: 'insert', index: 4, itemType: I.CARGO_BAY });
  assert.deepEqual(dropOp(STACK, 0, { from: 3 }), { kind: 'move', from: 3, to: 0 });
  assert.deepEqual(dropOp(STACK, 7, { from: 0 }), { kind: 'move', from: 0, to: 3 });
});

test('the pad editor keeps the stack inside the tower, and may hold a stack that does not fly yet', () => {
  assert.equal(padEditProblem(STACK, { kind: 'insert', index: 0, itemType: I.CARGO_BAY }, 6), null);
  assert.match(padEditProblem(STACK, { kind: 'insert', index: 0, itemType: I.LARGE_FUEL_TANK }, 6) ?? '', /tower/);
  assert.equal(padEditProblem(STACK, { kind: 'remove', index: 3 }, 5), null, 'no command module yet is fine on the pad');
  assert.equal(padEditProblem(STACK, { kind: 'remove', index: 9 }, 5), 'No such part');
  assert.equal(padEditProblem(STACK, { kind: 'move', from: 0, to: 3 }, 5), null);
});

test('every part model fills exactly its slots: the stacked hulls meet flush (no overlap to z-fight, no gap)', () => {
  // The OBJ part models are authored base at y = 0, one segment tall
  const modelTop = (path: string) => Math.max(...readFileSync(`public${path}`, 'utf8').split('\n')
    .filter(l => l.startsWith('v ')).map(l => Number(l.split(/\s+/)[2])));
  const types = Object.keys(ITEM_DATA).map(Number).filter(t => ITEM_DATA[t as ItemType].rocketPart) as ItemType[];
  for (const t of types) {
    const p = ITEM_DATA[t].rocketPart!;
    const h = modelTop(p.modelPath) * (p.modelScale?.y ?? 1);
    assert.ok(Math.abs(h - p.heightUnits * ROCKET_SEGMENT_HEIGHT) < 1e-3, `${ITEM_DATA[t].name}: model is ${h} m tall for ${p.heightUnits} unit(s)`);
  }
  // Stacked: each model's base sits on the top of the one below
  const stack = [I.ROCKET_ENGINE, I.LARGE_FUEL_TANK, I.FUEL_TANK_MK2, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
  const origins = stackPartHeights(stack, ROCKET_SEGMENT_HEIGHT);
  let bottom = 0;
  stack.forEach((t, i) => {
    const base = origins[i] + PlayerConfig.ROCKET_STACK_OFFSET_Y;
    assert.ok(Math.abs(base - bottom) < 1e-9, `${ITEM_DATA[t].name} base ${base} should be ${bottom}`);
    bottom += ITEM_DATA[t].rocketPart!.heightUnits * ROCKET_SEGMENT_HEIGHT;
  });
});

// ---- the pad applying an edit (models stubbed) ----
function fakePad() {
  const slots = (n: number) => Array.from({ length: n }, () => ({ itemType: I.NONE, quantity: 0 }));
  return {
    isComplete: true, segmentCount: 8, rocketParts: [] as InstanceType<typeof import('../src/planet/RocketPart').RocketPart>[],
    mesh: new THREE.Group(), position: new THREE.Vector3(0, 100, 0), planetCenter: new THREE.Vector3(),
    towerTileCenter: new THREE.Vector3(2, 100, 0), cargo: slots(0), equipment: slots(0), fuel: null as number | null,
    engineMode: null, hasRocketEngine: false, rocketEngineMesh: null,
  };
}
function fakeManager() {
  const m = Object.create(LaunchPadManager.prototype);
  const assets = { geometry: new THREE.BoxGeometry(), material: new THREE.ShaderMaterial() };
  Object.assign(m, { SEGMENT_HEIGHT: ROCKET_SEGMENT_HEIGHT, ROCKET_PART_SCALE: 1, loadRocketPartAssets: async () => assets });
  return m as InstanceType<typeof LaunchPadManager>;
}
const radial = (pad: ReturnType<typeof fakePad>) => pad.rocketParts.map(p => p.mesh.position.length());

test('a middle edit on the pad restacks the meshes, keeps the cargo and the fuel', async () => {
  const m = fakeManager();
  const pad = fakePad();
  const start = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
  assert.equal(await m.setRocketStack(pad as never, start), null);
  assert.deepEqual(pad.rocketParts.map(p => p.itemType), start);
  assert.equal(pad.mesh.children.length, 4);
  pad.cargo[0] = { itemType: I.ICE, quantity: 5 };
  pad.fuel = 150;
  const before = radial(pad);
  // Take the middle tank out: the command module slides down one slot
  assert.equal(await m.setRocketStack(pad as never, stackAfter(start, { kind: 'remove', index: 1 })), null);
  assert.deepEqual(pad.rocketParts.map(p => p.itemType), [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]);
  assert.equal(pad.mesh.children.length, 3, 'the old meshes are gone');
  const after = radial(pad);
  assert.ok(Math.abs(after[0] - before[0]) < 1e-9, 'the engine did not move');
  assert.ok(Math.abs(after[2] - before[2]) < 1e-9, 'the module came down to the second tank\'s height');
  assert.deepEqual(pad.cargo[0], { itemType: I.ICE, quantity: 5 }, 'the cargo came through');
  assert.equal(pad.fuel, Math.min(150, computeRocketStats(pad.rocketParts.map(p => p.itemType)).fuelCapacity));
  // Insert a cargo bay under the command module
  assert.equal(await m.setRocketStack(pad as never, stackAfter(pad.rocketParts.map(p => p.itemType), { kind: 'insert', index: 2, itemType: I.CARGO_BAY })), null);
  assert.deepEqual(pad.rocketParts.map(p => p.itemType), [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.CARGO_BAY, I.COMMAND_MODULE]);
  assert.deepEqual(pad.cargo[0], { itemType: I.ICE, quantity: 5 });
  assert.deepEqual(pad.rocketParts.map(p => p.heightIndex), [0, 1, 2, 3]);
});

test('an edit that would spill the cargo is refused and changes nothing', async () => {
  const m = fakeManager();
  const pad = fakePad();
  await m.setRocketStack(pad as never, [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]);
  const slots = pad.cargo.length;
  pad.cargo.forEach(s => { s.itemType = I.ICE; s.quantity = 1; });
  assert.ok(slots > 0);
  const why = await m.setRocketStack(pad as never, [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK]);
  assert.match(why ?? '', /cargo/);
  assert.equal(pad.rocketParts.length, 3);
});

test('part tooltips: the name, the key numbers and the stage a part is in', async () => {
  const { partTooltipLines, stageOfPart } = await import('../src/rocket/RocketPerformance');
  const { slotTooltip } = await import('../src/player/ToolUI');
  const engine = partTooltipLines(I.VACUUM_ENGINE).join('\n');
  assert.match(engine, /Engine/);
  assert.match(engine, /Mass \d+ kg/);
  assert.match(engine, /Thrust [\d.]+ kN, Isp \d+ s/);
  assert.match(partTooltipLines(I.LARGE_FUEL_TANK).join('\n'), /Fuel 300 units/);
  assert.match(partTooltipLines(I.LARGE_FUEL_TANK).join('\n'), /Takes 2 stack slots/);
  assert.match(partTooltipLines(I.COMMAND_MODULE).join('\n'), /Cargo 4 slots[\s\S]*Equipment 3 slots/);
  assert.deepEqual(partTooltipLines(I.ICE), []);
  // The inventory's slot tooltip shows the same lines under the name
  assert.equal(slotTooltip({ itemType: I.LARGE_FUEL_TANK, quantity: 1 }).split('\n')[0], ITEM_DATA[I.LARGE_FUEL_TANK].name);
  assert.equal(slotTooltip({ itemType: I.ICE, quantity: 3 }), ITEM_DATA[I.ICE].name);
  // Every line is plain ASCII (in-game text rule)
  for (const t of Object.keys(ITEM_DATA).map(Number) as ItemType[]) {
    for (const line of partTooltipLines(t)) assert.ok(/^[\x20-\x7e]*$/.test(line), line);
  }
  const staged = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
  assert.deepEqual(staged.map((_, i) => stageOfPart(staged, i)), [1, 1, 1, 2, 2, 2]);
});

test('the staging prompt reads its key from the binding', async () => {
  const { inputKeyLabel, ROCKET_INPUTS } = await import('../src/config/RocketConfig');
  assert.equal(inputKeyLabel('KeyN'), 'N');
  assert.equal(inputKeyLabel('Digit3'), '3');
  assert.equal(inputKeyLabel('ArrowUp'), 'Up');
  assert.equal(inputKeyLabel('Space'), 'Space');
  assert.equal(inputKeyLabel(ROCKET_INPUTS.STAGE), ROCKET_INPUTS.STAGE.replace(/^Key/, ''));
});
