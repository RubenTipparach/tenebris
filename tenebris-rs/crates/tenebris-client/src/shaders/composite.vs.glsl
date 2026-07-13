#version 410

uniform vec4 composite_vs_params[4];
layout(location = 0) out vec2 v_uv;
layout(location = 1) out vec3 v_view_dir;
layout(location = 2) out vec3 v_camera_pos;

void main()
{
    vec2 _22 = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vec2 _36 = (_22 * 2.0) - vec2(1.0);
    float _38 = _36.x;
    gl_Position = vec4(_38, _36.y, 0.0, 1.0);
    v_uv = _22;
    v_view_dir = (composite_vs_params[2].xyz + (composite_vs_params[0].xyz * ((_38 * composite_vs_params[0].w) * composite_vs_params[1].w))) + (composite_vs_params[1].xyz * (_36.y * composite_vs_params[0].w));
    v_camera_pos = composite_vs_params[3].xyz;
}


