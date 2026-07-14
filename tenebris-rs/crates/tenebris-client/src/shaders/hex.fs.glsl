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

// ---- Rain wetness detail: raindrop ripples on up-faces + water trickling
// down side-faces (and tree trunks, same shader). The ripple kernel is the
// Zavie / Ctrl-Alt-Test "H - Immersion" rain-drop effect, adapted to return a
// surface gradient (normal perturbation). Tunables grouped here; promote to
// YAML uniforms once the look is dialled in. The kernel's inner constants
// (31.0, the smoothstep bands, 0.3 spawn rate, hash scales) are the effect's
// identity and stay inline like a hash function's magic numbers.
#define RAIN_MAX_RADIUS 1        // ripple cell reach (1 = 3x3 kernel, cheaper)
#define RAIN_GRAD_H 0.012        // finite-diff step for the ripple gradient -
                                 // must exceed planet-scale f32 quantization or
                                 // the derivative degrades to noise/zero
#define RAIN_RIPPLE_SCALE 2.6    // ripple cells per metre on up-faces
#define RAIN_RIPPLE_STRENGTH 2.0 // normal push from raindrop impact rings
#define RAIN_FLOW_ACROSS 3.0     // trickle columns per metre across a side
#define RAIN_FLOW_DOWN 0.7       // trickle stretch along the fall direction
#define RAIN_FLOW_SPEED 1.3      // downward trickle scroll speed
#define RAIN_FLOW_STRENGTH 3.0   // normal push from trickles (sides need more)
#define RAIN_WAVE_SCALE 3.5      // continuous wet-sheet ripple frequency
#define RAIN_WAVE_STRENGTH 0.6   // continuous ripple normal push (always wet)
#define RAIN_WAVE_SPEED 1.4      // wet-sheet ripple animation speed
#define RAIN_WET_DARKEN 0.72     // wet surfaces darken toward this factor
#define RAIN_SKY_SHEEN 0.8       // wet sheen from SKY light - stays visible
                                 // under the rain's own OVERCAST (no sun needed)
#define RAIN_GLINT_POWER 24.0    // direct-sun glint tightness off the wet normal
#define RAIN_GLINT_STRENGTH 0.5  // direct-sun sparkle (only when the sun is out)

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
// Zavie rain-drop ripples -> 2D surface gradient (normal perturbation).
vec2 rain_ripple_grad(vec2 uv, float t) {
    vec2 p0 = floor(uv);
    vec2 circles = vec2(0.0);
    for (int j = -RAIN_MAX_RADIUS; j <= RAIN_MAX_RADIUS; ++j) {
        for (int i = -RAIN_MAX_RADIUS; i <= RAIN_MAX_RADIUS; ++i) {
            vec2 pi = p0 + vec2(float(i), float(j));
            vec2 p = pi + rr_hash22(pi);
            float tt = fract(0.3 * t + rr_hash12(pi));
            vec2 v = p - uv;
            float len = length(v) + 1e-6;
            float d = len - (float(RAIN_MAX_RADIUS) + 1.0) * tt;
            float h = RAIN_GRAD_H;
            float d1 = d - h;
            float d2 = d + h;
            float q1 = sin(31.0 * d1) * smoothstep(-0.6, -0.3, d1) * smoothstep(0.0, -0.3, d1);
            float q2 = sin(31.0 * d2) * smoothstep(-0.6, -0.3, d2) * smoothstep(0.0, -0.3, d2);
            circles += 0.5 * (v / len) * ((q2 - q1) / (2.0 * h) * (1.0 - tt) * (1.0 - tt));
        }
    }
    circles /= float((RAIN_MAX_RADIUS * 2 + 1) * (RAIN_MAX_RADIUS * 2 + 1));
    return circles;
}

// 4x4 Bayer screen-door threshold for the alpha cutout / translucency below.
float hex_bayer4(vec2 frag)
{
    int bx = int(frag.x) & 3;
    int by = int(frag.y) & 3;
    int i = by * 4 + bx;
    float m[16] = float[16](
        0.0,  8.0,  2.0,  10.0,
        12.0, 4.0,  14.0, 6.0,
        3.0,  11.0, 1.0,  9.0,
        15.0, 7.0,  13.0, 5.0);
    return (m[i] + 0.5) / 16.0;
}

