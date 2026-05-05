// Composite-blit shader. Fullscreen triangle that samples the
// offscreen-pass colour attachment and writes it to the swapchain so
// the underwater scene shows up under the water cap.
//
// Phase A.3 of the FBO water rework. After this lands, the water
// shader (Phase B.1) will start sampling the same scene_color
// texture for UV-perturb refraction, and the depth attachment for
// thickness-driven extinction.

@vs composite_vs

out vec2 v_uv;

void main() {
    // gl_VertexIndex-based fullscreen triangle — no vbuf required.
    // (sokol-shdc consumes Vulkan-flavoured GLSL where the builtin
    // is gl_VertexIndex, not gl_VertexID; the cross-compiler emits
    // the right name per backend.) VertexIndex 0/1/2 produces uvs
    // (0,0) (2,0) (0,2), projected to NDC = uv*2-1 to cover the
    // whole screen with the triangle's hypotenuse at the visible
    // boundary.
    vec2 uv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
    v_uv = uv;
}
@end


@fs composite_fs

layout(binding=0) uniform texture2D scene_color;
layout(binding=0) uniform sampler   scene_smp;

in vec2 v_uv;
out vec4 frag_color;

void main() {
    frag_color = texture(sampler2D(scene_color, scene_smp), v_uv);
}
@end


@program composite composite_vs composite_fs
