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
//      across a meniscus band centred on altitude=0. No more hard
//      boolean — half-submerged camera gets a soft transition.
//   3. Inside the meniscus band (|alt| < band_m) apply a much
//      heavier sin-wave smear + a 7-tap vertical blur on the colour
//      sample. Hides the otherwise-clean camera-clip waterline
//      with a wet-looking refracted band, in the spirit of a GoPro
//      half-dome shot.
//   4. Outside the band, the regular gentle underwater shimmer
//      still applies on the wet side only.

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
    vec4  near_far;       // x = near plane, y = far plane, z = meniscus_band_m, w = camera_alt
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
    float camera_alt  = near_far.w;
    vec3  pcen        = planet_params.xyz;
    float sea_radius  = planet_params.w;
    float dist_amt    = fx_params.x;
    float t           = fx_params.y;

    // Depth at the un-distorted uv so the pixel-altitude test is
    // computed against the correct geometry.
    float scene_z_ndc = texture(sampler2D(scene_depth, scene_depth_smp), v_uv).r;
    bool  is_sky      = scene_z_ndc >= 0.99999;

    // Reconstruct the world position of the pixel + signed altitude
    // relative to sea level. v_view_dir is parameterised so its
    // forward component = 1, so multiplying by linearised camera-z
    // gives the right world foreshortening.
    //
    // Sky pixels have no recoverable position. Fall back to the
    // camera's altitude — that way a fully-submerged camera fogs
    // the void to deep_color, a half-submerged camera treats the
    // sky pixel as on the same side of the line as the camera, and
    // the meniscus smear still kicks in at the same screen rows
    // where reconstructable pixels are crossing zero.
    vec3  pixel_world = v_camera_pos;
    float view_dist   = far;
    float pixel_alt;
    if (is_sky) {
        pixel_alt = camera_alt;
    } else {
        float lin_z = linearize_z(scene_z_ndc, near, far);
        pixel_world = v_camera_pos + v_view_dir * lin_z;
        view_dist   = length(pixel_world - v_camera_pos);
        pixel_alt   = length(pixel_world - pcen) - sea_radius;
    }

    // Soft underwater mask: smoothstep from above (alt = +band) to
    // below (alt = -band) so the fog opacity ramps across the
    // meniscus instead of slamming on at altitude = 0. Outside the
    // band the mask saturates to 0 above / 1 below as expected.
    float wet = smoothstep(band_m, -band_m, pixel_alt);

    // Meniscus band: 1 at the waterline, falls to 0 at |alt| = band.
    // ONLY fires when the camera itself is within the band — outside
    // of that the smear has nothing to hide (camera fully above /
    // below has a clean transition through the cap), and stacking
    // the smear + blur on the cap from a distance reads as a wide
    // shimmery stripe across the whole sea instead of a tight wet-
    // lens line at the actual waterline.
    float cam_in_band = 1.0 - smoothstep(band_m, band_m * 2.0, abs(camera_alt));
    float meniscus    = (1.0 - smoothstep(0.0, band_m, abs(pixel_alt))) * cam_in_band;

    // Underwater shimmer (gentle, applies wherever wet > 0) PLUS
    // the heavy meniscus smear (applies inside the band on either
    // side of the line). The two stack — the band gets both — so
    // the trans-medium region reads as a chaotic refracted strip.
    vec2 sample_uv = v_uv;
    if (wet > 0.0 && dist_amt > 0.0) {
        vec2 d_calm = vec2(
            sin(t * 1.3 + v_uv.y * 32.0) + 0.5 * sin(t * 0.7 + v_uv.x * 47.0),
            cos(t * 0.9 + v_uv.x * 28.0) + 0.5 * cos(t * 1.6 + v_uv.y * 41.0)
        ) * dist_amt;
        sample_uv += d_calm * wet;
    }
    if (meniscus > 0.0) {
        // Heavier smear at the waterline: ~8x the calm distortion
        // amplitude at peak meniscus. Read as wet-lens refraction.
        vec2 d_smear = vec2(
            sin(t * 2.1 + v_uv.y * 60.0) + 0.7 * sin(t * 1.3 + v_uv.x * 80.0),
            cos(t * 1.7 + v_uv.x * 50.0) + 0.7 * cos(t * 2.4 + v_uv.y * 70.0)
        ) * dist_amt * meniscus * 8.0;
        sample_uv += d_smear;
    }
    sample_uv = clamp(sample_uv, vec2(0.0), vec2(1.0));

    vec3 color = texture(sampler2D(scene_color, scene_smp), sample_uv).rgb;

    // 7-tap vertical blur in the meniscus band. Mimics the soft
    // out-of-focus refraction strip a GoPro dome shows at the
    // waterline. Falls off with meniscus so it costs nothing
    // outside the band and disappears smoothly.
    if (meniscus > 0.0) {
        vec3  acc       = color;
        float weight    = 1.0;
        float blur_amt  = 0.012 * meniscus;       // screen-uv units
        for (int i = 1; i <= 3; ++i) {
            float dy = float(i) * blur_amt / 3.0;
            vec2 a = clamp(vec2(sample_uv.x, sample_uv.y - dy), vec2(0.0), vec2(1.0));
            vec2 b = clamp(vec2(sample_uv.x, sample_uv.y + dy), vec2(0.0), vec2(1.0));
            acc += texture(sampler2D(scene_color, scene_smp), a).rgb;
            acc += texture(sampler2D(scene_color, scene_smp), b).rgb;
            weight += 2.0;
        }
        vec3 blurred = acc / weight;
        color = mix(color, blurred, meniscus);
    }

    // Beer-Lambert per-channel attenuation, matching the water cap's
    // above-water formula (see water.glsl: `mix(deep_color, refracted,
    // attenuation)`). Applied with the soft `wet` weight so above-
    // water pixels stay untouched, below-water pixels get the full
    // fog tint, and meniscus pixels get a partial mix that makes the
    // transition feel like a gradient rather than a step.
    vec3 attenuation = exp(-view_dist * sigma);
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
