//! Solar-system map (egui overlay, toggled with O) - the navigation
//! scene for interplanetary flight.
//!
//! A live top-down chart of the whole star system, driven by the same
//! on-rails orbit sim the sky uses (`core::orbit`), so what the map shows
//! IS where the bodies are: the star, each planet's orbit ring, every
//! major planet + its moons, the asteroid belt, and the player's OWN
//! live position (via `orbit::world_to_heliocentric`) - so a rocket
//! coasting between planets watches its marker crawl across the chart.
//!
//! Navigation controls:
//! - **Camera target**: pick any body in the side menu (thumbnail cards,
//!   baked from the same colour sampling the distant LOD uses) or click
//!   it on the chart - the view centres and follows it. SUN resets.
//! - **Maneuver target**: the TGT button on a card (or right-click on
//!   the chart) routes through `nav_ui::set_target`, the same target
//!   the in-flight halo cage + navball marker highlight - one target
//!   system, two views. The map highlights it with a pulsing ring.
//! - **Zoom**: +/- buttons or mouse wheel over the chart.
//!
//! Moons orbit metres-scale distances in a system that spans hundreds of
//! kilometres, so at true scale they'd vanish into their planet's dot.
//! They're drawn on a small DISPLAY ring around their parent - position
//! angle real (from the orbit sim), radius legible fiction - EXCEPT when
//! the camera targets a moon or its parent and the zoom is deep enough
//! for true offsets to be readable.

#![allow(dead_code)]

use sokol::app as sapp;

use tenebris_core::math::{dvec3_sub, DVec3};
use tenebris_core::orbit;
use tenebris_core::planet::{self, BodyId, Tileset};

use crate::nav_ui::{self, Target};

use std::cell::RefCell;

/* ---------------------------------------------------------------------- */
/* Open / close plumbing - mirrors tech_tree so screens.rs can manage it.  */

struct MapScreen {
    open: bool,
    /// Body the player is anchored to (frame of world_to_heliocentric).
    active: BodyId,
    /// Player position in the render frame, for the live marker.
    player_world: DVec3,
    /// Chart centre: None = the star.
    camera_target: Option<BodyId>,
    /// Chart zoom multiplier (1 = whole system fits).
    zoom: f64,
}

thread_local! {
    static G: RefCell<MapScreen> = const {
        RefCell::new(MapScreen {
            open: false,
            active: BodyId::Tenebris,
            player_world: DVec3 { x: 0.0, y: 0.0, z: 0.0 },
            camera_target: None,
            zoom: 1.0,
        })
    };
}

pub fn is_open() -> bool {
    G.with(|c| c.borrow().open)
}

pub fn close() {
    G.with(|c| c.borrow_mut().open = false);
}

/// Toggle the overlay (wired to O in app). Releases pointer lock on open,
/// re-locks on close - same flow as the tech tree.
pub fn toggle() {
    let now_open = G.with(|c| {
        let mut g = c.borrow_mut();
        g.open = !g.open;
        g.open
    });
    if now_open {
        crate::screens::take_focus(crate::screens::Screen::SolarMap);
    } else {
        crate::screens::grab_pointer();
    }
}

/// Per-frame state feed: which body the player is anchored to + where
/// they are in the render frame (drives the live YOU marker).
pub fn set_active(id: BodyId, player_world: DVec3) {
    G.with(|c| {
        let mut g = c.borrow_mut();
        g.active = id;
        g.player_world = player_world;
    });
}

/// Swallow input while open; Esc / the toggle key close. Returns true when
/// the event was consumed.
pub fn event(e: &sapp::Event) -> bool {
    G.with(|c| {
        let mut g = c.borrow_mut();
        if !g.open {
            return false;
        }
        let toggle_key = e._type == sapp::EventType::KeyDown
            && crate::controls::action_for_key(e.key_code)
                == Some(crate::controls::Action::OpenSolarMap);
        if e._type == sapp::EventType::KeyDown
            && (e.key_code == sapp::Keycode::Escape || toggle_key)
        {
            g.open = false;
            crate::screens::grab_pointer();
        }
        true
    })
}

/* ---------------------------------------------------------------------- */
/* Chart layout + palette (UI constants, same style as tech_tree's).       */

