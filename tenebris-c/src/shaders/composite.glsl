// Composite-blit shader. Fullscreen triangle that samples the
// offscreen-pass colour attachment + the water-cap coverage mask
// and writes the final image to the swapchain.
//
// Two effects keyed off the water_mask:
//
//   * Underwater fog. Beer-Lambert toward deep_color over the view
//     distance, applied where the camera ray traverses water. The
//     mask says "cap covers this pixel" (cap is in front of terrain
//     for this view ray) — when it does, we know the camera ray
//     passed through water surface to reach the seabed, so the
//     view-distance attenuation maps to water-column thickness.
//     For a fully-submerged camera (cam_underwater=1) we also fog
//     pixels with mask=0 since the ray is travelling through water
//     even before hitting any surface.
//
//   * Lens-water meniscus smear. 4-tap edge-detect on the mask:
//     fragments where the mask is non-zero AND any of the four
//     screen-space neighbours is zero are at the cap silhouette —
//     the visible camera-water boundary. Apply a heavy sin smear +
//     vertical blur at those pixels. The line traces the actual
//     wave-displaced cap silhouette naturally because the mask
//     geometry IS the wave-displaced cap.

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
    vec4  deep_color;     // xyz = water deep tint, w = unused
    vec4  absorption;     // xyz = Beer-Lambert per-channel sigma (1/m)
    vec4  near_far;       // x = near plane, y = far plane, z = unused, w = unused
    vec4  fx_params;      // x = distortion strength (UV units), y = time, z = camera_underwater [0|1], w = camera_alt (signed metres above sea level)
};

layout(binding=0) uniform texture2D scene_color;
layout(binding=1) uniform texture2D scene_depth;
layout(binding=2) uniform texture2D water_mask;
layout(binding=0) uniform sampler   scene_smp;
layout(binding=1) uniform sampler   scene_depth_smp;
layout(binding=2) uniform sampler   water_mask_smp;

in vec2 v_uv;
in vec3 v_view_dir;
in vec3 v_camera_pos;

out vec4 frag_color;

float linearize_z(float depth_ndc, float near, float far) {
    return (2.0 * near * far)
         / (far + near - (2.0 * depth_ndc - 1.0) * (far - near));
}

