#version 410

uniform vec4 fs_params[16];
uniform sampler2D water_scene_color_water_scene_smp;
uniform sampler2D water_scene_depth_water_scene_depth_smp;

layout(location = 0) in vec3 v_wpos;
layout(location = 1) in vec3 v_face_normal;
layout(location = 5) in vec2 v_flow_uv;
layout(location = 0) out vec4 frag_color;
layout(location = 2) in float v_sun_brightness;
layout(location = 3) in float v_sky_light;
layout(location = 4) in float v_torch_light;

float gn_fade(float t)
{
    return ((t * t) * t) * ((t * ((t * 6.0) - 15.0)) + 10.0);
}

uint gn_hash(int x, int y, int z)
{
    uint _81 = ((uint(x + 1073741824) * 374761393u) ^ (uint(y + 1073741824) * 668265263u)) ^ (uint(z + 1073741824) * 1274126177u);
    uint _88 = (_81 ^ (_81 >> 13u)) * 1103515245u;
    return _88 ^ (_88 >> 16u);
}

float gn_grad(uint hash, float x, float y, float z)
{
    uint _99 = hash & 15u;
    float _107 = (_99 < 8u) ? x : y;
    float _112;
    if (_99 < 4u)
    {
        _112 = y;
    }
    else
    {
        _112 = ((_99 == 12u) || (_99 == 14u)) ? x : z;
    }
    float _133;
    if ((_99 & 1u) != 0u)
    {
        _133 = -_107;
    }
    else
    {
        _133 = _107;
    }
    float _145;
    if ((_99 & 2u) != 0u)
    {
        _145 = -_112;
    }
    else
    {
        _145 = _112;
    }
    return _133 + _145;
}

float gnoise3(vec3 p)
{
    int _160 = int(floor(p.x));
    int _165 = int(floor(p.y));
    int _170 = int(floor(p.z));
    float _176 = p.x - float(_160);
    float _182 = p.y - float(_165);
    float _188 = p.z - float(_170);
    float param = _176;
    float _192 = gn_fade(param);
    float param_1 = _182;
    float _196 = gn_fade(param_1);
    float param_2 = _188;
    int param_3 = _160;
    int param_4 = _165;
    int param_5 = _170;
    uint param_6 = gn_hash(param_3, param_4, param_5);
    float param_7 = _176;
    float param_8 = _182;
    float param_9 = _188;
    int _220 = _160 + 1;
    int param_10 = _220;
    int param_11 = _165;
    int param_12 = _170;
    float _229 = _176 - 1.0;
    uint param_13 = gn_hash(param_10, param_11, param_12);
    float param_14 = _229;
    float param_15 = _182;
    float param_16 = _188;
    int _239 = _165 + 1;
    int param_17 = _160;
    int param_18 = _239;
    int param_19 = _170;
    float _247 = _182 - 1.0;
    uint param_20 = gn_hash(param_17, param_18, param_19);
    float param_21 = _176;
    float param_22 = _247;
    float param_23 = _188;
    int param_24 = _220;
    int param_25 = _239;
    int param_26 = _170;
    uint param_27 = gn_hash(param_24, param_25, param_26);
    float param_28 = _229;
    float param_29 = _247;
    float param_30 = _188;
    int _277 = _170 + 1;
    int param_31 = _160;
    int param_32 = _165;
    int param_33 = _277;
    float _285 = _188 - 1.0;
    uint param_34 = gn_hash(param_31, param_32, param_33);
    float param_35 = _176;
    float param_36 = _182;
    float param_37 = _285;
    int param_38 = _220;
    int param_39 = _165;
    int param_40 = _277;
    uint param_41 = gn_hash(param_38, param_39, param_40);
    float param_42 = _229;
    float param_43 = _182;
    float param_44 = _285;
    int param_45 = _160;
    int param_46 = _239;
    int param_47 = _277;
    uint param_48 = gn_hash(param_45, param_46, param_47);
    float param_49 = _176;
    float param_50 = _247;
    float param_51 = _285;
    int param_52 = _220;
    int param_53 = _239;
    int param_54 = _277;
    uint param_55 = gn_hash(param_52, param_53, param_54);
    float param_56 = _229;
    float param_57 = _247;
    float param_58 = _285;
    return mix(mix(mix(gn_grad(param_6, param_7, param_8, param_9), gn_grad(param_13, param_14, param_15, param_16), _192), mix(gn_grad(param_20, param_21, param_22, param_23), gn_grad(param_27, param_28, param_29, param_30), _192), _196), mix(mix(gn_grad(param_34, param_35, param_36, param_37), gn_grad(param_41, param_42, param_43, param_44), _192), mix(gn_grad(param_48, param_49, param_50, param_51), gn_grad(param_55, param_56, param_57, param_58), _192), _196), gn_fade(param_2));
}

