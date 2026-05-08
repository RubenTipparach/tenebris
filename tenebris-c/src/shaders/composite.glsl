// Composite-blit shader. Fullscreen triangle that samples the
// offscreen-pass colour attachment and writes it to the swapchain so
// the underwater scene shows up under the water cap.
//
// Doubles as the underwater post-process. Per pixel:
//
//   1. Reconstruct world position from the offscreen depth + camera
//      basis. Compare its radial distance to the active body's sea-
//      level radius — that's the signed altitude of the pixel.
//   2. Smoothly fade between "above water" (untouched) and "below
//      water" (Beer-Lambert toward deep_color) using a smoothstep
//      across a thin altitude window so the half-submerged camera
//      still gets a soft transition rather than a hard boolean.
//   3. Apply a gentle sin-wave shimmer to wet pixels' UV before
//      sampling the offscreen colour.

@vs composite_vs

layout(binding=0) uniform composite_vs_params {
    vec4 cam_right;     // xyz = camera right vector,   w = tan(fov/2)
    vec4 cam_up;        // xyz = camera up vector,      w = aspect ratio
    vec4 cam_forward;   // xyz = camera forward vector
    vec4 camera_pos;    // xyz = camera world position, w = unused
};

out vec2 v_uv;
out vec3 v_view_dir;        // unnormalised view ray (z component along
                            // forward = 1, scale by linear-z to get
                            // world-space pixel position)
out vec3 v_camera_pos;

void main() {
    // gl_VertexIndex-based fullscreen triangle — no vbuf required.
    // VertexIndex 0/1/2 produces uvs (0,0) (2,0) (0,2), projected to
    // NDC = uv*2-1 to cover the whole screen with the triangle's
    // hypotenuse at the visible boundary.
    vec2 uv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
    v_uv = uv;

    float tan_half = cam_right.w;
    float aspect   = cam_up.w;
    vec2  ndc      = uv * 2.0 - 1.0;
    v_view_dir = cam_forward.xyz
               + cam_right.xyz * (ndc.x * tan_half * aspect)
               + cam_up.xyz    * (ndc.y * tan_half);
    v_camera_pos = camera_pos.xyz;
}
@end


@fs composite_fs

layout(binding=1) uniform composite_fs_params {
    vec4  deep_color;     // xyz = water deep tint (matches water cap's u_deep_color)
    vec4  absorption;     // xyz = Beer-Lambert per-channel sigma (1/m)
    vec4  near_far;       // x = near plane, y = far plane, z = wet_fade_band (m), w = unused
    vec4  planet_params;  // xyz = body centre,           w = sea-level radius
    vec4  fx_params;      // x = distortion strength (UV units), y = time, z = camera_underwater [0|1], w = unused
};

layout(binding=0) uniform texture2D scene_color;
layout(binding=1) uniform texture2D scene_depth;
layout(binding=0) uniform sampler   scene_smp;
layout(binding=1) uniform sampler   scene_depth_smp;

in vec2 v_uv;
in vec3 v_view_dir;
in vec3 v_camera_pos;

out vec4 frag_color;

float linearize_z(float depth_ndc, float near, float far) {
    // gl-style 0..1 depth → camera-space metres along forward.
    return (2.0 * near * far)
         / (far + near - (2.0 * depth_ndc - 1.0) * (far - near));
}

