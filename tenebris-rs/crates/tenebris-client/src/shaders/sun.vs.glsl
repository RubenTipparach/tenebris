#version 410

uniform vec4 sun_vs_params[4];

layout(location = 0) in vec3 a_pos;
layout(location = 0) out vec3 v_local;

void main()
{
    v_local = a_pos;
    gl_Position = mat4(sun_vs_params[0], sun_vs_params[1], sun_vs_params[2], sun_vs_params[3])
        * vec4(a_pos, 1.0);
}
