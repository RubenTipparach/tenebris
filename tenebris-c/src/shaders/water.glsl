// Water cap shader. Animated procedural surface drawn over has_water
// bodies. All visual constants are baked in here; the C side only
// uploads the view-projection, the camera position, the sun
// direction, and a pre-scaled time (water_time_scale in renderer.c
// controls animation pace).
//
// Cross-compiled by sokol-shdc into water.glsl.h — the runtime gets
// water_shader_desc(sg_query_backend()), vs_params_t / fs_params_t,
// and ATTR_water_a_* / UB_* slot constants.

@vs water_vs

layout(binding=0) uniform vs_params {
    mat4 u_vp;                  // pre-multiplied with model so a_pos is body-local
    vec4 u_planet;              // xyz = body centre (model space), w unused
    vec4 u_sun_dir;             // xyz = world sun direction, w unused
    vec4 u_terminator;          // x=night_floor, y=lo, z=hi, w unused
    float u_time;               // pre-scaled "subjective" time
    float u_swell_amplitude;    // overall vertex-displacement multiplier (wave height)
    float u_swell_frequency;    // spatial-frequency multiplier in the sine swell (wavelength)
    float u_swell_speed;        // time multiplier in the sine swell (animation speed)
};

// a_normal carries the per-vertex world-space face normal baked at
// mesh-build time. For the planet-wide ocean cap the side that reaches
// here is radial-outward (parallel to normalize(a_pos)), so face-vs-
// radial alignment reads as 1.0 - that's the "still surface" case.
// For per-voxel water cells, side quads carry horizontal face normals,
// so alignment reads as 0.0 and the fragment shader treats them as
// vertical / falling surfaces. Used to bias the ripple-noise sample
// position downward on falling water so it visibly streams.
//
// a_uv carries the per-cell flow direction projected into the tile's
// local tangent plane, baked at mesh time by hex_mesher. For water top
// cap vertices this is a unit (or near-unit) 2D vector pointing the
// direction the surface noise should pan; for side walls / bottom caps
// the mesher writes (0, 0) so the pan effect is silently disabled.
// No uniform needed - the per-vertex value IS the flow.
//
// a_sky_light / a_torch_light are baked at mesh time by the same
// hex_mesher path the terrain uses (sky-occlusion sum + nearby torch
// inverse-square). The water cap reads both so a player-built roof
// over the water dims it like land, and a placed torch on the
// shoreline spills its warm circle onto the water beside it.
in vec3  a_pos;
in vec3  a_normal;
in vec2  a_uv;
in float a_sky_light;
in float a_torch_light;

out vec3  v_wpos;
out vec3  v_face_normal;       // world-space face normal, for falling-water bias
out float v_sun_brightness;     // 0 on full-night side of the planet, 1 on full-day
out float v_sky_light;          // 0..1 voxel-occlusion sky-reach
out float v_torch_light;        // 0..3 sum of inverse-square torch contributions
out vec2  v_flow_uv;            // per-cell flow direction in tile-local 2D

