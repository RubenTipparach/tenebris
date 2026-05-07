// Torch shader. Procedural three-piece torch (handle cylinder + head
// cylinder + flame cone) with vertex colours + per-vertex animWeight.
// animWeight is 0 on the static parts (handle/head) and 1 on the
// flame; the vertex shader only animates vertices with animWeight > 0,
// scaling the flame's Y above its base + adding a small horizontal
// wobble to the tip.
//
// Direct port of src/shaders/torch/torch.{vert,frag} in the JS
// reference. Cross-compiled by sokol-shdc into torch.glsl.h —
// runtime gets torch_shader_desc(sg_query_backend()),
// torch_vs_params_t, and ATTR_torch_a_* / UB_torch_* slot constants.

@vs torch_vs

layout(binding=0) uniform torch_vs_params {
    mat4  u_mvp;             // pre-multiplied vp * model per torch
    float u_time;            // accumulated seconds × flicker speed
    float u_flicker_amount;  // 0 = no flicker, ~0.15 = subtle, 0.3 = lively
};

in vec3  a_pos;
in vec3  a_color;
in float a_anim_weight;

out vec3 v_color;

void main() {
    v_color = a_color;

    // Same triple-sine flicker as the JS reference. Three frequencies
    // multiplied together gives an organic, non-periodic-looking
    // motion that doesn't read as a pure sine wave.
    float t = u_time;
    float flicker = sin(t) * sin(t * 2.3) * sin(t * 0.7);

    vec3 anim_pos = a_pos;
    if (a_anim_weight > 0.0) {
        // Flame base Y: handle (0.4) + head (0.1) = 0.5. The flame
        // cone spans 0.5 -> 0.65. Scale only the part above the base
        // so the flame tip moves while the seat where it meets the
        // head stays fixed.
        float flame_base_y = 0.5;
        float h_above = a_pos.y - flame_base_y;
        float scale_y = 1.0 + flicker * u_flicker_amount * a_anim_weight;
        anim_pos.y = flame_base_y + h_above * scale_y;

        // Higher parts wobble more horizontally — sells the flame as
        // a fluid rather than a rigid scaling cone. Two frequencies
        // (1.7 / 1.3) so x and z don't oscillate in sync.
        float h_factor = max(0.0, h_above * 4.0);
        anim_pos.x += sin(t * 1.7) * 0.008 * h_factor * a_anim_weight;
        anim_pos.z += cos(t * 1.3) * 0.008 * h_factor * a_anim_weight;
    }

    gl_Position = u_mvp * vec4(anim_pos, 1.0);
}
@end


@fs torch_fs

in vec3 v_color;
out vec4 frag_color;

void main() {
    // Emissive vertex colour — no Lambert. The flame is the light
    // source, the handle/head are at most lit by the bake on the
    // terrain around them; their own surface colour stays self-lit
    // so a torch in shadow still reads as a torch.
    /* Alpha = wet mask (0 = dry). Torches are placed entities, never
     * a face of a water voxel. */
    frag_color = vec4(v_color, 0.0);
}
@end


@program torch torch_vs torch_fs
