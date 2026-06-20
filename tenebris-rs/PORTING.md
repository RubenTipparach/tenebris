# Tenebris C -> Rust port conventions

This workspace is a 1:1 functional port of `tenebris-c/`. The C tree is
the source of truth; the Rust port must replicate behavior exactly.

## Hard rules

1. **Byte compatibility is non-negotiable** for anything serialized:
   - The wire protocol (`core/proto.{c,h}`) must produce/consume the
     exact same bytes so C clients and the Rust server interoperate.
   - The save format (`server/saves.{c,h}`, `client/persistence.c`)
     must read existing saves on the Fly volume / localStorage and
     write saves the C build can read back.
   Serialize with explicit little-endian reads/writes (no `#[repr(C)]`
   transmute tricks that depend on padding).
2. **Same algorithms, same constants, same order of operations.** Do
   not "improve" math, RNG, noise, or meshing while porting. f32 stays
   f32. The RNG must produce identical sequences for identical seeds —
   world gen depends on it.
3. **No new tunables in code.** Same rule as the C tree: designer
   knobs live in `tenebris-c/assets/config/*.yaml` (shared asset tree,
   not duplicated). The Rust config parser reads the same files with
   the same partial-override semantics (zero/omitted = compiled
   default).
4. **Module mapping is 1:1**: `core/world_water.c` -> 
   `tenebris-core/src/world_water.rs`, etc. Functions keep their names
   minus the module prefix where Rust modules make it redundant
   (`world_set()` -> `world::set()` is fine; document any rename at
   the top of the module).
5. **In-game text rules carry over**: 7-bit ASCII only in any string
   rendered via the debugtext path. No em-dashes, no smart quotes, no
   underscores in player-visible strings.

## Crate layout

- `tenebris-core` — port of `src/core/`: math, rng, blocks, config,
  goldberg, planet, planet_gen, world, world_light, world_water,
  physics, proto, job_system. `no_std`-ish discipline not required,
  but no I/O except config file loading; no networking.
- `tenebris-server` — port of `src/server/`: saves, websocket
  transport (tokio + tokio-tungstenite replaces libwebsockets),
  server tick loop. Native only.
- `tenebris-client` — port of `src/client/` + `src/shaders/`:
  sokol-rust for gfx/app/glue, targets native and
  wasm32-unknown-emscripten for the web build.

## Testing

Every core module ports with unit tests that pin observable behavior:
known RNG sequences, hash values, proto round-trips, world-gen
heights at fixed coordinates, water-sim steps on small fixtures.
Where practical, fixtures are generated from the C build and checked
in under `tests/fixtures/`.
