// atmosphere.glsl — GPU Gems 2 Ch.16 atmospheric scattering
// (fullscreen ray-march). Direct port of the Caelum reference shader
// to sokol-shdc format. Renders as a fullscreen pass with
// alpha-blending on top of the starfield.

@vs atmosphere_vs

layout(binding=0) uniform atmosphere_vs_params {
    vec4 cam_right;    // xyz = right vector, w = tan(fov/2)
    vec4 cam_up;       // xyz = up vector,    w = aspect ratio
    vec4 cam_forward;  // xyz = forward vector
    vec4 camera_pos;   // xyz = camera world position
};

layout(location=0) in vec2 a_pos;

out vec3 view_dir;
out vec3 v_camera_pos;

void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);

    float tan_half_fov = cam_right.w;
    float aspect       = cam_up.w;
    view_dir = cam_forward.xyz
             + cam_right.xyz * (a_pos.x * tan_half_fov * aspect)
             + cam_up.xyz    * (a_pos.y * tan_half_fov);
    v_camera_pos = camera_pos.xyz;
}
@end


@fs atmosphere_fs

layout(binding=1) uniform atmosphere_fs_params {
    vec4 sun_direction;     // xyz = normalised sun direction
    vec4 radii;             // x = planet_radius, y = atmosphere_radius, z = scale_height
    vec4 scatter_coeffs;    // x = rayleigh_scale, y = mie_scale, z = mie_g, w = sun_intensity
};

in vec3 view_dir;
in vec3 v_camera_pos;

out vec4 frag_color;

#define PI 3.14159265359
#define NUM_SAMPLES 8
#define NUM_LIGHT_SAMPLES 4

// (1/wavelength)^4 for Rayleigh scattering — 680 nm / 550 nm / 440 nm.
const vec3 wavelengthsInv4 = vec3(5.602, 9.473, 19.644);

float scaleHeight;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float rayleighPhase(float cosTheta) {
    return 0.75 * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    float denom = 1.0 + g2 - 2.0 * g * cosTheta;
    return (1.0 - g2) / (4.0 * PI * pow(max(denom, 0.0001), 1.5));
}

vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(-1.0);
    float sqrtDisc = sqrt(disc);
    return vec2(-b - sqrtDisc, -b + sqrtDisc);
}

float getDensity(float altitude) {
    return exp(-altitude / scaleHeight);
}

float computeOpticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength,
                          float pRadius, float aRadius) {
    float atmosThickness = aRadius - pRadius;
    float stepSize = rayLength / float(NUM_LIGHT_SAMPLES);
    float normalizedStep = stepSize / atmosThickness;
    float depth = 0.0;
    for (int i = 0; i < NUM_LIGHT_SAMPLES; i++) {
        vec3 samplePos = rayOrigin + rayDir * (stepSize * (float(i) + 0.5));
        float altitude = (length(samplePos) - pRadius) / atmosThickness;
        altitude = clamp(altitude, 0.0, 1.0);
        depth += getDensity(altitude) * normalizedStep;
    }
    return depth;
}

void main() {
    scaleHeight = radii.z;
    vec3 rayDir = normalize(view_dir);
    vec3 rayOrigin = v_camera_pos;
    float pRadius = radii.x;
    float aRadius = radii.y;
    float rayleighScale = scatter_coeffs.x;
    float mieScale = scatter_coeffs.y;
    float mieG = scatter_coeffs.z;
    float sunIntensity = scatter_coeffs.w;
    vec3 sunDir = normalize(sun_direction.xyz);

    vec2 atmosHit = raySphereIntersect(rayOrigin, rayDir, aRadius);
    if (atmosHit.y < 0.0) {
        frag_color = vec4(0.0);
        return;
    }

    float rayStart = max(0.0, atmosHit.x);
    float rayEnd = atmosHit.y;

    vec2 planetHit = raySphereIntersect(rayOrigin, rayDir, pRadius);
    if (planetHit.x > 0.0) {
        rayEnd = min(rayEnd, planetHit.x);
    }

    if (rayStart >= rayEnd) {
        frag_color = vec4(0.0);
        return;
    }

    float rayLength = rayEnd - rayStart;
    float stepSize = rayLength / float(NUM_SAMPLES);
    float atmosThickness = aRadius - pRadius;
    float normalizedStep = stepSize / atmosThickness;

    float dither = hash(gl_FragCoord.xy) * 0.5;

    vec3 rayleighSum = vec3(0.0);
    vec3 mieSum = vec3(0.0);
    float optDepthR = 0.0;
    float optDepthM = 0.0;

    for (int i = 0; i < NUM_SAMPLES; i++) {
        vec3 samplePos = rayOrigin + rayDir * (rayStart + stepSize * (float(i) + dither));
        float height = length(samplePos);

        if (height < pRadius) continue;

        float altitude = (height - pRadius) / atmosThickness;
        altitude = clamp(altitude, 0.0, 1.0);

        float localDensity = getDensity(altitude);

        float segmentDepth = localDensity * normalizedStep;
        optDepthR += segmentDepth;
        optDepthM += segmentDepth;

        vec2 sunPlanetHit = raySphereIntersect(samplePos, sunDir, pRadius);
        if (sunPlanetHit.x > 0.0) continue;

        vec2 sunAtmosHit = raySphereIntersect(samplePos, sunDir, aRadius);
        float sunRayLength = max(0.0, sunAtmosHit.y);
        float sunOptDepth = computeOpticalDepth(samplePos, sunDir, sunRayLength,
                                                 pRadius, aRadius);

        vec3 tauR = rayleighScale * wavelengthsInv4 * (optDepthR + sunOptDepth);
        vec3 tauM = vec3(mieScale * (optDepthM + sunOptDepth));
        vec3 attenuation = exp(-(tauR + tauM));

        rayleighSum += localDensity * attenuation * normalizedStep;
        mieSum += localDensity * attenuation * normalizedStep;
    }

    rayleighSum *= rayleighScale * wavelengthsInv4;
    mieSum *= mieScale;

    float cosTheta = dot(rayDir, sunDir);
    float phaseR = rayleighPhase(cosTheta);
    float phaseM = miePhase(cosTheta, mieG);

    vec3 color = sunIntensity * (rayleighSum * phaseR + mieSum * phaseM);

    // Sunset warmth — analytical multipliers; numerical integration
    // tends to under-shoot these at the step counts we afford.
    {
        float sun_height = dot(sunDir, normalize(v_camera_pos));
        float sunset = smoothstep(0.3, -0.05, sun_height);
        float view_sun = max(0.0, dot(rayDir, sunDir));

        color *= mix(vec3(1.0), vec3(1.3, 1.0, 0.6), sunset * 0.5);

        float glow = pow(view_sun, 3.0) * sunset;
        color += vec3(1.0, 0.65, 0.25) * glow * sunIntensity * 0.12;

        float horizon = 1.0 - abs(dot(rayDir, normalize(v_camera_pos)));
        horizon = pow(horizon, 3.0);
        color += vec3(0.8, 0.4, 0.15) * horizon * sunset * sunIntensity * 0.04;
    }

    color = 1.0 - exp(-color);

    float alpha = clamp(length(color) * 1.5, 0.0, 0.95);

    frag_color = vec4(color, alpha);
}
@end


@program atmosphere atmosphere_vs atmosphere_fs
