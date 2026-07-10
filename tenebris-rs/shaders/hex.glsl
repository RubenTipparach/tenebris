// Hex tile / terrain shader. Atlas-textured per-vertex Lambert shading
// plus planet-aware day/night terminator, voxel sky-occlusion, torch
// contribution, underwater dimming, and the block-break crack channel —
// ported from the JS reference's terrain.{vert,frag} and extended with
// explicit per-vertex sky_light + torch_light attributes baked at
// mesh-build time.
//
// This is the Rust port's OWN copy (tenebris-rs/shaders/hex.glsl); it
// diverged from tenebris-c/src/shaders/hex.glsl when the crack channel
// landed. Cross-compiled by sokol-shdc into
// crates/tenebris-client/src/shaders/hex.rs — see shaders/mod.rs for
// the regeneration command.
//
// Crack channel: while a block is being mined, renderer::draw_world
// paints the mined cell with the crack-stage texture INSIDE this pass —
// same geometry, same depth — so there is no separate inflated decal to
// z-fight the terrain. hex_fs_crack carries the cell's bounding data
// (axis, radial band, side planes) in body-local space.

@vs hex_vs

// Per-body block — vp is rebuilt per body draw, so the planet centre
// + sea-level radius travel with it. Both are in the same model space
// the vertex positions are in (centre = body origin pre-translate,
// water_level = body radius + water height_offset - depth_offset).
layout(binding=0) uniform hex_vs_params {
    mat4 u_vp;
    vec4 u_planet;          // xyz = body centre, w = water level radius
};

// Per-frame block, vs side. Carries the sun direction + terminator
// smoothstep range needed to compute v_sun_brightness up-front so the
// fs only needs ambient + sun-vector for its Lambert.
layout(binding=1) uniform hex_vs_light {
    vec3 u_sun_dir;
    vec4 u_terminator;      // x=night_floor (unused here), y=lo, z=hi, w=unused
};

in vec3  a_pos;
in vec3  a_normal;
in vec2  a_uv;
in float a_sky_light;
in float a_torch_light;
in float a_wet;

out vec2  v_uv;
out vec3  v_normal;
out float v_sun_brightness;  // 0 on full-night side, 1 on full-day side
out float v_water_depth;     // metres below sea level, 0 if above
out float v_sky_light;       // 0..1 voxel-occlusion sky-reach
out float v_torch_light;     // 0..3 sum of inverse-square torch contributions
out float v_wet;             // 1.0 if face borders a water voxel, 0.0 if dry
out vec3  v_local;           // body-local position (crack-channel cell test)

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    v_normal = normalize(a_normal);
    v_uv = a_uv;
    v_sky_light   = a_sky_light;
    v_torch_light = a_torch_light;
    v_wet         = a_wet;
    v_local       = a_pos - u_planet.xyz;

    // Surface direction from planet centre — gives day/night per tile,
    // independent of the mesh face normal so a wall facing away from
    // the sun on the day side still gets day-side ambient.
    vec3 surface_dir = normalize(a_pos - u_planet.xyz);
    float sun_facing = dot(surface_dir, normalize(u_sun_dir));
    v_sun_brightness = smoothstep(u_terminator.y, u_terminator.z, sun_facing);

    // Water depth — how far below sea level this vertex sits. 0 when
    // u_planet.w is 0 (body has no water).
    float dist_from_centre = length(a_pos - u_planet.xyz);
    float water_radius     = u_planet.w;
    v_water_depth = (water_radius > 0.0)
                  ? max(0.0, water_radius - dist_from_centre)
                  : 0.0;
}
@end


@fs hex_fs

// Per-frame block, fs side. Distinct name + binding from the vs block
// because sokol-shdc requires shared-name UBs to be byte-identical
// across stages — separating them keeps each stage's needs explicit.
// u_terminator.x carries the night-side ambient floor; .yz are unused
// here (consumed by the vs only).
layout(binding=2) uniform hex_fs_light {
    vec3 u_sun_dir;
    vec3 u_ambient;
    vec4 u_terminator;
};

