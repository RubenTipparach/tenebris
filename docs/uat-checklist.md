# Tenebris UAT Checklist — JS vs WASM Parity

Use this matrix to validate that the WASM (Sokol/C) build behaves the
same as the stable JS (Three.js) build for each tier.

Open both builds side-by-side from the chooser at
`heavyphoton.com/tenebris/` (use `?build=js` and `?build=wasm` as direct
links).

**How to mark a row**: tick the column if the behavior is correct *and*
visually/functionally matches the other build. A ❌ blocks the tier gate
until either (a) the WASM build is fixed, or (b) the row is explicitly
removed from tier scope with justification in the PR description.

Legend: ✅ pass · ❌ fail · ⬜ not yet implemented · 🚫 out of scope

---

## Tier 0 — Hello triangle

| Behavior | JS | WASM |
|---|:-:|:-:|
| Page loads in Chrome latest | 🚫 | ⬜ |
| Page loads in Firefox latest | 🚫 | ⬜ |
| Canvas fills viewport and resizes cleanly | 🚫 | ⬜ |
| Hello-world shape renders (triangle) | 🚫 | ⬜ |
| FPS overlay reads a plausible number | 🚫 | ⬜ |
| No console errors in first 10 s | 🚫 | ⬜ |

## Tier 1 — Creative Mode MVP

| Behavior | JS | WASM |
|---|:-:|:-:|
| Spawn in a flat voxel world | ✅ | ⬜ |
| WASD moves player relative to look direction | ✅ | ⬜ |
| Mouse look with pointer lock | ✅ | ⬜ |
| Space jumps, gravity returns player to ground | ✅ | ⬜ |
| Shift sprints | ✅ | ⬜ |
| Player AABB collides with blocks (no phasing) | ✅ | ⬜ |
| DDA raycast highlights the targeted block | ✅ | ⬜ |
| Left-click breaks the targeted block | ✅ | ⬜ |
| Right-click places the selected block | ✅ | ⬜ |
| Hotkeys 1–4 cycle STONE / DIRT / GRASS | ✅ | ⬜ |
| Chunks generate around the player (radius 4) | ✅ | ⬜ |
| Chunks unload when the player moves away | ✅ | ⬜ |
| Chunk re-mesh after an edit is immediate | ✅ | ⬜ |
| No frame-time spikes > 16 ms during chunk gen | ✅ | ⬜ |
| 60 FPS sustained on reference hardware | ✅ | ⬜ |
| Terrain height at `(0,0)` matches JS exactly | ✅ | ⬜ |

## Tier 2 — Creative polish (later)

| Behavior | JS | WASM |
|---|:-:|:-:|
| Hotbar visible and reflects selected block | ⬜ | ⬜ |
| `F` toggles fly mode | ⬜ | ⬜ |
| Save → reload → edits persist | ⬜ | ⬜ |
| Skybox renders | ⬜ | ⬜ |
| Break / place SFX audible | ⬜ | ⬜ |
| `F3` profiler overlay present | ⬜ | ⬜ |

## Tier 3+ — planets, rockets, crafting

Populated as those tiers land. For now: **out of scope** for WASM — the
JS build is the only path that has these features.

---

## How to run UAT

1. Pick a commit to validate (usually the latest on `main` or a
   release branch).
2. Open two browser windows side-by-side.
3. One window: `.../tenebris/?build=js` (or just `.../tenebris/js/`).
4. Other window: `.../tenebris/?build=wasm` (or `.../tenebris/wasm/`).
5. For each row above, reproduce the action in both windows and
   compare. Record ✅ / ❌.
6. File a GitHub issue tagged `uat-miss` for each ❌, linked back to the
   PR or commit that introduced the divergence.

## Reporting format (paste into PR)

```
### UAT (commit <sha>)

| Row | JS | WASM | Notes |
|---|:-:|:-:|---|
| ... | ... | ... | ... |
```
