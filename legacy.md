# Legacy rules — the frozen C and JS trees

This file is the archive of repo rules that are specifically about the
**deprecated C tree (`tenebris-c/`)** and the **deprecated JS tree
(`src/`, `public/`, `index.html`, ...)**. They are kept for historical
context only.

The active, one-line version of all of this now lives in `CLAUDE.md`
under **"C and JS trees are frozen archives — all work is in
`tenebris-rs/`"**. The short story: `tenebris-rs/` leads; do not edit,
chase parity with, or make Rust depend on the C/JS trees; reading them
to learn how a feature worked is fine; and the save / wire-compat string
literals containing `tenebris-c` must never be "cleaned up." Everything
below is the long-form background.

> Note: some of these sections contradict each other in date order (the
> "Active port lives under `tenebris-c/`" note predates the Rust port and
> was superseded first by the C-leading era and then by the Rust-leading
> era). They are preserved as written so the evolution is legible.

---

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
