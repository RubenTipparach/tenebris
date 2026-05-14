// Mobile water cap shader.
//
// Differences from water.glsl:
//
//   * No vertex swell - the cap stays geometrically flat at the
//     radius hex_mesher placed it. The fragment-shader normal-bump
//     below tilts the lighting; phones don't gain anything visible
//     from displacing the vertices on top of that.
//
//   * No screen-space refraction sample. The base water tone is a
//     constant u_deep_color instead of `mix(deep_color, refracted,
//     attenuation)` - water reads as solid water from above
//     regardless of depth. The seabed shows through the underlying
//     composite_mobile blit only at the shoreline, where the cap
//     mesh ends and dry terrain takes over.
//
//   * Per-fragment Beer-Lambert thickness fog is moved to
//     composite_mobile; on the surface itself we approximate the
//     desktop "deep ocean fades into atmosphere" feel via a view-
//     distance haze blend toward the sky-horizon colour. Cheap, no
//     extra samples.
//
//   * No Snell-window backface branch, no foam, no offscreen depth
//     read (the offscreen depth is forwarded into the swapchain
//     depth buffer by composite_mobile, so the LESS_EQUAL depth
//     test handles terrain occlusion).
//
//   * Normals come from a pre-baked tileable normal-map texture
//     instead of the 3-octave fbm + 4-sample finite-difference
//     gradient the desktop shader does per fragment. Two animated
//     samples are blended for a non-tiling look. Net effect on a
//     phone GPU: ~12 hash + 16 mul per fragment becomes 2 cheap
//     texture fetches.

@vs water_mobile_vs

layout(binding=0) uniform vs_params_mobile {
    mat4 u_vp;
    vec4 u_planet;
    vec4 u_sun_dir;
    vec4 u_terminator;
};

in vec3  a_pos;
in float a_sky_light;
in float a_torch_light;

out vec3  v_wpos;
out float v_sun_brightness;
out float v_sky_light;
out float v_torch_light;

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    v_wpos = a_pos;
    v_sky_light   = a_sky_light;
    v_torch_light = a_torch_light;

    vec3 surface_dir = normalize(a_pos - u_planet.xyz);
    float sun_facing = dot(surface_dir, normalize(u_sun_dir.xyz));
    v_sun_brightness = smoothstep(u_terminator.y, u_terminator.z, sun_facing);
}
@end


@fs water_mobile_fs

layout(binding=1) uniform fs_params_mobile {
    vec3  u_camera_pos;
    vec3  u_sun_dir;
    float u_time;
    vec3  u_deep_color;
    float u_spec_intensity;
    float u_spec_power;
    vec3  u_sun_tint;
    vec3  u_sky_horizon;
    vec3  u_sky_zenith;
    float u_sky_horizon_strength;
    float u_ripple_scale;
    float u_ripple_speed;
    float u_wave_steepness;
    float u_night_floor;
    vec4  u_torch_color;
    // Horizon-haze tuning. distance_m at which the surface fully fades
    // toward u_sky_horizon (mimics the desktop refraction fading out
    // with depth), and a 0..1 strength scalar.
    float u_horizon_fade_m;
    float u_horizon_fade_strength;
};

layout(binding=0) uniform texture2D water_normal_tex;
layout(binding=0) uniform sampler   water_normal_smp;

precision highp int;

in vec3  v_wpos;
in float v_sun_brightness;
in float v_sky_light;
in float v_torch_light;
out vec4 frag_color;

