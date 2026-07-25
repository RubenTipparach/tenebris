//! 3D backdrop for the boot-time menu screens: Tenebris seen from low
//! orbit, slowly spinning behind the 2D menu panels.
//!
//! The menu appears at boot, before any save is picked and before World
//! generation has even started (see app.rs's init/menu sequencing - "boot
//! no longer loads any terrain, because the menu doesn't need it"). To
//! show REAL detailed chunked terrain (not just a baked-noise impostor)
//! this module drives its own throwaway, randomly-seeded Tenebris World
//! through the exact same Gen -> Light -> (chunked mesh) pipeline the real
//! loader uses (see app.rs's `LoadStage`), budgeted per frame so the menu
//! stays responsive while it happens. Until that finishes it falls back to
//! the cheap distant-LOD impostor (`renderer::draw_menu_planet`) so the
//! menu never looks empty while waiting.
//!
//! This decorative world is NOT `app.world` and must never be mistaken for
//! a real save - see `renderer::clear_bodies_for_new_session`, called from
//! `start_world_regen` before any real game world registers, which is what
//! stops this backdrop from leaking into actual gameplay.
//!
//! Call [`draw`] once per frame from the menu's existing render branch,
//! BEFORE the 2D menu content, inside the same swapchain pass - it just
//! issues 3D draw calls with depth testing on; sokol_gl/egui draw without
//! depth testing afterward, so the 2D panels land on top unconditionally.

use std::cell::RefCell;
use std::rc::Rc;

use sokol::time as stm;

use crate::gfx_math::{mat4_look_at, mat4_perspective};
use crate::hex_mesher;
use crate::renderer::{self, RenderEnv};
use tenebris_core::math::{vec3_normalize, Vec3};
use tenebris_core::planet::{self, BodyConfig, BodyId};
use tenebris_core::world::World;

/// Camera altitude ABOVE THE SURFACE (not from the centre) - a genuine low
/// orbit, close enough that the chunked terrain's real detail reads clearly
/// instead of a distant smoothed-over globe.
const ORBIT_ALTITUDE_M: f32 = 250.0;
/// Camera elevation above the "equatorial" plane, as a fraction of the
/// centre distance - a gentle three-quarter look-down angle, not a flat
/// side-on view.
const ORBIT_ELEVATION_FRAC: f32 = 0.28;
/// Planet spin rate, radians/second, used only for the distant-impostor
/// fallback while the real terrain is still generating.
const SPIN_RATE_RAD_S: f32 = 0.05;
/// Camera orbit angular rate, radians/second - the real chunked terrain
/// doesn't spin itself (only the distant-impostor fallback's model matrix
/// does), so once generation finishes the scene would otherwise freeze with
/// a fixed eye/sun. Orbiting the camera instead keeps BOTH states in
/// continuous motion, and is a more literal "viewing from orbit" besides.
const CAM_ORBIT_RATE_RAD_S: f32 = 0.05;

/// Per-frame generation budget while the menu is up - same shape as the
/// real loader's LOADER_BUDGET_MS/LOADER_SLICE_TILES (app.rs), just its own
/// smaller constants since this runs behind a totally different, decorative
/// world and shouldn't compete too hard with the menu's own frame time.
const GEN_BUDGET_MS: f64 = 20.0;
const GEN_SLICE_TILES: i32 = 4096;
/// Global cap on relight slices (mirrors app.rs's LOADER_LIGHT_MAX_SLICES).
const LIGHT_MAX_SLICES: i32 = 400;

/// Fixed key-light direction - the menu isn't tied to any world's real time
/// of day, so (unlike frame_inner's `orbit::sun_direction`) this never
/// rotates; only the planet spins under it.
const SUN_DIR: Vec3 = Vec3 { x: -0.5, y: 0.35, z: 0.8 };
/// A menu-only ambient fill, brighter than gameplay's realistic default
/// (`Vec3{0.35,0.35,0.40}` in frame_inner): the terrain's night side used to
/// read as a near-black void next to the starfield - fine physically, a
/// "looks broken" impression on a backdrop meant to always look good. This
/// is presentation, not simulation, so it gets its own tuned constant.
const MENU_TERRAIN_AMBIENT: Vec3 = Vec3 { x: 0.55, y: 0.55, z: 0.62 };

#[derive(Clone, Copy, PartialEq, Eq)]
enum Stage {
    Gen,
    Light,
    Ready,
}

struct MenuWorld {
    world: Rc<RefCell<World>>,
    stage: Stage,
    light_slices: i32,
    last_time: u64,
}

thread_local! {
    static MENU_WORLD: RefCell<Option<MenuWorld>> = const { RefCell::new(None) };
}

