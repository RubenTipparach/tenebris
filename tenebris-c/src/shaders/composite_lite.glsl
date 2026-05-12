// Mobile / low-power composite blit. The desktop composite shader
// reconstructs each pixel's world position from the offscreen depth,
// computes its signed altitude relative to sea level, samples the
// scene color twice (once for the wet-mask gate, once with a
// sin-perturbed UV for the underwater shimmer), and applies a
// Beer-Lambert thickness fog using the alpha-channel wet mask.
//
// On mobile that's a depth fetch + dependent texture read + a stack
// of trig and exp() per pixel that mostly produces a subtle effect
// the player rarely sees. This variant drops the entire post-process.
//
// We still have to copy the offscreen depth into the swapchain depth
// buffer though, because water_lite runs after this pass on the
// swapchain and needs normal depth testing against the opaque scene -
// without a depth copy the water cap would draw on top of mountains
// in front of it. The fragment shader samples the offscreen depth
// texture and forwards it to gl_FragDepth; that lets the subsequent
// water_lite draw use SG_COMPAREFUNC_LESS_EQUAL the same way it would
// in the original offscreen pass.
//
// Side effect: a player swimming underwater in perf mode loses the
// screen-space Beer-Lambert fog tint. The water cap (water_lite.glsl)
// still draws over them with its alpha-blended deep_color, which
// gives a similar "you are underwater" feel without the post-process.

@vs composite_lite_vs

out vec2 v_uv;

void main() {
    vec2 uv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
    v_uv = uv;
}
@end


@fs composite_lite_fs

layout(binding=0) uniform texture2D scene_color_lite;
layout(binding=1) uniform texture2D scene_depth_lite;
layout(binding=0) uniform sampler   scene_lite_smp;
layout(binding=1) uniform sampler   scene_depth_lite_smp;

in vec2 v_uv;
out vec4 frag_color;

void main() {
    frag_color    = vec4(texture(sampler2D(scene_color_lite, scene_lite_smp), v_uv).rgb, 1.0);
    gl_FragDepth  = texture(sampler2D(scene_depth_lite, scene_depth_lite_smp), v_uv).r;
}
@end

// Depth sampler must be non-filtering (depth-as-sampler2D isn't a
// filterable resource on WebGL2 / desktop GL). Same pattern the
// desktop composite uses.
@image_sample_type scene_depth_lite unfilterable_float
@sampler_type scene_depth_lite_smp nonfiltering

@program composite_lite composite_lite_vs composite_lite_fs
