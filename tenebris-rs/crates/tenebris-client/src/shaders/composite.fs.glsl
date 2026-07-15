#version 410

// composite_fs_params[6] = camera rain-on-glass lens droplet knobs
// (weather.yaml): .x = count / coverage (per-cell cull below 1, extra stacked
// layers above 1), .y = refraction strength, .z = anim speed, .w = drop size
// (grid frequency - higher = smaller drops). Count (.x) and size (.w) are
// independent: raising .x adds drops at the SAME size, .w changes the size.
uniform vec4 composite_fs_params[8];
uniform sampler2D scene_depth_scene_depth_smp;
uniform sampler2D scene_color_scene_smp;

layout(location = 0) in vec2 v_uv;
layout(location = 2) in vec3 v_camera_pos;
layout(location = 1) in vec3 v_view_dir;
layout(location = 0) out vec4 frag_color;

float linearize_z(float depth_ndc, float near, float far)
{
    return ((2.0 * near) * far) / ((far + near) - (((2.0 * depth_ndc) - 1.0) * (far - near)));
}


// ===== Rain-on-glass: faithful port of "Heartfelt" by Martijn Steinrucken
// (BigWings), 2017, CC BY-NC-SA 3.0. Screen-space droplets refract + fog the
// lens; drops cut sharp trails through the misted glass. iChannel0 -> the
// composite scene_color; textureLod(scene, uv, focus) -> rd_blur() multi-tap
// (the offscreen target has no mip chain). =====
vec3 rd_N13(float p){{
    vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
}}
float rd_N(float t){{ return fract(sin(t * 12345.564) * 7658.76); }}
float rd_Saw(float b, float t){{ return smoothstep(0.0, b, t) * smoothstep(1.0, b, t); }}
vec2 rd_DropLayer2(vec2 uv, float t){{
    vec2 UV = uv;
    uv.y += t * 0.75;
    vec2 a = vec2(6.0, 1.0);
    vec2 grid = a * 2.0 * max(composite_fs_params[6].w, 0.05); // .w = drop size (grid freq)

    vec2 id = floor(uv * grid);
    float colShift = rd_N(id.x);
    uv.y += colShift;
    id = floor(uv * grid);
    vec3 n = rd_N13(id.x * 35.2 + id.y * 2376.1);
    // Coverage cull: .x (count) below 1 leaves a fraction of cells empty so the
    // SAME-size drops just get sparser. At 1.0 every cell keeps its drop.
    float rd_keep = step(1.0 - clamp(composite_fs_params[6].x, 0.0, 1.0),
                         fract(n.x * 3.17 + n.y * 6.91 + n.z));
    vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
    float x = n.x - 0.5;
    float y = UV.y * 20.0;
    float wiggle = sin(y + sin(y));
    x += wiggle * (0.5 - abs(x)) * (n.z - 0.5);
    x *= 0.7;
    float ti = fract(t + n.z);
    // MONOTONIC downward fall: the drop slides from the top of its cell (screen
    // v_uv is y-up, so high y = high on screen) straight down to the bottom as
    // ti goes 0 -> 1. There is no mid-cycle position reversal, so the drop never
    // moves upward. The old rd_Saw bump rose-then-snapped, and the snap read as
    // an upward flick; here the wrap back to the top (ti 1 -> 0) is instead
    // hidden by fading the drop's opacity to 0 at both ends of the cycle
    // (rd_fade), so the reset is never visible - only clean falling.
    y = 0.92 - ti * 0.88;
    float rd_fade = smoothstep(0.0, 0.12, ti) * smoothstep(1.0, 0.86, ti);
    vec2 p = vec2(x, y);
    float d = length((st - p) * a.yx);
    float mainDrop = smoothstep(0.4, 0.0, d);
    float r = sqrt(smoothstep(1.0, y, st.y));
    float cd = abs(st.x - x);
    float trail = smoothstep(0.23 * r, 0.15 * r * r, cd);
    float trailFront = smoothstep(-0.02, 0.02, st.y - y);
    trail *= trailFront * r * r;
    y = UV.y;
    float trail2 = smoothstep(0.2 * r, 0.0, cd);
    float droplets = max(0.0, (sin(y * (1.0 - y) * 120.0) - st.y)) * trail2 * trailFront * n.z;
    y = fract(y * 10.0) + (st.y - 0.5);
    float dd = length(st - vec2(x, y));
    droplets = smoothstep(0.3, 0.0, dd);
    float m = mainDrop + droplets * r * trailFront;
    // rd_fade hides the ti-wrap (drop + trail vanish before snapping back to
    // the top); rd_keep is the coverage cull. Both scale the drop AND its trail.
    return vec2(m, trail) * (rd_keep * rd_fade);
}}
float rd_StaticDrops(vec2 uv, float t){{
    uv *= 40.0 * max(composite_fs_params[6].w, 0.05); // .w = drop size (grid freq)

    vec2 id = floor(uv);
    uv = fract(uv) - 0.5;
    vec3 n = rd_N13(id.x * 107.45 + id.y * 3543.654);
    float rd_keep = step(1.0 - clamp(composite_fs_params[6].x, 0.0, 1.0),
                         fract(n.x * 3.17 + n.y * 6.91 + n.z)); // .x = count / coverage
    vec2 p = (n.xy - 0.5) * 0.7;
    float d = length(uv - p);
    float fade = rd_Saw(0.025, fract(t + n.z));
    return smoothstep(0.3, 0.0, d) * fract(n.z * 10.0) * fade * rd_keep;
}}
vec2 rd_Drops(vec2 uv, float t, float l0, float l1, float l2){{
    float s = rd_StaticDrops(uv, t) * l0;
    vec2 m1 = rd_DropLayer2(uv, t) * l1;
    vec2 m2 = rd_DropLayer2(uv * 1.85, t) * l2;
    float c = s + m1.x + m2.x;
    // Count (.x) above 1 stacks extra same-size drop layers (offset copies) so
    // more drops appear WITHOUT shrinking; below 1 the per-cell cull inside the
    // layers thins them. extra ramps in one full extra layer per +1.0 of count.
    float extra = clamp(composite_fs_params[6].x - 1.0, 0.0, 2.0);
    if (extra > 0.001) {{
        vec2 m3 = rd_DropLayer2(uv + vec2(0.50, 0.37), t);
        vec2 m4 = rd_DropLayer2(uv * 1.85 + vec2(0.27, 0.61), t);
        c += (m3.x * l1 + m4.x * l2) * min(extra, 1.0);
    }}
    c = smoothstep(0.3, 1.0, c);
    return vec2(c, max(m1.y * l0, m2.y * l1));
}}
// 17-tap two-ring blur (radius grows with focus); used by the depth blur.
vec3 rd_blur(sampler2D tex, vec2 uv, float focus){{
    float r = focus * 0.0016;
    vec3 s = texture(tex, uv).rgb; float w = 1.0;
    vec2 d;
    d = vec2(r, 0.0);         s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(0.0, r);         s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(r, r) * 0.707;   s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(r, -r) * 0.707;  s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    float r2 = r * 2.2;
    d = vec2(r2, 0.0);        s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(0.0, r2);        s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    d = vec2(r2, r2) * 0.707; s += texture(tex, clamp(uv + d, vec2(0.0), vec2(1.0))).rgb; s += texture(tex, clamp(uv - d, vec2(0.0), vec2(1.0))).rgb; w += 2.0;
    return s / w;
}}

