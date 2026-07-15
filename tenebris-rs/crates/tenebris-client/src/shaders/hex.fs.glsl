#version 410

uniform vec4 hex_fs_crack[10];
uniform vec4 hex_fs_light[3];
uniform vec4 hex_fs_torch[1];
uniform vec4 hex_fs_water[2];
uniform vec4 hex_fs_rain[4];
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
// surface gradient (normal perturbation). The DESIGNER knobs live in
// weather.yaml (rain_ripple_* / rain_flow_* / rain_wave_* / rain_wet_darken /
// rain_sky_sheen / rain_glint_*), fed via the hex_fs_rain uniform block; see
// the alias block in main(). Only the loop bound + the finite-diff step stay
// compiled in - the first must be a constant, the second is an algorithm
// constant (like the kernel's 31.0 / smoothstep bands / hash scales, which are
// the effect's identity and also stay inline).
#define RAIN_MAX_RADIUS 1        // ripple cell reach (1 = 3x3 kernel, cheaper)
#define RAIN_GRAD_H 0.012        // finite-diff step for the ripple gradient -
                                 // must exceed planet-scale f32 quantization or
                                 // the derivative degrades to noise/zero

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

// ---- Water streaking DOWN block sides as continuous RIVULETS (not the
// discrete Heartfelt blobs the camera lens uses). A few vertical channels
// per face - each a smooth band at a hashed horizontal offset - carry
// brightness ripples that scroll downward over time, so side water reads as
// unbroken streams trickling down instead of separated dots. Returns .x = wet
// mask; its screen-space gradient becomes the side-normal distortion at the
// call site. Same name/signature as the old drop layer so callers are unchanged.
float rd_N(float t) { return fract(sin(t * 12345.564) * 7658.76); }
vec2 rd_DropLayer2(vec2 uv, float t) {
    // uv.x = across the face (scaled by k_flow_across -> ~lane count),
    // uv.y = down the face (scaled by k_flow_down), t already * flow speed.
    float lane = floor(uv.x);           // which vertical channel
    float fx = fract(uv.x);             // position across the channel (0..1)
    float h1 = rd_N(lane);              // per-lane randoms
    float h2 = rd_N(lane + 41.0);
    float h3 = rd_N(lane + 91.0);
    float lane_on = step(0.32, h3);     // leave ~a third of lanes dry -> spaced streams
    // Rivulet meanders gently down the face so streams aren't ruler-straight;
    // kept well inside the lane so it never touches the seam.
    float center = 0.5 + (h1 - 0.5) * 0.3 + 0.06 * sin(uv.y * 1.7 + h2 * 6.2831);
    float halfw = 0.07 + 0.09 * h2;     // channel half-width
    float across = smoothstep(halfw, 0.0, abs(fx - center)); // 1 centre -> 0 edge
    across *= smoothstep(0.0, 0.06, fx) * smoothstep(1.0, 0.94, fx); // kill lane seams
    // Flow: brightness ripples scrolling DOWN (uv.y + t), continuous with no
    // per-drop reset, two octaves so the stream shimmers as it runs. Biased up
    // so the whole rivulet stays wet - the ripples modulate a stream, not gaps.
    float y = uv.y + t;
    float flow = 0.62
               + 0.26 * sin(y * 6.2831 + h1 * 6.2831)
               + 0.12 * sin(y * 17.0 - h2 * 9.0);
    float m = lane_on * across * clamp(flow, 0.0, 1.0);
    return vec2(m, m);
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
    vec4 tex = texture(hex_atlas_hex_atlas_smp, vec2(v_uv.x * (93.0 / 108.0), v_uv.y));
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
        // Designer knobs from weather.yaml (hex_fs_rain uniform block).
        float k_ripple_scale   = hex_fs_rain[0].x;
        float k_ripple_strength= hex_fs_rain[0].y;
        float k_flow_across    = hex_fs_rain[0].z;
        float k_flow_down      = hex_fs_rain[0].w;
        float k_flow_speed     = hex_fs_rain[1].x;
        float k_flow_strength  = hex_fs_rain[1].y;
        float k_wave_scale     = hex_fs_rain[1].z;
        float k_wave_strength  = hex_fs_rain[1].w;
        float k_wave_speed     = hex_fs_rain[2].x;
        float k_wet_darken     = hex_fs_rain[2].y;
        float k_sky_sheen      = hex_fs_rain[2].z;
        float k_glint_power    = hex_fs_rain[2].w;
        float k_glint_strength = hex_fs_rain[3].x;

        vec3 wet_up = normalize(v_local);
        vec3 nrm = normalize(v_normal);
        float face = dot(nrm, wet_up);              // 1 = up-face, 0 = side-face
        float top_w = smoothstep(0.35, 0.85, face);
        float side_w = 1.0 - smoothstep(0.1, 0.5, face);
        float wet_t = hex_fs_light[2].z;

        // Surface UV via TRIPLANAR projection onto fixed WORLD axes. The old
        // code used dot(v_local, tangent), but v_local is radial and the tangent
        // is perpendicular to it, so those dots are ~0 + float roundoff -> the
        // UV was random per-pixel noise (unmapped normals). Using the actual
        // world-position components gives a structured, smoothly-varying UV.
        // ax_a/ax_b are those world axes projected into the surface plane so the
        // gradient can be turned back into a tangential normal push.
        vec3 an = abs(nrm);
        vec2 uv;
        vec3 ax_a;
        vec3 ax_b;
        if (an.y >= an.x && an.y >= an.z) { uv = v_local.xz; ax_a = vec3(1.0, 0.0, 0.0); ax_b = vec3(0.0, 0.0, 1.0); }
        else if (an.x >= an.z)            { uv = v_local.zy; ax_a = vec3(0.0, 0.0, 1.0); ax_b = vec3(0.0, 1.0, 0.0); }
        else                              { uv = v_local.xy; ax_a = vec3(1.0, 0.0, 0.0); ax_b = vec3(0.0, 1.0, 0.0); }
        ax_a = normalize(ax_a - nrm * dot(ax_a, nrm));
        ax_b = normalize(ax_b - nrm * dot(ax_b, nrm));

        vec2 pg = vec2(0.0);   // pattern gradient in the (ax_a, ax_b) basis
        if (top_w > 0.001) {
            // Continuous rippled wet sheet (a few low-freq waves) so the WHOLE
            // wet face reads as a normal map, not just sparse rings.
            pg += vec2(
                cos(uv.x * k_wave_scale + wet_t * k_wave_speed)
                    + 0.7 * cos((uv.x + uv.y) * k_wave_scale * 0.6 - wet_t * k_wave_speed * 0.8),
                cos(uv.y * k_wave_scale - wet_t * k_wave_speed * 0.9)
                    + 0.7 * cos((uv.x - uv.y) * k_wave_scale * 0.6 + wet_t * k_wave_speed * 0.7)
            ) * (k_wave_strength * top_w);
            // Raindrop impact rings on top of the sheet.
            pg += rain_ripple_grad(uv * k_ripple_scale, wet_t) * (k_ripple_strength * top_w);
        }
        vec3 pert = ax_a * pg.x + ax_b * pg.y;
        // Water STREAKING down the side faces: the Heartfelt drop layer (same as
        // the camera lens droplets) - blobs with downward trails - mapped in the
        // block's own TEXTURE UV (v_uv), so the drops line up with the face and
        // the coordinate is bounded + precise (no world-scale float noise). The
        // perturbation frame is built GEOMETRICALLY (down = radially inward in the
        // face, across = perpendicular) rather than from dFdx(v_local): v_local is
        // planet-scale, so its screen derivative cancels to noise and skewed the
        // normals. For an upright side texture v_uv.x = across, v_uv.y = vertical.
        if (side_w > 0.001) {
            vec3 down_dir = -wet_up - nrm * dot(-wet_up, nrm);
            float ddl = length(down_dir);
            down_dir = (ddl > 1e-4) ? (down_dir / ddl) : ax_a;
            vec3 across_dir = normalize(cross(nrm, down_dir));
            // Independent U/V scale on the texture UV so the drop aspect is
            // tunable: k_flow_across = U scale (horizontal), k_flow_down = V
            // scale (vertical - RAISE it to shorten the vertical streak). +v_uv.y
            // is the Heartfelt fall axis.
            vec2 duv = vec2(v_uv.x * k_flow_across, v_uv.y * k_flow_down);
            float dt = wet_t * k_flow_speed;
            float dm = rd_DropLayer2(duv, dt).x;
            vec2 de = vec2(0.01, 0.0);
            float dmx = rd_DropLayer2(duv + de, dt).x;
            float dmy = rd_DropLayer2(duv + de.yx, dt).x;
            vec2 dn = vec2(dmx - dm, dmy - dm);
            pert += (across_dir * dn.x + down_dir * dn.y) * (k_flow_strength * side_w);
        }
        float wet = wet_amt * max(top_w, side_w);
        vec3 wet_n = normalize(nrm + pert);
        lit *= mix(1.0, k_wet_darken, wet);         // wet surfaces darken
        // Sky sheen: wet surfaces reflect the bright (overcast) sky, brighter
        // where the ripple tilts toward the sky and darker in the troughs. Uses
        // ambient/sky light (hex_fs_light[1]) + v_sky_light, so the ripples are
        // visible WHILE it rains, not only in direct sun.
        float sky_tilt = clamp(dot(wet_n, wet_up), 0.0, 1.0) - clamp(dot(nrm, wet_up), 0.0, 1.0);
        lit += hex_fs_light[1].xyz * (sky_tilt * k_sky_sheen * wet * v_sky_light);
        // Direct-sun glint - extra sparkle only when the sun is actually out.
        vec3 sun_d = normalize(hex_fs_light[0].xyz);
        float glint = pow(max(dot(wet_n, sun_d), 0.0), k_glint_power);
        lit += vec3(k_glint_strength) * (glint * wet * v_sun_brightness);
    }
    frag_color = vec4(lit, v_wet);
}


