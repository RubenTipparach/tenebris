// Hex tile / terrain shader. Atlas-textured per-vertex Lambert shading
// plus planet-aware day/night terminator, voxel sky-occlusion, torch
// contribution, and underwater dimming — ported from the JS reference's
// terrain.{vert,frag} and extended with explicit per-vertex sky_light
// + torch_light attributes baked at mesh-build time.
//
// Cross-compiled by sokol-shdc into hex.glsl.h — runtime gets
// hex_shader_desc(sg_query_backend()), hex_vs_params_t / hex_vs_light_t /
// hex_fs_light_t / hex_fs_water_t / hex_fs_torch_t, and ATTR_hex_a_* /
// UB_hex_* / VIEW_hex_* / SMP_hex_* slot constants.

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

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    v_normal = normalize(a_normal);
    v_uv = a_uv;
    v_sky_light   = a_sky_light;
    v_torch_light = a_torch_light;
    v_wet         = a_wet;

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

layout(binding=0) uniform texture2D hex_atlas;
layout(binding=0) uniform sampler   hex_atlas_smp;

in vec2  v_uv;
in vec3  v_normal;
in float v_sun_brightness;
in float v_water_depth;
in float v_sky_light;
in float v_torch_light;
in float v_wet;

out vec4 frag_color;

void main() {
    vec4 tex = texture(sampler2D(hex_atlas, hex_atlas_smp), v_uv);

    // Mesh-face Lambert against the sun. Gated by which side of the
    // planet this fragment lives on AND by the vertex's sky-light
    // attenuation — a vertex covered by solid voxels above can't
    // receive direct sun even on the day side, so caves stay dark.
    float ndl = max(dot(v_normal, normalize(u_sun_dir)), 0.0);
    float directional = ndl * v_sun_brightness * v_sky_light;

    // Ambient: mix between night floor and full-day, then apply a
    // SHADOW_KEEP-floored sky factor. The user explicitly asked for
    // "dark blocks should only be slightly darker than adjacent
    // blocks - lighting doesn't change abruptly cell-to-cell": with
    // the previous max(0.05, ...) floor, sky=0 cells dropped to ~5 %
    // of full ambient and read as pitch black next to sky=15 sand
    // walls at 100 %. The mix() with SHADOW_KEEP guarantees a sky=0
    // cell keeps SHADOW_KEEP fraction of the local ambient (60 %),
    // so the worst-case-dark face still reads as a softer shade of
    // its base colour rather than a black silhouette. Open-sky cells
    // still hit the full 1.0 multiplier so brightness on lit ground
    // is unchanged. Day/night terminator still attenuates everything
    // via ambient_dn.
    const float SHADOW_KEEP = 0.60;
    float ambient_dn    = mix(u_terminator.x, 1.0, v_sun_brightness);
    float lit_fraction  = mix(SHADOW_KEEP, 1.0, v_sky_light);
    float ambient_scale = ambient_dn * lit_fraction;
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
