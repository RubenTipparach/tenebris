// Atmospheric scattering shader. Fullscreen pass that runs AFTER
// the starfield draws, alpha-blended over it. Bruneton-style
// ray-march through a sphere shell — direct port of Caelum's
// atmosphere.glsl. Outputs vec4(rgb, alpha) where alpha gates how
// much the atmosphere replaces the starfield underneath.
//
// Two radii: Rp = planet ground (clip + sun shadow), Rg = density
// lower bound (raise to thin the rim halo without producing a void
// band — see WATER_REFRACTION.md notes for the void-band fix).

@vs atmosphere_vs

out vec2 v_ndc;

void main() {
    vec2 pos = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    pos = pos * 2.0 - 1.0;
    gl_Position = vec4(pos, 0.99999, 1.0);
    v_ndc = pos;
}
@end


@fs atmosphere_fs

precision highp int;

layout(binding=0) uniform atmosphere_params {
    vec3 u_sun_dir;
    vec3 u_planet_center;
    vec3 u_camera_pos;
    vec4 u_atmo_params;       // x=Rp, y=Ra, z=strength, w=Rg
    vec4 u_atmo_tuning;       // x=rayleigh, y=mie, z=sun_intensity, w=sunset_strength
    vec4 u_atmo_phys;         // xyz=wavelengths^-4, w=scale_height
    vec4 u_atmo_mie;          // x=mie_g, yzw=unused
    vec4 u_sunset_tint;       // xyz=multiplicative warm tint
    vec4 u_sunset_glow;       // xyz=sun-direction glow rgb
    vec4 u_sunset_horiz;      // xyz=horizon-band rgb
    vec3 u_cam_right;
    vec3 u_cam_up;
    vec3 u_cam_fwd;
    vec4 u_sky_params;        // x=tan(fovY/2), y=aspect, z=time (unused here)
};

in vec2 v_ndc;
out vec4 frag_color;

#define PI 3.14159265359
#define NUM_SAMPLES 12
#define NUM_LIGHT_SAMPLES 4

float h31(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(-1.0);
    float s = sqrt(disc);
    return vec2(-b - s, -b + s);
}

float density(float altitude) {
    return exp(-altitude / u_atmo_phys.w);
}

float opticalDepth(vec3 ro, vec3 rd, float rayLen, float Rg, float thickness) {
    float step_size = rayLen / float(NUM_LIGHT_SAMPLES);
    float ns = step_size / thickness;
    float depth = 0.0;
    for (int i = 0; i < NUM_LIGHT_SAMPLES; ++i) {
        vec3  p = ro + rd * (step_size * (float(i) + 0.5));
        float a = clamp((length(p) - Rg) / thickness, 0.0, 1.0);
        depth += density(a) * ns;
    }
    return depth;
}

void main() {
    float strength = u_atmo_params.z;
    if (strength <= 0.001) {
        frag_color = vec4(0.0);
        return;
    }

    float t  = u_sky_params.x;
    float ar = u_sky_params.y;
    vec3 d = normalize(u_cam_fwd
                     + v_ndc.x * ar * t * u_cam_right
                     + v_ndc.y * t       * u_cam_up);

    float Rp = u_atmo_params.x;
    float Ra = u_atmo_params.y;
    float Rg = (u_atmo_params.w > 0.0) ? u_atmo_params.w : Rp;
    float thickness = max(Ra - Rg, 0.001);

    vec3 ro = u_camera_pos - u_planet_center;

    vec2 atmoHit = raySphereIntersect(ro, d, Ra);
    if (atmoHit.y < 0.0) {
        frag_color = vec4(0.0);
        return;
    }

    float rayStart = max(0.0, atmoHit.x);
    float rayEnd   = atmoHit.y;

    vec2 planetHit = raySphereIntersect(ro, d, Rp);
    if (planetHit.x > 0.0) {
        rayEnd = min(rayEnd, planetHit.x);
    }

    if (rayStart >= rayEnd) {
        frag_color = vec4(0.0);
        return;
    }

    float rayLen   = rayEnd - rayStart;
    float stepSize = rayLen / float(NUM_SAMPLES);
    float normStep = stepSize / thickness;
    float dither   = h31(vec3(gl_FragCoord.xy, 0.5)) * 0.5;

    vec3 sunDir = normalize(u_sun_dir);

    vec3  rSum = vec3(0.0);
    vec3  mSum = vec3(0.0);
    float odR  = 0.0;
    float odM  = 0.0;

    for (int i = 0; i < NUM_SAMPLES; ++i) {
        vec3  p = ro + d * (rayStart + stepSize * (float(i) + dither));
        float h = length(p);
        if (h < Rg) continue;
        float altitude = clamp((h - Rg) / thickness, 0.0, 1.0);
        float dens = density(altitude);
        float seg  = dens * normStep;
        odR += seg;
        odM += seg;

        vec2 sunPlanet = raySphereIntersect(p, sunDir, Rp);
        if (sunPlanet.x > 0.0) continue;
        vec2 sunAtmo   = raySphereIntersect(p, sunDir, Ra);
        float sunLen   = max(0.0, sunAtmo.y);
        float sunOd    = opticalDepth(p, sunDir, sunLen, Rg, thickness);

        vec3 tauR = u_atmo_tuning.x * u_atmo_phys.xyz * (odR + sunOd);
        vec3 tauM = vec3(u_atmo_tuning.y * (odM + sunOd));
        vec3 atten = exp(-(tauR + tauM));
        rSum += dens * atten * normStep;
        mSum += dens * atten * normStep;
    }

    rSum *= u_atmo_tuning.x * u_atmo_phys.xyz;
    mSum *= u_atmo_tuning.y;

    float cosTheta = dot(d, sunDir);
    float phaseR   = 0.75 * (1.0 + cosTheta * cosTheta);
    float gg       = u_atmo_mie.x * u_atmo_mie.x;
    float phaseM   = (1.0 - gg) /
                     (4.0 * PI *
                      pow(max(1.0 + gg - 2.0 * u_atmo_mie.x * cosTheta, 0.0001), 1.5));

    vec3 sky = u_atmo_tuning.z * (rSum * phaseR + mSum * phaseM);

    vec3  ro_norm    = normalize(ro);
    float sun_height = dot(sunDir, ro_norm);
    float sunset     = smoothstep(0.3, -0.05, sun_height);
    float view_sun   = max(0.0, cosTheta);
    float ws = u_atmo_tuning.w;
    sky *= mix(vec3(1.0), u_sunset_tint.xyz, sunset * 0.5 * ws);
    sky += u_sunset_glow.xyz * pow(view_sun, 3.0) * sunset * u_atmo_tuning.z * 0.12 * ws;
    float horizon = 1.0 - abs(dot(d, ro_norm));
    horizon = pow(horizon, 3.0);
    sky += u_sunset_horiz.xyz * horizon * sunset * u_atmo_tuning.z * 0.04 * ws;

    sky = 1.0 - exp(-sky);

    // Caelum-style alpha-by-intensity. With SRC_ALPHA /
    // ONE_MINUS_SRC_ALPHA blending against the starfield underneath:
    // bright limbs / sun-side fully replace the stars, dim regions
    // (back side of the shell, planet-occluded segments) leave the
    // starfield visible. `strength` from atmo_params crossfades the
    // whole effect for non-atmospheric bodies.
    float alpha = clamp(length(sky) * 1.5, 0.0, 0.95) * strength;
    frag_color = vec4(sky, alpha);
}
@end


@program atmosphere atmosphere_vs atmosphere_fs
