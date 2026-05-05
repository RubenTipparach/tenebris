# Water Refraction — research + plan

Dedicated branch for adding refraction to the water shader on
`claude/water-refraction`. This doc lives in the repo root so it
doesn't get lost in `tenebris-c/` reorgs. Each technique and
trade-off below is summarised concisely so we can pick the path
deliberately rather than drift into rework.

## What "refraction" actually means here

The visual goal: look down through the water and see the underwater
terrain (sand / rock / plants), distorted by the ripples on the
surface, with progressively-bluer-and-darker colour as the view ray
traverses more water (depth fog / extinction).

Two physical effects fold together:

1. **Refraction proper** — the view ray bends when it crosses the
   water surface. Mathematically `refract(view, normal, eta)`. The
   visual symptom is that an underwater pixel appears at a
   slightly-shifted screen location compared to where it was when
   drawn.
2. **Volumetric absorption** — Beer–Lambert extinction along the
   path through the water (`exp(-d * sigma)` per RGB channel,
   higher sigma for red than blue → water's blue-green palette as
   depth increases).

Both need access to "what's underneath the water at this fragment"
plus "how far away that thing is".

## Chosen approach: Sebastian Lague-style post-process water

Sebastian Lague's "Coding Adventure: Atmosphere / Solar System"
treats water (and atmosphere) not as a mesh but as a **screen-space
post-processing pass** that runs over the entire framebuffer after
the opaque scene has been drawn. The architecture:

1. Render the opaque scene (terrain, moons, sky, sun) to an
   offscreen colour + depth FBO.
2. Composite-blit the offscreen colour to the swapchain (we need
   to see the scene under the water).
3. Run a fullscreen post-process pass:
   - For each pixel, reconstruct the world-space view ray from
     `gl_FragCoord` + the inverse view-projection.
   - Intersect that ray with the water sphere shell (the
     `body.radius_m + sea_level` sphere).
   - If the ray enters the water:
     - Compute exit point: closer of (sphere far side) or
       (linearised scene depth).
     - Thickness = exit – entry.
     - Sample the offscreen colour at a UV perturbed by the
       surface normal (= `refract(view, surface_normal, 1/1.33)`
       projected back to screen). That's the refraction.
     - Multiply by `exp(-thickness * sigma)`. That's the
       depth fog.
     - Add specular highlight at the entry point.
   - Else: pass-through the swapchain colour.

Why this beats the mesh-based water cap we have now:

- **No tile-grid problem.** The water "surface" is the analytical
  sphere shell + a noise displacement, not a triangulated hex
  mesh. The visual seams we kept fighting in the previous PR are
  literally gone — there are no tile boundaries to seam.
- **Geometrically correct refraction at any view angle.** Oblique
  views through deep water look right because the thickness comes
  from the actual ray length, not a vertical-only depth.
- **Smooth shoreline.** Thickness goes to zero naturally where the
  scene depth meets the water sphere; the alpha feather is just
  `smoothstep(0, ~0.5 m, thickness)`.
- **One pass, not three.** No reflection FBO, no clip-plane
  re-rendering of the underwater half. Just one offscreen scene
  pass + one composite + one post-process water pass.

The cost vs. the mesh approach: an offscreen colour + depth FBO
(same scaffolding the previous PR set up + reverted), plus a
fullscreen ray-march of ~4 sphere intersections + a few texture
samples per pixel. Cheap on modern GPUs; well within budget on
WebGL2.

## Migration shape

The existing water cap mesh + shader doesn't have to disappear in
the same commit that lands Lague-style water. Plan keeps the cap
drawing through R3 so we can A/B them, then removes it once the
post-process version looks better.

## Other techniques surveyed (kept for context, not chosen)

### 1. Mesh + screen-space refraction with offscreen FBO

The "every modern engine does this" answer. Render the opaque
scene to an FBO, water cap shader samples
`gl_FragCoord.xy / screen_size + perturbation`. We attempted this
in the previous PR and reverted because it landed too many
architectural changes in one commit.

- **Pros**: physically plausible, well-documented.
- **Cons**: doesn't fix the tile-grid problem; the water cap mesh
  is still triangulated and seams will leak through.

### 2. Mesh + screen-space refraction + depth-thickness extinction

Extension of #1: also sample a depth attachment for thickness.

- **Pros / cons**: same as #1.

### 3. Clip-plane reflection + refraction (ThinMatrix tutorial)

Render the scene three times: above-water reflection, below-water
refraction, normal swapchain. Clip planes hide the wrong half each
time.

- **Pros**: clean separation; reflections of clouds/sun are
  geometrically correct.
- **Cons**: triples geometry draws for the affected planet. Our
  draw-call budget already pushes back on a 40 k-tile Goldberg
  body × 32 chunks; tripling is a real cost.

### 4. Cube-map refraction

Pre-render a cubemap from the water body's centre, sample with the
refracted ray direction.

- **Pros**: cheapest by far at runtime — single texture lookup.
- **Cons**: cubemap centred on body centre, not the water sample
  point — close-range refraction is misaligned. Static; doesn't
  update with dynamic objects.

### 5. Framebuffer-fetch refraction (`EXT_shader_framebuffer_fetch`)

Read the current swapchain pixel directly inside the water
shader, distort by surface normal.

- **Pros**: zero extra passes.
- **Cons**: WebGL extension support is spotty — Apple GPUs ship
  it, Chrome on Windows / Firefox generally don't. Not portable.

