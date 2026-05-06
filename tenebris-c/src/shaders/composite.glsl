// Composite-blit shader. Fullscreen triangle that samples the
// offscreen-pass colour attachment and writes it to the swapchain so
// the underwater scene shows up under the water cap.
//
// Doubles as the underwater post-process: any pixel that reconstructs
// to a world position below the active body's sea-level radius gets
// faded toward the water's deep-colour tint via the same Beer-Lambert
// per-channel attenuation the water cap uses for the above-water view
// (so above-water and below-water views read as the same body of
// water). A small sin-wave shimmer is overlaid on the screen sample
// for a "looking through ripples" feel. Per-pixel masked, so a half-
// submerged camera leaves the dry side of the screen alone.

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
    vec4  near_far;       // x = near plane, y = far plane, zw unused
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
    vec3  pcen        = planet_params.xyz;
    float sea_radius  = planet_params.w;
    float dist_amt    = fx_params.x;
    float t           = fx_params.y;
    bool  cam_under   = fx_params.z > 0.5;

    // Depth at the un-distorted uv so the underwater mask is computed
    // against the correct geometry (we'll perturb the uv only when
    // sampling colour, below).
    float scene_z_ndc = texture(sampler2D(scene_depth, scene_depth_smp), v_uv).r;
    bool  is_sky      = scene_z_ndc >= 0.99999;

    // Reconstruct the world position of the pixel, when it isn't sky.
    // v_view_dir is parameterised so its forward component = 1, so
    // multiplying by the linearised camera-z gives the right world
    // foreshortening (off-axis pixels travel further per metre of z).
    vec3  pixel_world = v_camera_pos;
    float view_dist   = far;
    bool  pixel_under = false;
    if (!is_sky) {
        float lin_z = linearize_z(scene_z_ndc, near, far);
        pixel_world = v_camera_pos + v_view_dir * lin_z;
        view_dist   = length(pixel_world - v_camera_pos);
        float radial = length(pixel_world - pcen);
        pixel_under = radial < sea_radius;
    } else {
        // Sky pixels have no recoverable world position. They count
        // as underwater only if the camera itself is below sea level
        // — we're looking up through the water at an "infinite" sky
        // direction. View distance is treated as the far plane so
        // Beer-Lambert saturates and the pixel washes fully toward
        // deep_color (matches the water cap's deep-water look at
        // long thicknesses).
        pixel_under = cam_under;
    }

    // Underwater shimmer: sin-wave perturbation on the screen UV
    // before sampling the offscreen colour. Two phase-shifted waves
    // per axis avoid laminar drift and read as wobbly water rather
    // than a flat sweep.
    vec2 sample_uv = v_uv;
    if (pixel_under && dist_amt > 0.0) {
        vec2 d = vec2(
            sin(t * 1.3 + v_uv.y * 32.0) + 0.5 * sin(t * 0.7 + v_uv.x * 47.0),
            cos(t * 0.9 + v_uv.x * 28.0) + 0.5 * cos(t * 1.6 + v_uv.y * 41.0)
        ) * dist_amt;
        sample_uv = clamp(v_uv + d, vec2(0.0), vec2(1.0));
    }
    vec3 color = texture(sampler2D(scene_color, scene_smp), sample_uv).rgb;

    // Beer-Lambert per-channel attenuation, matching the water cap's
    // above-water formula (see water.glsl: `mix(deep_color, refracted,
    // attenuation)`). Same water, same look — the only thing that
    // changes when the camera ducks under is the rendering path that
    // computes it.
    if (pixel_under) {
        vec3 attenuation = exp(-view_dist * sigma);
        color = mix(deep, color, attenuation);
    }

    frag_color = vec4(color, 1.0);
}
@end


// Depth sampler must be non-filtering (depth-as-sampler2D isn't a
// filterable resource on WebGL2 / desktop GL). Same pattern the
// water shader uses for its scene-depth lookup.
@image_sample_type scene_depth unfilterable_float
@sampler_type scene_depth_smp nonfiltering

@program composite composite_vs composite_fs