/// Create the decorative world on first use. A random (not the compiled
/// default) seed so biomes/terrain actually activate (`biomes_active`) and
/// look different each launch - "just cache some random world on startup".
/// Mutates the global body table's Tenebris seed via `planet::set_seed`,
/// same as a real save entry does, but harmlessly: `World::create` snapshots
/// its own private copy of the body/seed, and any REAL save later sets its
/// own seed explicitly before creating its World (`start_world_regen`),
/// overwriting whatever this leaves behind.
fn ensure_menu_world() {
    MENU_WORLD.with(|c| {
        if c.borrow().is_some() {
            return;
        }
        let seed = stm::now() ^ 0x9E37_79B9_7F4A_7C15u64;
        planet::set_seed(BodyId::Tenebris, seed);
        let mut body = planet::get(BodyId::Tenebris);
        /* Pin to the world origin regardless of where the REAL Tenebris
         * sits after app.rs's boot-time reposition_heliocentric() (~150 km
         * out, on the star's orbit). This body only exists as a menu prop -
         * a copy of the config, never the live global table - so nothing
         * else observes this override. Keeping it at true (0,0,0) matches
         * this module's camera math (which assumes the body is at the
         * origin) AND sidesteps the heliocentric-scale f32 precision issue
         * entirely: draw_world reads body.world_pos as a raw f32 cast of
         * this position with no floating-origin rebase (that rebase is
         * renderer::begin_frame's job, which this lightweight menu path
         * deliberately never calls - see draw()) - at ~150 km that cast
         * alone costs visible centimetres of jitter, at true 0 it costs
         * nothing. */
        body.pos_x = 0.0;
        body.pos_y = 0.0;
        body.pos_z = 0.0;
        let subdivisions = planet::subdivisions_for_radius(body.radius_m);
        let world = Rc::new(RefCell::new(World::create(&body, subdivisions)));
        *c.borrow_mut() = Some(MenuWorld {
            world,
            stage: Stage::Gen,
            light_slices: 0,
            last_time: stm::now(),
        });
    });
}

/// Advance the decorative world by one budgeted slice (mirrors app.rs's
/// real loader: Gen -> Light; the chunked mesh itself happens the first
/// time `draw_world` is called on it, exactly like a real body). Returns
/// `Some((world, dt_seconds))` once ready to draw as real terrain.
fn step_menu_world() -> Option<(Rc<RefCell<World>>, f32)> {
    MENU_WORLD.with(|c| {
        let mut cb = c.borrow_mut();
        let mw = cb.as_mut()?;
        let t0 = stm::now();
        let in_budget = |t0: u64| stm::sec(stm::since(t0)) * 1000.0 < GEN_BUDGET_MS;
        match mw.stage {
            Stage::Gen => {
                let mut w = mw.world.borrow_mut();
                while !w.gen_complete() && in_budget(t0) {
                    w.stream_gen(GEN_SLICE_TILES);
                }
                if w.gen_complete() {
                    mw.stage = Stage::Light;
                }
            }
            Stage::Light => {
                let mut w = mw.world.borrow_mut();
                while w.light.is_dirty() && mw.light_slices < LIGHT_MAX_SLICES && in_budget(t0) {
                    hex_mesher::relight_if_needed(&mut w);
                    mw.light_slices += 1;
                }
                if !w.light.is_dirty() || mw.light_slices >= LIGHT_MAX_SLICES {
                    mw.stage = Stage::Ready;
                }
            }
            Stage::Ready => {}
        }
        if mw.stage != Stage::Ready {
            return None;
        }
        let dt = stm::sec(stm::laptime(&mut mw.last_time)) as f32;
        Some((mw.world.clone(), dt))
    })
}

