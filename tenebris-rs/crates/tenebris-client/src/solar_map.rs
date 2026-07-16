//! 3D orbital map mode (toggled with O) - the navigation scene for
//! interplanetary flight.
//!
//! Not a menu: toggling the map detaches the REAL scene camera and hands
//! it to this module. The world keeps rendering (and the rocket keeps
//! flying - key controls stay live), but the eye pulls out to a
//! drag-orbit / wheel-zoom camera framing whatever body is focused, with
//! the whole system's orbit rings drawn in 3D (`nav_ui::draw_map_orbits`)
//! and the sun rendered at its TRUE position and scale. KSP's map view,
//! Tenebris flavour.
//!
//! The fly-out panel on the right lists every body - baked lit-globe
//! thumbnail, FOCUS button (centre the camera there) and TGT button (set
//! the maneuver target, shared with the navball + in-world halo via
//! `nav_ui::set_target`) - plus a MY SHIP row at the top so the camera
//! can always come home to the player.
//!
//! Camera model: spherical orbit around the focus - yaw/pitch from mouse
//! drag anywhere outside the panel, distance from the wheel, limits and
//! sensitivities from solar.yaml (`map_*`).

#![allow(dead_code)]

use sokol::app as sapp;

use tenebris_core::math::{dvec3_add, dvec3_make, dvec3_sub, dvec3_to_vec3, DVec3};
use tenebris_core::orbit;
use tenebris_core::planet::{self, BodyId};

use crate::gfx_math::{mat4_look_at, mat4_perspective, Mat4};
use crate::nav_ui::{self, Target};

use std::cell::RefCell;

/* ---------------------------------------------------------------------- */
/* State.                                                                  */

/// What the map camera is centred on.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Focus {
    /// The player / rocket - the map's home view.
    Ship,
    Body(BodyId),
    /// The orbital station (rides Tenebris orbit).
    Station,
}

use crate::player_ctrl::PlayerCtrl;
use std::rc::Rc;
pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

thread_local! {
    static PLAYER: RefCell<Option<PlayerHandle>> = const { RefCell::new(None) };
}

/// Provide the player handle the WARP buttons teleport (fed each frame from
/// the egui dispatch, like the other survival screens).
pub fn set_player(p: Option<PlayerHandle>) {
    PLAYER.with(|c| *c.borrow_mut() = p);
}

/// Is the debug WARP (teleport) button enabled in the map? Gated on the
/// `map_teleport` solar-config flag so it ships off unless a world turns it on.
fn teleport_enabled() -> bool {
    tenebris_core::config::solar().map_teleport > 0.5
}

struct MapScreen {
    open: bool,
    /// Body the player is anchored to (frame for the orbit transforms).
    active: BodyId,
    /// Player position in the render frame (the SHIP focus + marker).
    player_world: DVec3,
    focus: Focus,
    /// Camera spherical angles about the focus, radians.
    yaw: f32,
    pitch: f32,
    /// Camera distance from the focus, metres.
    dist_m: f64,
}

thread_local! {
    static G: RefCell<MapScreen> = const {
        RefCell::new(MapScreen {
            open: false,
            active: BodyId::Tenebris,
            player_world: DVec3 { x: 0.0, y: 0.0, z: 0.0 },
            focus: Focus::Ship,
            yaw: 0.7,
            pitch: 0.55,
            dist_m: 0.0, /* 0 = "apply default on open" */
        })
    };
}

pub fn is_open() -> bool {
    G.with(|c| c.borrow().open)
}

pub fn close() {
    G.with(|c| c.borrow_mut().open = false);
}

/// Toggle map mode (wired to O in app). Releases pointer lock on open so
/// the fly-out + drag work; re-locks on close.
pub fn toggle() {
    let now_open = G.with(|c| {
        let mut g = c.borrow_mut();
        g.open = !g.open;
        if g.open && g.dist_m <= 0.0 {
            g.dist_m = tenebris_core::config::solar().map_ship_default_dist_m as f64;
        }
        g.open
    });
    if now_open {
        crate::screens::take_focus(crate::screens::Screen::SolarMap);
    } else {
        crate::screens::grab_pointer();
    }
}

/// Per-frame state feed from app: anchor body + player position.
pub fn set_active(id: BodyId, player_world: DVec3) {
    G.with(|c| {
        let mut g = c.borrow_mut();
        g.active = id;
        g.player_world = player_world;
    });
}

