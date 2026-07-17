# Repo rules

## Every planet's flora AND fauna roster must be UNIQUE to that planet

**Standing instruction from the user (all-caps, engrained).** No animal
species and no plant/tree species may appear on two different planets.
Each world gets its OWN roster - Tenebris's barnyard + frog/bird/lizard
stay on Tenebris, Sequoia's bipeds (Sparkit, Shellkin, Crane, Raptor) +
Sporewood/redwood flora stay on Sequoia, and any future planet gets a
fresh set. There is no shared "generic" filler species that shows up
everywhere.

- **Lifeless worlds spawn nothing.** Icy (Frostbite), barren (Crag,
  the moons), and asteroid bodies have NO fauna and NO flora - a sheep
  on a glacier is a bug. `fauna::body_has_fauna(body)` is the gate
  (true only for non-barren, non-icy Earth/Sequoia-tileset worlds); it
  wraps every spawn entry point (`spawn_near_auto`, both stalker paths,
  SP + MP).
- **Land fauna** is chosen by the pure `fauna::land_spawn_kind(...)`,
  which branches per planet. The rosters must be provably disjoint -
  the `planets_field_disjoint_rosters` test asserts the Tenebris and
  Sequoia kind-sets have an EMPTY intersection. When you add a planet,
  extend that branch and that test; never let a species leak across.
- **Water fauna** (`spawn_near_auto` water path) and the **fishing
  table** are the current KNOWN GAP: the base fish (Fish/LargeFish/
  LongFish/FlatFish/Turtle) still spawn on every ocean world; only the
  SerpentFish is Sequoia-gated. Bringing the water roster fully
  per-planet (each planet its own fish species) is outstanding work -
  do it the same way (per-body branch + disjointness test) when the
  fish art for a second set exists.
- **Flora** (trees / mushrooms / scatter in `world.rs` + the wild-fruit
  plants in `crops.rs`) follows the same rule: Sequoia grows redwoods /
  giant mushrooms / Sporewood, Tenebris grows the classic trees + the
  wild fruit (apple/melon/orange/kiwi - Tenebris ONLY). A new planet
  gets new plant species, gated on its tileset, never a reused one.

When you add a planet or a species, the checklist is: (1) give it its
own roster branch, (2) gate it on the body/tileset so it can't appear
elsewhere, (3) extend the disjointness test, (4) if it's a new visible
species, it needs its own icon/model/texture in the same change (see
the item-visuals + static-asset rules below).

This rule stays in force until the user says otherwise.

## HIGH PRIORITY BUG: the ship must NEVER despawn when you exit it

**Status: OPEN. Standing instruction from the user (all-caps, engrained).**
Pressing Exit (Z / ExitRocket) while flying must LEAVE THE SHIP IN THE
WORLD at the pose it had when you climbed out - visible, and re-boardable
by walking up to it and pressing E. It must NOT vanish.

- The old behaviour called `rocket_ride::clear()` on exit, which discards
  the ride entirely. That only "worked" on the launch pad (the parts were
  assumed to still be sitting on the pad); mid-flight / in orbit it made
  the whole ship disappear - the exact bug the user keeps hitting.
- The fix is a PARKED-SHIP representation: exit parks the ship (pose +
  parts + per-stage fuels + origin pad) so it keeps drawing in the world
  and re-boards where it sits. This lives in Core-adjacent client state
  (`rocket_ride.rs`) so SP and MP share it.
- **World edits persist immediately** (see the persistence rule below):
  a parked ship is world state, so parking writes the ride save
  same-frame, and reloading a world with a parked ship must bring the
  ship back at its parked pose - NOT strap the player back in, and NOT
  refund a fresh rocket on the pad.
- **Claude cannot verify this alone** - like the tree bug, the failure
  only shows in the running game. After ANY change here, ask the user to
  exit a ship in flight AND after a reload, and confirm the ship is still
  there and boardable. Keep the strongest regression tests on the pure
  park/board/persist state transitions, but green tests are not proof -
  only the user's in-game confirmation counts.

Related standing request: **teleport must carry the ship.** When the
teleport debug menu fires while the player is riding, it teleports the
SHIP (with the player in it) to the destination and keeps them flying -
it must not leave the ship behind or drop the player out onto a surface.

## Stations are STATIONARY reference frames inside their SOI

Standing instruction from the user (engrained). Inside the orbital
station's sphere of influence (its artificial-gravity field), the
station is the FIXED frame and everything else moves around it - exactly
like walking on a planet:

