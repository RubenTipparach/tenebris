#version 410

uniform vec4 hex_fs_crack[10];
uniform vec4 hex_fs_light[3];
uniform vec4 hex_fs_torch[1];
uniform vec4 hex_fs_water[2];
uniform sampler2D hex_atlas_hex_atlas_smp;
uniform sampler2D crack_tex_crack_smp;

layout(location = 0) in vec2 v_uv;
layout(location = 7) in vec3 v_local;
layout(location = 1) in vec3 v_normal;
layout(location = 2) in float v_sun_brightness;
layout(location = 4) in float v_sky_light;
layout(location = 5) in float v_torch_light;
layout(location = 6) in float v_wet;
layout(location = 3) in float v_water_depth;
layout(location = 0) out vec4 frag_color;

void main()
{
    vec4 tex = texture(hex_atlas_hex_atlas_smp, vec2(v_uv.x * (93.0 / 100.0), v_uv.y));
    if (hex_fs_crack[0].w > 0.001000000047497451305389404296875)
    {
        float _48 = length(v_local);
        bool _56 = _48 > (hex_fs_crack[1].x - 0.0199999995529651641845703125);
        bool _65;
        if (_56)
        {
            _65 = _48 < (hex_fs_crack[1].y + 0.0199999995529651641845703125);
        }
        else
        {
            _65 = _56;
        }
        if (_65)
        {
            vec3 _73 = v_local / vec3(_48);
            int _81 = int(hex_fs_crack[3].w + 0.5);
            bool inside = true;
            for (int i = 0; i < 6; i++)
            {
                bool _96 = i < _81;
                bool _109;
                if (_96)
                {
                    _109 = dot(_73, hex_fs_crack[i * 1 + 4].xyz) > 9.9999997473787516355514526367188e-05;
                }
                else
                {
                    _109 = _96;
                }
                if (_109)
                {
                    inside = false;
                }
            }
            if (inside)
            {
                vec3 _136 = _73 - (hex_fs_crack[0].xyz * dot(_73, hex_fs_crack[0].xyz));
                float _139 = length(_136);
                vec2 uv;
                if (abs(dot(v_normal, hex_fs_crack[0].xyz)) > 0.699999988079071044921875)
                {
                    float _158 = min(_139 / max(hex_fs_crack[2].w, 9.9999999747524270787835121154785e-07), 1.0);
                    vec2 _163;
                    if (_139 > 9.9999999747524270787835121154785e-07)
                    {
                        _163 = vec2(dot(_136, hex_fs_crack[2].xyz), dot(_136, hex_fs_crack[3].xyz)) / vec2(_139);
                    }
                    else
                    {
                        _163 = vec2(1.0, 0.0);
                    }
                    uv = vec2(((hex_fs_crack[1].z + hex_fs_crack[1].w) * 0.5) + ((((hex_fs_crack[1].w - hex_fs_crack[1].z) * 0.5) * _163.x) * _158), 0.5 + ((0.5 * _163.y) * _158));
                }
                else
                {
                    uv = vec2(mix(hex_fs_crack[1].z, hex_fs_crack[1].w, fract((atan(dot(_136, hex_fs_crack[3].xyz), dot(_136, hex_fs_crack[2].xyz)) * float(_81)) * 0.15915493667125701904296875)), clamp((hex_fs_crack[1].y - _48) / max(hex_fs_crack[1].y - hex_fs_crack[1].x, 9.9999997473787516355514526367188e-05), 0.0, 1.0));
                }
                vec4 _253 = texture(crack_tex_crack_smp, uv);
                vec4 _254 = tex;
                vec3 _264 = mix(_254.xyz, _253.xyz, vec3(_253.w * hex_fs_crack[0].w));
                vec4 _383 = _254;
                _383.x = _264.x;
                _383.y = _264.y;
                _383.z = _264.z;
                tex = _383;
            }
        }
    }
    vec3 lit = (tex.xyz * ((hex_fs_light[1].xyz * max(0.0500000007450580596923828125, mix(hex_fs_light[2].x, 1.0, v_sun_brightness) * v_sky_light)) + vec3((max(dot(v_normal, normalize(hex_fs_light[0].xyz)), 0.0) * v_sun_brightness) * v_sky_light))) + ((tex.xyz * (hex_fs_torch[0].xyz * hex_fs_torch[0].w)) * v_torch_light);
    bool _334 = v_wet > 0.5;
    bool _340;
    if (_334)
    {
        _340 = v_water_depth > 0.0;
    }
    else
    {
        _340 = _334;
    }
    if (_340)
    {
        vec3 _352 = exp(hex_fs_water[0].xyz * (-v_water_depth));
        lit = mix(lit * _352, hex_fs_water[1].xyz * _352, vec3((1.0 - dot(_352, vec3(0.3333333432674407958984375))) * 0.5));
    }
    // Rain wetness (hex_fs_light[2].y = wetness 0..1, .z = time seconds).
    // Sky-gated so caves stay dry; up-facing surfaces collect the rain.
    // Darkens the wet ground and adds an animated raindrop-ripple sun sheen.
    float wet_amt = clamp(hex_fs_light[2].y, 0.0, 1.0) * v_sky_light;
    if (wet_amt > 0.001) {
        vec3 wet_up = normalize(v_local);
        float wet_face = clamp(dot(v_normal, wet_up), 0.0, 1.0);
        float wet = wet_amt * wet_face;
        float wet_t = hex_fs_light[2].z;
        vec3 wet_ta = cross(wet_up, vec3(0.0, 1.0, 0.0));
        if (dot(wet_ta, wet_ta) < 1e-4) { wet_ta = cross(wet_up, vec3(1.0, 0.0, 0.0)); }
        wet_ta = normalize(wet_ta);
        vec3 wet_tb = cross(wet_up, wet_ta);
        vec2 wet_rc = vec2(dot(v_local, wet_ta), dot(v_local, wet_tb)) * 2.6;
        float wet_pa = 6.2831853 * wet_rc.x + wet_t * 4.0;
        float wet_pb = 6.2831853 * wet_rc.y + wet_t * 3.3;
        float wet_gx = cos(wet_pa) * sin(wet_pb);
        float wet_gy = sin(wet_pa) * cos(wet_pb);
        vec3 wet_n = normalize(v_normal + (wet_ta * wet_gx + wet_tb * wet_gy) * (0.35 * wet));
        lit *= mix(1.0, 0.72, wet);
        float wet_sheen = pow(max(dot(wet_n, normalize(hex_fs_light[0].xyz)), 0.0), 40.0);
        lit += vec3(0.6) * (wet_sheen * wet * v_sun_brightness);
    }
    frag_color = vec4(lit, v_wet);
}