const MAP_SIZE: f32 = 620.0;
const MENU_W: f32 = 250.0;
/// Margin between the outermost orbit ring and the panel edge, px.
const MAP_MARGIN: f32 = 42.0;
/// Display ring radius for the innermost moon of a planet, px.
const MOON_RING_PX: f32 = 14.0;
/// Extra display ring per additional moon, px.
const MOON_RING_STEP_PX: f32 = 8.0;
/// Planet dot radius bounds, px (log-scaled by body radius between them).
const DOT_MIN_PX: f32 = 4.0;
const DOT_MAX_PX: f32 = 9.0;
/// Chart-click hit radius around a body, px.
const PICK_R_PX: f32 = 14.0;
/// Zoom limits (1 = whole system in frame).
const ZOOM_MIN: f64 = 0.5;
const ZOOM_MAX: f64 = 4000.0;
/// Thumbnail edge in the menu cards, px.
const CARD_THUMB_PX: f32 = 40.0;

/// Maneuver-target highlight - matches nav_ui's TARGET_COL so the map,
/// the navball marker, and the in-world halo read as one system.
const TGT_COL: egui::Color32 = egui::Color32::from_rgb(0xfa, 0x59, 0xbf);

fn body_color(t: Tileset, icy: bool) -> egui::Color32 {
    if icy {
        return egui::Color32::from_rgb(0xa8, 0xd4, 0xe8);
    }
    match t {
        Tileset::Earth => egui::Color32::from_rgb(0x4f, 0x8f, 0xd4),
        Tileset::Sequoia => egui::Color32::from_rgb(0x5f, 0xb8, 0x5a),
        Tileset::Crag => egui::Color32::from_rgb(0xc0, 0x6a, 0x48),
        Tileset::Frost => egui::Color32::from_rgb(0xa8, 0xd4, 0xe8),
        Tileset::Asteroid => egui::Color32::from_rgb(0x80, 0x80, 0x88),
    }
}

/// The star-orbiting planets, in orbit order (the map's ring order).
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

/* ---------------------------------------------------------------------- */
/* egui overlay.                                                           */

pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let (active, player_world, camera_target, zoom) = G.with(|c| {
        let g = c.borrow();
        (g.active, g.player_world, g.camera_target, g.zoom)
    });
    let t = tenebris_core::world_time::seconds();
    let day_len = tenebris_core::config::time().day_length_s as f64;
    let day_n = if day_len > 0.0 { (t / day_len).floor() as i64 } else { 0 };

    egui::Window::new("Solar System")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            /* Header: day, camera centre, zoom controls. */
            let centre_name = match camera_target {
                None => "Sun",
                Some(id) => planet::get(id).name,
            };
            ui.horizontal(|ui| {
                ui.label(
                    egui::RichText::new(format!(
                        "Day {} - centre: {} - zoom {:.1}x",
                        day_n, centre_name, zoom
                    ))
                    .small()
                    .color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
                );
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.small_button("SUN").clicked() {
                        G.with(|c| {
                            let mut g = c.borrow_mut();
                            g.camera_target = None;
                            g.zoom = 1.0;
                        });
                    }
                    if ui.small_button("-").clicked() {
                        G.with(|c| {
                            let mut g = c.borrow_mut();
                            g.zoom = (g.zoom * 0.5).clamp(ZOOM_MIN, ZOOM_MAX);
                        });
                    }
                    if ui.small_button("+").clicked() {
                        G.with(|c| {
                            let mut g = c.borrow_mut();
                            g.zoom = (g.zoom * 2.0).clamp(ZOOM_MIN, ZOOM_MAX);
                        });
                    }
                    let tname = nav_ui::target_name();
                    if tname != "none" {
                        if ui
                            .small_button(
                                egui::RichText::new(format!("TGT {} [x]", tname)).color(TGT_COL),
                            )
                            .clicked()
                        {
                            nav_ui::set_target(None);
                        }
                    }
                });
            });
            ui.add_space(2.0);

            ui.horizontal_top(|ui| {
                draw_chart(ui, active, player_world, camera_target, zoom, t);
                draw_body_menu(ui, camera_target, t);
            });

            ui.label(
                egui::RichText::new(
                    "Click a card or chart body to centre the camera; TGT sets the \
                     maneuver target (right-click on the chart works too). Wheel zooms. \
                     O or Esc closes.",
                )
                .small()
                .color(egui::Color32::from_rgb(0x70, 0x76, 0x84)),
            );
        });
}

/// Where the chart centres, in heliocentric metres.
fn centre_helio(camera_target: Option<BodyId>, t: f64) -> DVec3 {
    match camera_target {
        None => DVec3 { x: 0.0, y: 0.0, z: 0.0 },
        Some(id) => orbit::heliocentric_pos(id, t),
    }
}

/* ------------------------------ the chart ----------------------------- */