/// Point the camera at a body (dev hook + panel FOCUS buttons).
pub fn set_focus(f: Focus) {
    G.with(|c| {
        let mut g = c.borrow_mut();
        g.focus = f;
        /* Re-seat the distance to frame the new subject. */
        let sc = tenebris_core::config::solar();
        g.dist_m = match f {
            Focus::Ship => sc.map_ship_default_dist_m as f64,
            Focus::Body(id) => planet::get(id).radius_m * 8.0,
            Focus::Station => 200.0,
        };
    });
}

/// WARP the player to `id`: teleports the SHIP if flying (keeps them in
/// space, still flying) or the walking player onto the surface otherwise,
/// then closes the map so they arrive there. Debug/creative - gated on the
/// map_teleport config at the button.
fn warp_to_body(id: BodyId) {
    if let Some(player) = PLAYER.with(|c| c.borrow().clone()) {
        let b = planet::get(id);
        if crate::rocket_ride::is_riding() {
            crate::player_ctrl::teleport_ride_to_body(&mut player.borrow_mut(), &b);
        } else {
            crate::player_ctrl::teleport_to(&mut player.borrow_mut(), &b);
        }
        if let Some(w) = crate::renderer::world_for_body(id as u32) {
            crate::renderer::set_active_world(&w);
        }
    }
    end_warp();
}

/// WARP to the orbital station: the ship stands off beside it (matched to
/// its velocity) if flying, or the walking player lands on the deck.
fn warp_to_station() {
    if let Some(player) = PLAYER.with(|c| c.borrow().clone()) {
        if crate::rocket_ride::is_riding() {
            crate::player_ctrl::teleport_ride_to_station(&mut player.borrow_mut());
        } else {
            crate::player_ctrl::teleport_to_station(&mut player.borrow_mut());
        }
        let ten = planet::get(BodyId::Tenebris);
        if let Some(w) = crate::renderer::world_for_body(ten.id as u32) {
            crate::renderer::set_active_world(&w);
        }
    }
    end_warp();
}

/// Close the map after a warp and restore the right cursor state: locked
/// for on-foot mouse-look, free while flying (the flight panel is clickable).
fn end_warp() {
    close();
    if !crate::rocket_ride::is_riding() {
        crate::screens::grab_pointer();
    }
}

/// While open: swallow mouse events (egui + the drag-orbit own the
/// pointer) and the close keys; let every OTHER key through so the
/// rocket keeps flying while you watch the map. Returns true when
/// consumed.
pub fn event(e: &sapp::Event) -> bool {
    G.with(|c| {
        let mut g = c.borrow_mut();
        if !g.open {
            return false;
        }
        match e._type {
            sapp::EventType::KeyDown => {
                let toggle_key = crate::controls::action_for_key(e.key_code)
                    == Some(crate::controls::Action::OpenSolarMap);
                if e.key_code == sapp::Keycode::Escape || toggle_key {
                    g.open = false;
                    crate::screens::grab_pointer();
                    return true;
                }
                false /* flight keys stay live in map view */
            }
            sapp::EventType::KeyUp | sapp::EventType::Char => false,
            /* Mouse is the map's: egui panel + drag-orbit + wheel (all
             * handled in egui_ui via the ctx input state). */
            _ => true,
        }
    })
}

/* ---------------------------------------------------------------------- */
/* Camera.                                                                 */

/// Focus position in the render frame right now.
fn focus_pos(g: &MapScreen, t: f64) -> DVec3 {
    match g.focus {
        Focus::Ship => g.player_world,
        Focus::Body(id) => orbit::apparent_pos(g.active, id, t),
        /* The station rides Tenebris orbit in world coords, the same frame
         * the ship marker (player_world) lives in. */
        Focus::Station => tenebris_core::station::orbit_pos(t),
    }
}

/// Distance limits for the current focus.
fn dist_limits(f: Focus) -> (f64, f64) {
    let sc = tenebris_core::config::solar();
    let min = match f {
        Focus::Ship => sc.map_ship_min_dist_m as f64,
        Focus::Body(id) => planet::get(id).radius_m * sc.map_min_dist_mult as f64,
        Focus::Station => 40.0,
    };
    (min, sc.map_max_dist_m as f64)
}

