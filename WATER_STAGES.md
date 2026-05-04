# Water Rendering — Staged Rework (FBO restart)

Tracking doc for the water rebuild on
`claude/fix-planet-terrain-teG9x`. Lives in repo root so it doesn't
get lost during `tenebris-c/` reorgs. Each stage is its own commit
so individual changes can be reverted in isolation.

## Goal

Water on Tenebris (and other has_water bodies) renders as a
**masked composite** over the underwater scene, with:

- depth-aware extinction — water gets darker / bluer as the view
  ray traverses more of it, sampled from the offscreen depth
- UV-distortion refraction — small surface-gradient-driven UV
  perturbation when sampling the offscreen colour
- soft shorelines — alpha feathered by depth difference
- visible animated ripples (geometry swell + flowing surface
  normal)
- terrain still legible through shallow water

## Architecture

Per frame:

1. **Offscreen pass** — render everything underwater into a
   colour+depth attachment pair sized to the swapchain:
   - sky / atmosphere / stars
   - sun
   - distant bodies
   - active body terrain + moons
2. **Composite pass (swapchain)**:
   - fullscreen quad samples the offscreen colour and writes it to
     the swapchain (this single quad replaces the previous "render
     directly to swapchain" path for the underwater scene)
   - water cap draws on top, sampling both offscreen colour and
     offscreen depth to compute refracted underwater colour, depth-
     through-water extinction, soft shoreline, foam, surface lighting

## Done (kept from stages 1–3)

| Stage | Commit | Change |
|------|--------|--------|
| 1    | `c33a741` | `emit_cap` accepts `r_offset_m`; water cap drops by `WATER_DEPTH_OFFSET_M` so wave swell can't spill above coplanar beach sand |
| 1 tune | `8b9baf3` | Cap drop 0.30 → 0.50 m |
| 2    | `134bf42` | Opacity range `mix(0.70, 0.97, f)` → `mix(0.45, 0.80, f)` |
| 3    | `8ad5918` | Specular multiplier `2.0` → `0.6` |

## Reverted / abandoned (history kept here so we don't repeat mistakes)

- **Stage 4 (uniform-block fog with new `vec4 u_fog`)** — pulled
  because the in-shader screen-space mix doesn't address what's
  *behind* the water. Replaced by Phase B.2.
- **Stage 4a (hardcoded screen-space distance fog)** — same reason
  as 4. Was useful as a sanity check that the visual showed up; now
  obsolete.
- **Stage 4.5 (animation-rate bump)** — reverted because the cap
  turned red afterwards. Root cause never confirmed. Re-attempt
  cautiously in a later polish stage with smaller bumps.
- **Original bulk water rewrite** — pulled because the GLSL noise
  port + uniform-block expansion produced solid green water.
- **First Phase A.1 attempt** — used field names that don't exist
  on this sokol version (`usage.render_attachment`,
  `sg_make_attachments`). Correct API is
  `usage.color_attachment` / `usage.depth_stencil_attachment`
  on `sg_image_desc`, plus a pair of `sg_view` objects of
  `.color_attachment.image` / `.depth_stencil_attachment.image`
  type passed directly into `sg_begin_pass.attachments.colors[0]`
  / `.depth_stencil`.

## Pending — Phase A: offscreen FBO infrastructure

Stand up colour + depth render targets, route the opaque-scene
draws through them, composite back to the swapchain. No water
behaviour change yet — we ship "looks identical" through the new
pipeline first to prove the plumbing works.

| Step | Plan |
|------|------|
| A.1  | Create offscreen colour (RGBA8) + depth (DEPTH) `sg_image`s plus matching `sg_view`s (one `.color_attachment` view, one `.depth_stencil_attachment` view, plus a `.texture.image` view of the colour for sampling later). Lazy-recreated on resize. Nothing samples or renders into them yet — only proves the create/destroy path compiles. |
| A.2  | Replace the existing `sg_begin_pass{ swapchain = sglue_swapchain() }` for the **opaque** draws (sky, sun, distant, terrain) with `sg_begin_pass{ attachments = { colors[0] = offscreen_color_att, depth_stencil = offscreen_depth_att } }`. Don't draw water in this pass yet. Begin a second swapchain pass after `sg_end_pass()` for the on-screen output (initially with a debug clear so we can confirm two passes run). |
| A.3  | Add a fullscreen-quad **composite** pipeline + shader. In the swapchain pass, draw it first to copy the offscreen colour onto the swapchain. Result should look identical to today's render. |
| A.4  | Move the existing water draw call into the swapchain pass after the composite quad. Visually unchanged from stage 3 — water still uses its current shader, doesn't yet sample the offscreen textures. |

## Pending — Phase B: water samples scene textures

| Step | Plan |
|------|------|
| B.1  | Add the offscreen colour + depth sampling to the water shader / pipeline. Two new `sg_view` bindings (texture views of the offscreen images) + a sampler. Fragment uses `gl_FragCoord.xy / vec2(textureSize(scene_color, 0))` as the UV. Initial composite is `mix(scene_color, water_color, water_alpha)` for parity with the current look — proves the sampling works. |
| B.2  | Depth-thickness extinction: linearize the sampled depth using projection near/far, subtract the water-surface depth, run through `exp(-thickness * extinction)` for a proper depth-fog curve. The `extinction` constant per RGB channel produces the classic blue-green absorption. |
| B.3  | Refraction: perturb the UV used for the colour sample by the surface tangent-plane gradient (small magnitude, ramped by `min(thickness, ~1 m)` so shallow water doesn't shimmer wildly). |
| B.4  | Soft shoreline: feather alpha by `smoothstep(0.0, ~0.5 m, thickness)` so water meets land as a gradient instead of a hard line. |

## Pending — Phase C: polish + tunables

| Step | Plan |
|------|------|
| C.1  | Shoreline foam — `1 - smoothstep(0.0, ~0.3 m, thickness)` band where water meets land. |
| C.2  | Re-attempt animation rate bump (carefully — last try produced red water and cause was never confirmed). |
| C.3  | Move every water knob (cap drop, fog colour, extinction, refraction strength, foam threshold, etc.) into `tenebris-c/assets/config/water.yaml` with a `water_config_t` + `config_load_water()`, similar to skybox / lod. CLAUDE.md no-magic-numbers rule. |

## References

- WebGL2 Fundamentals — Render to Texture:
  https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html
- LearnOpenGL — Framebuffers (depth linearization formula at end):
  https://learnopengl.com/Advanced-OpenGL/Framebuffers
- Sokol offscreen sample (canonical post-2024 API):
  https://github.com/floooh/sokol-samples/blob/master/sapp/offscreen-sapp.c
- Sokol header doc-comment for the offscreen pattern: lines
  ~585–720 of `sokol_gfx.h` (`floooh/sokol`)
- Fire-face water article — render-to-texture refraction; we add a
  depth attachment of our own for fog/extinction:
  https://fire-face.com/personal/water/
- ThinMatrix water tutorial series — canonical architecture
- Three.js `MeshTransmissionMaterial.js` — modern web reference
  for what "good" web water looks like

## Risks / known gotchas

- WebGL2 depth-texture support is universal but **default float
  precision** isn't — depth sampling needs `precision highp float;`
  in the fragment shader.
- Fragment-shader integer math needs `precision highp int;` —
  burned us once already on the gradient-noise port.
- Sokol attachments don't have an in-place resize; destroy +
  recreate on `sapp_width()/height()` change.
- Sokol pool sizes: image, view, pipeline pools default to 128 each
  (only `buffer_pool_size` is bumped to 4096 in `main_web.c`).
  Recreating attachments on every resize is fine but watch the
  view pool if we add lots of views.
- Loose-uniform packing in sokol: **every uniform takes a vec4
  slot** — even bare floats. This caught us before; offsets in the
  upload buffer must be `[0]`, `[4]`, `[8]`, `[12]`, … not packed.
