// Power grid, oil and nuclear tests (openspec industry-and-nuclear, tasks 3-5).
// Run: npx tsx scripts/power.test.ts
import * as THREE from 'three';
import { ItemType } from '../src/player/Inventory';
import { solveNetwork } from '../src/power/PowerGrid';
import { POWER_CONFIG, MACHINE_CONFIG, FABRICATOR_RECIPES } from '../src/config/PowerConfig';
import { newMachineState, tickMachine, wantsPower, machineSupplyW, loadInput, machineRecord, machineFromRecord } from '../src/power/MachineLogic';
import { ROCKET_CONFIG } from '../src/config/RocketConfig';
import { ELECTRONICS_RECIPES } from '../src/player/ElectronicsWorkbenchUI';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const S = POWER_CONFIG.SUPPLY_W, D = POWER_CONFIG.DEMAND_W;
const lead = POWER_CONFIG.BATTERIES[ItemType.BATTERY_LEAD_ACID];

// ---- 3.1 the solver
{
  // one steam engine runs one electric furnace
  const r = solveNetwork([{ id: 'e', watts: S.steamEngine! }], [{ id: 'f', watts: D.electricFurnace! }], [], 1);
  ok(r.powered && r.supplyW === 2000 && r.demandW === 1000, 'a steam engine runs an electric furnace');
}
{
  // overload: one engine, a furnace + a refinery + a centrifuge -> every machine stops
  const r = solveNetwork([{ id: 'e', watts: S.steamEngine! }],
    [{ id: 'f', watts: D.electricFurnace! }, { id: 'r', watts: D.refinery! }, { id: 'c', watts: D.centrifuge! }], [], 1);
  ok(!r.powered, 'overload stops the machines');
}
{
  // battery covers the gap, then drains, then the machines stop
  const bat = { id: 'b', chargeWh: 100, capacityWh: lead.capacityWh, maxRateW: lead.maxRateW };
  const dt = 60;  // a minute a step
  let r = solveNetwork([], [{ id: 'f', watts: D.electricFurnace! }], [bat], dt);
  ok(r.powered, 'a battery runs a furnace with no generator');
  ok(near(r.batteryCharge.get('b')!, 100 - 1000 * dt / 3600), 'it drains by watts x hours');
  let steps = 0;
  let charge = r.batteryCharge.get('b')!;
  while (r.powered && steps < 100) {
    r = solveNetwork([], [{ id: 'f', watts: 1000 }], [{ ...bat, chargeWh: charge }], dt);
    charge = r.batteryCharge.get('b')!;
    steps++;
  }
  ok(!r.powered && charge < 1000 * dt / 3600, `...and the furnace stops once it is drained (after ${steps + 1} min)`);
}
{
  // the battery's rate limit: 2 kW battery can't carry a 20 kW fabricator
  const r = solveNetwork([], [{ id: 'n', watts: D.nuclearFabricator! }], [{ id: 'b', chargeWh: 9999, capacityWh: lead.capacityWh, maxRateW: lead.maxRateW }], 1);
  ok(!r.powered && r.batteryCharge.get('b') === 9999, 'a battery past its rate does not carry the load (and is not drawn)');
}
{
  // surplus charges, up to rate and capacity
  const r = solveNetwork([{ id: 'e', watts: 2000 }], [{ id: 'f', watts: 1000 }], [{ id: 'b', chargeWh: 0, capacityWh: lead.capacityWh, maxRateW: lead.maxRateW }], 3600);
  ok(near(r.batteryCharge.get('b')!, 1000), 'surplus (1 kW for 1 h) charges the battery 1 kWh');
  const full = solveNetwork([{ id: 'e', watts: 2000 }], [], [{ id: 'b', chargeWh: lead.capacityWh - 10, capacityWh: lead.capacityWh, maxRateW: lead.maxRateW }], 3600);
  ok(full.batteryCharge.get('b') === lead.capacityWh, 'charging stops at capacity');
  const idle = solveNetwork([{ id: 'e', watts: 2000 }], [{ id: 'f', watts: 9000 }], [{ id: 'b', chargeWh: 0, capacityWh: lead.capacityWh, maxRateW: lead.maxRateW }], 3600);
  ok(!idle.powered && near(idle.batteryCharge.get('b')!, 2000), 'an overloaded network still charges its batteries with what it makes');
}
{
  const r = solveNetwork([{ id: 'r', watts: S.reactor!, nuclear: true }, { id: 'e', watts: S.steamEngine! }], [], [], 1);
  ok(r.nuclearW === S.reactor && r.supplyW === S.reactor! + S.steamEngine!, 'reactor supply is reported as nuclear');
}