void main()
{
    vec4 tex = texture(hex_atlas_hex_atlas_smp, vec2(v_uv.x * (93.0 / 100.0), v_uv.y));
    // Screen-door alpha from the block texture: gives a hard CUTOUT where the
    // atlas alpha is ~0 (the launch-tower truss shows sky through its lattice)
    // and dithered PARTIAL TRANSPARENCY where it is fractional (frosted ice),
    // all inside the opaque pass with correct depth - no separate blended
    // pass. Fully opaque terrain (alpha 1) is never discarded.
    if (tex.w < hex_bayer4(gl_FragCoord.xy)) { discard; }
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
    // Sky-gated so caves stay dry. Up-faces get a rippled wet SHEET (continuous
    // waves) plus raindrop IMPACT RINGS; side faces (and tree trunks - same
    // shader) get water TRICKLING down. The sheen is driven by SKY light so it
    // stays visible under the rain's own overcast (a direct-sun glint only adds
    // sparkle when the sun is out), on top of a wet darkening.
    float wet_amt = clamp(hex_fs_light[2].y, 0.0, 1.0) * v_sky_light;
    if (wet_amt > 0.001) {
        vec3 wet_up = normalize(v_local);
        vec3 nrm = normalize(v_normal);
        float face = dot(nrm, wet_up);              // 1 = up-face, 0 = side-face
        float top_w = smoothstep(0.35, 0.85, face);
        float side_w = 1.0 - smoothstep(0.1, 0.5, face);
        float wet_t = hex_fs_light[2].z;

        // Up-face tangent frame for the ripple UV.
        vec3 t_a = cross(wet_up, vec3(0.0, 1.0, 0.0));
        if (dot(t_a, t_a) < 1e-4) { t_a = cross(wet_up, vec3(1.0, 0.0, 0.0)); }
        t_a = normalize(t_a);
        vec3 t_b = cross(wet_up, t_a);

        vec3 pert = vec3(0.0);
        if (top_w > 0.001) {
            vec2 wc = vec2(dot(v_local, t_a), dot(v_local, t_b));
            // Continuous rippled wet sheet (a few low-freq waves, precision-safe)
            // so the WHOLE wet face reads as a normal map, not just sparse rings.
            vec2 wg = vec2(
                cos(wc.x * RAIN_WAVE_SCALE + wet_t * RAIN_WAVE_SPEED)
                    + 0.7 * cos((wc.x + wc.y) * RAIN_WAVE_SCALE * 0.6 - wet_t * RAIN_WAVE_SPEED * 0.8),
                cos(wc.y * RAIN_WAVE_SCALE - wet_t * RAIN_WAVE_SPEED * 0.9)
                    + 0.7 * cos((wc.x - wc.y) * RAIN_WAVE_SCALE * 0.6 + wet_t * RAIN_WAVE_SPEED * 0.7));
            pert += (t_a * wg.x + t_b * wg.y) * (RAIN_WAVE_STRENGTH * top_w);
            // Raindrop impact rings on top of the sheet.
            vec2 rg = rain_ripple_grad(wc * RAIN_RIPPLE_SCALE, wet_t) * (RAIN_RIPPLE_STRENGTH * top_w);
            pert += t_a * rg.x + t_b * rg.y;
        }
        // Water trickling straight down the side faces: the ripple kernel with a
        // tall, thin, downward-scrolled UV reads as flowing streaks.
        if (side_w > 0.001) {
            vec3 down_face = -wet_up - nrm * dot(-wet_up, nrm);
            float dl = length(down_face);
            down_face = (dl > 1e-4) ? (down_face / dl) : t_a;
            vec3 across = cross(nrm, down_face);
            float sc = dot(v_local, across) * RAIN_FLOW_ACROSS;
            float dc = dot(v_local, down_face) * RAIN_FLOW_DOWN - wet_t * RAIN_FLOW_SPEED;
            vec2 g = rain_ripple_grad(vec2(sc, dc), wet_t * 0.5) * (RAIN_FLOW_STRENGTH * side_w);
            pert += across * g.x + down_face * g.y;
        }

        float wet = wet_amt * max(top_w, side_w);
        vec3 wet_n = normalize(nrm + pert);
        lit *= mix(1.0, RAIN_WET_DARKEN, wet);      // wet surfaces darken
        // Sky sheen: wet surfaces reflect the bright (overcast) sky, brighter
        // where the ripple tilts toward the sky and darker in the troughs. Uses
        // ambient/sky light (hex_fs_light[1]) + v_sky_light, so the ripples are
        // visible WHILE it rains, not only in direct sun.
        float sky_tilt = clamp(dot(wet_n, wet_up), 0.0, 1.0) - clamp(dot(nrm, wet_up), 0.0, 1.0);
        lit += hex_fs_light[1].xyz * (sky_tilt * RAIN_SKY_SHEEN * wet * v_sky_light);
        // Direct-sun glint - extra sparkle only when the sun is actually out.
        vec3 sun_d = normalize(hex_fs_light[0].xyz);
        float glint = pow(max(dot(wet_n, sun_d), 0.0), RAIN_GLINT_POWER);
        lit += vec3(RAIN_GLINT_STRENGTH) * (glint * wet * v_sun_brightness);
    }
    frag_color = vec4(lit, v_wet);
}


