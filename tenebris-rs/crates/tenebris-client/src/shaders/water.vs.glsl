#version 410

uniform vec4 vs_params[8];
layout(location = 0) in vec3 a_pos;
layout(location = 0) out vec3 v_wpos;
layout(location = 1) out vec3 v_face_normal;
layout(location = 1) in vec3 a_normal;
layout(location = 3) out float v_sky_light;
layout(location = 3) in float a_sky_light;
layout(location = 4) out float v_torch_light;
layout(location = 4) in float a_torch_light;
layout(location = 5) out vec2 v_flow_uv;
layout(location = 2) in vec2 a_uv;
layout(location = 2) out float v_sun_brightness;

void main()
{
    float _29 = vs_params[7].x * vs_params[7].w;
    vec3 _116 = a_pos + (normalize(a_pos) * ((((sin(((_29 * 0.89999997615814208984375) + ((a_pos.x * 1.39999997615814208984375) * vs_params[7].z)) + ((a_pos.z * 0.60000002384185791015625) * vs_params[7].z)) * 0.180000007152557373046875) + (sin(((_29 * 1.2999999523162841796875) - ((a_pos.x * 0.699999988079071044921875) * vs_params[7].z)) + ((a_pos.z * 1.2000000476837158203125) * vs_params[7].z)) * 0.119999997317790985107421875)) + (sin(((_29 * 1.7000000476837158203125) + ((a_pos.x * 2.2999999523162841796875) * vs_params[7].z)) - ((a_pos.z * 1.89999997615814208984375) * vs_params[7].z)) * 0.0599999986588954925537109375)) * vs_params[7].y));
    gl_Position = mat4(vs_params[0], vs_params[1], vs_params[2], vs_params[3]) * vec4(_116, 1.0);
    v_wpos = _116;
    v_face_normal = a_normal;
    v_sky_light = a_sky_light;
    v_torch_light = a_torch_light;
    v_flow_uv = a_uv;
    v_sun_brightness = smoothstep(vs_params[6].y, vs_params[6].z, dot(normalize(_116 - vs_params[4].xyz), normalize(vs_params[5].xyz)));
}

