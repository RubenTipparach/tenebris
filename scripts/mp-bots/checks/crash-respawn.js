// In-game check: a crash, then RESPAWN on the crash screen, must put the
// player on a planet's ground - near the pad, and when the ship blew up in
// space. (The crash screen used to reload the page, and the pose autosave had
// saved the cockpit's position: the pilot came back floating in space.)
//
// Run against a live bot client (scripts/mp-bots/run.cjs): copy this file to
// <runner out dir>/cmd-<bot name>.js; the result lands in cmd-<bot>.out.json.
// Pass: every run has inFlight false, enabled true and standingOn.alt < 2.
// Boarding from the pad stashes the bot's items there (pad stash).
const g = __tenebris, fm = g.rocketFlightManager, b = g.blockInteraction, x = __bot.x;
const role = x.st.role || 'miner';
x.st.running = false;                         // the bot's loop stands still for the test
await x.sleep(1500);
const out = { runs: [] };
const pad = b.launchPadManager.getLaunchPads().find(p => p.isComplete && p.rocketParts.length > 0);
if (!pad) { __bot.start(role); return { error: 'no pad with a rocket near' }; }
const altitudeOnBody = () => {
  let best = { id: null, alt: Infinity };
  for (const p of fm.planets || fm.getLandedRocketManager().planets) {
    const dir = g.player.position.clone().sub(p.center);
    const ground = p.getSurfaceHeight ? p.getSurfaceHeight(dir.clone().normalize()) : p.radius;
    const alt = dir.length() - ground;
    if (alt < best.alt) best = { id: p.id, alt: +alt.toFixed(1) };
  }
  return best;
};
for (const where of ['near the pad', 'in space']) {
  // board straight from the pad (what the panel's Board button does)
  if (!fm.enterFlightMode(pad)) { out.runs.push({ where, error: 'could not board' }); continue; }
  g.player.setEnabled(false);
  const rc = fm.getRocketController();
  await x.sleep(500);
  if (where === 'in space') {
    // carry the ship far out of every gravity well, as if it flew there
    rc.position.copy(rc.getPosition().clone().normalize().multiplyScalar(600));
    rc.hasLaunched = true;
    await x.sleep(500);
  }
  rc.explode('impact');
  await x.sleep(800);
  document.getElementById('respawn-btn')?.click();
  // the teleport builds the landing spot's terrain first
  for (let i = 0; i < 60 && (fm.isInFlight() || !g.player.getEnabled()); i++) await x.sleep(500);
  await x.sleep(2000);
  const standingOn = altitudeOnBody();
  out.runs.push({ where, inFlight: fm.isInFlight(), enabled: g.player.getEnabled(), standingOn, pass: !fm.isInFlight() && g.player.getEnabled() && standingOn.alt < 2 });
}
out.pass = out.runs.every(r => r.pass);
__bot.start(role);
return out;
