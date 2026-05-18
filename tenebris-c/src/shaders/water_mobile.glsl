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
in vec3  a_normal;
in vec2  a_uv;
in float a_sky_light;
in float a_torch_light;

out vec3  v_wpos;
out vec3  v_face_normal;
out float v_sun_brightness;
out float v_sky_light;
out float v_torch_light;
out vec2  v_flow_uv;

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    v_wpos = a_pos;
    v_face_normal = a_normal;
    v_sky_light   = a_sky_light;
    v_torch_light = a_torch_light;
    v_flow_uv     = a_uv;

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
    // Per-voxel water falling-bias. Identical role to water.glsl's
    // u_flow_speed_falling: drives the directional offset applied to
    // the triplanar UV samples on vertical faces, so the side of a
    // waterfall visibly streams downward. Ocean cap is horizontal so
    // face_alignment ≈ 1 and the bias is suppressed.
    float u_flow_speed_falling;
};

layout(binding=0) uniform texture2D water_normal_tex;
layout(binding=0) uniform sampler   water_normal_smp;

precision highp int;

in vec3  v_wpos;
in vec3  v_face_normal;
in float v_sun_brightness;
in float v_sky_light;
in float v_torch_light;
in vec2  v_flow_uv;
out vec4 frag_color;

void main() {
    vec3 radial = normalize(v_wpos);

    // Same per-voxel falling-water bias as water.glsl: vertical_factor
    // is 1.0 on side faces, 0.0 on caps; fall_shift translates the
    // sample position upward over time so the texture pattern appears
    // to stream toward the planet centre. The mobile shader samples a
    // triplanar normal map (instead of computing fbm in-shader), so we
    // project the radial-direction shift into each of the three plane
    // coords and add it to that plane's t_off.
    vec3 face_n = (length(v_face_normal) > 0.0)
                  ? normalize(v_face_normal) : radial;
    float face_alignment  = abs(dot(face_n, radial));
    float vertical_factor = 1.0 - face_alignment;
    float fall_shift      = u_time * u_flow_speed_falling * vertical_factor;

    // Per-cell horizontal flow pan. v_flow_uv is the per-vertex flow
    // direction baked at mesh time (unit-ish 2D on top caps, (0,0)
    // elsewhere). Reconstruct world-space flow with a basis built off
    // face_n (matches the desktop shader recipe), then shift the
    // triplanar sample position OPPOSITE the flow direction so the
    // surface texture appears to stream IN flow direction. Gated by
    // horizontal_factor = face_alignment so vertical side walls get
    // zero pan and stay static (user spec: walls unaffected).
    vec3 ftan_u = (abs(face_n.x) > 0.9) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    ftan_u = normalize(ftan_u - face_n * dot(ftan_u, face_n));
    vec3 ftan_v = cross(face_n, ftan_u);
    vec3 flow_world = ftan_u * v_flow_uv.x + ftan_v * v_flow_uv.y;
    vec3  shifted_pos     = v_wpos + radial * fall_shift
                            - flow_world * (u_time * 0.35 * face_alignment);

    // Build a stable tangent basis at the body centre (NOT at the
    // fragment) so the basis is the same vector for every fragment in
    // the draw. Earlier the basis was per-fragment, which gave
    // dot(v_wpos, t1) = 0 everywhere (t1 is tangent at v_wpos, so
    // perpendicular to v_wpos) and collapsed the UV to a single texel.
    vec3 axis = (abs(radial.y) < 0.9) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(axis, radial));
    vec3 t2 = cross(radial, t1);

    // Triplanar mapping: sample the normal map on all three world-axis
    // planes (xz / xy / zy) and blend by |radial|. Avoids the directional
    // stretching of a single cardinal-plane projection - whichever face
    // of the planet the player is on, the dominant projection plane
    // gives near-undistorted tiling, and the blend hides the seam where
    // two faces meet.
    vec2 uv_xz = shifted_pos.xz;
    vec2 uv_xy = shifted_pos.xy;
    vec2 uv_zy = shifted_pos.zy;

    float scale_a = u_ripple_scale * 0.10;
    float scale_b = u_ripple_scale * 0.23;
    vec2 t_off_a = vec2( u_time * (u_ripple_speed * 0.025),
                          u_time * (u_ripple_speed * 0.018));
    vec2 t_off_b = vec2(-u_time * (u_ripple_speed * 0.013),
                          u_time * (u_ripple_speed * 0.029));

    // Each plane gets the two animated layers blended together so the
    // pattern doesn't read as a single repeating tile.
    vec2 bxz =
        ((texture(sampler2D(water_normal_tex, water_normal_smp), uv_xz * scale_a + t_off_a).xy * 2.0 - 1.0) +
         (texture(sampler2D(water_normal_tex, water_normal_smp), uv_xz * scale_b + t_off_b).xy * 2.0 - 1.0)) * 0.5;
    vec2 bxy =
        ((texture(sampler2D(water_normal_tex, water_normal_smp), uv_xy * scale_a + t_off_a).xy * 2.0 - 1.0) +
         (texture(sampler2D(water_normal_tex, water_normal_smp), uv_xy * scale_b + t_off_b).xy * 2.0 - 1.0)) * 0.5;
    vec2 bzy =
        ((texture(sampler2D(water_normal_tex, water_normal_smp), uv_zy * scale_a + t_off_a).xy * 2.0 - 1.0) +
         (texture(sampler2D(water_normal_tex, water_normal_smp), uv_zy * scale_b + t_off_b).xy * 2.0 - 1.0)) * 0.5;

    // Sharpen the per-axis blend weights so each fragment is dominated
    // by one plane (cheaper than three full contributions everywhere)
    // while still letting the seams between faces blend smoothly.
    vec3 wn = abs(radial);
    wn = pow(wn, vec3(4.0));
    wn /= max(wn.x + wn.y + wn.z, 1e-5);

    // Each plane's bump is a 2D vector in that plane's coordinate
    // system. Lift them back into 3D world-space tangent perturbation.
    vec3 perturb_xz = vec3(bxz.x, 0.0, bxz.y);   // x/z plane: y-up faces
    vec3 perturb_xy = vec3(bxy.x, bxy.y, 0.0);   // x/y plane: z-facing
    vec3 perturb_zy = vec3(0.0, bzy.y, bzy.x);   // z/y plane: x-facing
    vec3 perturb = perturb_xz * wn.y + perturb_xy * wn.z + perturb_zy * wn.x;

    // Project the blended perturbation onto the local tangent plane
    // (drop the radial component) so the displacement only tilts the
    // normal sideways, never pushes it through the surface.
    perturb -= radial * dot(perturb, radial);

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
    // pixels read more opaque.
    float alpha = clamp(0.45 + 0.55 * sky_weight, 0.45, 0.95);

    frag_color = vec4(color, alpha);
}
@end

@program water_mobile water_mobile_vs water_mobile_fs