fn draw_chart(
    ui: &mut egui::Ui,
    active: BodyId,
    player_world: DVec3,
    camera_target: Option<BodyId>,
    zoom: f64,
    t: f64,
) {
    let (region, resp) = ui.allocate_exact_size(
        egui::vec2(MAP_SIZE, MAP_SIZE),
        egui::Sense::click(),
    );
    let p = ui.painter_at(region);
    let c = region.center();

    /* Space-black backdrop with a faint border. */
    p.rect_filled(region, 6.0, egui::Color32::from_rgb(0x07, 0x09, 0x10));
    p.rect_stroke(
        region,
        6.0,
        egui::Stroke::new(1.0, egui::Color32::from_rgb(0x2a, 0x2e, 0x3a)),
        egui::StrokeKind::Inside,
    );

    /* Scale: zoom 1 fits the outermost planet's orbit; the camera target
     * offsets everything so the chart FOLLOWS the chosen body. */
    let max_r = PLANETS
        .iter()
        .map(|&id| dvec_len_xz(orbit::heliocentric_pos(id, t)))
        .fold(1.0f64, f64::max);
    let px_per_m = ((MAP_SIZE * 0.5 - MAP_MARGIN) as f64) / max_r * zoom;
    let centre = centre_helio(camera_target, t);
    let to_px = |v: DVec3| -> egui::Pos2 {
        let d = dvec3_sub(v, centre);
        c + egui::vec2((d.x * px_per_m) as f32, (d.z * px_per_m) as f32)
    };

    /* Wheel zoom while hovering the chart. */
    if resp.hovered() {
        let scroll = ui.input(|i| i.smooth_scroll_delta.y);
        if scroll.abs() > 0.0 {
            G.with(|cell| {
                let mut g = cell.borrow_mut();
                let k = if scroll > 0.0 { 1.25 } else { 0.8 };
                g.zoom = (g.zoom * k as f64).clamp(ZOOM_MIN, ZOOM_MAX);
            });
        }
    }

    /* Orbit rings about the star (drawn as circles offset by the chart
     * centre - accurate for these circular on-rails orbits). */
    let sun_px = to_px(DVec3 { x: 0.0, y: 0.0, z: 0.0 });
    for &id in &PLANETS {
        let r = (dvec_len_xz(orbit::heliocentric_pos(id, t)) * px_per_m) as f32;
        p.circle_stroke(
            sun_px,
            r,
            egui::Stroke::new(1.0, egui::Color32::from_rgb(0x1c, 0x22, 0x30)),
        );
    }

    /* The star. */
    p.circle_filled(sun_px, 11.0, egui::Color32::from_rgb(0xff, 0xd8, 0x66));
    p.circle_stroke(
        sun_px,
        14.0,
        egui::Stroke::new(1.5, egui::Color32::from_rgba_unmultiplied(0xff, 0xd8, 0x66, 60)),
    );
    p.text(
        sun_px + egui::vec2(0.0, 24.0),
        egui::Align2::CENTER_CENTER,
        "Sun",
        egui::FontId::proportional(11.0),
        egui::Color32::from_rgb(0xc8, 0xa8, 0x50),
    );

    /* Bodies: collect (id, screen pos) for click-picking as we draw. */
    let mut picks: Vec<(BodyId, egui::Pos2)> = Vec::new();
    let man_target = nav_ui::target();

    /* Asteroid belt - ten real rocks, faint specks. */
    for id in asteroids() {
        let pos = to_px(orbit::heliocentric_pos(id, t));
        p.circle_filled(pos, 1.5, egui::Color32::from_rgb(0x55, 0x58, 0x60));
        if man_target == Some(Target::Body(id)) {
            tgt_highlight(&p, pos, 6.0, t);
        }
        picks.push((id, pos));
    }

    /* Planets + moons. */
    for &id in &PLANETS {
        let b = planet::get(id);
        let pos = to_px(orbit::heliocentric_pos(id, t));
        let dot = dot_radius(b.radius_m);
        p.circle_filled(pos, dot, body_color(b.tileset, b.icy));
        picks.push((id, pos));

        /* Moons: true orbit angle from the sim; display radius is the
         * larger of the true scaled offset and the legible minimum ring,
         * so deep zoom transitions to truth. */
        for (mi, &mid) in moons_of(id).iter().enumerate() {
            let rel = dvec3_sub(orbit::heliocentric_pos(mid, t), orbit::heliocentric_pos(id, t));
            let true_px = (dvec_len_xz(rel) * px_per_m) as f32;
            let ring = true_px.max(MOON_RING_PX + mi as f32 * MOON_RING_STEP_PX + dot);
            p.circle_stroke(
                pos,
                ring,
                egui::Stroke::new(
                    0.5,
                    egui::Color32::from_rgba_unmultiplied(0x88, 0x8c, 0x98, 50),
                ),
            );
            let ang = (rel.z).atan2(rel.x) as f32;
            let mpos = pos + egui::vec2(ang.cos() * ring, ang.sin() * ring);
            let mb = planet::get(mid);
            p.circle_filled(mpos, 2.5, body_color(mb.tileset, mb.icy));
            if man_target == Some(Target::Body(mid)) {
                tgt_highlight(&p, mpos, 7.0, t);
            }
            picks.push((mid, mpos));
        }

        if man_target == Some(Target::Body(id)) {
            tgt_highlight(&p, pos, dot + 5.0, t);
        }
        p.text(
            pos + egui::vec2(0.0, dot + 11.0),
            egui::Align2::CENTER_CENTER,
            b.name,
            egui::FontId::proportional(11.0),
            egui::Color32::from_rgb(0x9a, 0xa2, 0xb2),
        );
    }

    /* The player - live heliocentric position, so a coasting rocket
     * watches its own marker crawl between the rings. Drawn last (on
     * top): white diamond + YOU. */
    let ppos = to_px(orbit::world_to_heliocentric(active, player_world, t));
    let d = 4.0;
    p.add(egui::Shape::convex_polygon(
        vec![
            ppos + egui::vec2(0.0, -d),
            ppos + egui::vec2(d, 0.0),
            ppos + egui::vec2(0.0, d),
            ppos + egui::vec2(-d, 0.0),
        ],
        egui::Color32::WHITE,
        egui::Stroke::NONE,
    ));
    p.text(
        ppos + egui::vec2(0.0, -12.0),
        egui::Align2::CENTER_CENTER,
        "YOU",
        egui::FontId::proportional(10.0),
        egui::Color32::WHITE,
    );

    /* Chart picking: left-click = camera target, right-click = maneuver
     * target. Nearest body within the pick radius wins. */
    let clicked = resp.clicked();
    let r_clicked = resp.secondary_clicked();
    if clicked || r_clicked {
        if let Some(mp) = resp.interact_pointer_pos() {
            let mut best: Option<(BodyId, f32)> = None;
            for &(id, sp) in &picks {
                let d2 = (sp - mp).length();
                if d2 <= PICK_R_PX && best.map(|(_, bd)| d2 < bd).unwrap_or(true) {
                    best = Some((id, d2));
                }
            }
            if let Some((id, _)) = best {
                if r_clicked {
                    nav_ui::set_target(Some(Target::Body(id)));
                } else {
                    G.with(|cell| cell.borrow_mut().camera_target = Some(id));
                }
            }
        }
    }
}

