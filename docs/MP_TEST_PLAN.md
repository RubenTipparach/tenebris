# Multiplayer test plan (JS client + server-js)

What this verifies: that 2-3 players in one server world see each other,
see each other's building, can hand items to each other, keep their own
mission progress, and that all of it survives a late join, a server restart
and a page reload.

The automated part is `scripts/mp-e2e/`. It is a black-box test of the real
stack: the real `server-js/server.js` (fresh data dir, fresh world) and the
real game in three headless Chromium clients.

## How it runs

```bash
npm ci && (cd server-js && npm ci)
npx vite --port 5173 --host 127.0.0.1 &      # the JS client (dev server)
node scripts/mp-e2e/run.cjs mp-e2e-out        # starts its own server on :8090
python3 scripts/mp-e2e/make-video.py mp-e2e-out   # -> mp-e2e-out/mp-e2e.mp4
```

- **The clients look like 1080p but render at 160x90.** Each page has a
  1920x1080 viewport, so the HUD, menus and toasts lay out at their real
  size. `deviceScaleFactor` is 160/1920, and the renderer sizes its
  backbuffer from `devicePixelRatio`, so WebGL only draws 160x90 pixels
  (SwiftShader, no GPU). Screenshots use `scale: 'css'`, so the DOM stays
  crisp and the 3D view is upscaled. Set `RENDER_W` to change the render
  width.
- **Input goes through the game's own handlers.** Headless pages can't take
  pointer lock, so clicks are not synthesised. The harness calls the same
  methods a click or key press reaches, through `window.__tenebris`
  (`?debug`):
  - `PlanetBlockInteraction.placeBlock` / `breakBlock` for building and
    mining.
  - `StorageUI.transferFromInventory` (drag into a chest) and
    `handleShiftClick` (shift-click out) for the chest.
  - `CraftingSystem.craftSelectedRecipe` for the Craft button.
  - `PlanetPlayer.placeAt` to stand somewhere and face a spot. Its
    `view.forward` takes the walker's `localForward` convention, so the
    harness passes the aim negated.

  Nothing is written to the network by hand, so every edit and record goes
  out through the one save path (`GameStorage` -> `NetSync` / `onTileChange`)
  exactly as in play. Item grants (`Inventory.setSlot` / `addItem`) stand in
  for gathering.
- Output: `report.json` (pass/fail plus evidence per check), `frames/`,
  `captions.json` and the stitched video. The exit code is 0 only when every
  check passes.

## Checks

| ID | Feature | Steps | Pass when |
|----|---------|-------|-----------|
| MP-01 | Join + presence | A and B open `?world=<id>` | both connected, player count 2, each lists the other by name |
| MP-02 | Pose sync | A and B stand on opposite sides of a build site | each draws the other's avatar within 1.5 m of where that player is |
| MP-02b | They can see each other | A and B turn to face each other | each avatar projects inside the other's view frustum AND its face (model +Z) points at the viewer (dot > 0.9) |
| MP-03 | Building replicates | A stacks 4 planks + 2 stone | B reads the same block ids at the same (tile, depth) |
| MP-04 | Mining replicates | B mines the top plank of A's tower | the block is AIR on A; the plank is in B's inventory (MP-04b) |
| MP-05 | Placed objects replicate | A places a storage chest | the chest exists on B |
| MP-06 | Chest contents replicate | A drags 16 iron ingots into the chest | B's copy of the chest holds exactly [iron x16] |
| MP-07 | Trade | B takes the iron and puts 8 gold back; A takes the gold | A: 0 iron / 8 gold, B: 16 iron / 0 gold, chest empty on both (no dupes, nothing lost) |
| MP-08 | Own missions | A gains logs, crafts planks + sticks | A has `logs` and `planks` done; B's done-list is unchanged |
| MP-09 | Own missions (other way) | B gains logs | B has `logs` but not `planks`; A's list is unchanged |
| MP-10 | Late join snapshot | C joins after all of the above | C reads the build including B's mined block (from the server's edit log) |
| MP-11 | Late join objects + players | - | C sees the empty chest and both A and B (player count 3) |
| MP-12 | No mission leak | - | C's mission tree starts empty |
| MP-13 | Three-way build | C builds a stone pillar | A and B both read it |
| MP-14 | Server restart | kill and restart the server process | all three clients reconnect on their own (player count back to 3) |
| MP-15 | Persistence | B reloads the page after the restart | every edit is still there; B's mission progress (logs, not planks) is kept |
| MP-16 | Leave | C closes its tab | A's player count drops to 2 and C's avatar is removed |
| MP-17 | Health | whole run | no uncaught page errors in any client |

## Bugs this plan found

- **Remote avatars faced backwards** (found by MP-02b). The walker's
  camera looks along its orientation's +Z (`PlanetPlayer.updateCamera`
  uses `-localForward`), but `net/Avatar.ts` draws the model looking down
  -Z. The raw orientation went out as the pose, so two players facing each
  other each saw the back of the other's head. Fixed where the pose is
  built (`mainPlanet.ts` `getPose`): the orientation is turned half a
  revolution about up into the avatar's frame. The character creator
  preview, which uses `Avatar` directly, is unchanged.

## Manual checks (not automated yet)

These need real input or a GPU, so a person runs them, ideally with two
browsers side by side on https://heavyphoton.com/tenebris/:

1. **Visual avatar check.** Walk around each other: the walk animation, the
   name tag, and the suit toggle (`setSuit`) show on the other screen.
2. **Real mouse building.** Place and break with the mouse, including
   torches (`torch` records) and a machine (furnace with fuel smelting).
   The other player sees the furnace's contents change.
3. **Chest race.** Both players open the same chest and drag the same stack
   out at once. Expected: one gets it and the other sees it vanish. Known
   risk: the record is last-writer-wins, so a duplicate is possible. Report
   it if it happens.
4. **Rockets.** Launch from a pad while the other player watches (the
   `live` frames of a rocket in flight), then land: the `landedRocket`
   record appears for them.
5. **Animals.** The lowest player id on a planet hosts the fauna. When the
   host leaves, animals keep moving for the other player (host handover).
6. **Shared clock.** Day and night match on both screens (`worldTimeMs`).
7. **Admin portal.** Kick a player (close 4001 shows a toast), reset the
   world (4010: the client reloads onto fresh terrain), and send a notice.
8. **Bad network.** Throttle one client in devtools. Edits still arrive in
   order and poses stay smooth (`SMOOTHING`).
