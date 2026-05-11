# Repo rules

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

## Post-commit links

After each commit, always show these links to the user:

- Play the games: https://rubentipparach.github.io/tenebris/
- Track CI builds: https://github.com/RubenTipparach/tenebris/actions