/// The map camera for this frame: (view, proj, eye). `None` when the map
/// is closed - app.rs falls through to the normal player/chase camera.
pub fn camera(aspect: f32) -> Option<(Mat4, Mat4, DVec3)> {
    let (open, focus, yaw, pitch, dist, active, player_world) = G.with(|c| {
        let g = c.borrow();
        (g.open, g.focus, g.yaw, g.pitch, g.dist_m, g.active, g.player_world)
    });
    if !open {
        return None;
    }
    let t = tenebris_core::world_time::seconds();
    let f = focus_pos(
        &MapScreen {
            open,
            active,
            player_world,
            focus,
            yaw,
            pitch,
            dist_m: dist,
        },
        t,
    );
    let (cy, sy) = (yaw.cos() as f64, yaw.sin() as f64);
    let (cp, sp) = (pitch.cos() as f64, pitch.sin() as f64);
    let off = dvec3_make(cp * cy * dist, sp * dist, cp * sy * dist);
    let eye = dvec3_add(f, off);
    let eye_f = dvec3_to_vec3(eye);
    let focus_f = dvec3_to_vec3(f);
    let view = mat4_look_at(
        eye_f,
        focus_f,
        tenebris_core::math::Vec3 { x: 0.0, y: 1.0, z: 0.0 },
    );
    let sc = tenebris_core::config::solar();
    /* Near plane scales with distance to keep depth precision sane from
     * 20 m ship views out to 800 km system views. */
    let znear = (dist as f32 * 0.001).clamp(0.5, 500.0);
    let proj = mat4_perspective(
        60.0 * (std::f32::consts::PI / 180.0),
        aspect,
        znear,
        sc.map_zfar_m,
    );
    Some((view, proj, eye))
}

/* ---------------------------------------------------------------------- */
/* Fly-out panel + drag/zoom input (egui).                                 */

const CARD_THUMB_PX: f32 = 40.0;
const PANEL_W: f32 = 240.0;
/// Wider panel when the WARP button is shown, so the extra pill has room
/// beside FOCUS/TGT without covering the body name.
const PANEL_W_WARP: f32 = 300.0;

fn panel_w() -> f32 {
    if teleport_enabled() {
        PANEL_W_WARP
    } else {
        PANEL_W
    }
}

/// Maneuver-target pink - matches nav_ui's TARGET_COL so the panel, the
/// navball marker, and the in-world halo read as one system.
const TGT_COL: egui::Color32 = egui::Color32::from_rgb(0xfa, 0x59, 0xbf);

/// The star-orbiting planets, in orbit order.
const PLANETS: [BodyId; 4] = [BodyId::Crag, BodyId::Tenebris, BodyId::Sequoia, BodyId::Frostbite];

/// Moons per planet (parented in orbit::elements).
fn moons_of(p: BodyId) -> &'static [BodyId] {
    match p {
        BodyId::Tenebris => &[BodyId::Luna, BodyId::Selene],
        BodyId::Sequoia => &[BodyId::Verdant, BodyId::Sprout],
        BodyId::Crag => &[BodyId::Quartz],
        BodyId::Frostbite => &[BodyId::Rime],
        _ => &[],
    }
}

fn asteroids() -> impl Iterator<Item = BodyId> {
    (0..10).filter_map(|i| BodyId::from_index(BodyId::Asteroid0 as i32 + i))
}

/// Small always-there MAP chip (top-right) so the system view is one
/// click away on foot or in flight - not just a key. Hidden while the
/// map itself is open (the fly-out owns that edge) - app gates it on
/// being in-game and unpaused.
pub fn egui_map_button(ctx: &egui::Context) {
    if is_open() {
        return;
    }
    let key = crate::controls::action_label(crate::controls::Action::OpenSolarMap);
    egui::Area::new(egui::Id::new("solar-map-chip"))
        .anchor(egui::Align2::RIGHT_TOP, egui::vec2(-10.0, 10.0))
        .show(ctx, |ui| {
            let btn = egui::Button::new(
                egui::RichText::new(format!("MAP [{key}]"))
                    .color(egui::Color32::from_rgb(0x9c, 0xb4, 0xd4)),
            )
            .fill(egui::Color32::from_rgba_unmultiplied(0x10, 0x14, 0x1c, 220));
            if ui.add(btn).clicked() {
                toggle();
            }
        });
}

pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let (focus, dist) = G.with(|c| {
        let g = c.borrow();
        (g.focus, g.dist_m)
    });

    /* ---- Fly-out body panel (right edge, slides in with the mode). ---- */
    egui::SidePanel::right("solar-bodies")
        .exact_width(panel_w())
        .resizable(false)
        .show_animated(ctx, true, |ui| {
            ui.add_space(4.0);
            ui.label(
                egui::RichText::new("SYSTEM BODIES")
                    .small()
                    .color(egui::Color32::from_rgb(0x8a, 0x94, 0xa8)),
            );
            ui.separator();
            egui::ScrollArea::vertical().auto_shrink([false, false]).show(ui, |ui| {
                ship_card(ui, focus);
                ui.add_space(2.0);
                /* The orbital station rides Tenebris orbit - list it right
                 * under MY SHIP since it's the near-space destination. */
                station_card(ui, focus);
                ui.add_space(2.0);
                for &id in &PLANETS {
                    body_card(ui, id, focus, 0.0);
                    for &mid in moons_of(id) {
                        body_card(ui, mid, focus, 14.0);
                    }
                }
                ui.add_space(4.0);
                ui.label(
                    egui::RichText::new("ASTEROID BELT")
                        .small()
                        .color(egui::Color32::from_rgb(0x6a, 0x74, 0x88)),
                );
                for id in asteroids() {
                    body_card(ui, id, focus, 0.0);
                }
            });
        });

    /* ---- HUD strip: focus / distance / target + hints. ---- */
    egui::Area::new(egui::Id::new("solar-hud"))
        .fixed_pos(egui::pos2(12.0, 10.0))
        .show(ctx, |ui| {
            egui::Frame::new()
                .fill(egui::Color32::from_rgba_unmultiplied(0x07, 0x09, 0x10, 200))
                .corner_radius(4.0)
                .inner_margin(egui::Margin::symmetric(8, 6))
                .show(ui, |ui| {
                    let focus_name = match focus {
                        Focus::Ship => "My Ship",
                        Focus::Body(id) => planet::get(id).name,
                        Focus::Station => "Orbital Station",
                    };
                    ui.label(
                        egui::RichText::new(format!(
                            "MAP - focus: {}  -  {}",
                            focus_name,
                            fmt_dist(dist)
                        ))
                        .color(egui::Color32::from_rgb(0xd8, 0xde, 0xe8)),
                    );
                    let tname = nav_ui::target_name();
                    if tname != "none" {
                        if ui
                            .small_button(
                                egui::RichText::new(format!("TGT {} [clear]", tname))
                                    .color(TGT_COL),
                            )
                            .clicked()
                        {
                            nav_ui::set_target(None);
                        }
                    }
                    ui.label(
                        egui::RichText::new("drag orbits - wheel zooms - O/Esc exits")
                            .small()
                            .color(egui::Color32::from_rgb(0x70, 0x76, 0x84)),
                    );
                });
        });

    /* ---- Drag-orbit + wheel zoom over the 3D view. ---- */
    let pointer_over_ui = ctx.wants_pointer_input() && ctx.is_pointer_over_area();
    if !pointer_over_ui {
        let (drag, scroll) = ctx.input(|i| {
            let drag = if i.pointer.primary_down() { i.pointer.delta() } else { egui::Vec2::ZERO };
            /* Sum this frame's RAW wheel events, not smooth_scroll_delta:
             * the zoom is a discrete multiplicative step per notch, and
             * egui spreads a smoothed delta across several frames - which
             * would fire the step several times for one notch. Raw is
             * nonzero only on the frame the notch arrives. */
            let scroll: f32 = i
                .raw
                .events
                .iter()
                .filter_map(|e| match e {
                    egui::Event::MouseWheel { delta, .. } => Some(delta.y),
                    _ => None,
                })
                .sum();
            (drag, scroll)
        });
        let sc = tenebris_core::config::solar();
        if drag != egui::Vec2::ZERO || scroll.abs() > 0.0 {
            G.with(|c| {
                let mut g = c.borrow_mut();
                g.yaw += drag.x * sc.map_drag_sens;
                g.pitch = (g.pitch + drag.y * sc.map_drag_sens)
                    .clamp(-1.45, 1.45);
                if scroll.abs() > 0.0 {
                    let k = if scroll > 0.0 {
                        1.0 / sc.map_zoom_step as f64
                    } else {
                        sc.map_zoom_step as f64
                    };
                    let (min, max) = dist_limits(g.focus);
                    g.dist_m = (g.dist_m * k).clamp(min, max);
                }
            });
        }
    }
}