// Underwater-dim block. Beer-Lambert per-channel sigma identical to
// the water cap's u_absorption — terrain visible *under* the cap
// dims with the same colour curve the cap uses, so the seam where
// they meet reads as one continuous body of water. Saturation tint
// matches u_deep_color for the same reason.
layout(binding=3) uniform hex_fs_water {
    vec3 u_absorption;
    vec3 u_deep_color;
};

// Torch contribution tuning. u_torch_color is the warm-orange tint
// applied per unit of v_torch_light (matches the JS reference's
// (1.0, 0.7, 0.3)); u_torch_intensity scales the final additive
// contribution so designers can dim/brighten torches globally
// without re-baking vertex data.
layout(binding=4) uniform hex_fs_torch {
    vec4 u_torch_color;     // xyz = warm tint, w = intensity scalar
};

// Block-break crack channel. Bounding data for the ONE cell being
// mined, in body-local space; u_crack_axis.w is the blend alpha and
// doubles as the enable flag (0 = no crack this draw). The cell is an
// n-gon prism: side planes all pass through the body origin (the
// mesher builds side walls radially), so "inside" is a radial band
// test plus at-most-6 plane half-space tests. su0..su1 select the
// crack-stage sub-rect of the horizontal atlas strip.
layout(binding=5) uniform hex_fs_crack {
    vec4 u_crack_axis;      // xyz = unit cell axis (tile centre dir), w = alpha (0 = off)
    vec4 u_crack_band;      // x = r0, y = r1, z = su0, w = su1
    vec4 u_crack_t1;        // xyz = tangent basis 1, w = corner angular radius (rho max)
    vec4 u_crack_t2;        // xyz = tangent basis 2, w = side count n (5 or 6)
    vec4 u_crack_planes[6]; // xyz = outward side-plane normals (through origin)
};

layout(binding=0) uniform texture2D hex_atlas;
layout(binding=0) uniform sampler   hex_atlas_smp;
layout(binding=1) uniform texture2D crack_tex;
layout(binding=1) uniform sampler   crack_smp;

in vec2  v_uv;
in vec3  v_normal;
in float v_sun_brightness;
in float v_water_depth;
in float v_sky_light;
in float v_torch_light;
in float v_wet;
in vec3  v_local;

out vec4 frag_color;

