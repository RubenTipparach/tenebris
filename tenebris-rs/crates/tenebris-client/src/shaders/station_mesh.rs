#![allow(dead_code)]
use sokol::gfx as sg;
/*
    HAND-WRITTEN shader (desktop GL 4.1 core only, per CLAUDE.md - no ES
    variant). The BAKED orbital-station mesh: the whole drum's prisms are
    built once into a vertex buffer in station-LOCAL space and drawn with
    a per-frame mvp (the station's orbit pose) - replacing the per-frame
    immediate-mode sokol_gl re-recording of thousands of prisms that was
    the red "draw-station" profiler row near the station.

    Vertex layout (10 floats): a_pos (vec3, station-local), a_uv (vec2),
    a_shade (float, gentle per-face AO), a_floor (float, baked brightness
    floor = max(material emissive floor, propagated block light)),
    a_normal (vec3, station-local face normal).

    Per-frame brightness = a_shade * max(sun_term, a_floor), where
    sun_term = u_lit * (ambient + (1-ambient) * max(dot(n, sun_local), 0)).
    The Lambert N.L against the SUN gives every face a real day/night
    terminator - the station used to be one flat scalar for the whole
    drum, so it was lit but not BY the sun. `u_lit` (entity_sun_brightness)
    still dims the whole station on the planet's night side (eclipse); the
    floor still keeps the casino's own lights (neon / lamps / marquees) and
    the glazing's night visibility. The sun direction arrives pre-rotated
    into station-LOCAL space (draw() computes it from the orbit basis), so
    the baked local normals need no per-frame transform.

    u_fs.y selects glass mode: opaque (0) alpha-tests at 0.5 and writes
    alpha 1; glass (1) skips the cutout and keeps the texture's alpha for
    the blend pipeline.
*/
pub const ATTR_STATION_MESH_A_POS: usize = 0;
pub const ATTR_STATION_MESH_A_UV: usize = 1;
pub const ATTR_STATION_MESH_A_SHADE: usize = 2;
pub const ATTR_STATION_MESH_A_FLOOR: usize = 3;
pub const ATTR_STATION_MESH_A_NORMAL: usize = 4;
pub const UB_STATION_MESH_VS_PARAMS: usize = 0;
pub const UB_STATION_MESH_FS_PARAMS: usize = 1;
pub const VIEW_STATION_MESH_TEX: usize = 0;
pub const SMP_STATION_MESH_SMP: usize = 0;

/// Floats per baked station vertex (pos3 + uv2 + shade1 + floor1 + normal3).
pub const STATION_VERT_FLOATS: usize = 10;

#[repr(C, align(16))]
pub struct StationMeshVsParams {
    pub u_mvp: [f32; 16],
}

#[repr(C, align(16))]
pub struct StationMeshFsParams {
    /// x = whole-station day/night dim, y = glass mode (0 opaque / 1 glass),
    /// z, w = spare.
    pub u_fs: [f32; 4],
    /// xyz = sun direction in station-LOCAL space, w = ambient floor for
    /// faces pointing away from the sun.
    pub u_sun: [f32; 4],
}

const VS_410: &core::ffi::CStr = c"#version 410

uniform vec4 station_mesh_vs_params[4];
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in float a_shade;
layout(location = 3) in float a_floor;
layout(location = 4) in vec3 a_normal;
layout(location = 0) out vec2 v_uv;
layout(location = 1) out float v_shade;
layout(location = 2) out float v_floor;
layout(location = 3) out vec3 v_normal;

void main()
{
    mat4 mvp = mat4(station_mesh_vs_params[0], station_mesh_vs_params[1],
                    station_mesh_vs_params[2], station_mesh_vs_params[3]);
    gl_Position = mvp * vec4(a_pos, 1.0);
    v_uv = a_uv;
    v_shade = a_shade;
    v_floor = a_floor;
    v_normal = a_normal;
}
";

const FS_410: &core::ffi::CStr = c"#version 410

uniform vec4 station_mesh_fs_params[2];
uniform sampler2D station_mesh_tex_station_mesh_smp;
layout(location = 0) in vec2 v_uv;
layout(location = 1) in float v_shade;
layout(location = 2) in float v_floor;
layout(location = 3) in vec3 v_normal;
layout(location = 0) out vec4 frag_color;

void main()
{
    vec4 t = texture(station_mesh_tex_station_mesh_smp, v_uv);
    float glass = station_mesh_fs_params[0].y;
    if (glass < 0.5 && t.a < 0.5) { discard; }
    vec3 sun = station_mesh_fs_params[1].xyz;
    float amb = station_mesh_fs_params[1].w;
    float ndl = max(dot(normalize(v_normal), sun), 0.0);
    float sun_term = station_mesh_fs_params[0].x * (amb + (1.0 - amb) * ndl);
    float b = v_shade * max(sun_term, v_floor);
    frag_color = vec4(t.rgb * b, glass < 0.5 ? 1.0 : t.a);
}
";

pub fn station_mesh_shader_desc(backend: sg::Backend) -> sg::ShaderDesc {
    let mut desc = sg::ShaderDesc::new();
    desc.label = c"station-mesh-shader".as_ptr();
    match backend {
        sg::Backend::Glcore => {
            desc.vertex_func.source = VS_410.as_ptr();
            desc.vertex_func.entry = c"main".as_ptr();
            desc.fragment_func.source = FS_410.as_ptr();
            desc.fragment_func.entry = c"main".as_ptr();
            desc.uniform_blocks[0].stage = sg::ShaderStage::Vertex;
            desc.uniform_blocks[0].layout = sg::UniformLayout::Std140;
            desc.uniform_blocks[0].size = 64;
            desc.uniform_blocks[0].glsl_uniforms[0]._type = sg::UniformType::Float4;
            desc.uniform_blocks[0].glsl_uniforms[0].array_count = 4;
            desc.uniform_blocks[0].glsl_uniforms[0].glsl_name =
                c"station_mesh_vs_params".as_ptr();
            desc.uniform_blocks[1].stage = sg::ShaderStage::Fragment;
            desc.uniform_blocks[1].layout = sg::UniformLayout::Std140;
            desc.uniform_blocks[1].size = 32;
            desc.uniform_blocks[1].glsl_uniforms[0]._type = sg::UniformType::Float4;
            desc.uniform_blocks[1].glsl_uniforms[0].array_count = 2;
            desc.uniform_blocks[1].glsl_uniforms[0].glsl_name =
                c"station_mesh_fs_params".as_ptr();
            desc.views[0].texture.stage = sg::ShaderStage::Fragment;
            desc.views[0].texture.image_type = sg::ImageType::Dim2;
            desc.views[0].texture.sample_type = sg::ImageSampleType::Float;
            desc.samplers[0].stage = sg::ShaderStage::Fragment;
            desc.samplers[0].sampler_type = sg::SamplerType::Filtering;
            desc.texture_sampler_pairs[0].stage = sg::ShaderStage::Fragment;
            desc.texture_sampler_pairs[0].view_slot = 0;
            desc.texture_sampler_pairs[0].sampler_slot = 0;
            desc.texture_sampler_pairs[0].glsl_name =
                c"station_mesh_tex_station_mesh_smp".as_ptr();
        }
        _ => {}
    }
    desc
}
