#version 410

/* Procedural sun surface. Classic layered approach (see e.g. the
 * Shadertoy / three.js sun-shader family): domain-warped fbm value
 * noise for the convection granulation, a slow low-frequency field for
 * sunspots, photospheric limb darkening from dot(normal, view), and a
 * hot fresnel rim at the limb. All look knobs arrive as uniforms from
 * solar.yaml - nothing designer-tunable is baked in here.
 *
 *   sun_fs_params[0] xyz = hot colour (granule cores)   w = time (s)
 *   sun_fs_params[1] xyz = cool colour (granule lanes)  w = granule scale
 *   sun_fs_params[2] xyz = sunspot colour               w = churn speed
 *   sun_fs_params[3] xyz = camera in unit-sphere space  w = limb power
 *   sun_fs_params[4] x = limb strength  y = rim boost
 *                    z = spot threshold w = spot sharpness
 *   sun_fs_params[5] x = warp amount    y = (unused)
 *                    z = brightness     w = (unused)
 */

uniform vec4 sun_fs_params[6];

layout(location = 0) in vec3 v_local;
layout(location = 0) out vec4 frag_color;

/* Value-noise hash. The constants are the hash's identity (they just
 * make it decorrelate), not tunables. */
float hash31(vec3 p)
{
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 p)
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), u.x),
            mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
        mix(mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x),
            mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
        u.z);
}

/* 5-octave fbm; the offset per octave decorrelates the lattices. */
float fbm(vec3 p)
{
    float a = 0.5;
    float v = 0.0;
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = p * 2.02 + vec3(11.5, 27.3, 5.7);
        a *= 0.55;
    }
    return v;
}

void main()
{
    vec3 hot = sun_fs_params[0].xyz;
    float t = sun_fs_params[0].w;
    vec3 cool = sun_fs_params[1].xyz;
    float gscale = sun_fs_params[1].w;
    vec3 spot_col = sun_fs_params[2].xyz;
    float churn = sun_fs_params[2].w;
    vec3 cam = sun_fs_params[3].xyz;
    float limb_pow = sun_fs_params[3].w;
    float limb_str = sun_fs_params[4].x;
    float rim_boost = sun_fs_params[4].y;
    float spot_thresh = sun_fs_params[4].z;
    float spot_sharp = sun_fs_params[4].w;
    float warp_amt = sun_fs_params[5].x;
    float brightness = sun_fs_params[5].z;

    vec3 n = normalize(v_local);
    vec3 view = normalize(cam - v_local);
    float mu = clamp(dot(n, view), 0.0, 1.0);

    /* Boiling convection cells: fbm sampled through an fbm-displaced
     * frame (domain warp), the whole field drifting slowly with time so
     * the surface churns instead of scrolling. */
    float tt = t * churn;
    vec3 p = n * gscale;
    vec3 q = vec3(
        fbm(p + vec3(0.0, 0.0, tt)),
        fbm(p + vec3(5.2, 1.3, -tt)),
        fbm(p + vec3(1.7, 9.2, tt * 0.7)));
    float g = fbm(p + q * warp_amt + vec3(tt * 0.5, -tt * 0.3, tt));

    /* Granulation: hot cell cores, cooler lanes between them. */
    vec3 col = mix(cool, hot, smoothstep(0.25, 0.75, g));

    /* Sunspots: a much lower-frequency, slower field; past the
     * threshold the surface darkens toward the spot colour. */
    float s = fbm(n * gscale * 0.35 + vec3(-tt * 0.2, tt * 0.15, 3.1));
    col = mix(col, spot_col, smoothstep(spot_thresh, spot_thresh + spot_sharp, s));

    /* Photospheric limb darkening: the disc dims toward the edge. */
    col *= 1.0 - limb_str * (1.0 - pow(mu, limb_pow));

    /* Hot fresnel rim right at the limb - the chromosphere flash that
     * keeps the darkened edge reading as fire, not shadow. */
    col += hot * pow(1.0 - mu, 3.0) * rim_boost;

    /* Alpha 0: the sun writes no depth and the composite treats it as
     * sky (same contract as the old flat disc). */
    frag_color = vec4(col * brightness, 0.0);
}
