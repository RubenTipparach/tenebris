// Mobile water cap shader. Same vertex inputs and same per-body
// uniform feed as water.glsl, but the fragment path skips every
// cost centre that mobile GPUs struggle with:
//
//   * No fbm noise - the surface normal is perturbed by two cheap
//     sines instead of the four 3-octave gradient-noise evaluations
//     the desktop fragment path does.
//   * No screen-space refraction colour sample - only the offscreen
//     depth is read, for a one-channel Beer-Lambert thickness fog.
//     The seabed itself is provided by the composite_mobile blit
//     drawn underneath the alpha-blended cap.
//   * No Snell-window backface branch, no foam.
//   * No vertex swell - the surface stays geometrically flat. The
//     two-sine fragment bump tilts the normal enough that Fresnel +
//     specular reads as moving water without paying for displaced
//     geometry.
//
// Picked at renderer_init time when renderer_set_perf_mode(true) was
// called before init - main_web.c calls that when EM_JS detects a
// mobile user agent. The full water.glsl pipeline still ships for
// desktop / high-end paths.

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
    // No swell: the water cap is drawn as-is at the radius set by
    // hex_mesher (sea level minus depth_offset_m). The fragment-side
    // normal-bump is what makes the surface look like water.
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
    float u_ripple_speed;
    float u_wave_steepness;
    float u_night_floor;
    vec4  u_torch_color;
    vec3  u_absorption;   // Beer-Lambert sigma per RGB channel (1/m)
    float u_near;         // projection near plane (m)
    float u_far;          // projection far plane (m)
};

// Scene depth from the offscreen pass - same image composite_mobile
// blits into the swapchain. Sampled here to compute the water
// column thickness for the depth-fog alpha. No scene_color sample;
// the underlying composite already provides the seabed colour.
layout(binding=0) uniform texture2D water_mobile_scene_depth;
layout(binding=0) uniform sampler   water_mobile_scene_depth_smp;

in vec3  v_wpos;
in float v_sun_brightness;
in float v_sky_light;
in float v_torch_light;
out vec4 frag_color;

void main() {
    vec3 radial = normalize(v_wpos);

    // Two-sine normal perturbation in the tangent plane. Longer
    // wavelengths than the original aggressive frequencies so the
    // bump reads as rolling water from a few metres out rather than
    // aliasing into per-pixel noise. Magnitude is roomy enough that
    // the resulting Fresnel + specular variation is plainly visible
    // even through the alpha blend with the seabed underneath.
    float t = u_time * u_ripple_speed;
    float s1 = sin(v_wpos.x * 0.55 + v_wpos.z * 0.41 + t * 1.4);
    float s2 = sin(v_wpos.z * 0.73 - v_wpos.x * 0.29 + t * 1.7);
    vec3  bump = vec3(s1, 0.0, s2) * (u_wave_steepness * 0.55);
    vec3 t_bump = bump - radial * dot(bump, radial);
    vec3 n = normalize(radial - t_bump);

    // Depth-fog thickness. Linearise both the fragment depth and
    // the offscreen-pass depth at this pixel; the difference is the
    // distance the view ray travels through water between the
    // surface and the seabed (or whatever opaque the cap is in
    // front of). Same math as the desktop water path, just without
    // the colour sample for refraction.
    vec2 screen_size = vec2(textureSize(sampler2D(water_mobile_scene_depth, water_mobile_scene_depth_smp), 0));
    vec2 screen_uv   = gl_FragCoord.xy / screen_size;
    float scene_z = texture(sampler2D(water_mobile_scene_depth, water_mobile_scene_depth_smp), screen_uv).r;
    float zw = (2.0 * u_near * u_far) /
               (u_far + u_near - (2.0 * gl_FragCoord.z - 1.0) * (u_far - u_near));
    float zs = (2.0 * u_near * u_far) /
               (u_far + u_near - (2.0 * scene_z         - 1.0) * (u_far - u_near));
    float thickness  = max(0.0, zs - zw);
    vec3  attenuation = exp(-thickness * u_absorption);
    // Per-channel attenuation collapsed for the alpha blend. r-channel
    // is the most aggressive (water absorbs red first), so it drives
    // the "deep enough to fog" gate the most strongly.
    float att_avg = clamp((attenuation.r + attenuation.g + attenuation.b) * 0.333, 0.0, 1.0);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    vec3 refl  = reflect(-view, n);
    float up_f = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky   = mix(u_sky_horizon, u_sky_zenith, up_f);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    // Surface colour: Fresnel mix between deep_color (looking
    // straight down at calm water) and the reflected sky tone
    // (glancing angles or where the bump tilts the normal toward
    // the horizon).
    vec3 base  = u_deep_color;
    vec3 color = mix(base, sky, f);

    // Sun highlight - cheap Blinn-Phong.
    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), u_spec_power);
    color += u_sun_tint * spec * u_spec_intensity;

    // Day/night dim, mirrors the full shader.
    float ambient_dn = mix(u_night_floor, 1.0, v_sun_brightness * v_sky_light);
    color *= ambient_dn;

    // Torch contribution - only feeds the Fresnel sky channel so the
    // body of the water doesn't read as flat yellow under a flame.
    vec3 torch = u_torch_color.xyz * u_torch_color.w * v_torch_light;
    color += torch * f;

    // Depth-fog alpha. Thin water (attenuation ~ 1) lets the seabed
    // through via a low alpha gated by Fresnel; thick water
    // (attenuation ~ 0) is fully opaque deep_color. The interpolation
    // is between alpha_shallow (~0.4-0.8 across viewing angle) and
    // 1.0 as the column grows. shoreline_fade_m is folded in via the
    // standard absorption sigma without a separate uniform.
    float alpha_shallow = clamp(0.40 + 0.50 * f, 0.0, 1.0);
    float alpha = mix(1.0, alpha_shallow, att_avg);

    frag_color = vec4(color, alpha);
}
@end

// Depth sampler must be non-filtering (depth-as-sampler2D isn't a
// filterable resource on WebGL2 / desktop GL). Same pattern the
// desktop water + composite shaders use.
@image_sample_type water_mobile_scene_depth unfilterable_float
@sampler_type water_mobile_scene_depth_smp nonfiltering

@program water_mobile water_mobile_vs water_mobile_fs