- **The player's pose is authoritative in STATION-LOCAL coordinates**
  while on/near the station. Walking, jumping, falling, collision - all
  of it integrates in the station's local frame (prograde/up/normal),
  where the station is motionless. A jump goes straight up and comes
  straight back down onto the deck.
- **World-space pose is COMPOSED, never integrated.** Each frame,
  world pos/vel = station anchor/orbit-velocity + the local pose mapped
  through the station basis. Rendering, saves, MP sync all read the
  composed world pose and keep working unchanged.
- **Never integrate on-deck motion in world space.** The station orbits
  at ~15 m/s on rails; a player integrated in world space inherits that
  as leaked orbital velocity, and the moment their feet leave the deck
  the station curves away under them - the "jump tosses me sideways off
  the station" bug. Any approach that keeps the player as a free world
  body plus per-frame corrections (artificial gravity toward the deck,
  velocity matching) WILL leak and is wrong here.
- The local frame is treated as inertial (no Coriolis/centrifugal
  terms) - at a ~70-minute orbital period the fictitious forces are
  imperceptible, and simplicity wins.
- The same rule applies to any future moving platform (moving ships,
  elevators, asteroids on rails): if the player stands on it, they
  live in ITS frame; the world moves around them.

## ONGOING UNRESOLVED BUG: falling through the world at trees

**Status: OPEN. Do not assume this is fixed.** The player clips/sinks
through the ground when colliding with a tree. Two reproductions, both
easy and both still happening as of the last user report:

1. Walk into a block that has a tree on top raised one block higher, then
   press jump -> fall through the world.
2. Just walk into a tree at ground level -> clip through the ground.

This has been "fixed" multiple times (PR #50 trunk-gate removal, PR #51
neighbour-floor borrow) and STILL reproduces. Treat every prior fix as
insufficient until the user confirms otherwise.

**Rules for Claude on this bug (engrained, standing instructions):**

- This is a physics/collision bug in `tenebris-rs` core/client
  (`player_ctrl.rs` + `world.rs` walkable-floor). It lives in Core (shared
  SP/MP world-state) - fix it there so SP and MP share the path.
- **Claude cannot verify this fix alone.** The failing case only
  reproduces at real world subdivisions in the running game; the headless
  tests have historically passed while the bug persisted. So after ANY
  change here, Claude MUST ask the user to revisit, test, and confirm
  whether it still happens - and must keep asking on every subsequent
  session/turn that touches this area until the user explicitly says it is
  fixed.
- Do not silently mark it resolved, do not remove this section, and do not
  stop following up, until the user confirms the specific repros above no
  longer happen.
- When working it, add/keep the strongest possible regression tests AND
  the runtime diagnostic logging, but never treat green tests as proof -
  only the user's in-game confirmation counts.

## Rust port targets DESKTOP OpenGL (GL 4.1 core) ONLY - no GLSL ES / WebGL

`tenebris-rs` is a high-performance **desktop** target. It runs on the
sokol `glcore` backend (OpenGL 4.1 core, `#version 410`). **We do NOT
support GLSL ES / WebGL2 for the Rust port** - do not add, maintain, or
"keep in sync" a `GLSL300ES` shader variant, and do not gate features on
ES compatibility.

Concretely:

- **One shader source per shader: GLSL 410.** New shaders are written in
  `#version 410` with explicit `layout(location=N)` on every vs-out /
  fs-in varying (desktop core needs them and they must match between
  stages). Prefer a plain `.glsl` text file loaded via `include_str!`
  over checked-in byte arrays.
- **Do not feed one shared body to two backends.** A hard-won bug: a
  single composite FS body was reused for both `glcore` and `gles3`.
  GLSL ES 3.0 forbids `layout(location)` on varyings, so the shared body
  dropped them; linked against the 410 vertex shader (whose outputs keep
  explicit, differently-ordered locations) the varyings got crossed and
  the whole screen rendered black. ES and desktop cannot share a body -
  and since we are desktop-only, the ES body simply should not exist.
- **Validate shaders by LINKING vs+fs**, not just compiling each stage -
  a per-stage compile passes while a varying-location mismatch still
  breaks the program at link time. Validate against a **core** profile
  context, not a compatibility profile (compat is too lenient).
- The `Gles3` arms in `*_shader_desc` and any `*_SOURCE_GLSL300ES`
  constants are legacy; new work drops them. When you touch a shader,
  collapse it to the 410-only path.

This rule stays in force until the user says otherwise.

## Terminology

When the user describes work in terms of these labels, treat them as
load-bearing - they say where the change belongs:

