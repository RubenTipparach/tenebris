// Water-cap mask shader. Renders the same wave-displaced cap
// geometry the visible water shader renders, but emits only a
// coverage flag (alpha = 1) into a single-channel offscreen target.
// The composite pass samples the mask to:
//
//   * fog the underwater scene with tight per-pixel masking (no
//     more "this pixel reconstructed to altitude < sea_radius";
//     the mask says directly whether the camera ray is travelling
//     through water at this pixel).
//   * 4-tap edge-detect the mask boundary to find the cap silhouette
//     in screen space — that's the camera-clip waterline, the right
//     place to apply the lens-water smear/blur. The line traces the
//     wave-displaced cap surface naturally because the mask geometry
//     IS the wave-displaced cap.
//
// Drawn between the offscreen scene pass and the composite pass:
//   1. offscreen pass → terrain, sun, atmosphere into offscreen_color
//      + offscreen_depth.
//   2. mask pass → THIS shader, depth-test against offscreen_depth
//      (cap fragments behind opaque terrain are rejected), no
//      depth-write (terrain depth stays intact for the visible
//      water cap shader's manual depth-discard later).
//   3. composite pass → blits offscreen_color + applies underwater
//      effects keyed off the mask.
//   4. visible water cap → drawn last on the swapchain, full
//      shading (foam, refraction, Snell's window).
//
// Same vertex layout as the visible water shader: only a_pos is
// read, the 24 unused bytes per vertex are silently skipped via
// the 36-byte stride (matches water.glsl's pipeline binding).

@vs water_mask_vs

layout(binding=0) uniform mask_vs_params {
    mat4 u_vp;                  // pre-multiplied with body model so a_pos is body-local
    float u_time;               // pre-scaled "subjective" time
    float u_swell_amplitude;    // overall vertex-displacement multiplier (wave height)
    float u_swell_frequency;    // spatial-frequency multiplier in the sine swell (wavelength)
    float u_swell_speed;        // time multiplier in the sine swell (animation speed)
};

in vec3 a_pos;

void main() {
    // Same three-octave swell as water.glsl @vs — keep these in
    // lockstep so the mask covers exactly the same screen pixels
    // the visible cap covers. If the coefficients drift, the
    // composite-pass meniscus will fire at the wrong screen line.
    vec3 n = normalize(a_pos);
    float t  = u_time * u_swell_speed;
    float fx = u_swell_frequency;
    float swell = 0.0;
    swell += sin(t * 0.9 + a_pos.x * 1.4 * fx + a_pos.z * 0.6 * fx) * 0.18;
    swell += sin(t * 1.3 - a_pos.x * 0.7 * fx + a_pos.z * 1.2 * fx) * 0.12;
    swell += sin(t * 1.7 + a_pos.x * 2.3 * fx - a_pos.z * 1.9 * fx) * 0.06;
    swell *= u_swell_amplitude;

    vec3 p = a_pos + n * swell;
    gl_Position = u_vp * vec4(p, 1.0);
}
@end


@fs water_mask_fs

out vec4 frag_color;

void main() {
    // Single bit of information: this pixel is covered by the cap.
    // The mask attachment is configured to clear to (0,0,0,0) so any
    // pixel without a cap fragment stays at alpha=0.
    frag_color = vec4(1.0, 0.0, 0.0, 1.0);
}
@end


@program water_mask water_mask_vs water_mask_fs