fn fmt_dist(m: f64) -> String {
    if m >= 1000.0 {
        format!("{:.1} km", m / 1000.0)
    } else {
        format!("{:.0} m", m)
    }
}

/// The MY SHIP row: focus-only (targeting yourself is a maneuver no one
/// needs).
fn ship_card(ui: &mut egui::Ui, focus: Focus) {
    let is_focus = focus == Focus::Ship;
    let (rect, resp) = ui.allocate_exact_size(
        egui::vec2(panel_w() - 16.0, CARD_THUMB_PX + 6.0),
        egui::Sense::click(),
    );
    let p = ui.painter_at(rect);
    let bg = if is_focus {
        egui::Color32::from_rgb(0x26, 0x2c, 0x3a)
    } else if resp.hovered() {
        egui::Color32::from_rgb(0x1e, 0x22, 0x2c)
    } else {
        egui::Color32::from_rgb(0x14, 0x17, 0x1e)
    };
    p.rect_filled(rect, 4.0, bg);
    /* A little ship glyph: white diamond, echoing the map marker. */
    let cx = rect.min + egui::vec2(4.0 + CARD_THUMB_PX * 0.5, 3.0 + CARD_THUMB_PX * 0.5);
    let d = 9.0;
    p.add(egui::Shape::convex_polygon(
        vec![
            cx + egui::vec2(0.0, -d),
            cx + egui::vec2(d, 0.0),
            cx + egui::vec2(0.0, d),
            cx + egui::vec2(-d, 0.0),
        ],
        egui::Color32::WHITE,
        egui::Stroke::NONE,
    ));
    p.text(
        egui::pos2(rect.min.x + CARD_THUMB_PX + 12.0, rect.center().y),
        egui::Align2::LEFT_CENTER,
        "My Ship",
        egui::FontId::proportional(13.0),
        if is_focus { egui::Color32::WHITE } else { egui::Color32::from_rgb(0xc2, 0xc8, 0xd4) },
    );
    let btn = focus_btn_rect(rect);
    let btn_resp = ui.interact(btn, resp.id.with("focus"), egui::Sense::click());
    draw_pill(&p, btn, "FOCUS", btn_resp.hovered(), is_focus);
    if btn_resp.clicked() || resp.clicked() {
        set_focus(Focus::Ship);
    }
}

fn focus_btn_rect(card: egui::Rect) -> egui::Rect {
    egui::Rect::from_min_size(
        egui::pos2(card.max.x - 88.0, card.center().y - 10.0),
        egui::vec2(44.0, 20.0),
    )
}

fn tgt_btn_rect(card: egui::Rect) -> egui::Rect {
    egui::Rect::from_min_size(
        egui::pos2(card.max.x - 40.0, card.center().y - 10.0),
        egui::vec2(34.0, 20.0),
    )
}

/// WARP pill - sits left of FOCUS (only shown when teleport is enabled, so
/// the panel is widened to make room).
fn warp_btn_rect(card: egui::Rect) -> egui::Rect {
    egui::Rect::from_min_size(
        egui::pos2(card.max.x - 142.0, card.center().y - 10.0),
        egui::vec2(48.0, 20.0),
    )
}

/// Draw the WARP pill on `card` and run `on_click` when pressed. Amber so it
/// reads as a distinct "jump there now" action from FOCUS/TGT.
fn warp_pill(ui: &mut egui::Ui, card: egui::Rect, id_src: egui::Id, on_click: impl FnOnce()) {
    let r = warp_btn_rect(card);
    let resp = ui.interact(r, id_src.with("warp"), egui::Sense::click());
    let p = ui.painter_at(card);
    let bg = if resp.hovered() {
        egui::Color32::from_rgb(0x6a, 0x54, 0x1c)
    } else {
        egui::Color32::from_rgb(0x3a, 0x2e, 0x12)
    };
    p.rect_filled(r, 3.0, bg);
    p.text(
        r.center(),
        egui::Align2::CENTER_CENTER,
        "WARP",
        egui::FontId::proportional(10.0),
        egui::Color32::from_rgb(0xf0, 0xc8, 0x60),
    );
    if resp.clicked() {
        on_click();
    }
}

