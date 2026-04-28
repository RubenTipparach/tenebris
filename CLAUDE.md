# Repo rules

## DO NOT MODIFY THE TENEBRIS JS SOURCE

The original Three.js / TypeScript implementation lives at the repo root
(`src/`, `public/`, `index.html`, `package.json`, etc.). It is the
reference implementation.

**Do not edit, refactor, or "fix" any file under the JS tree** — including
shaders under `src/shaders/`, configs under `src/config/`, world generation
under `src/planet/`, or anything else outside `tenebris-c/`. Reading the JS
to learn how a feature works is fine and encouraged. Touching it is not.

This rule stays in force until the user says otherwise.

## Active port lives under `tenebris-c/`

All development happens in the C + Sokol + WASM port at `tenebris-c/`. If
something feels like it should change in the JS, instead change the C port
to no longer depend on the JS shape — or surface the question and let the
user decide.
