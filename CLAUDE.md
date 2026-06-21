# Repo rules

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

## Post-commit links

After each commit, always show these links to the user:

- Play the games: https://rubentipparach.github.io/tenebris/
- Track CI builds: https://github.com/RubenTipparach/tenebris/actions