void main() {
    // Radial from the planet centre, NOT the per-tile flat normal in
    // a_normal. Adjacent Goldberg tiles each carry their own
    // t->center as their flat normal, so using a_normal makes the
    // vertex swell push neighbour tiles in slightly different
    // directions — visible grid-pattern seams at every tile
    // boundary. normalize(a_pos) is identical for any vertex at the
    // same world position, so the cap stays watertight across
    // boundaries.
    vec3 n = normalize(a_pos);

    // Three-octave directional swell. Per-octave amplitudes sum to
    // 0.36 m at u_swell_amplitude=1.0 — well inside the 0.50 m
    // depth_offset_m cap drop in hex_mesher.c so wave crests can't
    // poke through coplanar beach sand. Pushing u_swell_amplitude
    // above ~1.39 will start clipping into beach geometry.
    float t  = u_time * u_swell_speed;
    float fx = u_swell_frequency;
    float swell = 0.0;
    swell += sin(t * 0.9 + a_pos.x * 1.4 * fx + a_pos.z * 0.6 * fx) * 0.18;
    swell += sin(t * 1.3 - a_pos.x * 0.7 * fx + a_pos.z * 1.2 * fx) * 0.12;
    swell += sin(t * 1.7 + a_pos.x * 2.3 * fx - a_pos.z * 1.9 * fx) * 0.06;
    swell *= u_swell_amplitude;

    vec3 p = a_pos + n * swell;
    gl_Position = u_vp * vec4(p, 1.0);
    v_wpos = p;
    v_face_normal = a_normal;
    v_sky_light   = a_sky_light;
    v_torch_light = a_torch_light;
    v_flow_uv     = a_uv;

    // Day/night terminator — same surface-dir·sun_dir smoothstep the
    // terrain shader uses, so the water cap darkens on the night side
    // in lockstep with the land beside it. Computed per vertex (the
    // cap mesh is fine enough that interpolation reads as smooth).
    vec3 surface_dir = normalize(p - u_planet.xyz);
    float sun_facing = dot(surface_dir, normalize(u_sun_dir.xyz));
    v_sun_brightness = smoothstep(u_terminator.y, u_terminator.z, sun_facing);
}
@end


@fs water_fs

layout(binding=1) uniform fs_params {
    vec3 u_camera_pos;
    vec3 u_sun_dir;
    float u_time;
    float u_refract_amount;  // surface-gradient → screen UV perturbation scale
    float u_near;            // projection near plane (m)
    float u_far;             // projection far plane (m)
    vec3 u_absorption;       // Beer-Lambert sigma per RGB channel (1/m)
    vec3 u_deep_color;       // saturation colour where the ray has fully attenuated
    float u_spec_intensity;  // sun-highlight strength multiplier
    float u_spec_power;      // Blinn-Phong exponent
    vec3  u_sun_tint;        // warm tint multiplied with the sun highlight
    vec4  u_foam_crest;      // x=lo, y=hi, z=weight, w=overall foam_intensity
    vec4  u_foam_slope;      // x=lo, y=hi, z=weight, w=unused
    vec3  u_foam_color;      // wave-crest + slope foam tint
    vec3  u_sky_horizon;     // reflected-ray-skimming-horizontal sky tint
    float u_sky_horizon_strength; // horizon-direction reflection opacity (0=hide, 1=Fresnel default)
    vec3  u_sky_zenith;      // reflected-ray-up sky tint
    float u_ripple_scale;    // spatial multiplier inside the fbm lookup
    float u_ripple_speed;    // multiplier on the time advection inside fbm
    float u_wave_steepness;  // normal-perturbation factor (was hard-coded 0.65)
    float u_night_floor;     // lighting.yaml night_ambient_floor — water cap multiplies
                             // its final colour by mix(night_floor, 1, sun_brightness)
    vec4  u_torch_color;     // xyz = warm tint, w = intensity scalar. Per-vertex
                             // v_torch_light is multiplied by this (matches the
                             // hex shader's torch contribution exactly so a torch
                             // placed at a shore reads continuously across the
                             // water/land seam).
    // Per-voxel water-flow visual. Used only on vertical faces (per
    // the face-vs-radial dot product test below) to shift the noise
    // sample upward over time, making the surface pattern appear to
    // stream downward - the visual cue for falling water. The ocean
    // cap is horizontal so face_alignment ≈ 1 and the bias contributes
    // nothing. water.yaml flow_uv_speed_falling drives this.
    float u_flow_speed_falling;
};

// water_scene_color / water_scene_depth are texture views of the
// offscreen colour + depth attachments rendered before the water
// draw. Sampled at gl_FragCoord-derived UV for screen-space
// refraction + manual depth-discard.
//
// Two samplers — colour gets LINEAR for smooth refraction, depth
// gets NEAREST because WebGL2 disallows linear-filtered depth-as-
// sampler2D and silently returns zero on most drivers (which
// caused the universal discard that made water invisible).
layout(binding=0) uniform texture2D water_scene_color;
layout(binding=1) uniform texture2D water_scene_depth;
layout(binding=0) uniform sampler   water_scene_smp;
layout(binding=1) uniform sampler   water_scene_depth_smp;

