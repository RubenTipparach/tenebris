// The admin portal's game data (openspec admin-monitor, design 3): every
// item, mission and body, read from the game's own config and written to
// server-js/game-data.json for the server (which has no TypeScript build).
// scripts/admin-monitor.test.ts regenerates it and fails when the shipped
// file differs, so it can't drift from the config.
//
// Run: npx tsx scripts/gen-admin-data.ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ITEM_DATA, ItemType, toolMaxUses, HOTBAR_SIZE, PACK_SLOTS, TOOLBOX_SLOTS } from '../src/player/Inventory';
import { MISSIONS, MISSION_BRANCHES } from '../src/config/Missions';
import { SOLAR_SYSTEM, GAS_GIANTS } from '../src/config/SolarSystemConfig';
import { allOrbits } from '../src/world/Orbits';
import { gasGiantColour } from '../src/mockups/SolarSystemMockup';

export const ADMIN_DATA_PATH = fileURLToPath(new URL('../server-js/game-data.json', import.meta.url));

export interface AdminData {
  items: Record<string, { name: string; icon: string; maxUses?: number; atlas?: object }>;
  slots: { hotbar: number; pack: number; toolbox: number };
  missions: Array<{ id: string; title: string; branch: string; icon: number; objectives: Array<{ label: string; count: number }> }>;
  branches: Array<{ id: string; name: string }>;
  bodies: Array<{
    id: string; name: string; kind: string; parent: string | null; landable: boolean;
    radius: number; colour: string; position: { x: number; y: number; z: number };
    orbitRadius: number; startAngle: number;
  }>;
}

// Rounded so the file is stable and small
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function buildAdminData(): AdminData {
  const items: AdminData['items'] = {};
  for (const [id, d] of Object.entries(ITEM_DATA)) {
    if (Number(id) === ItemType.NONE) continue;
    const maxUses = toolMaxUses(Number(id) as ItemType);
    items[id] = { name: d.name, icon: d.texture, ...(maxUses !== null ? { maxUses } : {}), ...(d.atlasRegion ? { atlas: d.atlasRegion } : {}) };
  }
  const missions = MISSIONS.map(m => ({
    id: m.id, title: m.title, branch: m.branch, icon: m.icon,
    objectives: m.objectives.map(o => ({ label: o.label, count: o.count })),
  }));
  const orbits = allOrbits();
  const bodies: AdminData['bodies'] = [];
  const add = (id: string, name: string, kind: string, landable: boolean, radius: number, colour: string, position: { x: number; y: number; z: number }) => {
    const o = orbits.get(id);
    bodies.push({
      id, name, kind, landable, radius, colour,
      parent: o?.parent ?? null,
      position: { ...position },
      orbitRadius: r3(o?.radius ?? 0),
      startAngle: r3(o?.startAngle ?? 0),
    });
  };
  for (const b of SOLAR_SYSTEM.bodies) add(b.id, b.name, b.type, b.landable, b.radius, b.visual.distantColor, b.position);
  for (const g of GAS_GIANTS) add(g.id, g.name, 'gasGiant', false, g.radius, gasGiantColour(g.id), g.position);
  return { items, slots: { hotbar: HOTBAR_SIZE, pack: PACK_SLOTS, toolbox: TOOLBOX_SLOTS }, missions, branches: MISSION_BRANCHES.map(b => ({ ...b })), bodies };
}

export const adminDataJson = () => JSON.stringify(buildAdminData(), null, 1) + '\n';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(ADMIN_DATA_PATH, adminDataJson());
  console.log(`wrote ${ADMIN_DATA_PATH}`);
}
