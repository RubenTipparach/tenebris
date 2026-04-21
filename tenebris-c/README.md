# tenebris-c

Sokol + C11 + WebAssembly port of Tenebris. See `../conversion.md` for
the full plan.

## Status

**Tier 0**: hello triangle (in progress). Target is a browser-loadable
WASM that clears the screen and draws a textured quad to prove the
pipeline end-to-end.

**Tier 1+**: not yet started.

## First-time setup

```sh
# Vendor third-party single-header libs (sokol, stb, HandmadeMath)
./scripts/fetch-deps.sh

# Install Emscripten SDK and activate it (one-time, outside this repo)
#   https://emscripten.org/docs/getting_started/downloads.html
# Then `source emsdk_env.sh` in each shell that builds the web target.
```

## Build

```sh
# Web (WASM) build — this is the shipping target
cmake --preset=web
cmake --build build-web

# Native dev build (Linux/macOS/Windows) — for fast iteration + server
cmake --preset=native
cmake --build build-native
```

Web artifacts land in `build-web/tenebris.html + .js + .wasm`. Serve
with `emrun build-web/tenebris.html` or any static HTTP server that
sets COOP/COEP headers.

## Directory layout

```
src/
  core/     shared between client and server, MUST NOT link sokol
  client/   renderer, input, UI
  server/   authoritative sim (Tier 5+)
shaders/    GLSL sources, processed by sokol-shdc
assets/     runtime assets (textures, audio) copied from ../public
third_party/  vendored single-header libs (populated by fetch-deps.sh)
web/        HTML shell template for emcc
```