- **MP** - multiplayer.
- **SP** - single player.
- **Client** - the SP + MP client side. Anything under
  `tenebris-c/src/client/` plus the shaders under `tenebris-c/src/shaders/`.
  "Non-server code." Includes rendering, input, local prediction, UI,
  audio, the chat UI, profile management, etc.
- **Core** - SP and MP code that mutates authoritative state / poses /
  voxel data. Anything under `tenebris-c/src/core/` plus the relevant
  parts of `tenebris-c/src/server/`. Physics, world / chunk edits,
  saves, the server tick loop.

A bug that "doesn't work in SP or MP" is a Core bug if it touches
world state (mining, placement, physics) and a Client bug if it
touches rendering or input. When in doubt, fix it in Core so SP and
MP share the same code path.

## Never rebuild an existing feature - find it and extend it

Before writing a new system, **search for the one that already does the
job and grow it.** This codebase has years of working machinery; the
default assumption for any "add X" task is that something X-shaped (or
X-adjacent) already exists and the change is an extension, not a
green-field build.

The discipline, in order:

1. **Find it first.** Grep / read for the feature, its data, its state,
   its UI, its persistence, its tests. Look in `core/` (shared SP+MP
   state), in the client screens, in the save/load format, and in the
   JS reference tree for how it worked originally. Spend the search
   budget *before* the keyboard.
2. **Extend or parameterize, don't fork.** If the existing thing is
   close, add a field / variant / config knob / function parameter so
   the new case flows through the *same* code path. A new enum variant
   on an existing state machine beats a parallel state machine. A new
   YAML field beats a hard-coded second copy. One mutator wired into the
   existing persistence point beats a second save path.
3. **Generalize only as far as the second caller needs.** Make the
   shared code handle both cases cleanly; don't over-abstract for
   hypothetical third callers that don't exist yet.
4. **If you must add something new, say why.** When no existing system
   fits, state explicitly what you searched for and why extension was
   the wrong call, then build the new thing where its siblings live
   (the new mutator next to the other mutators, the new screen next to
   the other screens) so the *next* person finds it.

Concretely, a parallel implementation of something that already exists -
a second inventory store, a duplicate save path, a copy-pasted UI panel,
a re-derived flight sim - is a bug, not a feature. Two code paths that
must agree will drift; the SP/MP split in the Terminology section is the
whole reason we keep one path. If you catch yourself typing a struct,
function, or file whose shape mirrors one already in the tree, stop and
extend the original instead.

This rule stays in force until the user says otherwise.

## All world edits must persist immediately

Every block placement, every block break, every torch placement,
every torch removal must be written to durable storage **on the
same input frame it happens**, not batched, not snapshotted, not
deferred to a timer.

- **MP**: per-edit write through `saves_write_tile()` in the
  server's `PLAYER_CMD` handler (the whole 128-byte column, not a
  delta). Already wired; do not regress it.
- **SP**: per-edit write to `window.localStorage` via
  `persistence_save_tile()` / `persistence_save_torches()`. Calls
  live next to the `world_set()` / `torch_place` / `torch_remove`
  call in `interact.c` (or wherever the equivalent mutation
  originates).

There is no "save on quit" or "save every N seconds" path for block
or torch state. A browser tab can close without warning; a Fly
machine can auto-stop mid-frame. The 5 s pose autosave is acceptable
because pose is cheap to re-derive — block + torch state is not.

When you add any new world-mutating action (fluid placement, entity
spawn, terrain reshape, vehicle parts, etc.), wire its persistence
at the same point in the call graph as `world_set` is wired today.
A new mutator without a same-frame save is a bug, not a feature
request.

## The Rust port (`tenebris-rs/`) is the leading platform — C and JS are archive-only

`tenebris-rs/` is now the primary, leading development target. All new
work, features, and fixes happen there. **The C tree (`tenebris-c/`) and
the JS tree (`src/`, `public/`, ...) are kept only for archival /
historical reference — their implementations no longer matter.**

Concretely:

- **Do not chase parity with C or JS.** When Rust behaviour diverges from
  the C/JS implementation, that is fine — Rust leads. Do not "fix" Rust to
  match C/JS, and do not hold back a Rust change because it would break a
  C-parity guarantee.
- **Golden tests are Rust-golden.** Pinned mesh / worldgen / sim hashes in
  `tenebris-rs/` are snapshots of the *intended Rust output*, not a C-parity
  contract. When an intentional gameplay/visual change moves them, re-pin to
  the new Rust values (verify the change is the one you meant, then update
  the constant) and note why. Older "generated from the C build" comments
  are historical.
