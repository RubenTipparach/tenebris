# Voxel Lighting + Baked Indirect Skylight

Replace today's column-attenuated skylight + line-of-sight torches with a
neighbor-propagated voxel light grid, then layer a cheap one-bounce
indirect-skylight diffusion on top.

Current implementation:

- `client/hex_mesher.c:71` `sky_light_at()` — walks straight up the
  column with 0.55x per solid voxel. Ignores horizontal occlusion, so
  a tile under an overhang reads the same as open sky.
- `client/hex_mesher.c:90` `torch_light_at()` — inverse-square in 3D,
  no occlusion. Light leaks through walls.
- Both computed at remesh time and baked into per-vertex
  `sky_light` / `torch_light` floats (44 B vertex).
- No per-voxel lighting storage. `world.blocks[]` is one `uint8_t`
  per voxel; everything else is derived at mesh time.

Target end state: per-voxel `sky` / `block` / `indirect_sky` nibbles
maintained by incremental BFS in `core/world_light.{c,h}`, sampled at
mesh time the same way vertex attributes are baked today. Same code
path on SP and MP — deterministic from `blocks[]`, so we don't ship
light bytes over the wire.

---

## Status legend

- `[ ]` not started
- `[~]` in progress
- `[x]` done

## Phase 1 — Per-voxel light grid + BFS propagation

Goal: replace `sky_light_at()` and `torch_light_at()` with samples
from a real voxel light grid. Visual parity with today as a floor;
overhang shadows and wall-blocked torches as the gain.

- [ ] **1.1** Add `world_light.{c,h}` under `core/`. Owns the parallel
  array sized like `blocks[]` (`tile * WORLD_MAX_DEPTH + depth`),
  packed `sky_nibble << 4 | block_nibble` per voxel.
- [ ] **1.2** Direct skylight BFS. Seed value 15 at the topmost air
  voxel of each column. Propagate to 6-neighbours losing 1 per step,
  except straight-down-through-air which keeps the parent value
  (preserves "shafts of daylight" without ambient leak).
- [ ] **1.3** Block-light BFS. Seed each torch at its emission value
  (configurable per torch type). Propagate losing 1 per step.
  Standard removal: BFS-darken from the removed source, re-light from
  any remaining sources hit during the darken pass.
- [ ] **1.4** Per-vertex sample at mesh time. Replace the two
  `*_light_at()` callers in `hex_mesher.c` with a smooth-lighting
  read of the 4-8 voxels around each vertex; bake into the existing
  `sky_light` / `torch_light` attributes. No shader change.
- [ ] **1.5** `assets/config/lighting.yaml` for tunables: sky max,
  attenuation step, per-torch-type emission, ripple cap, indirect
  diffusion fraction + iterations. Parser pattern follows
  `core/config.c` (atmosphere.yaml).
- [ ] **1.6** Visual A/B switch (`lighting.engine: column | voxel`)
  so we can keep the old path during transition.

## Phase 2 — Incremental updates

Goal: edits stay cheap (~ms), no full-chunk relight.

- [ ] **2.1** Lighting dirty queue separate from the existing
  per-tile mesh dirty bitset (`world.c:49`). Edits push only the
  affected voxels.
- [ ] **2.2** Bounded ripple radius per edit: ~15 voxels for sky,
  `torch_emission` for block, capped from `lighting.yaml`.
- [ ] **2.3** Hook into the existing block-edit path (`world` writes)
  and torch placement/removal (`torch.c`) so propagation is the single
  source of truth for "what's dirty for mesh".
- [ ] **2.4** Profile under stress: rapid mining, multi-torch
  placement, MP burst of server diffs. Budget: light update + remesh
  under one frame for the common case.

## Phase 3 — Baked indirect skylight (one-bounce GI)

Goal: soft daylight reaching a few voxels into cave mouths and under
overhangs. Cheap, baked, deterministic.

- [ ] **3.1** Promote the per-voxel byte to `uint16_t`: add an
  `indirect_sky` nibble (third channel, one nibble spare).
- [ ] **3.2** Diffusion pass: after direct sky settles, every air
  voxel whose direct sky is low picks up a configurable fraction
  (e.g. 1/3) of its brightest neighbour's direct sky. Iterate 2-3
  times. All values driven by `lighting.yaml`.
- [ ] **3.3** Re-run only when direct sky in a region changed, not on
  every block edit (most edits don't move the sky-air interface).
- [ ] **3.4** Sample as a third per-vertex attribute or fold into
  `sky_light` with a weight (decide after seeing 3.2 in motion).

## Phase 4 — Decisions deferred until earlier phases land

- Heavier indirect (SH / ambient cube per voxel). Not planned — keep
  on the list only if the nibble diffusion looks flat.
- Coloured block-light (per-channel nibble triple). Nice-to-have once
  we have non-white emitters.
- Server-authoritative lighting (ship bytes). Only if we ever find
  a non-determinism. Default: client recomputes from `blocks[]`.

---

## Tradeoffs on record

- Memory: +1 byte/voxel ~= 80 KB per fully-loaded tile column;
  ~50 MB at 642 tiles. Bumping to `uint16_t` in Phase 3 doubles it.
  If this bites, pack two channels into one byte and store indirect
  in a separate lazily-allocated array.
- Determinism: both SP and MP must run the exact same fixed-order
  BFS. Nibble format is wire-friendly if we ever need to ship it.
- Visual delta: smooth-sampled grid lighting will look noticeably
  different from today's column attenuation. Phase 1.6's engine
  switch covers the transition.
