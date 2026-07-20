#![allow(dead_code)]
use sokol::gfx as sg;
/*
    HAND-WRITTEN shader module (no .glsl source in-repo to run
    sokol-shdc on - follows the same desc/uniform conventions as the
    generated siblings).

    "glow": emissive light-point billboards - the far-LOD stand-in for
    baked torch light, so bases read as warm dots from orbit. One quad
    per light; the vertex shader billboards it toward the camera and
    scales it with distance (never below a world-size floor, never
    smaller than ~a pixel at range), and fades it up at night via the
    same terminator band the entity lighting uses. Drawn additively
    into the offscreen scene with depth-test on / write off, so
    terrain occludes lights behind the horizon.

    Vertex layout: a_center (vec3, body-local), a_corner (vec2 in
    -1..1), a_size (float, per-light base half-size in metres).

    glow_vs_params (8 vec4, std140):
      [0..3] u_mvp (vp * body model)
      [4]    camera right (xyz, world) + min half-size m (w)
      [5]    camera up (xyz, world) + half-size per metre of dist (w)
      [6]    camera pos (xyz, body-local) + day alpha (w)
      [7]    sun dir (xyz, world) + night alpha (w)

    glow_fs_params (1 vec4): glow colour (rgb) + unused (w).
*/
pub const ATTR_GLOW_A_CENTER: usize = 0;
pub const ATTR_GLOW_A_CORNER: usize = 1;
pub const ATTR_GLOW_A_SIZE: usize = 2;
pub const UB_GLOW_VS_PARAMS: usize = 0;
pub const UB_GLOW_FS_PARAMS: usize = 1;

#[repr(C, align(16))]
pub struct GlowVsParams {
    pub u_mvp: [f32; 16],
    pub u_right_min: [f32; 4],
    pub u_up_scale: [f32; 4],
    pub u_cam_day: [f32; 4],
    pub u_sun_night: [f32; 4],
}

#[repr(C, align(16))]
pub struct GlowFsParams {
    pub u_color: [f32; 4],
}

const VS_410: &core::ffi::CStr = c"#version 410

uniform vec4 glow_vs_params[8];
layout(location = 0) in vec3 a_center;
layout(location = 1) in vec2 a_corner;
layout(location = 2) in float a_size;
layout(location = 0) out vec2 v_uv;
layout(location = 1) out float v_alpha;

void main()
{
    mat4 mvp = mat4(glow_vs_params[0], glow_vs_params[1], glow_vs_params[2], glow_vs_params[3]);
    vec3 right = glow_vs_params[4].xyz;
    float min_half = glow_vs_params[4].w;
    vec3 up = glow_vs_params[5].xyz;
    float per_m = glow_vs_params[5].w;
    vec3 cam = glow_vs_params[6].xyz;
    float a_day = glow_vs_params[6].w;
    vec3 sun = glow_vs_params[7].xyz;
    float a_night = glow_vs_params[7].w;

    float dist = length(a_center - cam);
    float half_size = max(min_half + a_size, dist * per_m);
    vec3 world = a_center + (right * a_corner.x + up * a_corner.y) * half_size;
    gl_Position = mvp * vec4(world, 1.0);
    v_uv = a_corner;
    float d = dot(normalize(a_center), sun);
    float daylight = clamp((d + 0.10) / 0.22, 0.0, 1.0);
    v_alpha = mix(a_night, a_day, daylight);
}
";

const FS_410: &core::ffi::CStr = c"#version 410

uniform vec4 glow_fs_params[1];
layout(location = 0) in vec2 v_uv;
layout(location = 1) in float v_alpha;
layout(location = 0) out vec4 frag_color;

void main()
{
    float f = clamp(1.0 - length(v_uv), 0.0, 1.0);
    f *= f;
    // Alpha MUST be 0: the offscreen scene's alpha channel is the composite's
    // wet-mask (the terrain writes v_wet there; the water fog keys off it). An
    // additive glow that wrote alpha 1 stamped 'fully wet' over its billboard,
    // so the composite painted teal deep-water fog as a square at every torch
    // in a below-sea-level cave. The torch mesh already writes alpha 0 for the
    // same reason; the glow now matches. (Blend is additive on alpha too, so 0
    // leaves the terrain's mask untouched; the RGB write-mask double-guards it.)
    frag_color = vec4(glow_fs_params[0].xyz * (f * v_alpha), 0.0);
}
";

