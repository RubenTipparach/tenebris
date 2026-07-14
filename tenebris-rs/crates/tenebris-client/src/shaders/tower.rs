#![allow(dead_code)]
use sokol::gfx as sg;
/*
    HAND-WRITTEN shader (desktop GL 4.1 core only, per CLAUDE.md - no ES
    variant). A minimal textured shader with an ALPHA-TEST CUTOUT: it
    discards fully-transparent texels so the launch-tower truss lattice is
    see-through, while writing depth for the solid beams. Paired with a
    cull-NONE pipeline (renderer::draw_tower_cutout) it renders the gantry
    DOUBLE-SIDED with correct depth - clouds and its own far beams sort
    right, unlike an alpha-blended pass with depth-write off.

    Vertex layout: a_pos (vec3, world), a_uv (vec2), a_shade (float, baked
    per-vertex lighting * face shade).

    tower_vs_params (4 vec4, std140): [0..3] = view-projection matrix.
*/
pub const ATTR_TOWER_A_POS: usize = 0;
pub const ATTR_TOWER_A_UV: usize = 1;
pub const ATTR_TOWER_A_SHADE: usize = 2;
pub const UB_TOWER_VS_PARAMS: usize = 0;
pub const VIEW_TOWER_TEX: usize = 0;
pub const SMP_TOWER_SMP: usize = 0;

#[repr(C, align(16))]
pub struct TowerVsParams {
    pub u_vp: [f32; 16],
}

const VS_410: &core::ffi::CStr = c"#version 410

uniform vec4 tower_vs_params[4];
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in float a_shade;
layout(location = 0) out vec2 v_uv;
layout(location = 1) out float v_shade;

void main()
{
    mat4 vp = mat4(tower_vs_params[0], tower_vs_params[1], tower_vs_params[2], tower_vs_params[3]);
    gl_Position = vp * vec4(a_pos, 1.0);
    v_uv = a_uv;
    v_shade = a_shade;
}
";

const FS_410: &core::ffi::CStr = c"#version 410

uniform sampler2D tower_tex_tower_smp;
layout(location = 0) in vec2 v_uv;
layout(location = 1) in float v_shade;
layout(location = 0) out vec4 frag_color;

void main()
{
    vec4 t = texture(tower_tex_tower_smp, v_uv);
    if (t.a < 0.5) { discard; }
    frag_color = vec4(t.rgb * v_shade, 1.0);
}
";

pub fn tower_shader_desc(backend: sg::Backend) -> sg::ShaderDesc {
    let mut desc = sg::ShaderDesc::new();
    desc.label = c"tower_shader".as_ptr();
    if let sg::Backend::Glcore = backend {
        desc.vertex_func.source = VS_410.as_ptr();
        desc.vertex_func.entry = c"main".as_ptr();
        desc.fragment_func.source = FS_410.as_ptr();
        desc.fragment_func.entry = c"main".as_ptr();
    }
    desc.attrs[ATTR_TOWER_A_POS].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[ATTR_TOWER_A_POS].glsl_name = c"a_pos".as_ptr();
    desc.attrs[ATTR_TOWER_A_UV].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[ATTR_TOWER_A_UV].glsl_name = c"a_uv".as_ptr();
    desc.attrs[ATTR_TOWER_A_SHADE].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[ATTR_TOWER_A_SHADE].glsl_name = c"a_shade".as_ptr();
    desc.uniform_blocks[0].stage = sg::ShaderStage::Vertex;
    desc.uniform_blocks[0].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[0].size = 64;
    desc.uniform_blocks[0].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[0].glsl_uniforms[0].array_count = 4;
    desc.uniform_blocks[0].glsl_uniforms[0].glsl_name = c"tower_vs_params".as_ptr();
    desc.views[0].texture.stage = sg::ShaderStage::Fragment;
    desc.views[0].texture.multisampled = false;
    desc.views[0].texture.image_type = sg::ImageType::Dim2;
    desc.views[0].texture.sample_type = sg::ImageSampleType::Float;
    desc.samplers[0].stage = sg::ShaderStage::Fragment;
    desc.samplers[0].sampler_type = sg::SamplerType::Filtering;
    desc.texture_sampler_pairs[0].stage = sg::ShaderStage::Fragment;
    desc.texture_sampler_pairs[0].view_slot = 0;
    desc.texture_sampler_pairs[0].sampler_slot = 0;
    desc.texture_sampler_pairs[0].glsl_name = c"tower_tex_tower_smp".as_ptr();
    desc
}
