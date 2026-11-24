// The 3D printer needs electricity: a job only advances while the printer's
// cable network powers it (isPowered, set from the grid solve).
// Run: npx tsx scripts/printer-power.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const THREE = await import('three');
const { Printer3DManager } = await import('../src/planet/Printer3D');
const { ItemType } = await import('../src/player/Inventory');

function printerWithJob(isPowered: boolean) {
  // Skip the constructor (it loads textures, which need a browser); only
  // the job step is under test
  const mgr = Object.assign(Object.create(Printer3DManager.prototype), { printers: [] }) as InstanceType<typeof Printer3DManager>;
  const printer = {
    position: new THREE.Vector3(), isPowered, printQueue: [], outputInventory: [],
    currentJob: { itemType: ItemType.LAUNCH_PAD_BLOCK, progress: 0, totalTime: 10, startTime: 0, outputQuantity: 1, ingredients: [] },
  };
  (mgr as unknown as { printers: unknown[] }).printers.push(printer);
  return { mgr, printer };
}

test('an unpowered printer holds its job', () => {
  const { mgr, printer } = printerWithJob(false);
  mgr.updatePrintJobs(5);
  assert.equal(printer.currentJob!.progress, 0);
});

test('a powered printer prints', () => {
  const { mgr, printer } = printerWithJob(true);
  mgr.updatePrintJobs(5);
  assert.equal(printer.currentJob!.progress, 0.5);
});
