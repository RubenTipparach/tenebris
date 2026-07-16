#![allow(dead_code)]
//! Procedural sun-surface shader (hand-maintained, GLSL 410 core only).
//!
//! Replaced the sokol-shdc flat emissive disc: the fragment stage now
//! renders domain-warped fbm granulation, sunspots, limb darkening and a
//! hot fresnel rim (see `sun.fs.glsl` for the technique notes). Sources
//! live in `sun.vs.glsl` / `sun.fs.glsl` and are embedded via
//! `include_str!` per the repo shader rule - desktop GL 4.1 core is the
//! only backend; the legacy GLES3 arm is gone.
//!
//! Uniform layout mirrors the flattened-vec4-array convention the other
//! hand-maintained shaders use (composite, distant): the FS block is
//! `uniform vec4 sun_fs_params[6]` = 96 bytes; the Rust struct below MUST
//! stay field-for-field in sync with the doc table at the top of
//! `sun.fs.glsl` (there's a size pin in the tests).

use sokol::gfx as sg;

pub const ATTR_SUN_A_POS: usize = 0;
pub const UB_SUN_VS_PARAMS: usize = 0;
pub const UB_SUN_FS_PARAMS: usize = 1;

#[repr(C, align(16))]
pub struct SunVsParams {
    pub u_mvp: [f32; 16],
}

/// `sun_fs_params[6]` - one vec4 per row of the table in sun.fs.glsl.
#[repr(C, align(16))]
pub struct SunFsParams {
    /// [0] granule-core (hot) colour + time in seconds.
    pub u_color_hot: [f32; 3],
    pub u_time: f32,
    /// [1] granule-lane (cool) colour + granulation noise scale.
    pub u_color_cool: [f32; 3],
    pub u_granule_scale: f32,
    /// [2] sunspot colour + churn (animation) speed.
    pub u_color_spot: [f32; 3],
    pub u_churn_speed: f32,
    /// [3] camera position in the sun's unit-sphere space + limb-darkening
    /// curve power.
    pub u_cam_local: [f32; 3],
    pub u_limb_power: f32,
    /// [4] limb-darkening strength, fresnel rim boost, sunspot threshold,
    /// sunspot edge sharpness.
    pub u_limb_strength: f32,
    pub u_rim_boost: f32,
    pub u_spot_threshold: f32,
    pub u_spot_sharpness: f32,
    /// [5] domain-warp amount, (unused), overall brightness, (unused).
    pub u_warp_amount: f32,
    pub _pad_84: f32,
    pub u_brightness: f32,
    pub _pad_92: f32,
}

pub const SUN_VS_SOURCE_GLSL410: &str = concat!(include_str!("sun.vs.glsl"), "\0");
pub const SUN_FS_SOURCE_GLSL410: &str = concat!(include_str!("sun.fs.glsl"), "\0");

pub fn sun_shader_desc(_backend: sg::Backend) -> sg::ShaderDesc {
    let mut desc = sg::ShaderDesc::new();
    desc.label = c"sun_shader".as_ptr();
    /* Desktop GL 4.1 core only (repo rule) - no ES arm. */
    desc.vertex_func.source = SUN_VS_SOURCE_GLSL410.as_ptr() as *const _;
    desc.vertex_func.entry = c"main".as_ptr();
    desc.fragment_func.source = SUN_FS_SOURCE_GLSL410.as_ptr() as *const _;
    desc.fragment_func.entry = c"main".as_ptr();
    desc.attrs[0].base_type = sg::ShaderAttrBaseType::Float;
    desc.attrs[0].glsl_name = c"a_pos".as_ptr();
    desc.uniform_blocks[0].stage = sg::ShaderStage::Vertex;
    desc.uniform_blocks[0].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[0].size = 64;
    desc.uniform_blocks[0].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[0].glsl_uniforms[0].array_count = 4;
    desc.uniform_blocks[0].glsl_uniforms[0].glsl_name = c"sun_vs_params".as_ptr();
    desc.uniform_blocks[1].stage = sg::ShaderStage::Fragment;
    desc.uniform_blocks[1].layout = sg::UniformLayout::Std140;
    desc.uniform_blocks[1].size = 96;
    desc.uniform_blocks[1].glsl_uniforms[0]._type = sg::UniformType::Float4;
    desc.uniform_blocks[1].glsl_uniforms[0].array_count = 6;
    desc.uniform_blocks[1].glsl_uniforms[0].glsl_name = c"sun_fs_params".as_ptr();
    desc
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The struct must exactly fill `uniform vec4 sun_fs_params[6]`.
    #[test]
    fn fs_params_size_pinned() {
        assert_eq!(std::mem::size_of::<SunFsParams>(), 96);
        assert_eq!(std::mem::size_of::<SunVsParams>(), 64);
    }

    /// The GLSL sources declare the same block sizes the desc promises,
    /// and carry explicit varying locations (410-core requirement).
    #[test]
    fn glsl_sources_match_desc()
    {
        assert!(SUN_FS_SOURCE_GLSL410.contains("uniform vec4 sun_fs_params[6]"));
        assert!(SUN_VS_SOURCE_GLSL410.contains("uniform vec4 sun_vs_params[4]"));
        assert!(SUN_VS_SOURCE_GLSL410.contains("layout(location = 0) out vec3 v_local"));
        assert!(SUN_FS_SOURCE_GLSL410.contains("layout(location = 0) in vec3 v_local"));
        assert!(SUN_VS_SOURCE_GLSL410.starts_with("#version 410"));
        assert!(SUN_FS_SOURCE_GLSL410.starts_with("#version 410"));
        assert!(SUN_VS_SOURCE_GLSL410.ends_with('\0'));
        assert!(SUN_FS_SOURCE_GLSL410.ends_with('\0'));
    }
}