float fbm3(vec3 p, float t)
{
    float h = 0.0;
    vec3 _400 = (p * 0.89999997615814208984375) + vec3(t * 0.3499999940395355224609375, t * 0.180000007152557373046875, t * (-0.4199999868869781494140625));
    vec3 q = _400;
    vec3 param = _400;
    h += (gnoise3(param) * 0.5);
    vec3 _408 = q;
    vec3 _422 = (_408 * 2.099999904632568359375) + vec3(t * (-0.2199999988079071044921875), t * 0.3300000131130218505859375, t * 0.17000000178813934326171875);
    q = _422;
    vec3 param_1 = _422;
    h += (gnoise3(param_1) * 0.2800000011920928955078125);
    vec3 _430 = q;
    vec3 _444 = (_430 * 2.2999999523162841796875) + vec3(t * 0.189999997615814208984375, t * (-0.2700000107288360595703125), t * 0.10999999940395355224609375);
    q = _444;
    vec3 param_2 = _444;
    float _450 = h;
    float _451 = _450 + (gnoise3(param_2) * 0.1500000059604644775390625);
    h = _451;
    return _451;
}

// ---- Rain ripples on the water surface. Zavie / Ctrl-Alt-Test
// "H - Immersion" rain-drop kernel, adapted to a surface-gradient (normal
// perturbation) added into the fbm wave gradient so it drives the normal,
// refraction and foam. Gated by rain intensity fs_params[14].y. Tunables here;
// the kernel's inner constants are the effect's identity (stay inline).
#define WATER_RAIN_MAX_RADIUS 1     // ripple cell reach (1 = 3x3 kernel)
#define WATER_RAIN_RIPPLE_SCALE 3.0 // ripple cells per metre on the surface
#define WATER_RAIN_RIPPLE_STRENGTH 6.0 // push into the wave gradient

float rr_hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 rr_hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xx + p3.yz) * p3.zy);
}
vec2 rain_ripple_grad(vec2 uv, float t) {
    vec2 p0 = floor(uv);
    vec2 circles = vec2(0.0);
    for (int j = -WATER_RAIN_MAX_RADIUS; j <= WATER_RAIN_MAX_RADIUS; ++j) {
        for (int i = -WATER_RAIN_MAX_RADIUS; i <= WATER_RAIN_MAX_RADIUS; ++i) {
            vec2 pi = p0 + vec2(float(i), float(j));
            vec2 p = pi + rr_hash22(pi);
            float tt = fract(0.3 * t + rr_hash12(pi));
            vec2 v = p - uv;
            float len = length(v) + 1e-6;
            float d = len - (float(WATER_RAIN_MAX_RADIUS) + 1.0) * tt;
            float h = 1e-3;
            float d1 = d - h;
            float d2 = d + h;
            float q1 = sin(31.0 * d1) * smoothstep(-0.6, -0.3, d1) * smoothstep(0.0, -0.3, d1);
            float q2 = sin(31.0 * d2) * smoothstep(-0.6, -0.3, d2) * smoothstep(0.0, -0.3, d2);
            circles += 0.5 * (v / len) * ((q2 - q1) / (2.0 * h) * (1.0 - tt) * (1.0 - tt));
        }
    }
    circles /= float((WATER_RAIN_MAX_RADIUS * 2 + 1) * (WATER_RAIN_MAX_RADIUS * 2 + 1));
    return circles;
}