void main() {
    vec3  deep        = deep_color.xyz;
    vec3  sigma       = absorption.xyz;
    float near        = near_far.x;
    float far         = near_far.y;
    float band_m      = max(near_far.z, 0.0001);
    vec3  pcen        = planet_params.xyz;
    float sea_radius  = planet_params.w;
    float dist_amt    = fx_params.x;
    float t           = fx_params.y;

    // Depth at the un-distorted uv so the pixel-altitude test is
    // computed against the correct geometry.
    float scene_z_ndc = texture(sampler2D(scene_depth, scene_depth_smp), v_uv).r;
    bool  is_sky      = scene_z_ndc >= 0.99999;
    bool  cam_under   = fx_params.z > 0.5;

    // Reconstruct the world position of the pixel — v_view_dir is
    // parameterised so its forward component = 1, so multiplying
    // by linearised camera-z gives the right world foreshortening.
    vec3  pixel_world = v_camera_pos;
    float view_dist   = 0.0;
    float pixel_alt   = band_m;
    if (!is_sky) {
        float lin_z = linearize_z(scene_z_ndc, near, far);
        pixel_world = v_camera_pos + v_view_dir * lin_z;
        view_dist   = length(pixel_world - v_camera_pos);
        pixel_alt   = length(pixel_world - pcen) - sea_radius;
    }

    // Voxel-driven wet mask. Each opaque pipeline writes the per-
    // vertex / per-cap "is the cell behind this face actually
    // BLOCK_WATER" flag into the offscreen alpha channel; sky/sun/
    // distant/torch write 0; water cap writes 1; the atmosphere
    // overlay's blend preserves dst alpha. So sampling alpha here
    // gives a direct yes/no for "is this pixel a wet surface" with
    // none of the altitude/cave failure modes the previous test
    // had — a stone wall under the sea but inside a dug-out cave
    // is dry, while seabed sand below an actual water cap is wet.
    //
    // Sky pixels fall back to the camera-underwater flag: if the
    // camera is in a water voxel, looking at sky means looking up
    // through water, so the void should still fog. Otherwise sky
    // is dry.
    vec4 sc = texture(sampler2D(scene_color, scene_smp), v_uv);
    float wet = is_sky ? (cam_under ? 1.0 : 0.0) : sc.a;
    // The voxel mask flags every face of any solid block sharing a
    // column with water as wet, but the actual water cap sits below
    // the top of the sea-level depth cell by depth_offset_m. That
    // means beach blocks at depth SEA_LEVEL_DEPTH-1 (and the upper
    // strip of their side faces) stick above the cap while still
    // being tagged wet=1 — without a per-pixel altitude gate, the
    // distortion shimmer leaks onto dry geometry above the waterline.
    //
    // sea_radius already bakes in height_offset_m - depth_offset_m,
    // so pixel_alt is signed altitude relative to the actual water
    // surface. Smoothstep across the band gives a soft transition
    // so the gate doesn't show a hard line at the cap. Sky pixels
    // skip the gate (the cam_under case wants full effect through
    // the void above).
    float alt_gate = is_sky ? 1.0
                            : (1.0 - smoothstep(-band_m, band_m, pixel_alt));
    wet *= alt_gate;

    // Underwater shimmer — gentle sin perturbation on the screen UV
    // for wet pixels. Resample colour through the perturbed UV when
    // distortion is active.
    vec2 sample_uv = v_uv;
    vec3 color     = sc.rgb;
    if (wet > 0.0 && dist_amt > 0.0) {
        vec2 d_calm = vec2(
            sin(t * 1.3 + v_uv.y * 32.0) + 0.5 * sin(t * 0.7 + v_uv.x * 47.0),
            cos(t * 0.9 + v_uv.x * 28.0) + 0.5 * cos(t * 1.6 + v_uv.y * 41.0)
        ) * dist_amt;
        sample_uv = clamp(v_uv + d_calm * wet, vec2(0.0), vec2(1.0));
        color     = texture(sampler2D(scene_color, scene_smp), sample_uv).rgb;
    }

    // Beer-Lambert thickness. Two regimes:
    //   - Camera under water (in a BLOCK_WATER voxel): the entire
    //     view ray from camera to opaque is in water, so use the
    //     full view distance.
    //   - Camera above water, looking at a wet surface: the ray
    //     traverses water vertically from sea-level to the surface,
    //     so use the vertical depth (-pixel_alt) as a conservative
    //     proxy for the underwater segment length. This is exact
    //     for straight-down views and slightly under-fogs at
    //     glancing angles — a future closed-water-volume pass can
    //     replace this with a true segment length without touching
    //     the wet-mask plumbing.
    float thickness = cam_under ? view_dist : max(0.0, -pixel_alt);
    vec3 attenuation = exp(-thickness * sigma);
    vec3 fogged      = mix(deep, color, attenuation);
    color = mix(color, fogged, wet);

    frag_color = vec4(color, 1.0);
}
@end


// Depth sampler must be non-filtering (depth-as-sampler2D isn't a
// filterable resource on WebGL2 / desktop GL). Same pattern the
// water shader uses for its scene-depth lookup.
@image_sample_type scene_depth unfilterable_float
@sampler_type scene_depth_smp nonfiltering

@program composite composite_vs composite_fs
