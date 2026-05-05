# Water Refraction — research + plan

Dedicated branch for adding refraction to the water shader on
`claude/water-refraction`. This doc lives in the repo root so it
doesn't get lost in `tenebris-c/` reorgs. Each technique and
trade-off below is summarised concisely so we can pick the path
deliberately rather than drift into rework.

## What "refraction" actually means here

The visual goal: look down through the water cap and see the
underwater terrain (sand / rock / plants), distorted by the ripples
on the surface, with progressively-bluer-and-darker colour as the
view ray traverses more water (depth fog / extinction).

Two physical effects fold together:

1. **Refraction proper** — the view ray bends when it crosses the
   water surface. Mathematically it's `refract(view, normal, eta)`.
   The visual symptom is that an underwater pixel appears at a
   slightly-shifted screen location compared to where it was when
   drawn.
2. **Volumetric absorption** — Beer–Lambert extinction along the
   path through the water (`exp(-d * sigma)` per RGB channel, with
   sigma higher for red than blue → water's characteristic
   blue-green palette as depth increases).

Both need access to "what's underneath the water at this fragment"
plus "how far away that thing is", which means *some* kind of
texture / depth lookup.

## Techniques surveyed

### 1. Screen-space refraction with offscreen colour buffer (the canonical approach)

Render the opaque scene into an FBO with a colour attachment, then
the water shader samples it at `gl_FragCoord.xy / screen_size +
perturbation`. The perturbation is driven by the water surface
gradient or refracted ray.

- **Pros**: physically plausible, every modern engine uses some
  variant of this, simple math, automatically picks up dynamic
  underwater objects (fish, plants, etc.).
- **Cons**: requires an extra render pass and extra texture memory.
  Pixels above the waterline that happen to land inside a water
  fragment will leak in unless we also use a clip plane.
- **Status in this codebase**: we just reverted the FBO infra that
  enables this (`Phase A.2/3/4` from the previous PR). The
  architecture was right; the routing had a bug we didn't track
  down before reverting.

### 2. Screen-space refraction + depth-thickness extinction

Extension of #1: also sample a depth attachment, linearise it,
subtract the water-surface depth, and use the difference as the
"thickness" in `exp(-thickness * sigma)`. Multiplies the refracted
colour by the absorption tint.

- **Pros**: gives us proper depth fog without faking it. Shoreline
  feathering (transparent at zero thickness) is one extra
  `smoothstep` on top.
- **Cons**: same as #1 plus depth-linearisation math (need
  near/far from the projection matrix as a uniform).
- **Status**: same as #1. Depends on the offscreen depth attachment
  being live.

### 3. Clip-plane reflection + refraction (ThinMatrix tutorial style)

Render the scene three times:
- once normally to the swapchain
- once with the camera mirrored across the water plane and a
  clip plane keeping only above-water content → reflection FBO
- once with a clip plane keeping only below-water content →
  refraction FBO

Water shader samples both reflection and refraction FBOs, blends
by Fresnel.

- **Pros**: clean separation of what's above/below the water
  surface; reflections of clouds/sun are accurate.
- **Cons**: triples geometry draws for the affected planet.
  Goldberg-sphere planets with 40 k tiles + a 32-chunk per-body
  layout already push our draw-call budget; tripling it is a real
  cost.

### 4. Cube-map refraction

Pre-render a cube map from the water body's centre, sample with
the refracted ray direction.

- **Pros**: cheapest by far at runtime — single texture lookup.
- **Cons**: refraction is wrong at close range (cubemap centred at
  body centre, not at the water sample point), doesn't update with
  dynamic objects.

### 5. Framebuffer-fetch refraction (`EXT_shader_framebuffer_fetch`)

Read the current swapchain pixel directly inside the water shader,
distort by the surface normal.

- **Pros**: zero extra passes.
- **Cons**: WebGL extension support is spotty — Apple GPUs ship it
  via `WEBGL_shader_pixel_local_storage` / Metal, but Chrome on
  Windows and Firefox generally don't. Not portable.

### 6. Fake refraction (no underwater sampling)

Don't actually refract anything — just perturb the water shader's
own computed colour by the surface gradient. Adds a shimmer that
looks vaguely refraction-like.

- **Pros**: zero infrastructure. Pure shader change.
- **Cons**: doesn't actually show the underwater terrain through
  the water. The visual win is small.

### 7. Parallax refraction

