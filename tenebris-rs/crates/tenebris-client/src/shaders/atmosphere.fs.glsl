#version 410

// Per-body atmospheric scattering - a GPU Gems 2 single-scatter march,
// the GPU twin of the CPU horizon_sky_color() fog sample in renderer.rs
// (same 8 view / 4 light samples, same phase + tone map), so sky and fog
// agree by construction.
//
// FS uniform block (7 vec4, std140):
//   [0] sun_direction.xyz
//   [1] radii:   x = planet/clip radius Rp, y = outer shell Ra,
//                z = scale height, w = unused
//   [2] scatter: x = rayleigh_scale, y = mie_scale, z = mie_g,
//                w = sun_intensity
//   [3] wavelengths.xyz (1/lambda^4 RGB ratios), w = sunset_strength
//   [4] sunset_tint.xyz     (sky multiplier near the horizon at dusk)
//   [5] sunset_glow.xyz     (sun-direction glow at dusk)
//   [6] sunset_horizon.xyz  (horizon-band tint at dusk)
//
// Slots [3..6] were baked GLSL literals until they were lifted to
// uniforms so atmosphere.yaml's wavelengths / sunset_* actually drive the
// SKY DOME (they only ever coloured the distance fog before). The env
// defaults reproduce the old baked constants, so bodies that don't set
// them look identical.
uniform vec4 atmosphere_fs_params[7];

layout(location = 0) in vec3 view_dir;
layout(location = 1) in vec3 v_camera_pos;
layout(location = 0) out vec4 frag_color;

float scaleHeight;

vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float disc = (b * b) - c;
    if (disc < 0.0) {
        return vec2(-1.0);
    }
    float s = sqrt(disc);
    return vec2(-b - s, -b + s);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float getDensity(float altitude) {
    return exp(-altitude / scaleHeight);
}

float computeOpticalDepth(vec3 ro, vec3 rd, float rayLength, float pRadius, float aRadius) {
    float thickness = aRadius - pRadius;
    float step = rayLength * 0.25;
    float nstep = step / thickness;
    float depth = 0.0;
    for (int i = 0; i < 4; i++) {
        float alt = clamp((length(ro + rd * (step * (float(i) + 0.5))) - pRadius) / thickness, 0.0, 1.0);
        depth += getDensity(alt) * nstep;
    }
    return depth;
}

float rayleighPhase(float cosTheta) {
    return 0.75 * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (12.5663706 * pow(max((1.0 + g2) - (2.0 * g * cosTheta), 1e-4), 1.5));
}

void main() {
    float pRadius = atmosphere_fs_params[1].x;
    float aRadius = atmosphere_fs_params[1].y;
    scaleHeight = atmosphere_fs_params[1].z;
    float rayleighScale = atmosphere_fs_params[2].x;
    float mieScale = atmosphere_fs_params[2].y;
    float mieG = atmosphere_fs_params[2].z;
    float sunIntensity = atmosphere_fs_params[2].w;
    vec3 wavelengths = atmosphere_fs_params[3].xyz;
    float sunsetStrength = atmosphere_fs_params[3].w;

    vec3 dir = normalize(view_dir);
    vec3 sunDir = normalize(atmosphere_fs_params[0].xyz);

    // Ray vs the outer atmosphere shell.
    vec2 atmoHit = raySphereIntersect(v_camera_pos, dir, aRadius);
    if (atmoHit.y < 0.0) {
        frag_color = vec4(0.0);
        return;
    }
    float rayStart = max(0.0, atmoHit.x);
    float rayEnd = atmoHit.y;

    // Clamp the march to the ground for view rays that hit the planet.
    float groundT = raySphereIntersect(v_camera_pos, dir, pRadius).x;
    bool hitsGround = groundT > 0.0;
    if (hitsGround) {
        rayEnd = min(rayEnd, groundT);
    }
    if (rayStart >= rayEnd) {
        frag_color = vec4(0.0);
        return;
    }

    float thickness = aRadius - pRadius;
    float step = (rayEnd - rayStart) * 0.125;   // 8 samples
    float nstep = step / thickness;
    float jitter = hash(gl_FragCoord.xy) * 0.5;

    vec3 rayleighSum = vec3(0.0);
    vec3 mieSum = vec3(0.0);
    float optDepthR = 0.0;
    float optDepthM = 0.0;
    for (int i = 0; i < 8; i++) {
        vec3 sp = v_camera_pos + dir * (rayStart + step * (float(i) + jitter));
        float h = length(sp);
        if (h < pRadius) {
            continue;
        }
        float alt = clamp((h - pRadius) / thickness, 0.0, 1.0);
        float localDensity = getDensity(alt);
        float seg = localDensity * nstep;
        optDepthR += seg;
        optDepthM += seg;
        // Sun-shadowed samples still accrue extinction (above) but do not
        // in-scatter.
        if (raySphereIntersect(sp, sunDir, pRadius).x > 0.0) {
            continue;
        }
        float sunLen = max(0.0, raySphereIntersect(sp, sunDir, aRadius).y);
        float sunDepth = computeOpticalDepth(sp, sunDir, sunLen, pRadius, aRadius);
        vec3 att = exp(-((wavelengths * rayleighScale) * (optDepthR + sunDepth)
                          + vec3(mieScale * (optDepthM + sunDepth))));
        vec3 contrib = att * localDensity * nstep;
        rayleighSum += contrib;
        mieSum += contrib;
    }
    rayleighSum *= wavelengths * rayleighScale;
    mieSum *= mieScale;

    float cosTheta = dot(dir, sunDir);
    vec3 up = normalize(v_camera_pos);
    float sunHeight = dot(sunDir, up);
    // Dusk factor: warmth builds as the sun nears the horizon, peaks just
    // below it, closes out to dark once the sun is well down.
    float sunset = smoothstep(0.18, 0.0, sunHeight) * smoothstep(-0.32, -0.1, sunHeight);

    vec3 scattered = (rayleighSum * rayleighPhase(cosTheta)
                      + mieSum * miePhase(cosTheta, mieG)) * sunIntensity;
    // Warm dusk tint (sunset_strength = blend cap; was the baked 0.85).
    scattered *= mix(vec3(1.0), atmosphere_fs_params[4].xyz, vec3(sunset * sunsetStrength));
    // Sun-direction glow + horizon band. The 0.22 / 0.11 weights are the
    // fixed shape of the two dusk terms (tuned so dusk reads orange-red,
    // not residual blue); the colours are the per-body sunset_glow /
    // sunset_horizon.
    vec3 glow = atmosphere_fs_params[5].xyz * (pow(max(0.0, cosTheta), 3.0) * sunset) * sunIntensity * 0.22;
    vec3 band = atmosphere_fs_params[6].xyz * (pow(1.0 - abs(dot(dir, up)), 3.0) * sunset) * sunIntensity * 0.11;

    vec3 color = vec3(1.0) - exp(-(scattered + glow + band));

    // Ground-hitting view rays are opaque (in-scatter over terrain);
    // sky rays take alpha from scatter luminance so faint sky stays clear.
    float alpha = hitsGround ? 1.0 : clamp(length(color) * 1.5, 0.0, 0.95);
    frag_color = vec4(color, alpha);
}
