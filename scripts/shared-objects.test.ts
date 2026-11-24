// Shared objects + chat, client side (openspec mp-shared-objects).
// Run: npx tsx scripts/shared-objects.test.ts
//
// - the conflict rule: a write carries the version it was made on, one write
//   per record is in flight, a refused write is undone (the object from the
//   server's copy, the player's inventory by exactly the refused trade), so
//   two concurrent takes never duplicate an item
// - an open panel's object is refreshed in place (same slot objects)
// - exactly one simulator per planet (the host)
// - chat lines: parse, clean, format, scrollback; the length cap agrees with the server
import fs from 'node:fs';
import { Inventory, ItemType } from '../src/player/Inventory';
import {
  ackRecord, addDelta, applySnapshot, attachTransport, diffCounts, dispatchRecord, nackRecord, netSync, setPeer,
  type ItemDelta,
} from '../src/net/NetSync';
import { copySlotsInPlace } from '../src/net/SharedState';
import { ChatHistory, cleanChatText, formatChatLine, parseChatLine, systemLine } from '../src/net/Chat';
import { CHAT_CONFIG } from '../src/config/ChatConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const IRON = ItemType.INGOT_IRON;

// ---- a fake connection -------------------------------------------------
const sent: Array<{ kind: string; planet: string; key: string; data: any; base: number }> = [];
const transport = {
  sendRecord: (kind: string, planet: string, key: string, data: object | null, base: number) => { sent.push({ kind, planet, key, data, base }); },
  sendChat: () => {},
  sendLive: () => {},
  uploadMap: async () => false,
};
attachTransport(transport, 2, Date.now(), 0, 'test', {});

// What the player's inventory holds, and the ledger the game installs
// (PlanetBlockInteraction): a "player action" is between begin() and the write
const inv = new Inventory();
let baseline: Map<number, number> | null = null;
const begin = () => { baseline = inv.itemCounts(); };
const refunds: ItemDelta[] = [];
netSync.setTradeLedger({
  take: () => {
    if (!baseline) return null;
    const now = inv.itemCounts();
    const d = diffCounts(baseline, now);
    baseline = now;
    return d;
  },
  refund: (d) => { refunds.push(d); inv.undoTrade(d); },
});

// The chest as this client sees it, and what the record applier did
type Chest = { tileIndex: number; slots: Array<{ itemType: number; quantity: number }> };
const chestData = (iron: number): Chest => ({ tileIndex: 7, slots: [{ itemType: iron ? IRON : 0, quantity: iron }, { itemType: 0, quantity: 0 }] });
const applied: Array<Chest | null> = [];
netSync.onRecord('chest', (_p, _k, data) => { applied.push(data); });

// ---- the server's snapshot gives the chest at version 5 ----------------
applySnapshot([['chest', 'earth', '7', chestData(10), 5]]);
ok(applied.length === 1 && applied[0]!.slots[0].quantity === 10, 'join: the server copy of the chest is applied');

// ---- a take: B takes 10 iron (the chest goes to 0) -----------------------
begin();
inv.addItem(IRON, 10);                          // the panel moved 10 into the inventory...
netSync.record('chest', 'earth', 7, chestData(0)); // ...and saved the chest
ok(sent.length === 1 && sent[0].base === 5, 'a write carries the version it was made on (5)');
ok(netSync.hasPending('chest', 'earth', 7), 'the write is in flight');

// a second change before the answer waits behind it (no second base-5 write)
begin();
inv.removeItem(IRON, 3);
netSync.record('chest', 'earth', 7, chestData(3));
ok(sent.length === 1, 'one write per record in flight: the next one waits');

// another player's change of the same chest lands first: not applied now
dispatchRecord('chest', 'earth', '7', chestData(4), 6);
ok(applied.length === 1, "another player's record during our write waits for the refusal");

// the server refuses ours (stale): rollback to its copy + undo both trades
nackRecord('chest', 'earth', '7', 6, chestData(4));
ok(applied.length === 2 && applied[1]!.slots[0].quantity === 4, 'refused: the object is rebuilt from the server copy');
ok(refunds.length === 1 && refunds[0][IRON] === 7, 'refused: the refund is the sum of the unconfirmed trades (+10 -3 = 7)');
ok(inv.getItemCount(IRON) === 0, 'two concurrent takes never dupe: the loser keeps none of the iron');
ok(!netSync.hasPending('chest', 'earth', 7), 'nothing left in flight after a refusal');