void main()
{
    vec3 _459 = normalize(v_wpos);
    vec3 _465;
    if (length(v_face_normal) > 0.0)
    {
        _465 = normalize(v_face_normal);
    }
    else
    {
        _465 = _459;
    }
    float _477 = abs(dot(_465, _459));
    vec3 tangent_u = vec3(1.0, 0.0, 0.0);
    if (abs(_465.x) > 0.89999997615814208984375)
    {
        tangent_u = vec3(0.0, 1.0, 0.0);
    }
    vec3 _506 = tangent_u;
    vec3 _513 = normalize(_506 - (_465 * dot(_506, _465)));
    tangent_u = _513;
    vec3 _554 = ((v_wpos + (_459 * ((fs_params[1].w * fs_params[14].x) * (1.0 - _477)))) + ((((-((_513 * v_flow_uv.x) + (cross(_465, _513) * v_flow_uv.y))) * fs_params[1].w) * 0.3499999940395355224609375) * _477)) * fs_params[11].w;
    float _561 = fs_params[1].w * fs_params[12].x;
    vec3 param = _554;
    float param_1 = _561;
    float _569 = fbm3(param, param_1);
    vec3 param_2 = _554 + vec3(0.07999999821186065673828125, 0.0, 0.0);
    float param_3 = _561;
    vec3 param_4 = _554 + vec3(0.0, 0.07999999821186065673828125, 0.0);
    float param_5 = _561;
    vec3 param_6 = _554 + vec3(0.0, 0.0, 0.07999999821186065673828125);
    float param_7 = _561;
    vec3 _604 = vec3(fbm3(param_2, param_3) - _569, fbm3(param_4, param_5) - _569, fbm3(param_6, param_7) - _569) * vec3(12.5);
    vec3 _612 = _604 - (_459 * dot(_604, _459));
    // Rain ripples: add the Zavie raindrop gradient into the wave gradient so
    // the drops perturb the normal, refraction and foam. fs_params[14].y = rain
    // intensity (0 = dry, no-op); fs_params[1].w = time.
    if (fs_params[14].y > 0.001) {
        vec3 wr_tv = cross(_465, _513);
        vec2 wr_uv = vec2(dot(v_wpos, _513), dot(v_wpos, wr_tv)) * WATER_RAIN_RIPPLE_SCALE;
        vec2 wr_g = rain_ripple_grad(wr_uv, fs_params[1].w) * (fs_params[14].y * WATER_RAIN_RIPPLE_STRENGTH);
        _612 += _513 * wr_g.x + wr_tv * wr_g.y;
    }
    // Slope clamp (fs_params[8].w = u_slope_max) BEFORE the gradient bends the
    // normal: the rain-ripple kernel spikes the gradient to ~8x the fbm waves,
    // flipping the normal into the tangent plane - Schlick then hits 1.0 and
    // the whole sheet becomes a flat sky mirror. Foam still reads the raw
    // gradient below, so storm foam keeps its bite.
    vec3 n_grad = _612;
    float n_grad_l = length(n_grad);
    if (n_grad_l > fs_params[8].w)
    {
        n_grad *= fs_params[8].w / n_grad_l;
    }
    vec3 _621 = normalize(_459 - (n_grad * fs_params[12].y));
    vec2 _645 = gl_FragCoord.xy / vec2(textureSize(water_scene_color_water_scene_smp, 0));
    vec4 _653 = texture(water_scene_depth_water_scene_depth_smp, _645);
    float _654 = _653.x;
    if (gl_FragCoord.z > _654)
    {
        discard;
    }
    // Refraction offset clamp (fs_params[2].w = u_refract_max_uv): gradient
    // spikes threw the sample up to a third of the screen away - onto the SKY -
    // painting the water sky-colour (glaring on Sequoia's orange sky over green
    // sea; invisible on Tenebris blue-on-blue, which is why it shipped).
    vec2 refr_off = _612.xy * fs_params[2].x;
    float refr_l = length(refr_off);
    if (refr_l > fs_params[2].w)
    {
        refr_off *= fs_params[2].w / refr_l;
    }
    vec2 refr_uv = clamp(_645 + refr_off, vec2(0.0), vec2(1.0));
    // Refraction validity: reject samples on the wrong side of the sky
    // boundary (sky sampled for a seafloor pixel or vice versa) and samples of
    // geometry IN FRONT of the surface (foreground smear). Same far-plane test
    // the composite uses for its sky mask.
    float refr_z = texture(water_scene_depth_water_scene_depth_smp, refr_uv).x;
    bool own_sky = _654 >= 0.99998999;
    bool smp_sky = refr_z >= 0.99998999;
    if ((smp_sky != own_sky) || (refr_z < gl_FragCoord.z))
    {
        refr_uv = _645;
    }
    vec4 _679 = texture(water_scene_color_water_scene_smp, refr_uv);
    vec3 _680 = _679.xyz;
    if (!gl_FrontFacing)
    {
        vec3 _692 = v_wpos - fs_params[0].xyz;
        frag_color = vec4(mix(fs_params[4].xyz, mix(fs_params[4].xyz, _680, exp(fs_params[3].xyz * (-length(_692)))), vec3(smoothstep(0.550000011920928955078125, 0.75, dot(normalize(_692), _621)))), 1.0);
        return;
    }
    float _748 = (2.0 * fs_params[2].y) * fs_params[2].z;
    float _753 = fs_params[2].z + fs_params[2].y;
    float _762 = fs_params[2].z - fs_params[2].y;
    vec3 _806 = normalize(fs_params[0].xyz - v_wpos);
    float _840 = clamp(dot(reflect(-_806, _621), _459), 0.0, 1.0);
    float _858 = (0.0199999995529651641845703125 + (0.980000019073486328125 * pow(1.0 - max(dot(_806, _621), 0.0), 5.0))) * mix(fs_params[10].w, 1.0, _840);
    float _926 = max(smoothstep(fs_params[7].x, fs_params[7].y, _569) * fs_params[7].z, smoothstep(fs_params[8].x, fs_params[8].y, length(_612)) * fs_params[8].z) * fs_params[7].w;
    vec3 _966 = ((mix(mix(mix(fs_params[4].xyz, _680, exp(fs_params[3].xyz * (-max(0.0, (_748 / (_753 - (((2.0 * _654) - 1.0) * _762))) - (_748 / (_753 - (((2.0 * gl_FragCoord.z) - 1.0) * _762))))))), mix(fs_params[10].xyz, fs_params[11].xyz, vec3(_840)), vec3(_858)), fs_params[9].xyz, vec3(_926)) + ((fs_params[6].xyz * pow(max(dot(_621, normalize(_806 + normalize(fs_params[1].xyz))), 0.0), fs_params[5].x)) * fs_params[4].w)) * mix(fs_params[12].z, 1.0, v_sun_brightness * v_sky_light)) + (((fs_params[13].xyz * fs_params[13].w) * v_torch_light) * (_858 + _926));
    float fog_d = length(v_wpos - fs_params[0].xyz);
    float fog_f = (1.0 - exp(-fog_d * fs_params[15].w)) * step(9.9999997e-05, fs_params[15].w);
    // Fog ceiling (fs_params[12].w = u_fog_max): the sheet may haze toward the
    // sky but never fully BECOME it - at 1.0 the far water flattened into the
    // limb atmosphere with no boundary and read as "the sea despawned".
    fog_f = min(fog_f, fs_params[12].w);
    frag_color = vec4(mix(_966, fs_params[15].xyz, vec3(fog_f)), 1.0);
}

