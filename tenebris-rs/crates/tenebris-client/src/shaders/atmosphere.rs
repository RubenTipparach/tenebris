#![allow(dead_code)]
use sokol::gfx as sg;
// Atmosphere shader bindings.
//
// Originally sokol-shdc machine-generated (glsl410:glsl300es byte arrays).
// Now hand-maintained: the source lives in the sibling `atmosphere.vs.glsl`
// / `atmosphere.fs.glsl` (GL 4.1 core only - the ES arm is dropped per the
// desktop-only rule), loaded via `include_str!`. The FS uniform block grew
// from 3 to 7 vec4s so per-body `wavelengths` / `sunset_*` reach the sky
// dome instead of being baked GLSL literals - see the .fs.glsl header.
//
//   Uniform block 'atmosphere_vs_params' -> AtmosphereVsParams (slot 0)
//   Uniform block 'atmosphere_fs_params' -> AtmosphereFsParams (slot 1)

pub const ATTR_ATMOSPHERE_A_POS: usize = 0;
pub const UB_ATMOSPHERE_VS_PARAMS: usize = 0;
pub const UB_ATMOSPHERE_FS_PARAMS: usize = 1;

#[repr(C, align(16))]
pub struct AtmosphereVsParams {
    pub cam_right: [f32; 4],
    pub cam_up: [f32; 4],
    pub cam_forward: [f32; 4],
    pub camera_pos: [f32; 4],
}

#[repr(C, align(16))]
pub struct AtmosphereFsParams {
    pub sun_direction: [f32; 4],
    /// x = planet/clip radius Rp, y = outer shell Ra, z = scale height.
    pub radii: [f32; 4],
    /// x = rayleigh_scale, y = mie_scale, z = mie_g, w = sun_intensity.
    pub scatter_coeffs: [f32; 4],
    /// xyz = wavelengths (1/lambda^4 RGB ratios), w = sunset_strength.
    /// Hand-added slot: lifts the sky-scattering hue + dusk-tint blend out
    /// of baked GLSL literals so atmosphere.yaml drives them per body.
    pub wavelengths: [f32; 4],
    /// xyz = sunset_tint (dusk sky multiplier near the horizon).
    pub sunset_tint: [f32; 4],
    /// xyz = sunset_glow (dusk sun-direction glow).
    pub sunset_glow: [f32; 4],
    /// xyz = sunset_horizon (dusk horizon-band tint).
    pub sunset_horizon: [f32; 4],
}

// `static` (not `const`) so the null-terminated source has ONE fixed
// 'static address whose pointer stays valid when handed to sokol. As a
// `const`, `.as_ptr()` was reading a promoted temporary that sokol saw as
// null under a no-console (redirected-stdio) launch.
pub static ATMOSPHERE_VS_SOURCE_GLSL410: &str = concat!(include_str!("atmosphere.vs.glsl"), "\0");
pub static ATMOSPHERE_FS_SOURCE_GLSL410: &str = concat!(include_str!("atmosphere.fs.glsl"), "\0");

pub fn atmosphere_shader_desc(_backend: sg::Backend) -> sg::ShaderDesc {
    /* Desktop GL 4.1 core only (the ES arm is dropped per the desktop-only
     * rule), so the source is set unconditionally rather than gated on the
     * backend - the gate was the bug that left the source null and crashed
     * shader creation. */
    let mut desc = sg::ShaderDesc::new();
    desc.label = c"atmosphere_shader".as_ptr();
    desc.vertex_func.source = ATMOSPHERE_VS_SOURCE_GLSL410.as_ptr() as *const _;
    desc.vertex_func.entry = c"main".as_ptr();
    desc.fragment_func.source = ATMOSPHERE_FS_SOURCE_GLSL410.as_ptr() as *const _;
    desc.fragment_func.entry = c"main".as_ptr();
    desc.attrs[0].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[0].glsl_name = c"a_pos".as_ptr();
    desc.uniform_blocks[0].stage = sg::ShaderStage::Vertex;
    desc.uniform_blocks[0].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[0].size = 64;
    desc.uniform_blocks[0].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[0].glsl_uniforms[0].array_count = 4;
    desc.uniform_blocks[0].glsl_uniforms[0].glsl_name = c"atmosphere_vs_params".as_ptr();
    desc.uniform_blocks[1].stage = sg::ShaderStage::Fragment;
    desc.uniform_blocks[1].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[1].size = 112; /* 7 vec4 - +wavelengths/sunset (hand-added) */
    desc.uniform_blocks[1].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[1].glsl_uniforms[0].array_count = 7;
    desc.uniform_blocks[1].glsl_uniforms[0].glsl_name = c"atmosphere_fs_params".as_ptr();
    desc
}