/// Pulsing maneuver-target highlight: ring + four corner ticks.
fn tgt_highlight(p: &egui::Painter, at: egui::Pos2, r: f32, t: f64) {
    let pulse = 1.0 + 0.25 * ((t * 4.0).sin() as f32);
    let rr = r * pulse;
    p.circle_stroke(at, rr, egui::Stroke::new(1.5, TGT_COL));
    for (dx, dy) in [(-1.0f32, -1.0f32), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)] {
        let dir = egui::vec2(dx, dy) * std::f32::consts::FRAC_1_SQRT_2;
        p.line_segment(
            [at + dir * (rr + 2.0), at + dir * (rr + 6.0)],
            egui::Stroke::new(1.5, TGT_COL),
        );
    }
    p.text(
        at + egui::vec2(0.0, rr + 12.0),
        egui::Align2::CENTER_CENTER,
        "TGT",
        egui::FontId::proportional(10.0),
        TGT_COL,
    );
}

/* ----------------------------- body menu ------------------------------ */

/// One clickable card per body: baked thumbnail, name, TGT button.
/// Clicking the card centres the camera on the body.
fn draw_body_menu(ui: &mut egui::Ui, camera_target: Option<BodyId>, _t: f64) {
    ui.vertical(|ui| {
        ui.set_width(MENU_W);
        egui::ScrollArea::vertical()
            .max_height(MAP_SIZE)
            .auto_shrink([false, true])
            .show(ui, |ui| {
                section_label(ui, "PLANETS + MOONS");
                for &id in &PLANETS {
                    body_card(ui, id, camera_target, 0.0);
                    for &mid in moons_of(id) {
                        body_card(ui, mid, camera_target, 14.0);
                    }
                }
                ui.add_space(4.0);
                section_label(ui, "ASTEROID BELT");
                for id in asteroids() {
                    body_card(ui, id, camera_target, 0.0);
                }
            });
    });
}