fn draw_pill(p: &egui::Painter, r: egui::Rect, label: &str, hovered: bool, lit: bool) {
    let bg = if lit {
        egui::Color32::from_rgb(0x3a, 0x62, 0x8f)
    } else if hovered {
        egui::Color32::from_rgb(0x2a, 0x33, 0x44)
    } else {
        egui::Color32::from_rgb(0x1c, 0x22, 0x2e)
    };
    p.rect_filled(r, 3.0, bg);
    p.text(
        r.center(),
        egui::Align2::CENTER_CENTER,
        label,
        egui::FontId::proportional(10.0),
        if lit { egui::Color32::WHITE } else { egui::Color32::from_rgb(0x9c, 0xb4, 0xd4) },
    );
}

/// One body row: thumbnail + name + FOCUS + TGT.
fn body_card(ui: &mut egui::Ui, id: BodyId, focus: Focus, indent: f32) {
    let b = planet::get(id);
    let is_focus = focus == Focus::Body(id);
    let is_tgt = nav_ui::target() == Some(Target::Body(id));

    let (rect, resp) = ui.allocate_exact_size(
        egui::vec2(panel_w() - 16.0, CARD_THUMB_PX + 6.0),
        egui::Sense::click(),
    );
    let p = ui.painter_at(rect);
    let bg = if is_focus {
        egui::Color32::from_rgb(0x26, 0x2c, 0x3a)
    } else if resp.hovered() {
        egui::Color32::from_rgb(0x1e, 0x22, 0x2c)
    } else {
        egui::Color32::from_rgb(0x14, 0x17, 0x1e)
    };
    p.rect_filled(rect, 4.0, bg);
    if is_tgt {
        p.rect_stroke(rect, 4.0, egui::Stroke::new(1.5, TGT_COL), egui::StrokeKind::Inside);
    }

    /* Baked lit-globe thumbnail. */
    let thumb = egui::Rect::from_min_size(
        rect.min + egui::vec2(4.0 + indent, 3.0),
        egui::vec2(CARD_THUMB_PX, CARD_THUMB_PX),
    );
    let (u0, v0, u1, v1) = crate::renderer::body_gallery_uv(id);
    p.image(
        crate::egui_layer::BODY_TEX,
        thumb,
        egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1)),
        egui::Color32::WHITE,
    );

    p.text(
        egui::pos2(thumb.max.x + 8.0, rect.center().y),
        egui::Align2::LEFT_CENTER,
        b.name,
        egui::FontId::proportional(13.0),
        if is_focus { egui::Color32::WHITE } else { egui::Color32::from_rgb(0xc2, 0xc8, 0xd4) },
    );

    let fbtn = focus_btn_rect(rect);
    let fresp = ui.interact(fbtn, resp.id.with("focus"), egui::Sense::click());
    draw_pill(&p, fbtn, "FOCUS", fresp.hovered(), is_focus);

    let tbtn = tgt_btn_rect(rect);
    let tresp = ui.interact(tbtn, resp.id.with("tgt"), egui::Sense::click());
    let tbg = if is_tgt {
        TGT_COL
    } else if tresp.hovered() {
        egui::Color32::from_rgb(0x3a, 0x2c, 0x38)
    } else {
        egui::Color32::from_rgb(0x22, 0x1c, 0x24)
    };
    p.rect_filled(tbtn, 3.0, tbg);
    p.text(
        tbtn.center(),
        egui::Align2::CENTER_CENTER,
        "TGT",
        egui::FontId::proportional(10.0),
        if is_tgt { egui::Color32::BLACK } else { TGT_COL },
    );

    if teleport_enabled() {
        warp_pill(ui, rect, resp.id, || warp_to_body(id));
    }

    if tresp.clicked() {
        nav_ui::set_target(if is_tgt { None } else { Some(Target::Body(id)) });
    } else if fresp.clicked() || resp.clicked() {
        set_focus(Focus::Body(id));
    }
}