// ---- 3.2 batteries: each tier holds more, and its charge is saved
{
  const tiers = [ItemType.BATTERY_LEAD_ACID, ItemType.BATTERY_LITHIUM, ItemType.BATTERY_SOLID_STATE].map(t => POWER_CONFIG.BATTERIES[t]);
  ok(tiers[0].capacityWh === 10000 && tiers[1].capacityWh === 40000 && tiers[2].capacityWh === 150000, 'battery capacities are 10 / 40 / 150 kWh');
  ok(tiers.every((t, i) => i === 0 || (t.capacityWh > tiers[i - 1].capacityWh && t.maxRateW > tiers[i - 1].maxRateW)), 'capacities and rates increase tier by tier');
  const b = newMachineState(ItemType.BATTERY_LITHIUM, 5, 30, new THREE.Vector3(1, 2, 3), 0);
  b.chargeWh = 1234;
  const back = machineFromRecord(JSON.parse(JSON.stringify(machineRecord(b))));
  ok(back.kind === 'battery' && back.chargeWh === 1234 && back.itemType === ItemType.BATTERY_LITHIUM, 'battery charge survives its saved record');
  const made = (t: ItemType) => ELECTRONICS_RECIPES.find(r => r.output.itemType === t);
  ok(!!made(ItemType.BATTERY_LEAD_ACID)?.inputs.some(i => i.itemType === ItemType.SULFUR), 'lead-acid battery is made with sulfur');
  ok(!!made(ItemType.BATTERY_LITHIUM)?.inputs.some(i => i.itemType === ItemType.INGOT_LITHIUM)
    && !!made(ItemType.BATTERY_LITHIUM)?.inputs.some(i => i.itemType === ItemType.INGOT_COBALT), 'lithium-ion battery is made with lithium and cobalt');
  ok(!!made(ItemType.BATTERY_SOLID_STATE)?.inputs.some(i => i.itemType === ItemType.PLASTIC), 'solid-state battery is made with plastic');
  for (const t of [ItemType.PUMP_JACK, ItemType.REFINERY, ItemType.CENTRIFUGE, ItemType.REACTOR, ItemType.NUCLEAR_FABRICATOR]) {
    ok(!!made(t), `${ItemType[t]} has a workbench recipe`);
  }
}

// ---- 4.1 pump jack
{
  const p = newMachineState(ItemType.PUMP_JACK, 1, 30, new THREE.Vector3(), 0);
  tickMachine(p, 1, { oilBelow: false, reactorPower: false });
  ok(p.status === 'No oil here' && !wantsPower(p, false), 'pump jack off oil says "No oil here" and draws nothing');
  p.powered = false;
  tickMachine(p, MACHINE_CONFIG.PUMP_UNIT_S, { oilBelow: true, reactorPower: false });
  ok(p.tank === 0 && p.status === 'No power', 'unpowered pump jack does not pump');
  p.powered = true;
  const fx = tickMachine(p, MACHINE_CONFIG.PUMP_UNIT_S, { oilBelow: true, reactorPower: false });
  ok(p.tank === 1 && fx.pumpedCell === true && fx.event === 'pumped', 'powered pump jack pumps a unit and takes an oil sand cell');
  ok(loadInput(p, ItemType.BUCKET, 3) === 3 && loadInput(p, ItemType.CRUDE_OIL_BUCKET, 1) === 0, 'it takes empty buckets and nothing else');
  tickMachine(p, 0.1, { oilBelow: true, reactorPower: false });
  ok(p.tank === 0 && p.outputs[0].itemType === ItemType.CRUDE_OIL_BUCKET && p.outputs[0].quantity === 1, 'a bucket fills from the tank');
  p.tank = MACHINE_CONFIG.PUMP_TANK_UNITS;
  ok(!wantsPower(p, true), 'a full tank draws no power');
}

// ---- 4.2 refinery + kerosene
{
  const r = newMachineState(ItemType.REFINERY, 2, 30, new THREE.Vector3(), 0);
  r.powered = true;
  ok(!wantsPower(r, false), 'empty refinery draws nothing');
  loadInput(r, ItemType.CRUDE_OIL_BUCKET, 1);
  const fx = tickMachine(r, MACHINE_CONFIG.REFINE_S, { oilBelow: false, reactorPower: false });
  const out = (t: ItemType) => r.outputs.filter(s => s.itemType === t).reduce((n, s) => n + s.quantity, 0);
  ok(fx.event === 'refined' && out(ItemType.KEROSENE) === 2 && out(ItemType.PLASTIC) === 1 && out(ItemType.BUCKET) === 1,
    'a crude bucket refines into 2 kerosene + 1 plastic, and the bucket comes back');
  const fuel = ROCKET_CONFIG.FUEL_SOURCES.find(f => f.itemType === ItemType.KEROSENE);
  ok(fuel?.units === 40, 'kerosene is a rocket fuel source at 40 units');
}