precision highp int;

in vec3  v_wpos;
in vec3  v_face_normal;
in float v_sun_brightness;
in float v_sky_light;
in float v_torch_light;
in vec2  v_flow_uv;
out vec4 frag_color;

// 3D gradient (Perlin) noise — quintic fade, integer-hash gradient
// lookup, output in [-1, +1]. Replaces value noise to kill the
// axis-aligned cell boundaries that showed up as a visible grid
// across the cap surface. Same primitive used by the terrain fix in
// core/rng.c::gnoise3d_seed.
//
// Hash uses uint to keep wrap-around well-defined under GLSL ES 300
// (signed overflow is UB; unsigned is modulo-2^32). The cell coords
// are biased by 2^30 before the uint cast — negative-int-to-uint is
// indeterminate per the spec, so the bias keeps the operand in
// well-defined territory. The bias only relabels the hash space.
float gn_fade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

uint gn_hash(int x, int y, int z) {
    uint ux = uint(x + 0x40000000);
    uint uy = uint(y + 0x40000000);
    uint uz = uint(z + 0x40000000);
    uint h = ux * 374761393u ^ uy * 668265263u ^ uz * 1274126177u;
    h = (h ^ (h >> 13u)) * 1103515245u;
    return h ^ (h >> 16u);
}

float gn_grad(uint hash, float x, float y, float z) {
    uint h = hash & 15u;
    float u = (h < 8u)  ? x : y;
    float v = (h < 4u)  ? y : ((h == 12u || h == 14u) ? x : z);
    return ((h & 1u) != 0u ? -u : u) + ((h & 2u) != 0u ? -v : v);
}

float gnoise3(vec3 p) {
    int ix = int(floor(p.x));
    int iy = int(floor(p.y));
    int iz = int(floor(p.z));
    float fx = p.x - float(ix);
    float fy = p.y - float(iy);
    float fz = p.z - float(iz);
    float u = gn_fade(fx);
    float v = gn_fade(fy);
    float w = gn_fade(fz);
    float g000 = gn_grad(gn_hash(ix,   iy,   iz  ), fx,       fy,       fz);
    float g100 = gn_grad(gn_hash(ix+1, iy,   iz  ), fx-1.0,   fy,       fz);
    float g010 = gn_grad(gn_hash(ix,   iy+1, iz  ), fx,       fy-1.0,   fz);
    float g110 = gn_grad(gn_hash(ix+1, iy+1, iz  ), fx-1.0,   fy-1.0,   fz);
    float g001 = gn_grad(gn_hash(ix,   iy,   iz+1), fx,       fy,       fz-1.0);
    float g101 = gn_grad(gn_hash(ix+1, iy,   iz+1), fx-1.0,   fy,       fz-1.0);
    float g011 = gn_grad(gn_hash(ix,   iy+1, iz+1), fx,       fy-1.0,   fz-1.0);
    float g111 = gn_grad(gn_hash(ix+1, iy+1, iz+1), fx-1.0,   fy-1.0,   fz-1.0);
    float a = mix(mix(g000, g100, u), mix(g010, g110, u), v);
    float b = mix(mix(g001, g101, u), mix(g011, g111, u), v);
    return mix(a, b, w);
}

// Three-octave fBm with per-octave time advection along different
// directions so the surface flow doesn't look like a single laminar
// stream.
float fbm3(vec3 p, float t) {
    float h = 0.0;
    vec3 q = p * 0.9 + vec3(t * 0.35, t * 0.18, -t * 0.42);
    h += gnoise3(q) * 0.50;
    q = q * 2.1 + vec3(-t * 0.22, t * 0.33, t * 0.17);
    h += gnoise3(q) * 0.28;
    q = q * 2.3 + vec3(t * 0.19, -t * 0.27, t * 0.11);
    h += gnoise3(q) * 0.15;
    return h;
}