- **Reading C/JS to learn how a feature worked is still fine** and often
  useful. But treat them as documentation of the past, not a spec to honour.
- **Never edit C or JS to keep them in sync with Rust.** They are frozen
  archives; do not touch them (the older "all development happens in
  `tenebris-c/`" note below is superseded by this section).

This rule stays in force until the user says otherwise.

## DO NOT MODIFY THE TENEBRIS JS SOURCE — IT IS DEPRECATED

The original Three.js / TypeScript implementation lives at the repo root
(`src/`, `public/`, `index.html`, `package.json`, etc.). **It is
deprecated.** It exists only as a reference implementation for the C port
to study; it is not maintained, not shipped, and not part of the active
product.

**Updates to the JS code are strictly off limits.** Do not edit, refactor,
"fix", reformat, or otherwise touch any file under the JS tree — including
shaders under `src/shaders/`, configs under `src/config/`, world generation
under `src/planet/`, or anything else outside `tenebris-c/`. Reading the JS
to learn how a feature works is fine and encouraged. Touching it is not,
even if you spot a bug, a typo, or an obvious improvement — port the fix
into `tenebris-c/` instead, or leave it alone.

This rule stays in force until the user says otherwise.

## Active port lives under `tenebris-c/`

All development happens in the C + Sokol + WASM port at `tenebris-c/`. If
something feels like it should change in the JS, instead change the C port
to no longer depend on the JS shape — or surface the question and let the
user decide.

## The Rust port (`tenebris-rs/`) is self-contained — never reference the C or JS trees

The Rust port under `tenebris-rs/` is a standalone target that owns its
own source, assets, and build scripts. **Rust code and Rust build
scripts must NEVER reference the C tree (`tenebris-c/`) or the
deprecated JS tree (`src/`, `public/`, ...) as a build-time or runtime
dependency** — no `..\tenebris-c` paths, no `../../../tenebris-c/...`
in `concat!` / `include_*` / test fixtures, no cd-ing into a sibling
tree, no borrowing its assets.

- **Build / run scripts** (`run-rust.bat`, any future Rust tooling) may
  only touch paths under `tenebris-rs/`. The binary builds and runs from
  `tenebris-rs/` and loads assets from `tenebris-rs/assets/`.
- **Assets** the Rust build needs live under `tenebris-rs/assets/` and
  are the Rust port's own copy. When the port needs an asset that only
  exists in the C tree, COPY it into `tenebris-rs/assets/` — never point
  at the C copy. (This supersedes the older "shared asset tree, not
  duplicated" note in `tenebris-rs/PORTING.md`.)
- **Rust source, including tests**, must not open, include, or hard-code
  a filesystem path into `tenebris-c/` or the JS tree.

Two things are explicitly NOT covered by this rule:

1. **`//! Port of tenebris-c/...` attribution comments** and any other
   prose that merely *names* the C file a module was ported from. Those
   are documentation, not a dependency — reading the C / JS to learn how
   a feature works stays fine and encouraged.
2. **Save / wire-compat string literals** that happen to contain the
   text `tenebris-c` — the `tenebris-c:` localStorage / KV key
   namespaces, the `wss://tenebris-c.fly.dev/` server URL, the
   `tenebris-c` config dir name under `%APPDATA%`. These are on-disk /
   on-wire identifiers; changing them breaks existing saves and MP
   interop, so they stay exactly as-is (see PORTING.md hard rule 1).

This rule stays in force until the user says otherwise.

## Tunable values live in `tenebris-c/assets/config/*.yaml`

Anything that's "a knob a designer or modder might want to turn without
recompiling" should be exposed in a YAML file under
`tenebris-c/assets/config/`, not as a `const` or `#define` in C/GLSL.
The first such file is `atmosphere.yaml` — see `src/core/config.c` for
the parser pattern.

Conventions:

- One config file per subsystem (`atmosphere.yaml`, future
  `terrain.yaml`, etc.). Keep the schema documented at the top of the
  YAML itself so the file is self-describing.
- Sections are body / object names; fields are lowercase
  underscore_case. Values are floats or `[a, b, c]` vec3 lists.
- A field set to its zero value (or omitted entirely) means "use the
  compiled-in default". The C side merges by checking `> 0.0f` per
  field — this lets the YAML express partial overrides.
- The parser is a deliberately tiny YAML subset (key/value, vec3
  lists, top-level sections, `#` comments). Don't reach for libyaml
  for one config file.
- Files are bundled via the existing `assets/` preload directive, so
  they ship with the WASM binary at build time. Native builds read
  them off disk at boot for true edit-and-rerun iteration.

When adding a new tunable, the checklist is: (1) add field to the
relevant struct in `core/`, (2) extend the YAML schema doc-comment,
(3) extend the parser's switch in `core/config.c`, (4) plumb through
to the consumer (renderer / sim / whatever).

## No magic numbers in code

Unless a value is a true mathematical or protocol constant that will
never need to change (π, the speed of light, the on-disk header magic
of a fixed file format), **do not hard-code numeric literals in
C/GLSL**. Every "designer-tweakable" or "feels-right-after-iteration"
number — colours, sizes, thresholds, falloff curves, density layers,
phase asymmetries, drift speeds, intensities — belongs in a YAML file
under `tenebris-c/assets/config/` and reaches the consumer via a
`config_*()` getter.

If you find yourself writing `* 0.85` or `vec3(0.55, 0.18, 0.38)` in
a shader or sim path, stop. Add a field to the relevant
`*_config_t`, extend the YAML schema and parser, and read it as a
uniform / value at runtime instead. The four-step checklist above is
the same one you'd follow for any new tunable.

The only exception is values that are part of an algorithm's
*identity* — e.g., the magic constants inside a hash function
(`0.1031`, `443.897`) where the specific number doesn't have a
semantic meaning, it just makes the hash work. Those stay inline,
because exposing them would invite breakage rather than tuning.

## UI guidelines

### Item visuals and slot grids are a PRIORITY (not optional)

Inventories, the crafting screen, storage chests, the hotbar, and any
panel that shows items **must render a grid of slots with item
thumbnails** — a real icon per item, drawn from the item's texture —
**never a text list of "name xN" rows**. Every item must have a visual;
giving an item an icon is treated as part of adding the item, not a
later polish pass. A panel that lists items as text instead of a
thumbnail grid is a bug, not a deliverable.

Concretely:

- **Grid, not list.** Inventory / crafting / chest contents are laid out
  as a 2D grid of fixed-size square slots (the Minecraft-style cell:
  border, item icon centred, stack count in the corner). Recipes show
  their inputs/outputs as icons, not "1 copper, 1 coal" text.
- **Thumbnails, not labels.** The slot shows the item's texture. Text is
  only a small stack-count badge and optional hover tooltip — not the
  primary representation.
- **Item visuals come first.** When a new item or block is added, it
  gets an icon in the same change. No item ships icon-less; no UI ships
  showing an item as a bare name.

Do **not** hand back a text-mockup UI or default-framework widgets
slapped over the canvas and call it done. If you cannot draw the icons
yet, surface that as the blocking task and solve it (item-icon atlas,
texture sampling in the UI layer) — do not substitute a text list.

### General

When the user asks for UI — menus, dialogs, popups, debug panels,
HUD readouts — **do not generate low-effort ASCII art** as the
default. Tenebris already has a sokol_gl helper layer with rounded
buttons, rings, segments, glyph rendering, and an alpha-blended
2D pipeline (see `src/client/mobile_ui.c`). New UI should use that
layer to draw real geometry: filled rectangles or rounded buttons
for backgrounds, distinct colours for hover / selected / disabled
states, and `sokol_debugtext` only for labels *on top of* a real
panel — never as the panel itself.

Specifically:

- A "popup menu" or "modal" means a drawn panel with a backdrop,
  a title, and clickable rows. Not a frame of `+----+ | text |
  +----+` characters built from `sdtx_printf`.
- Buttons must be hit-testable. Wire each one through
  `mobile_ui_handle_touch` (or an equivalent module-local hit
  table) so a click / tap actually triggers its action.
- Labels go through `sdtx_printf` because that's the only readable
  text path. That's fine — the rule is about the *structure* of
  the UI, not whether glyphs are rastered.

The exception is plain HUD readouts that are inherently text (FPS,
altitude, `[H] hide terrain`). Those stay as `sdtx_printf`.

Only deliver an ASCII-only UI when the user explicitly asks for it
("draw an ASCII frame", "I just want text").

## In-game text: ASCII only — no em-dashes, no smart quotes

Every string that ends up rendered on screen via `sdtx_printf` must
be plain 7-bit ASCII. The bundled `sokol_debugtext` fonts (Oric,
c64, etc.) only define glyphs for the standard ASCII range, and
non-ASCII characters render as garbage glyphs (you'll see € for
`_`, weird boxes for `'`, etc.).

**Never use em-dashes (—) in any string that reaches the player.**
Use a regular hyphen `-` instead. Same goes for en-dashes (–),
typographic quotes (`'`, `'`, `"`, `"`), the ellipsis character (…),
non-breaking spaces, and any other Unicode punctuation. Comments in
the C source are free to use whatever — the rule is strictly about
*rendered* text.

Also avoid `_` (underscore) in player-visible strings — the Oric
font maps it to a graphic glyph rather than a true underline, so
`player_id` renders as `player€id`. Use `-` (hyphen), space, or
camelCase if you need to break words.

This rule stays in force until the font pipeline gains real Unicode
coverage, which is not on the roadmap.

## No browser alert / prompt / confirm boxes — in-game UI only

**Never use `window.alert`, `window.prompt`, or `window.confirm` for
any user-facing input or dialog.** Those native browser modals look
out of place over the game canvas, can't be styled, steal focus
mid-gameplay, and on mobile cover most of the screen. They have no
place in the shipping UX.

Every text input — room codes, profile names, world names, server
URLs, chat — goes through an **in-game input box**: a real drawn
panel rendered with `sokol_gl` for the geometry and `sokol_debugtext`
for the typed glyphs, with the input loop driven by
`SAPP_EVENTTYPE_CHAR` (typed characters) and `SAPP_EVENTTYPE_KEY_DOWN`
(Enter / Escape / Backspace). The menu module already owns one such
box for the room JOIN flow — reuse / extend that rather than
reaching for `EM_JS(window.prompt)`.

Same applies to confirmations: a real two-button dialog drawn on
the canvas, not `window.confirm`. The exception is `console.log` /
`console.error` for dev diagnostics — those go to devtools, not the
game, so they're fine to keep on the standard JS console.

If a feature *requires* the browser prompt UX (e.g. a deep-link
permission grant), document the exception inline at the call site.
Otherwise this rule is absolute.

## Cross-platform UI lives in the canvas, DOM is mobile-only scaffolding

This is a web game, but "web" doesn't mean "browser-styled HTML".
The core game UI — every menu, pause panel, dialog, input box,
HUD readout — is rendered **inside the canvas** with `sokol_gl`
+ `sokol_debugtext` so it matches the game's visual identity on
every platform. A real game's pause screen looks like part of
the game, not like a `<button>` with the browser's default UA
styling.

DOM overlays exist only for **mobile-only virtual input
controls** — things that duplicate input the desktop player
already has via keyboard / mouse, and that we'd never show on
desktop. Phones don't have an Esc key, a `W` key, or a left mouse
button, so they need on-screen stand-ins. Those stand-ins are
scaffolding, not part of the game's UI; using the browser's
native button styling is fine for them because they're already
visually outside the game world.

The pattern in `main_web.c` `init()`:

```c
#ifdef __EMSCRIPTEN__
if (tenebris_is_mobile_device()) {
    /* DOM scaffolding so phones can play at all. Gated on mobile
     * detection - desktop already has the real inputs. */
    tenebris_pause_button_install();      // stands in for Esc
    tenebris_mobile_controls_install();   // joysticks + JUMP / BREAK / PLACE
}
#endif
```

Pause panels, profile pickers, error dialogs, the chat box,
the world picker — all drawn with `sokol_gl` panels and
`sokol_debugtext` labels through the existing menu module, no
DOM. Same code path on every platform.

The two layers never mix: a touch-only DOM control (the mobile
pause Esc-stand-in) is hidden on desktop; a cross-platform panel
(the pause menu itself) renders into the canvas on every device.

## Static game asset guidelines

These rules apply to every asset Claude generates, hand-edits, or asks
the user to drop into the repo. Keep them in mind whenever a task
involves "generate a model / texture / animation".

- **Textures** — if the task involves generating textures, the result
  must be baked to PNG (8-bit RGBA, ≤32×32 unless the existing pipeline
  allows otherwise) and committed under `assets/textures/`. The
  Makefile runs `mksprite` to convert each PNG to a `.sprite` at build
  time. Do not commit the `.sprite` outputs — only the source PNG.
- **3D models** — Tenebris is a procedural game, so the default for new
  3D content is to generate it procedurally in code (mesh built at
  runtime from parameters, the way trees / planets / asteroids already
  work). Only when the user explicitly asks for a **"custom model"** or
  **"baked model"** do we go to the baked-asset path: a `.obj` file
  under `assets/models/`, optionally with a matching JSON sidecar for
  the in-browser model editor, with the `.obj` as the source of truth.
  Generators for baked models live under `tools/` and write both.
- **Animations** — if the task involves animation (walk cycles,
  machinery motion, scripted camera moves, anything that sweeps a
  transform over time), the keyframes must be baked to an animation
  file under `assets/animations/`. The current pipeline uses simple
  JSON `*.anim.json` (frames + per-bone transforms) plus an optional
  baked C header generated by a `tools/gen-*-c.py` script. Procedural
  per-frame tweaks layered on top of the baked clip are fine; the base
  motion must come from the file.
- **Generation scripts** go under `tools/`. Each generator follows the
  pattern of `tools/gen-textures.py` / `tools/gen-character.py` /
  `tools/gen-character-c.py`: a Python entry point that writes out the
  baked artifact deterministically, with no third-party deps beyond
  what the existing scripts already use (stdlib + zlib).

## Time compression on server resume

The Fly deployment has `auto_stop_machines = 'stop'` +
`min_machines_running = 0`, so the dedicated server sleeps when
idle and starts back up on the first request. When the server
boots it should treat wall-clock time *since the last persisted
state* as "elapsed simulation time" - not "time the server has
been running" - and fast-forward any long-running simulation
processes by that delta in one step at startup. This keeps the
world coherent across cost-saving stops without the operator
having to keep the machine warm.

Subsystems that should participate when they land:

- **Plant / tree growth** - regrow harvested leaves, age stumps,
  spread saplings.
- **Animal populations** - births / deaths / migration on a
  per-biome stat, not per-individual; the per-individual entities
  are spawned lazily when a player is nearby.
- **Resource regen** - ore veins refilling, water table recovery
  after pumping.
- **Economy / market** - price drift, NPC trader inventories
  cycling, faction balance shifts.
- **World events** - timers on storms, eclipses, comet visits.

Implementation pattern:

1. Persist a `last_sim_time_unix_s` on every relevant save (alongside
   the existing chunk / player files under `/data/saves/`).
2. At `server_init`, after loading the saves, compute
   `dt = max(0, now() - last_sim_time)` and call each subsystem's
   `*_catch_up(dt)` once before opening the listener.
3. Cap the delta (e.g. one in-game year) so a server that's been
   off for months doesn't blow up - long absences just settle to
   the steady state.
4. Subsystems live in `core/` so the same code path runs in SP and
   MP - the SP client uses `dt = save_age` exactly the same way.

This note is a *reminder*, not a current spec. None of the above
subsystems exist yet; when adding the first one, also add a
`world_time.{c,h}` module in `core/` that owns the `last_sim_time`
field + the central catch-up dispatch, so each new system plugs
into one place.

## Screenshotting the planet from orbit — use the LOD camera, never hand-aim

Aiming the screenshot camera at the planet from orbit by guessing
`TENEBRIS_DEV_HOVER` / pitch / yaw wastes runs and repeatedly ends up
staring at empty starfields. **Do not hand-aim the from-orbit camera.**
Use the deterministic tool that always frames the full disk:

- **`TENEBRIS_DEV_SHOT=<path.png>` — the ONLY reliable way to grab a PNG
  on Windows.** The engine itself glReadPixels the finished back buffer
  once a second and atomically overwrites the file (`dev_shot.rs`).
  External window capture does NOT work: PrintWindow returns a white
  frame for a GL swapchain, and screen-copy loses the z-order fight with
  whatever window the user has focused. Recipe: set the env vars, boot,
  wait ~150 s (worldgen + hook arming), read the PNG, kill the client.
  Read the PNG only AFTER the boot wait — it's overwritten continuously
  from frame 60, so an early read sees a mid-boot frame.
- **Water framing** (composes with `TENEBRIS_DEV_BODY=sequoia` +
  `TENEBRIS_DEV_WEATHER=rain|snow|clear`): `TENEBRIS_DEV_DIVE=<m>` —
  negative = AERIAL (camera |m| above the deepest ocean, aimed down at
  the sheet: the "is the sea green or sky-coloured" framing), `< 2` =
  wade (eye ~0.4 m BELOW the waterline — a straddle shot, mostly sky in
  frame, NOT a water-sheet shot), `>= 2` = fully underwater; add
  `TENEBRIS_DEV_LOOKUP=1` with a deep dive to aim straight up for
  Snell's-window shots.

- **`TENEBRIS_DEV_LODCAM=<metres>`** (combine with `TENEBRIS_DEV_SP=<name>`):
  each frame parks the camera `<metres>` beyond the planet surface on a
  sun-perpendicular azimuth (terminator bisects the disk), lifted off the
  equatorial plane so the station drum isn't in front, and aims it dead at
  the planet **centre**. It forces `is_in_space = false` and remeshes the
  full disk once gen completes, so the whole globe renders as terrain. Lives
  in `app.rs` by the other per-frame dev-cam hooks.
- **How the aim works (don't regress this):** the look direction is solved,
  not guessed. Each frame it takes `to_center = normalize(center - cam)` and
  solves yaw/pitch against the player's **current** basis
  (`pitch = asin(dot(to_center, up))`, `yaw = atan2(dot(to_center, right),
  dot(to_center, fwd))`). The old hard-coded `yaw=0 / pitch=-1.552` assumed
  `basis.up == view_dir`, but the basis is parallel-transported and stale for
  a frame or two after the teleport, so the fixed angles pointed off-centre
  (the exact "camera wasn't aimed at the planet" bug). Solving against the
  live basis frames the disk no matter how the basis is oriented.
- **`tenebris-rs/tools/lodcam-capture.sh [OUT_DIR] [DISTANCES...]`**: boots
  the client once per distance and grabs one PNG each — a consistent A/B
  set for from-orbit visual work. Two LOD tiers, two default sweeps:
  **primary** (near, detailed terrain + per-puff clouds) at **200 m
  increments** (`200..1000`), and **secondary** (far distant-sphere LOD +
  cloud-texture wrap) at **2 km increments** (`2000..12000`).
- **`TENEBRIS_DEV_SUNCAM=<metres above surface>`** (sibling hook): frames
  the **sun disc** instead — parks the camera above the sub-solar point
  and solves yaw/pitch dead along `orbit::sun_direction`, which is the
  same direction the disc is drawn along, so it always centres. Use for
  any `sun.fs.glsl` / solar.yaml look work. Shares the LODCAM no-autosave
  gate. Boots fast (~40 s — no full-disk gen needed, you face away from
  the terrain).

Hard facts learned building it (don't relearn them the slow way):

- **Near tier: ~200..1000 m.** By ~400 m the whole globe fills the frame.
  Between there and the 5 km chunk cutoff the terrain streaming radius can
  cull chunked terrain back toward empty stars — that's why the far tier
  exists.
- **Far tier: past the 5 km chunk cutoff** the active body draws the
  distant-sphere LOD (no streaming), and **past ~10 km** the translucent
  cloud-texture shell wraps it (`clouds.yaml` `lod_alt_m`). This is the tier
  to check cloud-shell and distant-LOD shading changes.
- **`is_in_space` must be forced false** for the capture. Past ~200 m the
  space seam otherwise flips it true, unloads the voxel chunks, and the disk
  vanishes.
- **The capture MUST NOT autosave.** The hook pins the player in orbit every
  frame; if that pose gets written to the world save, every later load
  spawns in space with terrain unloaded (a poisoned save). `maybe_autosave_sp`
  early-returns while `TENEBRIS_DEV_LODCAM` is set — keep it that way. Prefer
  a throwaway world name (`TENEBRIS_DEV_SP=rimtest`) for captures.
- **Fresh worlds need long boots** (120 s+) to stream-generate the full disk;
  a partially-gen'd world reads as an off-centre partial arc.
- In the **near tier** the planet is **voxel hex terrain + the atmosphere
  shell**, NOT the distant-LOD impostor. So near-orbit terrain shading
  targets the **hex** terrain shader (`hex_fs_light[3..6]` carries the
  camera + rim knobs) and the atmosphere. In the **far tier** (past 5 km) it
  swaps to the distant icosphere impostor (`distant.fs.glsl`) plus, past
  ~10 km, the `clouds.rs` cloud-texture shell. Pick the shader that matches
  the tier you're capturing.

When doing any "planet from orbit" visual change, capture a before/after
with this tool instead of guessing at the camera.

## Post-commit links

After each commit, always show these links to the user:

- Play the games: https://rubentipparach.github.io/tenebris/
- Track CI builds: https://github.com/RubenTipparach/tenebris/actions
- Operator portal: https://tenebris-c.fly.dev/admin
- Hex structure editor: https://tenebris-c.fly.dev/admin/tile-editor

The `/admin` portal and the tile editor are served by the dedicated
server itself (`tenebris-server` on Fly), so they update on the same
push that deploys the server. The editor exports `*.template.json`
into `tenebris-rs/assets/templates/`.