void main()
{
    float _68 = max(composite_fs_params[2].z, 9.9999997473787516355514526367188e-05);
    vec4 _100 = texture(scene_depth_scene_depth_smp, v_uv);
    float _101 = _100.x;
    bool _107 = _101 >= 0.999989986419677734375;
    // Underwater-fog activation. fx_params.z is the tri-state submersion flag
    // (0 dry, 0.5 eye straddling the surface, 1 fully under). FULL submersion
    // only (> 0.75) - straddling (0.5) must NOT take this path.
    //
    // Why: for a sky/far pixel this path has no geometry to measure against, so
    // it estimates water travel analytically from the MEAN SEA SPHERE (_259 =
    // gap / d_up). That sphere is perfectly smooth - it knows nothing about the
    // waves - so the moment the eye dips below it, every near-horizontal ray
    // gets the same fake water depth and the result is a dead-flat blue band
    // ruled across the horizon, cutting straight through the wave silhouette.
    // Fully under, that is fine (the whole view IS water and there is no visible
    // waterline to contradict). Straddling, it is exactly the jarring artifact.
    //
    // Straddling instead falls through to the dry path below, whose mask comes
    // from the RENDERED water surface (scene_color.w) gated by the per-pixel
    // waterline (_171) - real wave-displaced geometry, so the fog stops at the
    // wave silhouette and conforms to it, which is the whole point.
    bool _112 = composite_fs_params[4].z > 0.75;
    float view_dist = 0.0;
    float pixel_alt = _68;
    if (!_107)
    {
        float param = _101;
        float param_1 = composite_fs_params[2].x;
        float param_2 = composite_fs_params[2].y;
        vec3 _138 = v_camera_pos + (v_view_dir * linearize_z(param, param_1, param_2));
        view_dist = length(_138 - v_camera_pos);
        pixel_alt = length(_138 - composite_fs_params[3].xyz) - composite_fs_params[3].w;
    }
    vec4 _157 = texture(scene_color_scene_smp, v_uv);
    float _160;
    if (_107)
    {
        _160 = float(_112);
    }
    else
    {
        _160 = _112 ? 1.0 : _157.w;
    }
    float wet = _160;
    float _171;
    if (_107)
    {
        _171 = 1.0;
    }
    else
    {
        _171 = 1.0 - smoothstep(-_68, _68, pixel_alt);
    }
    float _183 = wet;
    float _184 = _183 * _171;
    wet = _184;
    vec3 color = _157.xyz;
    // Two-mode composite (composite_fs_params[7].x): x < 0.5 is the COMPOSE
    // pass (scene fog / blur, NO droplets) into the intermediate target; x >
    // 0.5 is the LENS pass (sample the post-water intermediate, apply ONLY the
    // rain-on-glass droplets) into the swapchain, so drops refract the real
    // water. In the lens pass the base is the plain intermediate sample - fog
    // and water are already baked into it.
    bool lens_pass = composite_fs_params[7].x > 0.5;
    if (lens_pass) { color = texture(scene_color_scene_smp, v_uv).xyz; }
    if ((!lens_pass) && (_184 > 0.0) && (composite_fs_params[4].x > 0.0))
    {
        color = texture(scene_color_scene_smp, clamp(v_uv + ((vec2(sin((composite_fs_params[4].y * 1.2999999523162841796875) + (v_uv.y * 32.0)) + (0.5 * sin((composite_fs_params[4].y * 0.699999988079071044921875) + (v_uv.x * 47.0))), cos((composite_fs_params[4].y * 0.89999997615814208984375) + (v_uv.x * 28.0)) + (0.5 * cos((composite_fs_params[4].y * 1.60000002384185791015625) + (v_uv.y * 41.0)))) * composite_fs_params[4].x) * wet), vec2(0.0), vec2(1.0))).xyz;
    }
    float _259;
    if (_112)
    {
        if (_107)
        {
            // Submerged sky/far pixel: the far distance (chunk-culled terrain or
            // beyond-LOD) seen THROUGH the water. gap = how far the eye sits below
            // the surface; d_up = how steeply this ray rises toward it. A ray that
            // does not rise (d_up <= 0) never exits the water, so its whole line of
            // sight is underwater and the fog must SATURATE to the deep colour -
            // otherwise near the surface, where gap is tiny, the far underwater
            // reads as a bright HOLE instead of uniform murk (diving deep only hid
            // it because gap grew). Genuinely upward rays keep the finite exit
            // distance so the real sky above the waterline stays clear.
            //
            // gap/d_up already grows smoothly toward infinity as d_up -> 0, so
            // the water-travel distance ramps up on its own approaching the
            // waterline - no hard cutoff. The epsilon here only guards the
            // divide for rays at/below horizontal (d_up <= 0, never surfacing),
            // which saturate. A larger threshold used to snap finite -> huge and
            // drew a visible dark LINE at the horizon; keeping it tiny lets the
            // deep-water band fade into the water instead.
            float gap = max(0.0, composite_fs_params[3].w - length(v_camera_pos - composite_fs_params[3].xyz));
            float d_up = dot(normalize(v_view_dir), normalize(v_camera_pos - composite_fs_params[3].xyz));
            _259 = (d_up > 0.0008) ? (gap / d_up) : 100000.0;
        }
        else
        {
            _259 = view_dist;
        }
    }
    else
    {
        _259 = max(0.0, -pixel_alt);
    }
    vec3 _276 = color;
    vec3 _283 = mix(_276, mix(composite_fs_params[0].xyz, _276, exp(composite_fs_params[1].xyz * (-_259))), vec3(wet));
    if (!lens_pass) { color = _283; }
    if ((!lens_pass) && (!_107) && (composite_fs_params[5].w > 0.0))
    {
        float fog_f = 1.0 - exp(-view_dist * composite_fs_params[5].w);
        // Match the underwater-fog activation threshold (_112, full submersion
        // only): where the water fog covers a pixel, back off the atmospheric
        // fog so the two don't stack. Straddling uses the dry path, so its
        // atmospheric fog stays ungated exactly like the above-water case.
        float fog_gate = (composite_fs_params[4].z > 0.75) ? (1.0 - wet) : 1.0;
        color = mix(color, composite_fs_params[5].xyz, fog_f * fog_gate);
    }
    // Depth blur: soften the DISTANT background while the wet FX is active
    // (rain, or just-surfaced), foreground stays crisp. Distance-based (uses
    // view_dist), so it is not a flat lens fog. Reuses rd_blur.
    float dz_amt = max(composite_fs_params[4].w, composite_fs_params[2].w);
    if ((!lens_pass) && (dz_amt > 0.001) && (composite_fs_params[4].z < 0.75)) {{
        float dz = smoothstep(28.0, 190.0, view_dist) * clamp(dz_amt, 0.0, 1.0);
        if (dz > 0.002) {{
            // Blur blend strength = water.yaml wet_blur (composite_fs_params[1].w),
            // was an un-tunable 0.6. Keeps foreground crisp, softens distance.
            color = mix(color, rd_blur(scene_color_scene_smp, v_uv, dz * 3.5), dz * composite_fs_params[1].w);
        }}
    }}
    // Above-waterline mask for the lens droplets. Only bites while the camera
    // STRADDLES the surface (fx_params.z == 0.5); when clearly above water
    // (z == 0.0) it is a flat 1 so drops bead over the whole lens, including the
    // water the camera looks down on. Straddling, the split is by RAY DIRECTION
    // (d_up = how far this ray rises toward the surface), NOT per-pixel seabed
    // altitude: the seabed sits below sea level across ALL water, so the old
    // altitude test wiped drops off the entire water SURFACE, not just the
    // submerged murk. d_up puts drops on everything at/above the on-screen
    // waterline - the water surface AND the sky - and clears them only where the
    // view looks steeply DOWN into the deep water. (z == 1.0 fully underwater ->
    // the droplet blocks are skipped anyway.)
    float above_water;
    if (composite_fs_params[4].z > 0.25) {
        float d_up = dot(normalize(v_view_dir), normalize(v_camera_pos - composite_fs_params[3].xyz));
        above_water = smoothstep(-0.12, -0.02, d_up);
    } else {
        above_water = 1.0;
    }
    // Rain-on-glass (Heartfelt drops), refraction only - NO lens fog: sample
    // the scene sharply through each drop's normal, applied only where drops
    // are so distance fog between drops is preserved.
    if (lens_pass && (composite_fs_params[4].w > 0.001) && (composite_fs_params[4].z < 0.75)) {{
        float rd_rain = clamp(composite_fs_params[4].w, 0.0, 1.0);
        float rd_t = composite_fs_params[4].y * 0.2 * composite_fs_params[6].z; // .z = anim speed
        vec2 rd_uv = (v_uv - 0.5); rd_uv.x *= max(composite_fs_params[0].w, 0.1);
        float rd_s = smoothstep(-0.5, 1.0, rd_rain) * 2.0;
        float rd_l1 = smoothstep(0.25, 0.75, rd_rain);
        float rd_l2 = smoothstep(0.0, 0.5, rd_rain);
        vec2 rd_c = rd_Drops(rd_uv, rd_t, rd_s, rd_l1, rd_l2);
        vec2 rd_e = vec2(0.001, 0.0);
        float rd_cx = rd_Drops(rd_uv + rd_e, rd_t, rd_s, rd_l1, rd_l2).x;
        float rd_cy = rd_Drops(rd_uv + rd_e.yx, rd_t, rd_s, rd_l1, rd_l2).x;
        vec2 rd_n = vec2(rd_cx - rd_c.x, rd_cy - rd_c.x);
        vec3 rd_refr = texture(scene_color_scene_smp, clamp(v_uv - (rd_n * composite_fs_params[6].y), vec2(0.0), vec2(1.0))).xyz;
        color = mix(color, rd_refr, clamp(rd_c.x, 0.0, 1.0) * rd_rain * above_water);
    }}
    // Emerge-from-water: same drops running down + drying off, refraction only
    // (no fog). near_far.w = intensity 1->0. Skipped while submerged.
    if (lens_pass && (composite_fs_params[2].w > 0.001) && (composite_fs_params[4].z < 0.75)) {{
        float em = clamp(composite_fs_params[2].w, 0.0, 1.0);
        float em_t = composite_fs_params[4].y * 0.2 * composite_fs_params[6].z; // .z = anim speed
        vec2 em_uv = (v_uv - 0.5); em_uv.x *= max(composite_fs_params[0].w, 0.1);
        vec2 em_c = rd_Drops(em_uv, em_t, 0.0, 1.0, 0.6);
        vec2 em_e = vec2(0.001, 0.0);
        float em_cx = rd_Drops(em_uv + em_e, em_t, 0.0, 1.0, 0.6).x;
        float em_cy = rd_Drops(em_uv + em_e.yx, em_t, 0.0, 1.0, 0.6).x;
        vec2 em_n = vec2(em_cx - em_c.x, em_cy - em_c.x);
        vec3 em_refr = texture(scene_color_scene_smp, clamp(v_uv - (em_n * composite_fs_params[6].y), vec2(0.0), vec2(1.0))).xyz;
        color = mix(color, em_refr, clamp(em_c.x, 0.0, 1.0) * em * above_water);
    }}
    frag_color = vec4(color, 1.0);
    gl_FragDepth = _101;
}



