//! Solar-system map (egui overlay, toggled with O).
//!
//! A live top-down chart of the whole star system, driven by the same
//! on-rails orbit sim the sky uses (`core::orbit`), so what the map shows
//! IS where the bodies are: the star at the centre, each planet's orbit
//! ring, every major planet + its moons at their current positions, the
//! asteroid belt, and a marker on the body the player is standing on.
//!
//! Moons orbit metres-scale distances in a system that spans hundreds of
//! kilometres, so at true scale they'd vanish into their planet's dot.
//! They're drawn on a small DISPLAY ring around their parent instead -
//! position angle is real (from the orbit sim), radius is legible fiction.
//! Same trick planetarium software uses.

#![allow(dead_code)]

use sokol::app as sapp;

use tenebris_core::orbit;
use tenebris_core::planet::{self, BodyId, Tileset};

use std::cell::RefCell;

/* ---------------------------------------------------------------------- */
/* Open / close plumbing - mirrors tech_tree so screens.rs can manage it.  */

struct MapScreen {
    open: bool,
    /// Body the player is anchored to, for the "YOU" marker.
    active: BodyId,
}

thread_local! {
    static G: RefCell<MapScreen> =
        const { RefCell::new(MapScreen { open: false, active: BodyId::Tenebris }) };
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

/// Tell the map which body the player is on (drives the "YOU" marker).
pub fn set_active(id: BodyId) {
    G.with(|c| c.borrow_mut().active = id);
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

const MAP_SIZE: f32 = 640.0;
/// Margin between the outermost orbit ring and the panel edge, px.
const MAP_MARGIN: f32 = 46.0;
/// Display ring radius for the innermost moon of a planet, px.
const MOON_RING_PX: f32 = 14.0;
/// Extra display ring per additional moon, px.
const MOON_RING_STEP_PX: f32 = 8.0;
/// Planet dot radius bounds, px (log-scaled by body radius between them).
const DOT_MIN_PX: f32 = 4.0;
const DOT_MAX_PX: f32 = 9.0;

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

/* ---------------------------------------------------------------------- */
/* egui overlay.                                                           */

pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let active = G.with(|c| c.borrow().active);
    let t = tenebris_core::world_time::seconds();
    let day_len = tenebris_core::config::time().day_length_s as f64;
    let day_n = if day_len > 0.0 { (t / day_len).floor() as i64 } else { 0 };
    let sun_km = tenebris_core::config::solar().sun_distance_m / 1000.0;

    egui::Window::new("Solar System")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.label(
                egui::RichText::new(format!(
                    "Day {} - live orbits, top-down. Moons ride display rings \
                     (true orbits are too tight to chart). Sun is {:.0} km out.",
                    day_n, sun_km
                ))
                .small()
                .color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
            );
            ui.add_space(4.0);

            let (region, _) = ui.allocate_exact_size(
                egui::vec2(MAP_SIZE, MAP_SIZE),
                egui::Sense::hover(),
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

            /* Scale: fit the outermost planet's (scaled) orbit inside the
             * panel. Heliocentric positions already carry the solar.yaml
             * system scale, so measure the real max. */
            let max_r = PLANETS
                .iter()
                .map(|&id| dvec_len_xz(orbit::heliocentric_pos(id, t)))
                .fold(1.0f64, f64::max);
            let px_per_m = ((MAP_SIZE * 0.5 - MAP_MARGIN) as f64) / max_r;

            /* Orbit rings (projected to the X/Z plane; inclinations are a
             * few degrees, so the flat circle is honest enough to chart). */
            for &id in &PLANETS {
                let r = (dvec_len_xz(orbit::heliocentric_pos(id, t)) * px_per_m) as f32;
                p.circle_stroke(
                    c,
                    r,
                    egui::Stroke::new(1.0, egui::Color32::from_rgb(0x1c, 0x22, 0x30)),
                );
            }

            /* The star. */
            p.circle_filled(c, 11.0, egui::Color32::from_rgb(0xff, 0xd8, 0x66));
            p.circle_stroke(
                c,
                14.0,
                egui::Stroke::new(1.5, egui::Color32::from_rgba_unmultiplied(0xff, 0xd8, 0x66, 60)),
            );
            p.text(
                c + egui::vec2(0.0, 24.0),
                egui::Align2::CENTER_CENTER,
                "Sun",
                egui::FontId::proportional(11.0),
                egui::Color32::from_rgb(0xc8, 0xa8, 0x50),
            );

            /* Asteroid belt - ten real rocks, drawn as faint specks. */
            for i in 0..10 {
                let Some(id) = BodyId::from_index(BodyId::Asteroid0 as i32 + i) else { continue };
                let pos = to_px(orbit::heliocentric_pos(id, t), c, px_per_m);
                p.circle_filled(pos, 1.5, egui::Color32::from_rgb(0x55, 0x58, 0x60));
            }

            /* Planets + moons. */
            for &id in &PLANETS {
                let b = planet::get(id);
                let pos = to_px(orbit::heliocentric_pos(id, t), c, px_per_m);
                let dot = dot_radius(b.radius_m);
                let col = body_color(b.tileset, b.icy);
                p.circle_filled(pos, dot, col);

                /* Moons: real orbit ANGLE from the sim, legible display
                 * radius. */
                for (mi, &mid) in moons_of(id).iter().enumerate() {
                    let ring = MOON_RING_PX + mi as f32 * MOON_RING_STEP_PX + dot;
                    p.circle_stroke(
                        pos,
                        ring,
                        egui::Stroke::new(
                            0.5,
                            egui::Color32::from_rgba_unmultiplied(0x88, 0x8c, 0x98, 50),
                        ),
                    );
                    let rel = tenebris_core::math::dvec3_sub(
                        orbit::heliocentric_pos(mid, t),
                        orbit::heliocentric_pos(id, t),
                    );
                    let ang = rel.z.atan2(rel.x) as f32;
                    let mpos = pos + egui::vec2(ang.cos() * ring, ang.sin() * ring);
                    let mb = planet::get(mid);
                    p.circle_filled(mpos, 2.0, body_color(mb.tileset, mb.icy));
                    if mid == active {
                        you_marker(&p, mpos, 5.0);
                    }
                }

                /* Label under the dot; the active planet gets the marker. */
                p.text(
                    pos + egui::vec2(0.0, dot + 11.0),
                    egui::Align2::CENTER_CENTER,
                    b.name,
                    egui::FontId::proportional(11.0),
                    if id == active {
                        egui::Color32::WHITE
                    } else {
                        egui::Color32::from_rgb(0x9a, 0xa2, 0xb2)
                    },
                );
                if id == active {
                    you_marker(&p, pos, dot + 4.0);
                }
            }

            ui.add_space(4.0);
            ui.label(
                egui::RichText::new("O or Esc to close")
                    .small()
                    .color(egui::Color32::from_rgb(0x70, 0x76, 0x84)),
            );
        });
}

/// White "you are here" ring + tick.
fn you_marker(p: &egui::Painter, at: egui::Pos2, r: f32) {
    p.circle_stroke(at, r, egui::Stroke::new(1.5, egui::Color32::WHITE));
    p.text(
        at + egui::vec2(0.0, -(r + 9.0)),
        egui::Align2::CENTER_CENTER,
        "YOU",
        egui::FontId::proportional(10.0),
        egui::Color32::WHITE,
    );
}

/// Heliocentric metres -> chart px (top-down: world X right, world Z down).
fn to_px(v: tenebris_core::math::DVec3, c: egui::Pos2, px_per_m: f64) -> egui::Pos2 {
    c + egui::vec2((v.x * px_per_m) as f32, (v.z * px_per_m) as f32)
}

fn dvec_len_xz(v: tenebris_core::math::DVec3) -> f64 {
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
}