### 6. Fake refraction (no underwater sampling)

Don't actually refract anything — just perturb the water shader's
own computed colour by the surface gradient. Adds shimmer that
looks vaguely refraction-like.

- **Pros**: zero infrastructure. Pure shader change.
- **Cons**: doesn't actually show the underwater terrain.

### 7. Parallax / ray-march through water

Ray-step through the water medium inside the fragment shader.

- **Pros**: highest quality.
- **Cons**: many texture samples per pixel; expensive at full
  screen.

### 8. Direct procedural seafloor lookup (no FBO)

For procedural worlds: each water fragment samples the same
terrain noise function used to generate the planet, gets the
seafloor altitude + biome colour, applies Beer–Lambert against
that.

- **Pros**: zero infrastructure, fits the procedural-world spirit
  of the project.
- **Cons**: doesn't actually sample what would be visible at
  oblique angles — only "vertical depth" works correctly. Refraction
  is approximate.

### 9. Procedural ray-march

Same as #8 but ray-march the view direction through the water
medium and call the terrain noise function at each step.

- **Pros**: no FBO, geometrically correct.
- **Cons**: 4–16 noise samples per fragment per ray-march; the
  noise function on the C side is significantly more expensive
  than a single texture lookup.

## Plan

| Step | Plan |
|------|------|
| R0   | Restore the offscreen-target scaffolding (`sg_image` colour + depth, `sg_view` colour-attach + depth-attach + colour-as-texture). Swapchain pass unchanged — this commit changes nothing visible. |
| R1   | Render the opaque scene (sky / sun / terrain / moons) to the offscreen attachments. Add a fullscreen-quad composite blit at the start of the swapchain pass. Result should look identical. |
| R2   | Add the ray-march post-process pipeline + shader (separate `.glsl` file driven by sokol-shdc). For now, the shader just blits the offscreen colour through with no water effect — verifies the binding chain. |
| R3   | First refraction step: in the post-process shader, ray-sphere-intersect against the water shell. Where the ray enters water, perturb the colour-sample UV by the (analytic) surface normal. Refraction shimmer appears. The existing water cap mesh stays drawn on top so we can A/B them visually. |
| R4   | Add depth-thickness extinction. Sample the offscreen depth, linearise, compute thickness from the ray-sphere geometry vs. scene depth. Apply Beer–Lambert. Real depth fog appears. |
| R5   | Soften shoreline alpha by `smoothstep(0, ~0.5 m, thickness)`. |
| R6   | Add Lague-style surface noise: sample fbm at the entry point to displace the surface normal used by R3, so refraction shimmer animates. |
| R7   | Remove the legacy water cap mesh + its draw call. Post-process water is the only water renderer. Tile-grid problem permanently gone. |

### Things to avoid (lessons from the reverted PR)

- Never combine offscreen-routing changes AND new shader sampling
  in the same commit. Each step above is independently visible /
  verifiable.
- Always sokol-shdc the new shader before pushing — cross-compile
  locally first.
- `gl_VertexIndex`, not `gl_VertexID`, in sokol-shdc-authored
  fullscreen-tri shaders.
- `precision highp int;` for any fragment shader doing
  bitwise / hash math.
- Sokol-shdc uniform blocks need explicit `layout(binding=N)`.

## References

### The chosen approach
- Sebastian Lague — Coding Adventure: Atmosphere (architecture is
  identical, swap "atmosphere" for "water"):
  https://www.youtube.com/watch?v=DxfEbulyFcY
- Sebastian Lague — Coding Adventure: Solar System (water on
  planets specifically): https://www.youtube.com/watch?v=lctXaT9pxA0
- Sebastian Lague's source: https://github.com/SebLague/Solar-System
- Iñigo Quilez — analytic ray-sphere intersection + thickness:
  https://iquilezles.org/articles/intersectors/

### Generic
- WebGL2 Fundamentals — Render to Texture:
  https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html
- LearnOpenGL — Framebuffers + depth linearisation:
  https://learnopengl.com/Advanced-OpenGL/Framebuffers
- Sokol offscreen sample (post-2024 attachment-view API):
  https://github.com/floooh/sokol-samples/blob/master/sapp/offscreen-sapp.c
- Sokol header doc-comment for the offscreen pattern: lines
  ~585–720 of `sokol_gfx.h`.

### Mesh-based alternatives (not chosen, kept for context)
- Fire-face water (mesh + FBO):
  https://fire-face.com/personal/water/
- ThinMatrix water tutorial (clip-plane mesh):
  https://www.youtube.com/playlist?list=PLRIWtICgwaX23jiqVByUs0bqhnalNTNZh
- Three.js `MeshTransmissionMaterial.js`:
  https://github.com/mrdoob/three.js/blob/dev/examples/jsm/materials/MeshTransmissionMaterial.js
- Shadertoy "Seascape" (Alexander Alekseev) — single-shader
  surface noise + refraction reference:
  https://www.shadertoy.com/view/Ms2SD1
- Shadertoy "Oceanic" (TDM) — proper underwater extinction:
  https://www.shadertoy.com/view/4sXGRM

## State of this branch

Branched off `main` at the same commit as PR #16's merge head
(gradient-noise water shader). No code changes yet — just this
planning doc.

Next commit lands R0 (offscreen-target scaffolding) once we agree
the plan is sound.

