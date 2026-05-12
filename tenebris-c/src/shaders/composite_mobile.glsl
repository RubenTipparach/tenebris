// Mobile composite blit + camera-submerged fog.
//
// Two responsibilities:
//
//   1. Blit the offscreen colour into the swapchain, and forward
//      the offscreen depth via gl_FragDepth. The subsequent
//      water_mobile draw uses LESS_EQUAL against this forwarded
//      depth so mountains correctly occlude the water cap.
//
//   2. Apply a screen-wide Beer-Lambert fog when the camera is
//      submerged in a water voxel. Unlike the desktop composite,
//      there's no per-pixel altitude reconstruction or wet-mask
//      gate - if cam_under is true, every pixel gets fogged toward
//      deep_color by its view-distance Beer-Lambert attenuation.
//      Sky pixels saturate to far so the void above also fogs out
//      from under the surface.
//
// All the heavier desktop bits - per-pixel altitude reconstruction,
// fbm-gated wet mask, UV-perturbing shimmer, smoothstep crossfade
// across the water surface - are dropped. The result is a single
// branch per fragment plus, when submerged, one exp() + one mix().

@vs composite_mobile_vs

out vec2 v_uv;

void main() {
    vec2 uv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
    v_uv = uv;
}
@end


@fs composite_mobile_fs

layout(binding=1) uniform composite_mobile_fs_params {
    vec4 deep_color;     // xyz = deep_color tint (matches water.yaml)
    vec4 absorption;     // xyz = Beer-Lambert sigma per RGB channel
    vec4 fog_params;     // x = near, y = far, z = cam_under (0|1), w = unused
};

layout(binding=0) uniform texture2D scene_color_mobile;
layout(binding=1) uniform texture2D scene_depth_mobile;
layout(binding=0) uniform sampler   scene_mobile_smp;
layout(binding=1) uniform sampler   scene_depth_mobile_smp;

in vec2 v_uv;
out vec4 frag_color;

void main() {
    vec4 sc = texture(sampler2D(scene_color_mobile, scene_mobile_smp), v_uv);
    float scene_z_ndc = texture(sampler2D(scene_depth_mobile, scene_depth_mobile_smp), v_uv).r;
    gl_FragDepth = scene_z_ndc;

    bool cam_under = fog_params.z > 0.5;
    vec3 color = sc.rgb;

    if (cam_under) {
        float near = fog_params.x;
        float far  = fog_params.y;
        bool is_sky = scene_z_ndc >= 0.99999;
        // Linearised view distance. Sky pixels saturate to far so
        // the void above the surface also fogs out when the camera
        // is below the cap.
        float lin_z;
        if (is_sky) {
            lin_z = far;
        } else {
            lin_z = (2.0 * near * far)
                  / (far + near - (2.0 * scene_z_ndc - 1.0) * (far - near));
        }
        vec3 attenuation = exp(-lin_z * absorption.xyz);
        color = mix(deep_color.xyz, color, attenuation);
    }

    frag_color = vec4(color, 1.0);
}
@end

// Depth sampler must be non-filtering (depth-as-sampler2D isn't a
// filterable resource on WebGL2 / desktop GL). Same pattern the
// desktop composite + water shaders use.
@image_sample_type scene_depth_mobile unfilterable_float
@sampler_type scene_depth_mobile_smp nonfiltering

@program composite_mobile composite_mobile_vs composite_mobile_fs