/// The orbital-station row: station glyph + name + FOCUS + (config-gated)
/// WARP. No TGT - the nav target system is body-keyed; docking is the
/// station's "target" mechanic.
fn station_card(ui: &mut egui::Ui, focus: Focus) {
    let is_focus = focus == Focus::Station;
    let (rect, resp) = ui.allocate_exact_size(
        egui::vec2(panel_w() - 16.0, CARD_THUMB_PX + 6.0),
        egui::Sense::click(),
    );
    let p = ui.painter_at(rect);
    let bg = if is_focus {
        egui::Color32::from_rgb(0x26, 0x2c, 0x3a)
    } else if resp.hovered() {
        egui::Color32::from_rgb(0x1e, 0x22, 0x2c)
    } else {
        egui::Color32::from_rgb(0x14, 0x17, 0x1e)
    };
    p.rect_filled(rect, 4.0, bg);
    /* A little ring glyph for the drum (echoes the station's shape). */
    let c = rect.min + egui::vec2(4.0 + CARD_THUMB_PX * 0.5, 3.0 + CARD_THUMB_PX * 0.5);
    p.circle_stroke(c, 12.0, egui::Stroke::new(2.5, egui::Color32::from_rgb(0x8c, 0xd0, 0xf0)));
    p.text(
        egui::pos2(rect.min.x + CARD_THUMB_PX + 12.0, rect.center().y),
        egui::Align2::LEFT_CENTER,
        "Orbital Station",
        egui::FontId::proportional(13.0),
        if is_focus { egui::Color32::WHITE } else { egui::Color32::from_rgb(0xc2, 0xc8, 0xd4) },
    );
    let fbtn = focus_btn_rect(rect);
    let fresp = ui.interact(fbtn, resp.id.with("focus"), egui::Sense::click());
    draw_pill(&p, fbtn, "FOCUS", fresp.hovered(), is_focus);

    if teleport_enabled() {
        warp_pill(ui, rect, resp.id, warp_to_station);
    }

    if fresp.clicked() || resp.clicked() {
        set_focus(Focus::Station);
    }
}

/* ---------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn toggle_flips_and_close_all_sees_it() {
        assert!(!is_open());
        G.with(|c| c.borrow_mut().open = true);
        assert!(is_open());
        close();
        assert!(!is_open());
    }

    #[test]
    fn every_planet_has_its_moons_charted() {
        // The moons_of table must cover every parented body in the orbit
        // sim, or the fly-out silently drops a moon.
        for &pid in &PLANETS {
            for &mid in moons_of(pid) {
                let e = orbit::elements(mid);
                assert_eq!(e.parent, Some(pid), "{mid:?} listed under wrong parent");
            }
        }
        let charted: Vec<BodyId> =
            PLANETS.iter().flat_map(|&p| moons_of(p).iter().copied()).collect();
        for id in BodyId::ALL {
            if let Some(parent) = orbit::elements(id).parent {
                assert!(
                    charted.contains(&id),
                    "moon {id:?} (parent {parent:?}) missing from the fly-out"
                );
            }
        }
    }

    /// Every body the fly-out lists must have a thumbnail cell.
    #[test]
    fn gallery_covers_every_pickable_body() {
        let mut listed: Vec<BodyId> = Vec::new();
        for &p in &PLANETS {
            listed.push(p);
            listed.extend(moons_of(p));
        }
        listed.extend(asteroids());
        for id in listed {
            let (u0, v0, u1, v1) = crate::renderer::body_gallery_uv(id);
            assert!(u1 > u0 && v1 > v0, "{id:?} has a degenerate gallery uv");
            assert!(u1 <= 1.0 && v1 <= 1.0, "{id:?} uv out of atlas");
        }
    }

    /// The map camera only exists while the mode is on, orbits the focus
    /// at the configured distance, and clamps zoom per focus.
    #[test]
    fn camera_exists_only_when_open_and_respects_limits() {
        assert!(camera(1.6).is_none(), "closed map must not hijack the camera");
        G.with(|c| {
            let mut g = c.borrow_mut();
            g.open = true;
            g.focus = Focus::Body(BodyId::Tenebris);
            g.dist_m = 5_000.0;
            g.player_world = DVec3 { x: 0.0, y: 0.0, z: 0.0 };
        });
        let (_, _, eye) = camera(1.6).expect("open map provides the camera");
        let t = tenebris_core::world_time::seconds();
        let f = orbit::apparent_pos(BodyId::Tenebris, BodyId::Tenebris, t);
        let d = ((eye.x - f.x).powi(2) + (eye.y - f.y).powi(2) + (eye.z - f.z).powi(2)).sqrt();
        assert!((d - 5_000.0).abs() < 1.0, "eye sits at dist_m from the focus, got {d}");
        let (min, max) = dist_limits(Focus::Body(BodyId::Tenebris));
        assert!(min > 0.0 && max > min, "sane zoom band: {min}..{max}");
        G.with(|c| c.borrow_mut().open = false);
    }
}