void main() {
    vec3 radial = normalize(v_wpos);

    // Build a stable tangent basis at the body centre (NOT at the
    // fragment) so the basis is the same vector for every fragment in
    // the draw. Earlier the basis was per-fragment, which gave
    // dot(v_wpos, t1) = 0 everywhere (t1 is tangent at v_wpos, so
    // perpendicular to v_wpos) and collapsed the UV to a single texel.
    //
    // Choosing a globally fixed basis means UV grows linearly across
    // the surface at the planet's tangent rate - the texture tiles
    // smoothly in a band around the equator (relative to whichever
    // axis we picked). Distortion at the poles is OK because the
    // player's local view only spans a few hex tiles.
    vec3 axis = (abs(radial.y) < 0.9) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(axis, radial));
    vec3 t2 = cross(radial, t1);
    // Re-anchor the projection to a *constant* (per-draw) pair of
    // axes using the global Y / X axes themselves. dot(v_wpos, world_x)
    // = v_wpos.x; we just want two independent linear functions of
    // v_wpos that don't collapse. Use the cardinal axes that aren't
    // close to the local radial.
    vec2 uv_base;
    if (abs(radial.y) < 0.7) {
        // Near the equator - project onto x/z plane.
        uv_base = vec2(v_wpos.x, v_wpos.z);
    } else if (abs(radial.x) < 0.7) {
        // Polar caps - project onto x/y so the seam doesn't sit under
        // the player's feet.
        uv_base = vec2(v_wpos.x, v_wpos.y);
    } else {
        uv_base = vec2(v_wpos.z, v_wpos.y);
    }

    // Two animated UV layers at different scales + opposing drift
    // directions blend so the underlying texture doesn't read as a
    // repeating tile. Scale factor mirrors the desktop ripple_scale
    // knob from water.yaml.
    vec2 uv1 = uv_base * (u_ripple_scale * 0.10)
             + vec2( u_time * (u_ripple_speed * 0.025),
                     u_time * (u_ripple_speed * 0.018));
    vec2 uv2 = uv_base * (u_ripple_scale * 0.23)
             + vec2(-u_time * (u_ripple_speed * 0.013),
                     u_time * (u_ripple_speed * 0.029));

    vec3 nm1 = texture(sampler2D(water_normal_tex, water_normal_smp), uv1).xyz * 2.0 - 1.0;
    vec3 nm2 = texture(sampler2D(water_normal_tex, water_normal_smp), uv2).xyz * 2.0 - 1.0;
    vec2 bump = (nm1.xy + nm2.xy) * 0.5;

    // Apply the tangent-space xy as a perturbation in the local
    // tangent plane, then re-normalise back onto the radial.
    vec3 perturb = t1 * bump.x + t2 * bump.y;
    vec3 n = normalize(radial + perturb * u_wave_steepness);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    // Fresnel + sky reflection. Same math as the desktop pipeline.
    vec3 refl   = reflect(-view, n);
    float up_f  = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky    = mix(u_sky_horizon, u_sky_zenith, up_f);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    float sky_weight = f * mix(u_sky_horizon_strength, 1.0, up_f);

    // View-distance haze - mobile stand-in for the desktop Beer-
    // Lambert thickness fog. Closer water reads near-deep_color; the
    // surface fades toward u_sky_horizon at distance so the
    // horizon-line doesn't look like a sharp slab edge.
    float view_dist = length(u_camera_pos - v_wpos);
    float haze = clamp(view_dist / max(u_horizon_fade_m, 1.0), 0.0, 1.0);
    haze = pow(haze, 0.7) * u_horizon_fade_strength;
    vec3 base = mix(u_deep_color, u_sky_horizon, haze);

    vec3 color = mix(base, sky, sky_weight);

    // Sun highlight - same Blinn-Phong as the desktop path.
    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), u_spec_power);
    color += u_sun_tint * spec * u_spec_intensity;

    // Day/night dim - matches the terrain + desktop water shaders.
    float ambient_dn = mix(u_night_floor, 1.0, v_sun_brightness * v_sky_light);
    color *= ambient_dn;

    // Torch contribution - feeds only the Fresnel sky channel, same
    // as the desktop water path; the bulk of the cap doesn't pick
    // up a flat torch tint.
    vec3 torch = u_torch_color.xyz * u_torch_color.w * v_torch_light;
    color += torch * sky_weight;

    // Alpha = Fresnel-weighted opacity so shore tiles read as
    // half-transparent (seabed shows through) and deep / grazing
    // pixels read more opaque. Approximates the desktop shoreline
    // fade without needing an offscreen depth probe. shoreline
    // opacity is clamped to a small floor so even at zero Fresnel
    // the water doesn't vanish entirely.
    float alpha = clamp(0.45 + 0.55 * sky_weight, 0.45, 0.95);

    frag_color = vec4(color, alpha);
}
@end

@program water_mobile water_mobile_vs water_mobile_fs
