#version 410

uniform vec4 hex_vs_light[3];
uniform vec4 hex_vs_params[5];
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec3 a_normal;
layout(location = 5) in float a_wet;
layout(location = 1) out vec3 v_normal;
layout(location = 0) out vec2 v_uv;
layout(location = 2) in vec2 a_uv;
layout(location = 4) out float v_sky_light;
layout(location = 3) in float a_sky_light;
layout(location = 5) out float v_torch_light;
layout(location = 4) in float a_torch_light;
layout(location = 6) out float v_wet;
layout(location = 7) out vec3 v_local;
layout(location = 2) out float v_sun_brightness;
layout(location = 3) out float v_water_depth;

void main()
{
    vec3 pos = a_pos;
    if (dot(a_normal, a_normal) < 0.810000002384185791015625)
    {
        bool _28 = a_wet > 0.5;
        float _29;
        if (_28)
        {
            _29 = hex_vs_light[2].z;
        }
        else
        {
            _29 = hex_vs_light[2].x;
        }
        float _51;
        if (_28)
        {
            _51 = hex_vs_light[2].w;
        }
        else
        {
            _51 = hex_vs_light[2].y;
        }
        vec3 _74 = normalize(a_pos - hex_vs_params[4].xyz);
        vec3 _80 = cross(_74, vec3(0.0, 1.0, 0.0));
        vec3 east = _80;
        if (dot(_80, _80) < 9.9999997473787516355514526367188e-05)
        {
            east = cross(_74, vec3(1.0, 0.0, 0.0));
        }
        vec3 _91 = east;
        vec3 _92 = normalize(_91);
        east = _92;
        pos += (_92 * (sin((hex_vs_light[1].w * _29) + dot(a_pos, vec3(1.7000000476837158203125, 2.2999999523162841796875, 1.10000002384185791015625))) * _51));
    }
    gl_Position = mat4(hex_vs_params[0], hex_vs_params[1], hex_vs_params[2], hex_vs_params[3]) * vec4(pos, 1.0);
    v_normal = normalize(a_normal);
    v_uv = a_uv;
    v_sky_light = a_sky_light;
    v_torch_light = a_torch_light;
    v_wet = a_wet;
    vec3 _153 = a_pos - hex_vs_params[4].xyz;
    v_local = _153;
    v_sun_brightness = smoothstep(hex_vs_light[1].y, hex_vs_light[1].z, dot(normalize(_153), normalize(hex_vs_light[0].xyz)));
    float _188;
    if (hex_vs_params[4].w > 0.0)
    {
        _188 = max(0.0, hex_vs_params[4].w - length(_153));
    }
    else
    {
        _188 = 0.0;
    }
    v_water_depth = _188;
}

