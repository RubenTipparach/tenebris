/**
 * The grid solver (openspec industry-and-nuclear, power-grid; design
 * decision 3). Pure: one cable network's generators, machines and batteries
 * in, who is powered and the batteries' new charge out. The cable networks
 * themselves are CableNodeManager's (the one grid); this only balances one.
 *
 * Each step: supply = running generators' watts, demand = working machines'
 * watts. A shortfall is drawn from the batteries (each up to its rate and
 * its charge); if they can't cover it, every machine on the network stops.
 * A surplus charges the batteries (each up to its rate and its room).
 */

export interface GridGenerator { id: string; watts: number; nuclear?: boolean }
export interface GridConsumer { id: string; watts: number }
export interface GridBattery { id: string; chargeWh: number; capacityWh: number; maxRateW: number }

export interface GridResult {
  powered: boolean;            // the machines on this network run
  supplyW: number;
  demandW: number;
  storedWh: number;            // after this step
  capacityWh: number;
  nuclearW: number;            // supply from reactors (the fabricator needs it)
  onBattery: boolean;          // the machines run because batteries cover a shortfall
  batteryCharge: Map<string, number>;  // battery id -> new charge (Wh)
}

export function solveNetwork(
  generators: GridGenerator[],
  consumers: GridConsumer[],
  batteries: GridBattery[],
  dtS: number,
): GridResult {
  const supplyW = generators.reduce((s, g) => s + g.watts, 0);
  const nuclearW = generators.reduce((s, g) => s + (g.nuclear ? g.watts : 0), 0);
  const demandW = consumers.reduce((s, c) => s + c.watts, 0);
  const hours = dtS / 3600;
  const batteryCharge = new Map<string, number>();
  for (const b of batteries) batteryCharge.set(b.id, b.chargeWh);

  let powered = true;
  const net = supplyW - demandW;
  if (net < 0) {
    // Short: can the batteries give the gap this step?
    let gapW = -net;
    const canGiveW = batteries.reduce((s, b) => s + Math.min(b.maxRateW, b.chargeWh / Math.max(hours, 1e-9)), 0);
    if (canGiveW + 1e-9 < gapW) {
      powered = false;  // they can't: the machines stop, nothing is drawn
    } else {
      // Draw it, from each battery in proportion to what it can give
      for (const b of batteries) {
        const can = Math.min(b.maxRateW, b.chargeWh / Math.max(hours, 1e-9));
        const share = canGiveW > 0 ? (can / canGiveW) * gapW : 0;
        batteryCharge.set(b.id, Math.max(0, b.chargeWh - share * hours));
      }
      gapW = 0;
    }
  }
  // Spare supply (all of it when the machines stopped) charges the batteries
  let spareW = powered ? Math.max(0, net) : supplyW;
  for (const b of batteries) {
    if (spareW <= 0) break;
    const room = (b.capacityWh - batteryCharge.get(b.id)!) / Math.max(hours, 1e-9);
    const take = Math.min(spareW, b.maxRateW, Math.max(0, room));
    batteryCharge.set(b.id, Math.min(b.capacityWh, batteryCharge.get(b.id)! + take * hours));
    spareW -= take;
  }
  const storedWh = [...batteryCharge.values()].reduce((s, v) => s + v, 0);
  const capacityWh = batteries.reduce((s, b) => s + b.capacityWh, 0);
  const onBattery = powered && net < 0;
  return { powered, supplyW, demandW, storedWh, capacityWh, nuclearW, onBattery, batteryCharge };
}

/** "2.0 kW" / "450 W" */
export function formatWatts(w: number): string {
  return w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`;
}

/** "3.2 kWh" / "800 Wh" */
export function formatWh(wh: number): string {
  return wh >= 1000 ? `${(wh / 1000).toFixed(1)} kWh` : `${Math.round(wh)} Wh`;
}