const VS_300ES: &core::ffi::CStr = c"#version 300 es
precision highp float;
precision highp int;

uniform highp vec4 glow_vs_params[8];
layout(location = 0) in highp vec3 a_center;
layout(location = 1) in highp vec2 a_corner;
layout(location = 2) in highp float a_size;
out highp vec2 v_uv;
out highp float v_alpha;

void main()
{
    highp mat4 mvp = mat4(glow_vs_params[0], glow_vs_params[1], glow_vs_params[2], glow_vs_params[3]);
    highp vec3 right = glow_vs_params[4].xyz;
    highp float min_half = glow_vs_params[4].w;
    highp vec3 up = glow_vs_params[5].xyz;
    highp float per_m = glow_vs_params[5].w;
    highp vec3 cam = glow_vs_params[6].xyz;
    highp float a_day = glow_vs_params[6].w;
    highp vec3 sun = glow_vs_params[7].xyz;
    highp float a_night = glow_vs_params[7].w;

    highp float dist = length(a_center - cam);
    highp float half_size = max(min_half + a_size, dist * per_m);
    highp vec3 world = a_center + (right * a_corner.x + up * a_corner.y) * half_size;
    gl_Position = mvp * vec4(world, 1.0);
    v_uv = a_corner;
    highp float d = dot(normalize(a_center), sun);
    highp float daylight = clamp((d + 0.10) / 0.22, 0.0, 1.0);
    v_alpha = mix(a_night, a_day, daylight);
}
";

const FS_300ES: &core::ffi::CStr = c"#version 300 es
precision mediump float;
precision highp int;

uniform highp vec4 glow_fs_params[1];
in highp vec2 v_uv;
in highp float v_alpha;
layout(location = 0) out highp vec4 frag_color;

void main()
{
    highp float f = clamp(1.0 - length(v_uv), 0.0, 1.0);
    f *= f;
    // Alpha 0: the offscreen alpha is the composite wet-mask (see the 410 FS).
    frag_color = vec4(glow_fs_params[0].xyz * (f * v_alpha), 0.0);
}
";

pub fn glow_shader_desc(backend: sg::Backend) -> sg::ShaderDesc {
    let mut desc = sg::ShaderDesc::new();
    desc.label = c"glow_shader".as_ptr();
    match backend {
        sg::Backend::Glcore => {
            desc.vertex_func.source = VS_410.as_ptr();
            desc.vertex_func.entry = c"main".as_ptr();
            desc.fragment_func.source = FS_410.as_ptr();
            desc.fragment_func.entry = c"main".as_ptr();
        }
        sg::Backend::Gles3 => {
            desc.vertex_func.source = VS_300ES.as_ptr();
            desc.vertex_func.entry = c"main".as_ptr();
            desc.fragment_func.source = FS_300ES.as_ptr();
            desc.fragment_func.entry = c"main".as_ptr();
        }
        _ => {}
    }
    desc.attrs[ATTR_GLOW_A_CENTER].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[ATTR_GLOW_A_CENTER].glsl_name = c"a_center".as_ptr();
    desc.attrs[ATTR_GLOW_A_CORNER].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[ATTR_GLOW_A_CORNER].glsl_name = c"a_corner".as_ptr();
    desc.attrs[ATTR_GLOW_A_SIZE].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[ATTR_GLOW_A_SIZE].glsl_name = c"a_size".as_ptr();
    desc.uniform_blocks[0].stage = sg::ShaderStage::Vertex;
    desc.uniform_blocks[0].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[0].size = 128;
    desc.uniform_blocks[0].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[0].glsl_uniforms[0].array_count = 8;
    desc.uniform_blocks[0].glsl_uniforms[0].glsl_name = c"glow_vs_params".as_ptr();
    desc.uniform_blocks[1].stage = sg::ShaderStage::Fragment;
    desc.uniform_blocks[1].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[1].size = 16;
    desc.uniform_blocks[1].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[1].glsl_uniforms[0].array_count = 1;
    desc.uniform_blocks[1].glsl_uniforms[0].glsl_name = c"glow_fs_params".as_ptr();
    desc
}