fn section_label(ui: &mut egui::Ui, text: &str) {
    ui.label(
        egui::RichText::new(text)
            .small()
            .color(egui::Color32::from_rgb(0x6a, 0x74, 0x88)),
    );
}

fn body_card(ui: &mut egui::Ui, id: BodyId, camera_target: Option<BodyId>, indent: f32) {
    let b = planet::get(id);
    let is_cam = camera_target == Some(id);
    let is_tgt = nav_ui::target() == Some(Target::Body(id));

    let card_h = CARD_THUMB_PX + 6.0;
    let (rect, resp) = ui.allocate_exact_size(
        egui::vec2(MENU_W - 8.0, card_h),
        egui::Sense::click(),
    );
    let p = ui.painter_at(rect);

    /* Card background: highlighted when it's the camera centre, outlined
     * pink when it's the maneuver target, lighter on hover. */
    let bg = if is_cam {
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

    /* Thumbnail (the baked "screenshot" globe). */
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

    /* Name + radius line. */
    p.text(
        egui::pos2(thumb.max.x + 8.0, rect.center().y - 7.0),
        egui::Align2::LEFT_CENTER,
        b.name,
        egui::FontId::proportional(13.0),
        if is_cam { egui::Color32::WHITE } else { egui::Color32::from_rgb(0xc2, 0xc8, 0xd4) },
    );
    p.text(
        egui::pos2(thumb.max.x + 8.0, rect.center().y + 8.0),
        egui::Align2::LEFT_CENTER,
        format!("r {:.0} m", b.radius_m),
        egui::FontId::proportional(10.0),
        egui::Color32::from_rgb(0x7a, 0x82, 0x92),
    );

    /* TGT button on the right edge of the card. */
    let btn = egui::Rect::from_min_size(
        egui::pos2(rect.max.x - 40.0, rect.center().y - 10.0),
        egui::vec2(34.0, 20.0),
    );
    let btn_resp = ui.interact(btn, resp.id.with("tgt"), egui::Sense::click());
    let btn_bg = if is_tgt {
        TGT_COL
    } else if btn_resp.hovered() {
        egui::Color32::from_rgb(0x3a, 0x2c, 0x38)
    } else {
        egui::Color32::from_rgb(0x22, 0x1c, 0x24)
    };
    p.rect_filled(btn, 3.0, btn_bg);
    p.text(
        btn.center(),
        egui::Align2::CENTER_CENTER,
        "TGT",
        egui::FontId::proportional(10.0),
        if is_tgt { egui::Color32::BLACK } else { TGT_COL },
    );
    if btn_resp.clicked() {
        nav_ui::set_target(if is_tgt { None } else { Some(Target::Body(id)) });
    } else if resp.clicked() {
        G.with(|c| c.borrow_mut().camera_target = Some(id));
    }
}

/* ------------------------------- helpers ------------------------------ */

fn dvec_len_xz(v: DVec3) -> f64 {
    (v.x * v.x + v.z * v.z).sqrt()
}

/// Log-scale a body radius into the dot-size band so Frostbite doesn't
/// dwarf the moons off the chart.
fn dot_radius(radius_m: f64) -> f32 {
    let t = ((radius_m / 50.0).ln() / (400.0f64 / 50.0).ln()).clamp(0.0, 1.0) as f32;
    DOT_MIN_PX + (DOT_MAX_PX - DOT_MIN_PX) * t
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
        // sim, or the map silently drops a moon.
        for &pid in &PLANETS {
            for &mid in moons_of(pid) {
                let e = orbit::elements(mid);
                assert_eq!(e.parent, Some(pid), "{mid:?} charted under wrong parent");
            }
        }
        // And the reverse: every moon in BodyId::ALL appears on some ring.
        let charted: Vec<BodyId> =
            PLANETS.iter().flat_map(|&p| moons_of(p).iter().copied()).collect();
        for id in BodyId::ALL {
            if let Some(parent) = orbit::elements(id).parent {
                assert!(
                    charted.contains(&id),
                    "moon {id:?} (parent {parent:?}) missing from the map"
                );
            }
        }
    }

    #[test]
    fn dot_radius_stays_in_band() {
        for r in [10.0, 50.0, 120.0, 400.0, 4000.0] {
            let d = dot_radius(r);
            assert!((DOT_MIN_PX..=DOT_MAX_PX).contains(&d), "dot {d} out of band for r={r}");
        }
    }

    /// Every body the picker lists (planets, moons, asteroids) must have
    /// a thumbnail cell in the gallery atlas - a missing UV means a card
    /// silently shows the wrong body.
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
}