void main() {
    vec4 tex = texture(sampler2D(hex_atlas, hex_atlas_smp), v_uv);

    // Crack channel: fragments inside the mined cell's prism blend the
    // crack-stage texture over the block texture BEFORE lighting, so
    // cracks shade with the face they sit on. Same geometry, same
    // depth as the terrain itself — z-fighting is impossible by
    // construction (this replaced the old inflated-decal pass).
    if (u_crack_axis.w > 0.001) {
        float r = length(v_local);
        // 0.02 m pad absorbs f32 length() error at planet-scale radii.
        if (r > u_crack_band.x - 0.02 && r < u_crack_band.y + 0.02) {
            vec3 pdir = v_local / r;
            int nsides = int(u_crack_t2.w + 0.5);
            bool inside = true;
            for (int i = 0; i < 6; i++) {
                if (i < nsides && dot(pdir, u_crack_planes[i].xyz) > 1e-4) {
                    inside = false;
                }
            }
            if (inside) {
                vec3  axis = u_crack_axis.xyz;
                float su0 = u_crack_band.z;
                float su1 = u_crack_band.w;
                vec3  perp = pdir - axis * dot(pdir, axis);
                float rho = length(perp);
                vec2 uv;
                if (abs(dot(v_normal, axis)) > 0.7) {
                    // Cap face: radial fan about the cell centre (the
                    // old decal's cap mapping).
                    float rn = min(rho / max(u_crack_t1.w, 1e-6), 1.0);
                    vec2 dirp = (rho > 1e-6)
                        ? vec2(dot(perp, u_crack_t1.xyz), dot(perp, u_crack_t2.xyz)) / rho
                        : vec2(1.0, 0.0);
                    uv = vec2((su0 + su1) * 0.5 + (su1 - su0) * 0.5 * dirp.x * rn,
                              0.5 + 0.5 * dirp.y * rn);
                } else {
                    // Side face: one stage sub-rect wrapped per face
                    // (angle around the axis, n repeats per turn).
                    float ang = atan(dot(perp, u_crack_t2.xyz), dot(perp, u_crack_t1.xyz));
                    float uw = fract(ang * float(nsides) / 6.28318530718);
                    float vv = clamp((u_crack_band.y - r)
                                   / max(u_crack_band.y - u_crack_band.x, 1e-4), 0.0, 1.0);
                    uv = vec2(mix(su0, su1, uw), vv);
                }
                vec4 ck = texture(sampler2D(crack_tex, crack_smp), uv);
                tex.rgb = mix(tex.rgb, ck.rgb, ck.a * u_crack_axis.w);
            }
        }
    }

    // Mesh-face Lambert against the sun. Gated by which side of the
    // planet this fragment lives on AND by the vertex's sky-light
    // attenuation — a vertex covered by solid voxels above can't
    // receive direct sun even on the day side, so caves stay dark.
    float ndl = max(dot(v_normal, normalize(u_sun_dir)), 0.0);
    float directional = ndl * v_sun_brightness * v_sky_light;

    // Ambient: mix between night floor and full-day, then gate by
    // sky_light so cave fragments lose ambient bounce too. A small
    // residual "rock glow" floor (0.05) keeps deep cave walls from
    // being literally pitch-black silhouettes — matches the JS
    // reference's behaviour where a tiny ambient survives in the
    // dark for readability.
    float ambient_dn    = mix(u_terminator.x, 1.0, v_sun_brightness);
    float ambient_scale = max(0.05, ambient_dn * v_sky_light);
    vec3 lit = tex.rgb * (u_ambient * ambient_scale + vec3(directional));

    // Torch contribution. Warm-orange tint multiplied by the per-
    // vertex inverse-square sum baked at mesh time. Added on top of
    // the daylight term — torches illuminate caves the same way they
    // illuminate exposed surfaces. Tex modulates the colour so
    // grass-coloured grass under torchlight reads warm-yellow rather
    // than pure orange.
    vec3 torch_tint = u_torch_color.xyz * u_torch_color.w;
    lit += tex.rgb * torch_tint * v_torch_light;

    // Underwater dimming. Per-channel exp() against the same
    // absorption sigma the water cap uses, then a partial mix toward
    // u_deep_color so deep submerged terrain doesn't go completely
    // opaque — there's still a hint of the original tile colour at
    // depth (matching the JS terrain.frag tint blend).
    //
    // Gated by v_wet (the voxel-driven "is face actually under
    // water" flag), NOT just by altitude. A cave wall whose
    // neighbour cell is air reads dry even when geometrically
    // below sea level, so caves stop picking up the underwater
    // tint they used to inherit from the altitude-only check.
    if (v_wet > 0.5 && v_water_depth > 0.0) {
        vec3 dim = exp(-v_water_depth * u_absorption);
        lit *= dim;
        float tint_w = (1.0 - dot(dim, vec3(1.0/3.0))) * 0.5;
        lit = mix(lit, u_deep_color * dim, tint_w);
    }

    // Alpha channel is repurposed as the per-pixel "wet" mask the
    // composite reads to gate underwater fog. tex.a is always 1.0
    // for the opaque atlas tiles (we don't use cut-out
    // transparency in terrain), so dropping it here is safe.
    frag_color = vec4(lit, v_wet);
}
@end


@program hex hex_vs hex_fs