// ---- 5.1 centrifuge + fuel rod recipe
{
  const c = newMachineState(ItemType.CENTRIFUGE, 3, 30, new THREE.Vector3(), 0);
  c.powered = true;
  loadInput(c, ItemType.ORE_URANIUM, 3);
  ok(!wantsPower(c, false), 'centrifuge with 3 ore waits');
  loadInput(c, ItemType.ORE_URANIUM, 1);
  const fx = tickMachine(c, MACHINE_CONFIG.ENRICH_S, { oilBelow: false, reactorPower: false });
  ok(fx.event === 'enriched' && c.outputs[0].itemType === ItemType.ENRICHED_URANIUM && c.inputs[0].quantity === 0, '4 uranium ore become 1 enriched uranium');
  const rod = ELECTRONICS_RECIPES.find(r => r.output.itemType === ItemType.FUEL_ROD);
  const count = (t: ItemType) => rod?.inputs.filter(i => i.itemType === t).reduce((n, i) => n + i.quantity, 0) ?? 0;
  ok(count(ItemType.ENRICHED_URANIUM) === 2 && count(ItemType.INGOT_TITANIUM) === 1 && rod!.inputs.length === 3, 'fuel rod = 2 enriched uranium + 1 titanium ingot at the workbench');
}

// ---- 5.2 reactor
{
  const r = newMachineState(ItemType.REACTOR, 4, 30, new THREE.Vector3(), 0);
  ok(machineSupplyW(r) === 0, 'an empty reactor supplies nothing');
  ok(loadInput(r, ItemType.FUEL_ROD, 9) === MACHINE_CONFIG.REACTOR_ROD_SLOTS, 'a reactor holds up to 4 fuel rods');
  tickMachine(r, 1, { oilBelow: false, reactorPower: false });
  ok(machineSupplyW(r) === 50000 && r.status === 'Running', 'a fuelled reactor supplies 50 kW');
  tickMachine(r, MACHINE_CONFIG.REACTOR_ROD_LIFE_S, { oilBelow: false, reactorPower: false });
  ok(machineSupplyW(r) === 0, 'each rod lasts 30 minutes (all four burn together)');
  const rec = machineFromRecord(JSON.parse(JSON.stringify(machineRecord(r))));
  ok(rec.rodLifeS.length === 4 && rec.kind === 'reactor', 'reactor rods survive the record');
}

// ---- 5.3 nuclear fabricator
{
  const f = newMachineState(ItemType.NUCLEAR_FABRICATOR, 6, 30, new THREE.Vector3(), 0);
  f.powered = true;
  f.job = ItemType.ION_DRIVE;
  tickMachine(f, 1000, { oilBelow: false, reactorPower: false });
  ok(f.status === 'Needs reactor power' && f.progressS === 0, 'the fabricator refuses steam power: "Needs reactor power"');
  const recipe = FABRICATOR_RECIPES.find(r => r.output === ItemType.ION_DRIVE)!;
  const fx = tickMachine(f, recipe.timeS, { oilBelow: false, reactorPower: true });
  ok(fx.event === 'fabricated' && f.outputs[0].itemType === ItemType.ION_DRIVE && f.job === null, 'on reactor power it builds the part');
  const outs = FABRICATOR_RECIPES.map(r => r.output).sort();
  ok(JSON.stringify(outs) === JSON.stringify([ItemType.NUCLEAR_THERMAL_ENGINE, ItemType.ION_DRIVE, ItemType.REACTOR_CORE, ItemType.BATTERY_PACK].sort()),
    'it makes the nuclear thermal engine, ion drive, reactor core and battery pack');
  // a 20 kW fabricator on a 2 kW engine: the network can't carry it
  const steam = solveNetwork([{ id: 'e', watts: S.steamEngine! }], [{ id: 'n', watts: D.nuclearFabricator! }], [], 1);
  const nuke = solveNetwork([{ id: 'r', watts: S.reactor!, nuclear: true }], [{ id: 'n', watts: D.nuclearFabricator! }], [], 1);
  ok(!steam.powered && nuke.powered && nuke.nuclearW > 0, 'a reactor carries the fabricator; a steam engine does not');
}

// ---- a pumped pocket that has run dry still empties its tank into buckets
{
  const p = newMachineState(ItemType.PUMP_JACK, 9, 30, new THREE.Vector3(), 0);
  p.tank = 1;
  loadInput(p, ItemType.BUCKET, 1);
  tickMachine(p, 0.25, { oilBelow: false, reactorPower: false });
  ok(p.status === 'No oil here' && p.tank === 0 && p.outputs[0].itemType === ItemType.CRUDE_OIL_BUCKET, 'a dry pump jack still fills a bucket from its tank');
}