// ---- an accepted take, and the queue after an ack -----------------------
begin();
inv.addItem(IRON, 4);
netSync.record('chest', 'earth', 7, chestData(0));
ok(sent.length === 2 && sent[1].base === 6, 'the next write is made on the refused-to version (6)');
begin();
inv.removeItem(IRON, 1);
netSync.record('chest', 'earth', 7, chestData(1));
ackRecord('chest', 'earth', '7', 9);
ok(sent.length === 3 && sent[2].base === 9 && sent[2].data.slots[0].quantity === 1, 'ack: the waiting write goes on the acked version');
ackRecord('chest', 'earth', '7', 10);
ok(!netSync.hasPending('chest', 'earth', 7) && inv.getItemCount(IRON) === 3, 'acked: the trade stands (took 4, put 1 back)');

// a machine's own tick (no player action) carries no trade: a refusal refunds nothing
baseline = null;
netSync.record('chest', 'earth', 7, chestData(2));
const before = refunds.length;
nackRecord('chest', 'earth', '7', 11, chestData(1));
ok(refunds.length === before && inv.getItemCount(IRON) === 3, "a refused machine tick changes no player's inventory");

// a placement on a free tile goes with base 0
begin();
netSync.record('chest', 'earth', 99, chestData(0));
ok(sent[sent.length - 1].base === 0, 'a new object is written on version 0 (nothing there yet)');

// ---- deltas --------------------------------------------------------------
const d = diffCounts(new Map([[1, 5], [2, 1]]), new Map([[1, 2], [3, 4]]));
ok(d[1] === -3 && d[2] === -1 && d[3] === 4 && Object.keys(d).length === 3, 'diffCounts: after - before per item');
const sum = addDelta({ 1: 2 }, { 1: -2, 4: 1 })!;
ok(sum[1] === 0 && sum[4] === 1, 'addDelta sums per item');
const full = new Inventory();
full.addItem(IRON, 2);
const u = full.undoTrade({ [IRON]: 5, [ItemType.STONE]: -3 });
ok(u.missing === 3 && full.getItemCount(IRON) === 0 && full.getItemCount(ItemType.STONE) === 3, 'undoTrade takes back what is there, gives back what was given');

// ---- an open panel refreshes in place -------------------------------------
const panelChest = chestData(5);
const shown = panelChest.slots[0];   // what the open panel's grid reads
ok(copySlotsInPlace(panelChest.slots, chestData(2).slots) && shown === panelChest.slots[0] && shown.quantity === 2,
  "another player's record updates the open panel's slot objects in place");
ok(!copySlotsInPlace(panelChest.slots, [{ itemType: 0, quantity: 0 }]), 'a different slot count is not applied in place (rebuild)');

// ---- one simulator per planet ----------------------------------------------
setPeer(1, 'earth');
setPeer(3, 'moon');
ok(!netSync.isHost('earth'), 'player 2 does not simulate earth while player 1 is there');
ok(netSync.isHost('moon'), 'player 2 simulates the moon (player 3 has a higher id)');
setPeer(1, null);
ok(netSync.isHost('earth'), 'player 1 left earth: player 2 simulates it now');
attachTransport(null);
ok(netSync.isHost('earth') && netSync.isHost('moon'), 'offline: this client simulates everything');

// ---- chat ----------------------------------------------------------------------
ok(cleanChatText('  hi\u0007 there—!  ') === 'hi there!', 'chat text: control and non-ASCII characters stripped, trimmed');
ok(cleanChatText('x'.repeat(500)).length === CHAT_CONFIG.MAX_CHARS, 'chat text capped at MAX_CHARS');
const line = parseChatLine({ t: 'chat', id: 4, name: 'Ada', text: 'hello', at: new Date(2026, 0, 1, 9, 5).getTime() });
ok(!!line && formatChatLine(line) === '[09:05] Ada: hello', 'a player line formats as [hh:mm] name: text');
ok(parseChatLine({ id: 4, name: 'Ada', text: '\u0001' }) === null && parseChatLine(null) === null, 'an empty or malformed line is dropped');
ok(formatChatLine(systemLine('Bob joined', new Date(2026, 0, 1, 10, 0).getTime())) === '[10:00] * Bob joined', 'system lines are starred');
const h = new ChatHistory(3);
for (let i = 0; i < 5; i++) h.push(systemLine(`l${i}`));
ok(h.all().length === 3 && h.all()[0].text === 'l2' && h.last(2).map(x => x.text).join() === 'l3,l4', 'scrollback keeps the newest N lines');
const serverSrc = fs.readFileSync(new URL('../server-js/server.js', import.meta.url), 'utf8');
const cap = Number(/const CHAT_MAX_CHARS = (\d+);/.exec(serverSrc)?.[1]);
ok(cap === CHAT_CONFIG.MAX_CHARS, `the client's chat cap matches the server's (${cap})`);
ok(!CHAT_CONFIG.OPEN_KEYS.includes('KeyE') && !CHAT_CONFIG.OPEN_KEYS.includes('KeyF'), 'chat never opens on E or F');