Ray-step through the water medium inside the fragment shader,
sampling the depth attachment at each step until we hit something.

- **Pros**: highest quality.
- **Cons**: many texture samples per pixel, prohibitively expensive
  for full-screen water at planet scale.

## Recommendation

**#1 + #2 (screen-space refraction with depth-thickness
extinction)** is the only technique that delivers both the
"refracted underwater terrain" effect and physically-correct depth
fog at acceptable cost. It's what every modern realtime engine
does. The previous attempt failed at the FBO routing stage, not
the technique stage.

This time, the right way to land it:

| Step | Plan |
|------|------|
| R0   | Restore the offscreen-target scaffolding (`sg_image` colour + depth, three `sg_view` objects — colour-attach, depth-attach, colour-as-texture). Keeps the swapchain pass exactly as it is, so this commit changes nothing visible. |
| R1   | Bind `R.offscreen_color_tex` + a sampler to the water pipeline as a debug pass-through: water shader samples the texture but blends 0 % of it into the output. Verifies binding compiles and gives us a place to land the actual sample. |
| R2   | Render the opaque scene to the offscreen colour + depth, AS WELL AS to the swapchain. (Two passes, wasteful, but isolates the refraction work from the composite-blit work.) Confirm offscreen image populates correctly via a debug fullscreen quad that draws it to the corner of the screen. |
| R3   | Replace the water shader's `mix(deep, shallow, vdn)` base colour with a sample of `R.offscreen_color_tex` at perturbed UV. Refraction appears. |
| R4   | Linearise the offscreen depth, compute thickness, apply Beer–Lambert. Real depth fog appears. |
| R5   | Soften shoreline alpha by `smoothstep(0, ~0.5 m, thickness)`. |
| R6   | Eventually collapse the duplicate scene render (R2 ran the scene twice for safety). The opaque pass ONLY goes to offscreen, swapchain gets a composite-blit — same as the reverted Phase A but with the offscreen path proven to work first. |

This sequence trades extra GPU work in R2 for a much shorter
debugging path: each step is independently visible / verifiable,
and the "wasteful" duplicate scene render in R2 is removed in R6
once everything else is settled.

### Things to avoid (lessons from the reverted PR)

- Never combine offscreen-routing AND new shader sampling in the
  same commit. R6 changes the routing; R3 / R4 add the sampling —
  separate commits.
- Always sokol-shdc the new shader before pushing. The
  uniform-block packing footguns we hit before are gone, but a
  syntax slip in `.glsl` can still slip through if we don't
  cross-compile locally first.
- `gl_VertexIndex`, not `gl_VertexID`, in sokol-shdc-authored
  fullscreen-tri shaders.
- `precision highp int;` for any fragment shader doing
  bitwise / hash math — mediump int silently truncates to 16 bits
  and that broke the gradient-noise port in earlier commits.
- Sokol-shdc uniform blocks need explicit `layout(binding=N)`
  (Vulkan-style GLSL) — bind 0 / 1 / ... within the program scope
  (not per stage).

## References

- WebGL2 Fundamentals — Render to Texture:
  https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html
- LearnOpenGL — Framebuffers (depth-linearisation formula at end):
  https://learnopengl.com/Advanced-OpenGL/Framebuffers
- LearnOpenGL — SSR (relevant for the colour-sampling step):
  https://learnopengl.com/PBR/Theory
- Sokol offscreen sample (post-2024 attachment-view API):
  https://github.com/floooh/sokol-samples/blob/master/sapp/offscreen-sapp.c
- Sokol header doc-comment for the offscreen pattern: lines
  ~585–720 of `sokol_gfx.h` (`floooh/sokol`).
- Fire-face water article — render-to-texture refraction; we add
  our own depth attachment for fog/extinction:
  https://fire-face.com/personal/water/
- ThinMatrix water tutorial series (canonical clip-plane
  architecture, useful as a contrast to #1).
- Three.js `MeshTransmissionMaterial.js` — modern web reference
  for the visual target:
  https://github.com/mrdoob/three.js/blob/dev/examples/jsm/materials/MeshTransmissionMaterial.js

## State of this branch

Branched off `claude/fix-planet-terrain-teG9x` at commit `620458e`
(the gradient-noise water shader, which was the merged head). No
code changes yet — just this planning doc.

Next commit lands R0 (offscreen-target scaffolding) once we agree
the plan is sound.
