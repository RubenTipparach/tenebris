precision mediump float;
precision highp int;

// --- Tunables (edit + rebuild) --------------------------------------------
// Droplet refraction / normal strength: how far a rain / emerge drop's
// surface normal (rd_n / em_n = screen-space gradient of the drop height
// field) bends the UV when sampling the scene behind it. Higher = stronger
// lensing / more distortion through each drop; lower = flatter, subtler drops.
#define DROP_REFRACT 1.7
// --------------------------------------------------------------------------

uniform highp vec4 composite_fs_params[6];
uniform highp sampler2D scene_depth_scene_depth_smp;
uniform highp sampler2D scene_color_scene_smp;

in highp vec2 v_uv;
in highp vec3 v_camera_pos;
in highp vec3 v_view_dir;
layout(location = 0) out highp vec4 frag_color;

highp float linearize_z(highp float depth_ndc, highp float near, highp float far)
{
    return ((2.0 * near) * far) / ((far + near) - (((2.0 * depth_ndc) - 1.0) * (far - near)));
}


// ===== Rain-on-glass: faithful port of "Heartfelt" by Martijn Steinrucken
// (BigWings), 2017, CC BY-NC-SA 3.0. Screen-space droplets refract + fog the
// lens; drops cut sharp trails through the misted glass. iChannel0 -> the
// composite scene_color; textureLod(scene, uv, focus) -> rd_blur() multi-tap
// (the offscreen target has no mip chain). =====
highp vec3 rd_N13(highp float p){{
    highp vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
}}
highp float rd_N(highp float t){{ return fract(sin(t * 12345.564) * 7658.76); }}
highp float rd_Saw(highp float b, highp float t){{ return smoothstep(0.0, b, t) * smoothstep(1.0, b, t); }}
highp vec2 rd_DropLayer2(highp vec2 uv, highp float t){{
    highp vec2 UV = uv;
    uv.y += t * 0.75;
    highp vec2 a = vec2(6.0, 1.0);
    highp vec2 grid = a * 2.0;
    highp vec2 id = floor(uv * grid);
    highp float colShift = rd_N(id.x);
    uv.y += colShift;
    id = floor(uv * grid);
    highp vec3 n = rd_N13(id.x * 35.2 + id.y * 2376.1);
    highp vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
    highp float x = n.x - 0.5;
    highp float y = UV.y * 20.0;
    highp float wiggle = sin(y + sin(y));
    x += wiggle * (0.5 - abs(x)) * (n.z - 0.5);
    x *= 0.7;
    highp float ti = fract(t + n.z);
    y = (rd_Saw(0.85, ti) - 0.5) * 0.9 + 0.5;
    highp vec2 p = vec2(x, y);
    highp float d = length((st - p) * a.yx);
    highp float mainDrop = smoothstep(0.4, 0.0, d);
    highp float r = sqrt(smoothstep(1.0, y, st.y));
    highp float cd = abs(st.x - x);
    highp float trail = smoothstep(0.23 * r, 0.15 * r * r, cd);
    highp float trailFront = smoothstep(-0.02, 0.02, st.y - y);
    trail *= trailFront * r * r;
    y = UV.y;
    highp float trail2 = smoothstep(0.2 * r, 0.0, cd);
    highp float droplets = max(0.0, (sin(y * (1.0 - y) * 120.0) - st.y)) * trail2 * trailFront * n.z;
    y = fract(y * 10.0) + (st.y - 0.5);
    highp float dd = length(st - vec2(x, y));
    droplets = smoothstep(0.3, 0.0, dd);
    highp float m = mainDrop + droplets * r * trailFront;
    return vec2(m, trail);
}}
highp float rd_StaticDrops(highp vec2 uv, highp float t){{
    uv *= 40.0;
    highp vec2 id = floor(uv);
    uv = fract(uv) - 0.5;
    highp vec3 n = rd_N13(id.x * 107.45 + id.y * 3543.654);
    highp vec2 p = (n.xy - 0.5) * 0.7;
    highp float d = length(uv - p);
    highp float fade = rd_Saw(0.025, fract(t + n.z));
    return smoothstep(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
}}
highp vec2 rd_Drops(highp vec2 uv, highp float t, highp float l0, highp float l1, highp float l2){{
    highp float s = rd_StaticDrops(uv, t) * l0;
    highp vec2 m1 = rd_DropLayer2(uv, t) * l1;
    highp vec2 m2 = rd_DropLayer2(uv * 1.85, t) * l2;
    highp float c = s + m1.x + m2.x;
    c = smoothstep(0.3, 1.0, c);
    return vec2(c, max(m1.y * l0, m2.y * l1));
}}
// 17-tap two-ring blur (radius grows with focus); used by the depth blur.
highp vec3 rd_blur(highp sampler2D tex, highp vec2 uv, highp float focus){{
    highp float r = focus * 0.0016;
    highp vec3 s = texture(tex, uv).rgb; highp float w = 1.0;
    highp vec2 d;
    d = vec2(r, 0.0);         s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(0.0, r);         s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(r, r) * 0.707;   s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(r, -r) * 0.707;  s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    highp float r2 = r * 2.2;
    d = vec2(r2, 0.0);        s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(0.0, r2);        s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(r2, r2) * 0.707; s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    return s / w;
}}

void main()
{
    highp float _68 = max(composite_fs_params[2].z, 9.9999997473787516355514526367188e-05);
    highp vec4 _100 = texture(scene_depth_scene_depth_smp, v_uv);
    highp float _101 = _100.x;
    bool _107 = _101 >= 0.999989986419677734375;
    bool _112 = composite_fs_params[4].z > 0.5;
    highp float view_dist = 0.0;
    highp float pixel_alt = _68;
    if (!_107)
    {
        highp float param = _101;
        highp float param_1 = composite_fs_params[2].x;
        highp float param_2 = composite_fs_params[2].y;
        highp vec3 _138 = v_camera_pos + (v_view_dir * linearize_z(param, param_1, param_2));
        view_dist = length(_138 - v_camera_pos);
        pixel_alt = length(_138 - composite_fs_params[3].xyz) - composite_fs_params[3].w;
    }
    highp vec4 _157 = texture(scene_color_scene_smp, v_uv);
    highp float _160;
    if (_107)
    {
        _160 = float(_112);
    }
    else
    {
        _160 = _112 ? 1.0 : _157.w;
    }
    highp float wet = _160;
    highp float _171;
    if (_107)
    {
        _171 = 1.0;
    }
    else
    {
        _171 = 1.0 - smoothstep(-_68, _68, pixel_alt);
    }
    highp float _183 = wet;
    highp float _184 = _183 * _171;
    wet = _184;
    highp vec3 color = _157.xyz;
    if ((_184 > 0.0) && (composite_fs_params[4].x > 0.0))
    {
        color = texture(scene_color_scene_smp, clamp(v_uv + ((vec2(sin((composite_fs_params[4].y * 1.2999999523162841796875) + (v_uv.y * 32.0)) + (0.5 * sin((composite_fs_params[4].y * 0.699999988079071044921875) + (v_uv.x * 47.0))), cos((composite_fs_params[4].y * 0.89999997615814208984375) + (v_uv.x * 28.0)) + (0.5 * cos((composite_fs_params[4].y * 1.60000002384185791015625) + (v_uv.y * 41.0)))) * composite_fs_params[4].x) * wet), vec2(0.0), vec2(1.0))).xyz;
    }
    highp float _259;
    if (_112)
    {
        _259 = _107 ? (max(0.0, composite_fs_params[3].w - length(v_camera_pos - composite_fs_params[3].xyz)) / max(dot(normalize(v_view_dir), normalize(v_camera_pos - composite_fs_params[3].xyz)), 0.0500000007450580596923828125)) : view_dist;
    }
    else
    {
        _259 = max(0.0, -pixel_alt);
    }
    highp vec3 _276 = color;
    highp vec3 _283 = mix(_276, mix(composite_fs_params[0].xyz, _276, exp(composite_fs_params[1].xyz * (-_259))), vec3(wet));
    color = _283;
    // Distance fog: fades far terrain (and far water) into the sky colour so
    // the horizon has no hard seam. fog_params.w = density/metre (built on
    // the CPU from atmo_fog_density x altitude fade x weather; storm
    // multipliers are tuned in weather.yaml so rain hazes but never whites
    // out). fog_params.xyz = the sky-matched fog colour.
    if ((!_107) && (composite_fs_params[5].w > 0.0))
    {
        highp float fog_f = 1.0 - exp(-view_dist * composite_fs_params[5].w);
        float fog_gate = (composite_fs_params[4].z > 0.5) ? (1.0 - wet) : 1.0;
        color = mix(color, composite_fs_params[5].xyz, fog_f * fog_gate);
    }
    // Depth blur: soften the DISTANT background while the wet FX is active
    // (rain, or just-surfaced), foreground stays crisp. Distance-based (uses
    // view_dist), so it is not a flat lens fog. Reuses rd_blur.
    highp float dz_amt = max(composite_fs_params[4].w, composite_fs_params[2].w);
    if ((dz_amt > 0.001) && (composite_fs_params[4].z < 0.5)) {{
        highp float dz = smoothstep(28.0, 190.0, view_dist) * clamp(dz_amt, 0.0, 1.0);
        if (dz > 0.002) {{
            // Blur blend = dz x wet_blur (absorption.w, water.yaml). Radius
            // (dz x 2.5) kept modest so it softens, not smears.
            color = mix(color, rd_blur(scene_color_scene_smp, v_uv, dz * 2.5), dz * composite_fs_params[1].w);
        }}
    }}
    // Rain-on-glass (Heartfelt drops), refraction only - NO lens fog: sample
    // the scene sharply through each drop's normal, applied only where drops
    // are so distance fog between drops is preserved.
    if ((composite_fs_params[4].w > 0.001) && (composite_fs_params[4].z < 0.5)) {{
        highp float rd_rain = clamp(composite_fs_params[4].w, 0.0, 1.0);
        highp float rd_t = composite_fs_params[4].y * 0.2;
        highp vec2 rd_uv = (v_uv - 0.5); rd_uv.x *= max(composite_fs_params[0].w, 0.1);
        highp float rd_s = smoothstep(-0.5, 1.0, rd_rain) * 2.0;
        highp float rd_l1 = smoothstep(0.25, 0.75, rd_rain);
        highp float rd_l2 = smoothstep(0.0, 0.5, rd_rain);
        highp vec2 rd_c = rd_Drops(rd_uv, rd_t, rd_s, rd_l1, rd_l2);
        highp vec2 rd_e = vec2(0.001, 0.0);
        highp float rd_cx = rd_Drops(rd_uv + rd_e, rd_t, rd_s, rd_l1, rd_l2).x;
        highp float rd_cy = rd_Drops(rd_uv + rd_e.yx, rd_t, rd_s, rd_l1, rd_l2).x;
        highp vec2 rd_n = vec2(rd_cx - rd_c.x, rd_cy - rd_c.x);
        highp vec3 rd_refr = texture(scene_color_scene_smp, clamp(v_uv - (rd_n * DROP_REFRACT), vec2(0.0), vec2(1.0))).xyz;
        color = mix(color, rd_refr, clamp(rd_c.x, 0.0, 1.0) * rd_rain);
    }}
    // Emerge-from-water: same drops running down + drying off, refraction only
    // (no fog). near_far.w = intensity 1->0. Skipped while submerged.
    if ((composite_fs_params[2].w > 0.001) && (composite_fs_params[4].z < 0.5)) {{
        highp float em = clamp(composite_fs_params[2].w, 0.0, 1.0);
        highp float em_t = composite_fs_params[4].y * 0.2;
        highp vec2 em_uv = (v_uv - 0.5); em_uv.x *= max(composite_fs_params[0].w, 0.1);
        highp vec2 em_c = rd_Drops(em_uv, em_t, 0.0, 1.0, 0.6);
        highp vec2 em_e = vec2(0.001, 0.0);
        highp float em_cx = rd_Drops(em_uv + em_e, em_t, 0.0, 1.0, 0.6).x;
        highp float em_cy = rd_Drops(em_uv + em_e.yx, em_t, 0.0, 1.0, 0.6).x;
        highp vec2 em_n = vec2(em_cx - em_c.x, em_cy - em_c.x);
        highp vec3 em_refr = texture(scene_color_scene_smp, clamp(v_uv - (em_n * DROP_REFRACT), vec2(0.0), vec2(1.0))).xyz;
        color = mix(color, em_refr, clamp(em_c.x, 0.0, 1.0) * em);
    }}
    frag_color = vec4(color, 1.0);
    gl_FragDepth = _101;
}