void main() {
    // Radial from world-space position keeps lighting continuous
    // across tile boundaries.
    vec3 radial = normalize(v_wpos);

    // Per-voxel water falling-bias. abs(dot(face_n, radial)) is 1.0 on
    // horizontal faces (ocean cap, top of a still pool) and 0.0 on
    // vertical faces (the side of a waterfall column). vertical_factor
    // gates a downward sample-position shift: positive radial offset =
    // sampling noise from a position higher up the column, so the
    // fragment sees what was above it a moment ago - i.e. the pattern
    // visually scrolls toward the planet centre. Magnitude scaled by
    // u_flow_speed_falling so designers can dial speed via YAML.
    //
    // Per-cell flow direction (horizontal streams scrolling along the
    // surface) needs a per-vertex flow vector attribute and a more
    // invasive mesher change; that's a follow-up. The vertical-face
    // case alone catches the most visually important class - actual
    // falling water.
    vec3 face_n = (length(v_face_normal) > 0.0)
                  ? normalize(v_face_normal) : radial;
    float face_alignment  = abs(dot(face_n, radial));
    float vertical_factor = 1.0 - face_alignment;
    float fall_shift      = u_time * u_flow_speed_falling * vertical_factor;

    // Per-cell horizontal flow pan. v_flow_uv is the per-vertex flow
    // direction baked by hex_mesher (top cap of a flow water cell:
    // unit-length vector pointing away from the source; everything
    // else: (0, 0)). Project it back into world space by reading any
    // two tangent-plane basis vectors from the face_normal / radial
    // pair, then add a time-advected offset to v_wpos so the noise
    // pattern visibly scrolls in the flow direction.
    //
    // Only applies on horizontal faces (face_alignment ~ 1.0) - the
    // vertical-face case already has its own fall_shift bias for
    // waterfalls, and walls of water are supposed to be unaffected by
    // horizontal flow per the user spec.
    //
    // Tangent basis: take any vector not parallel to face_n, cross
    // twice to get an orthonormal pair on the tangent plane. The
    // specific orientation doesn't matter visually as long as it's
    // consistent across adjacent vertices on the same tile - and
    // because face_n + radial come from per-vertex data the basis
    // stays continuous across the cap face.
    vec3 tangent_u = vec3(1.0, 0.0, 0.0);
    if (abs(dot(tangent_u, face_n)) > 0.9) tangent_u = vec3(0.0, 1.0, 0.0);
    tangent_u = normalize(tangent_u - face_n * dot(tangent_u, face_n));
    vec3 tangent_v = cross(face_n, tangent_u);
    vec3 flow_world = tangent_u * v_flow_uv.x + tangent_v * v_flow_uv.y;
    float horizontal_factor = face_alignment;
    // The noise pattern advects OPPOSITE the flow vector: as the
    // sample position shifts in the flow direction, the pattern
    // appears to stream the OTHER way. Standard moving-camera math.
    vec3 flow_pan = -flow_world * u_time * 0.35 * horizontal_factor;

    // Scalar height + 3-sample finite-difference world-space
    // gradient. Epsilon ~8 cm — small enough to stay inside the
    // smallest noise cell, big enough to dodge fp noise. Position is
    // pre-multiplied by u_ripple_scale (smaller scale → bigger ripple
    // cells; larger → finer / busier ripples), time by u_ripple_speed.
    vec3  rp = (v_wpos + radial * fall_shift + flow_pan) * u_ripple_scale;
    float rt = u_time * u_ripple_speed;
    float e  = 0.08;
    float h0 = fbm3(rp, rt);
    vec3 grad = vec3(
        fbm3(rp + vec3(e, 0, 0), rt) - h0,
        fbm3(rp + vec3(0, e, 0), rt) - h0,
        fbm3(rp + vec3(0, 0, e), rt) - h0) / e;

    vec3 t_grad = grad - radial * dot(grad, radial);
    vec3 n = normalize(radial - t_grad * u_wave_steepness);

    // Screen-space UV: gl_FragCoord.xy is in pixels; texture size
    // gives us the divisor without needing a uniform.
    vec2 screen_size = vec2(textureSize(sampler2D(water_scene_color, water_scene_smp), 0));
    vec2 screen_uv   = gl_FragCoord.xy / screen_size;

    // Manual depth occlusion. Pipeline has HW depth-test disabled
    // (compare = ALWAYS) because the swapchain depth buffer doesn't
    // hold the offscreen scene's depth; we read it directly from the
    // offscreen depth texture and discard fragments behind opaque
    // geometry. Uses the NEAREST sampler (water_scene_depth_smp) —
    // see header comment.
    float scene_z = texture(sampler2D(water_scene_depth, water_scene_depth_smp), screen_uv).r;
    if (gl_FragCoord.z > scene_z) discard;

    // Refraction: perturb the colour-sample UV by the surface
    // tangent-plane gradient. Magnitude scales with u_refract_amount
    // so the C side can dial it without a shader rebuild.
    vec2 refract_uv = clamp(screen_uv + t_grad.xy * u_refract_amount,
                            vec2(0.0), vec2(1.0));
    vec3 refracted = texture(sampler2D(water_scene_color, water_scene_smp), refract_uv).rgb;

    // ---- Back face = camera underwater looking up at the cap ----
    //
    // Snell's window: light from the world above can only enter the
    // water through a cone of half-angle ~48.6° (water-to-air
    // critical angle, n_water ≈ 1.33). Inside the cone the surface
    // looks like a refracted window onto the sky; outside, total
    // internal reflection — the rest of the underside reads as
    // dark deep-water tint.
    if (!gl_FrontFacing) {
        vec3  view_to_frag = normalize(v_wpos - u_camera_pos);
        float cos_theta    = dot(view_to_frag, n);

        // cos(critical) = sqrt(1 - 1/n²); n=1.33 → ≈ 0.659.
        // Soft transition over ~10° so the Snell-window rim
        // doesn't read as a hard ring under the wave normals.
        float snell = smoothstep(0.55, 0.75, cos_theta);

        // Beer-Lambert through the water column between camera and
        // the surface.
        float view_dist     = length(v_wpos - u_camera_pos);
        vec3  attenuation   = exp(-view_dist * u_absorption);
        vec3  refracted_lit = mix(u_deep_color, refracted, attenuation);

        // Inside Snell's window: the refracted sky/scene visible
        // through the surface, attenuated by the water in front of
        // it. Outside: total internal reflection saturates to
        // deep_color.
        //
        // No surface-light terms here — viewed from below, the cap
        // is purely a window onto whatever's above (Snell-mixed with
        // deep_color outside the cone). The refracted sample already
        // carries the sun's lighting on the sky/terrain above the
        // surface, so re-adding sun-glint or torch additives just
        // paints a yellow film over the underside that doesn't
        // correspond to any real light path. Day/night dim is also
        // already in the refracted sample (the skybox / terrain it
        // views are dimmed at source), so we don't multiply again.
        vec3 below_color = mix(u_deep_color, refracted_lit, snell);

        frag_color = vec4(below_color, 1.0);
        return;
    }

    // Beer-Lambert depth-thickness extinction. Linearise both the
    // water-surface depth and the sampled scene depth into camera-z
    // (metres), use their difference as the thickness of water the
    // view ray traverses. Per-channel exp(-thickness * sigma) gives
    // water its characteristic red-absorbed / blue-preserved tint as
    // depth grows.
    float zw = (2.0 * u_near * u_far) /
               (u_far + u_near - (2.0 * gl_FragCoord.z - 1.0) * (u_far - u_near));
    float zs = (2.0 * u_near * u_far) /
               (u_far + u_near - (2.0 * scene_z         - 1.0) * (u_far - u_near));
    float thickness = max(0.0, zs - zw);
    vec3  attenuation = exp(-thickness * u_absorption);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    // Mix between the refracted scene (visible through shallow
    // water) and the deep-water saturation tint (where the ray has
    // attenuated to zero). attenuation is a per-channel lerp factor:
    // high → see-through, low → deep colour.
    vec3 base = mix(u_deep_color, refracted, attenuation);

    vec3 refl   = reflect(-view, n);
    float up_f  = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky    = mix(u_sky_horizon, u_sky_zenith, up_f);

    // Horizon-direction reflection opacity. up_f=0 (reflected ray skims
    // horizontal — i.e. the bit of sky a flat-on viewer sees on distant
    // water) gets multiplied by u_sky_horizon_strength; up_f=1
    // (reflected ray points straight up) is untouched. So strength=0
    // erases the horizon-leaning sky reflection entirely while leaving
    // overhead reflections intact, and 1.0 keeps the original Fresnel
    // mix.
    float sky_weight = f * mix(u_sky_horizon_strength, 1.0, up_f);

    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), u_spec_power);
    vec3  sun_highlight = u_sun_tint * spec * u_spec_intensity;

    // Wave-crest + slope foam — bright flecks on tall fbm peaks and
    // steep tangent gradients. Two smoothstep ranges feed a max()
    // blend with per-source weights; the combined mass tints toward
    // foam_color at foam_intensity.
    float steepness = length(t_grad);
    float crest     = smoothstep(u_foam_crest.x, u_foam_crest.y, h0);
    float slope_f   = smoothstep(u_foam_slope.x, u_foam_slope.y, steepness);
    float foam      = max(crest * u_foam_crest.z, slope_f * u_foam_slope.z);

    vec3 color = mix(base, sky, sky_weight);
    color = mix(color, u_foam_color, foam * u_foam_crest.w);

    // Sun highlight (Blinn-Phong) is applied AFTER the foam mix —
    // physically the sun still glints off foam, and u_spec_intensity
    // is a true additive scaler whose visual impact is independent
    // of where on the cap the fragment lives.
    color += sun_highlight;

    // Day/night dim, last step. Mirrors the terrain shader: the cap
    // multiplies its final colour by mix(night_floor, 1, sky_light *
    // sun_brightness) so the night-side ocean surface darkens in
    // lockstep with the night-side land beside it, and water under
    // a built roof dims like the land under that same roof. Sun
    // glint passes through this gate because it's added before — the
    // Blinn-Phong dot is already ~zero on the dark side anyway, so
    // the dimming reads as a tiny tail on an already-dim quantity.
    float ambient_dn = mix(u_night_floor, 1.0, v_sun_brightness * v_sky_light);
    color *= ambient_dn;

    // Torch contribution. Bulk water is transparent — it doesn't
    // diffuse-scatter the way terrain does, so the body of the cap
    // must NOT pick up a flat torch tint (that's what made shallow
    // water near a torch look like opaque yellow paint at night).
    // Instead the torch only feeds the surface channels that would
    // physically catch a nearby flame:
    //   * Fresnel sky-reflection — the surface acts as a mirror, so
    //     a torch behind the camera glints off it the same way the
    //     sun's specular does. Modulated by sky_weight so it's
    //     strongest at glancing angles and absent when looking
    //     straight down at calm water.
    //   * Foam — bright flecks behave like terrain-style diffuse
    //     receivers; their existing white tint warms toward orange
    //     under a torch. Modulated by the same foam mass the cap
    //     mixes toward u_foam_color above.
    // The shoreline-sand glow comes through the refracted sample on
    // its own (the terrain shader bakes torch_light into the sand
    // below), so we don't need to double-paint it on the cap.
    // Added AFTER the daylight dim so torches survive on the night
    // side, matching the hex shader's torch-after-dim ordering.
    vec3 torch = u_torch_color.xyz * u_torch_color.w * v_torch_light;
    color += torch * (sky_weight + foam * u_foam_crest.w);

    frag_color = vec4(color, 1.0);
}
@end


// Depth sampler must be non-filtering on desktop GL (and on WebGL2 in
// most drivers): a DEPTH24_STENCIL8 / depth-only texture isn't a
// filterable resource, so binding it with a SG_SAMPLERTYPE_FILTERING
// sampler trips sokol's VALIDATE_ABND_TEXVIEW_EXPECTED_FILTERABLE_IMAGE.
// `unfilterable_float` keeps texture(sampler2D, uv).r returning the raw
// depth value; the matching sampler must be `nonfiltering`.
@image_sample_type water_scene_depth unfilterable_float
@sampler_type water_scene_depth_smp nonfiltering

@program water water_vs water_fs