/// Build the `RenderEnv` `draw_skybox`/`draw_world` read for lighting +
/// atmosphere - mirroring frame_inner's construction (app.rs), simplified
/// for this module's non-rebased scene (see `renderer::set_env`'s doc: this
/// body sits at the true origin and `eye` is a true small-scale position,
/// so `camera_world` is `eye` directly, not the floating-origin zero
/// gameplay uses). Real Tenebris atmosphere config (`body`'s atmo_* fields),
/// a fixed sun direction, and a brighter-than-realistic ambient fill (see
/// `MENU_TERRAIN_AMBIENT`).
fn build_env(eye: Vec3, body: &BodyConfig) -> RenderEnv {
    let sun_dir = vec3_normalize(SUN_DIR);
    let has_atmo = planet::body_has_atmosphere(body);
    let radius_mult = if body.atmo_radius_mult > 0.0 { body.atmo_radius_mult } else { 1.3 };
    let lower_mult = if body.atmo_lower_radius_mult > 0.0 { body.atmo_lower_radius_mult } else { 1.0 };
    let rayleigh = if body.atmo_rayleigh_scale > 0.0 { body.atmo_rayleigh_scale } else { 1.0 };
    let mie = if body.atmo_mie_scale > 0.0 { body.atmo_mie_scale } else { 0.05 };
    let sun_int = if body.atmo_sun_intensity > 0.0 { body.atmo_sun_intensity } else { 30.0 };
    let sunset = if body.atmo_sunset_strength > 0.0 { body.atmo_sunset_strength } else { 0.85 };
    let scale_h = if body.atmo_scale_height > 0.0 { body.atmo_scale_height } else { 0.25 };
    let mie_g = if body.atmo_mie_g > 0.0 { body.atmo_mie_g } else { 0.76 };
    let wl = body.atmo_wavelengths;
    let wavelengths = if wl.x + wl.y + wl.z > 0.0 { wl } else { Vec3 { x: 5.602, y: 9.473, z: 19.644 } };
    let st = body.atmo_sunset_tint;
    let sunset_tint = if st.x + st.y + st.z > 0.0 { st } else { Vec3 { x: 1.30, y: 1.00, z: 0.60 } };
    let sg_ = body.atmo_sunset_glow;
    let sunset_glow = if sg_.x + sg_.y + sg_.z > 0.0 { sg_ } else { Vec3 { x: 1.00, y: 0.65, z: 0.25 } };
    let sh = body.atmo_sunset_horizon;
    let sunset_horizon = if sh.x + sh.y + sh.z > 0.0 { sh } else { Vec3 { x: 0.80, y: 0.40, z: 0.15 } };
    let planet_r = body.radius_m as f32;
    let clip_radius = planet_r * lower_mult;
    let atmo_r = planet_r * radius_mult;
    RenderEnv {
        sun_dir,
        ambient: MENU_TERRAIN_AMBIENT,
        atmo_planet_center: Vec3::default(), /* body pinned to the origin */
        atmo_planet_radius: clip_radius,
        atmo_radius: atmo_r,
        atmo_strength: if has_atmo { 1.0 } else { 0.0 },
        atmo_rayleigh_scale: rayleigh,
        atmo_mie_scale: mie,
        atmo_sun_intensity: sun_int,
        atmo_sunset_strength: sunset,
        atmo_wavelengths: wavelengths,
        atmo_mie_g: mie_g,
        atmo_scale_height: scale_h,
        atmo_sunset_tint: sunset_tint,
        atmo_sunset_glow: sunset_glow,
        atmo_sunset_horizon: sunset_horizon,
        /* Not rebased (no floating origin here - see the doc above): both
         * the camera and the body sit at their true small-scale positions,
         * so the "rebased" and "true" camera are the same value. */
        camera_world: eye,
        camera_world_d: tenebris_core::math::DVec3 {
            x: eye.x as f64,
            y: eye.y as f64,
            z: eye.z as f64,
        },
        ..Default::default()
    }
}

/// Draw the orbiting-Tenebris backdrop: starfield always, then either the
/// real chunked terrain (once the decorative world finishes generating) or
/// the cheap distant-LOD impostor as a placeholder while it does.
pub fn draw(screen_w: f32, screen_h: f32) {
    if screen_w <= 0.0 || screen_h <= 0.0 {
        return;
    }
    ensure_menu_world();
    let ready = step_menu_world();

    let body = planet::get(BodyId::Tenebris);
    let dist = body.radius_m as f32 + ORBIT_ALTITUDE_M;
    let theta = stm::sec(stm::now()) as f32 * CAM_ORBIT_RATE_RAD_S;
    let ground_dist = dist * (1.0 - ORBIT_ELEVATION_FRAC * ORBIT_ELEVATION_FRAC).max(0.0).sqrt();
    let eye = Vec3 {
        x: theta.sin() * ground_dist,
        y: dist * ORBIT_ELEVATION_FRAC,
        z: theta.cos() * ground_dist,
    };
    let view = mat4_look_at(eye, Vec3 { x: 0.0, y: 0.0, z: 0.0 }, Vec3 { x: 0.0, y: 1.0, z: 0.0 });
    let proj = mat4_perspective(45.0f32.to_radians(), screen_w / screen_h, 1.0, dist * 10.0);

    renderer::set_env(build_env(eye, &body));
    renderer::draw_skybox(view, proj);
    match ready {
        Some((world, dt)) => {
            /* The chunked-vs-distant LOD decision measures from the LOD
             * anchor (real gameplay's player position), falling back to
             * r.env.camera_world_d only when unset - and this menu path
             * never runs the real per-frame renderer::begin_frame that
             * would otherwise keep that env current. Without this, the
             * anchor stayed stuck wherever gameplay last left it (or its
             * zeroed default), so the freshly-registered terrain read as
             * "camera too far" and immediately unloaded back to the
             * distant impostor the same frame it finished generating. */
            renderer::set_lod_anchor(eye);
            renderer::draw_world(view, proj, &world, eye, dt);
            /* Paired with draw_world exactly like real gameplay does: if
             * this body is ever NOT in its chunked state (a stale anchor,
             * a future re-approach edge case), draw_moons still shows it
             * as the distant-LOD impostor rather than nothing at all. */
            renderer::draw_moons(view, proj, eye);
        }
        None => {
            /* Independent of the renderer's r.time_seconds, which only
             * advances inside draw_world - not called yet while we're
             * still generating. sokol's own clock ticks from boot
             * regardless of what screen is showing. */
            let spin_rad = stm::sec(stm::now()) as f32 * SPIN_RATE_RAD_S;
            renderer::draw_menu_planet(view, proj, eye, spin_rad);
        }
    }
}