void main() {
    vec3  deep      = deep_color.xyz;
    vec3  sigma     = absorption.xyz;
    float near      = near_far.x;
    float far       = near_far.y;
    float dist_amt  = fx_params.x;
    float t         = fx_params.y;
    bool  cam_under = fx_params.z > 0.5;
    float camera_alt = fx_params.w;

    // Water-mask sample at the un-distorted uv. r-channel = coverage
    // (0 = no cap, 1 = cap visible at this pixel).
    float mask_c = texture(sampler2D(water_mask, water_mask_smp), v_uv).r;

    // 4-tap edge sample for the meniscus. Filtered down to ONLY
    // cap-vs-sky boundaries — every cap silhouette in screen space
    // (cap-shore, cap-distant-cap, etc.) fires on a raw mask edge,
    // but only the cap-against-sky edge is the actual lens-water
    // clip line. Test: a neighbour that has no cap (mask=0) AND no
    // terrain (offscreen scene_z at the far plane) is sky → that
    // edge counts. Otherwise (neighbour is sky-without-cap → also
    // edge, neighbour is terrain-with-no-cap → cap-shore edge,
    // skipped).
    //
    // Then gate on camera-altitude: only fire the meniscus when the
    // lens is essentially AT the surface. Above + below the surface
    // by more than ~15 cm there's no clip line to hide.
    vec2 res = vec2(textureSize(sampler2D(scene_color, scene_smp), 0));
    vec2 px  = 1.0 / res;
    vec2 offsets[4] = vec2[4](
        vec2(-px.x, 0.0), vec2( px.x, 0.0),
        vec2( 0.0,  px.y), vec2( 0.0, -px.y)
    );
    float edge = 0.0;
    for (int i = 0; i < 4; ++i) {
        float m_n = texture(sampler2D(water_mask, water_mask_smp), v_uv + offsets[i]).r;
        float z_n = texture(sampler2D(scene_depth, scene_depth_smp), v_uv + offsets[i]).r;
        // Mask transition AND neighbour is sky.
        float is_sky_neighbour = z_n >= 0.99999 ? 1.0 : 0.0;
        edge += abs(mask_c - m_n) * is_sky_neighbour;
    }
    edge = clamp(edge * 1.5, 0.0, 1.0);

    // Camera-at-surface gate: only fires the smear when the lens is
    // literally clipping through the water plane. Outside ±15 cm of
    // sea level the clip doesn't exist, so no smear.
    float cam_at_surface = 1.0 - smoothstep(0.05, 0.15, abs(camera_alt));
    edge *= cam_at_surface;

    // ---- distortion + sample selection ----
    //
    // Two perturbations stack on the screen UV:
    //
    //   * calm shimmer: gentle sin perturbation, applied to underwater
    //     pixels (mask covers them OR camera fully submerged).
    //   * meniscus smear: heavier sin perturbation, applied only to
    //     edge fragments — the screen-space line where the mask
    //     transitions.
    vec2 sample_uv = v_uv;

    bool wet_pixel = (mask_c > 0.5) || cam_under;
    if (wet_pixel && dist_amt > 0.0) {
        vec2 d_calm = vec2(
            sin(t * 1.3 + v_uv.y * 32.0) + 0.5 * sin(t * 0.7 + v_uv.x * 47.0),
            cos(t * 0.9 + v_uv.x * 28.0) + 0.5 * cos(t * 1.6 + v_uv.y * 41.0)
        ) * dist_amt;
        sample_uv += d_calm;
    }
    if (edge > 0.0) {
        vec2 d_smear = vec2(
            sin(t * 2.1 + v_uv.y * 60.0) + 0.7 * sin(t * 1.3 + v_uv.x * 80.0),
            cos(t * 1.7 + v_uv.x * 50.0) + 0.7 * cos(t * 2.4 + v_uv.y * 70.0)
        ) * 0.012 * edge;
        sample_uv += d_smear;
    }
    sample_uv = clamp(sample_uv, vec2(0.0), vec2(1.0));

    vec3 color = texture(sampler2D(scene_color, scene_smp), sample_uv).rgb;

    // 5-tap vertical blur on edge pixels — soft refracted strip.
    if (edge > 0.0) {
        vec3  acc    = color;
        float weight = 1.0;
        for (int i = 1; i <= 2; ++i) {
            float dy = float(i) * px.y * 2.0;
            vec2 a = clamp(vec2(sample_uv.x, sample_uv.y - dy), vec2(0.0), vec2(1.0));
            vec2 b = clamp(vec2(sample_uv.x, sample_uv.y + dy), vec2(0.0), vec2(1.0));
            acc += texture(sampler2D(scene_color, scene_smp), a).rgb;
            acc += texture(sampler2D(scene_color, scene_smp), b).rgb;
            weight += 2.0;
        }
        vec3 blurred = acc / weight;
        color = mix(color, blurred, edge);
    }

    // Underwater fog. Beer-Lambert toward deep_color over the view
    // distance from camera to the offscreen scene depth (camera-space
    // forward distance × off-axis foreshortening). The fog applies
    // wherever the ray traverses water:
    //   * mask covers pixel: ray went through water surface to reach
    //     the seabed → water-column thickness ≈ view_dist (close
    //     enough for our purposes).
    //   * camera underwater + mask doesn't cover: ray is fully in
    //     water all the way to the (terrain or sky) hit.
    //   * neither: above-water with no water in line of sight → no fog.
    float scene_z_ndc = texture(sampler2D(scene_depth, scene_depth_smp), v_uv).r;
    bool  is_sky      = scene_z_ndc >= 0.99999;
    float view_dist;
    if (is_sky) {
        view_dist = far;
    } else {
        view_dist = linearize_z(scene_z_ndc, near, far) * length(v_view_dir);
    }
    float wet = wet_pixel ? 1.0 : 0.0;
    if (wet > 0.0) {
        vec3 attenuation = exp(-view_dist * sigma);
        color = mix(deep, color, attenuation);
    }

    frag_color = vec4(color, 1.0);
}
@end


@image_sample_type scene_depth unfilterable_float
@sampler_type scene_depth_smp nonfiltering

@program composite composite_vs composite_fs
