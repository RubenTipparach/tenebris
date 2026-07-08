//! First-person held-tool viewmodel.
//!
//! Draws the baked wood-tool models (`assets/models/wood_*.obj`, authored
//! by `tools/gen-tool-models.py`) anchored to the camera in eye space -
//! the classic bottom-right held item. The tool shown is the one the
//! player's swing would actually use (interact's held-tool pick), so the
//! viewmodel doubles as feedback that the right tool is in play.
//!
//! Records into the DEFAULT sgl context (unlike animals / crops, which
//! use the renderer's world context): it flushes in the swapchain pass
//! over the already-composited scene, so world geometry can never clip
//! into the held tool - the classic FPS viewmodel layer. Modelview =
//! identity puts the geometry in eye space, so it rides the camera for
//! free; the cleared swapchain depth buffer still self-sorts the tool's
//! own parts, and the HUD (no depth test) paints over it as usual.
//!
//! A gentle idle sway rides the renderer clock and a chop cycle plays
//! while the mine button is held; both are procedural layers on top of
//! the baked mesh (CLAUDE.md allows per-frame tweaks over baked assets).

use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;

use sokol::gl as sgl;

use tenebris_core::items::{self, ItemId};

use crate::baked_model::{self, Model};
use crate::gfx_math::Mat4;

/// Eye-space anchor (the grip) + scale for the held tool. y sits just
/// above the frustum's bottom edge at this depth (edge = z*tan(fov/2) =
/// 0.48*0.577 ~ 0.28) so the handle root stays on screen.
const ANCHOR: [f32; 3] = [0.26, -0.26, -0.48];
const SCALE: f32 = 0.34;
/// Chop cycle speed (radians of swing phase per second while mining).
const SWING_SPEED: f32 = 9.0;

thread_local! {
    /// Loaded tool models by item id; a failed load caches None so the
    /// miss is logged once, not every frame.
    static MODELS: RefCell<HashMap<ItemId, Option<Rc<Model>>>> = RefCell::new(HashMap::new());
    static PIP3D: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    /// Swing phase - advances while mining, eases back to rest after.
    static SWING: Cell<f32> = const { Cell::new(0.0) };
}

fn model_for(tool: ItemId) -> Option<Rc<Model>> {
    let stem = match tool {
        items::WOOD_PICKAXE => "wood_pickaxe",
        items::WOOD_AXE => "wood_axe",
        items::WOOD_SHOVEL => "wood_shovel",
        _ => return None,
    };
    MODELS.with(|m| {
        m.borrow_mut()
            .entry(tool)
            .or_insert_with(|| {
                let path = format!("assets/models/{stem}.obj");
                let loaded = baked_model::load_model(&path).map(Rc::new);
                if loaded.is_none() {
                    println!("[viewmodel] {path} missing - no held-tool render");
                }
                loaded
            })
            .clone()
    })
}

/// Draw the held tool. `tool` = the item the player's swing would use
/// (None hides the viewmodel), `mining` = mine button held on a valid
/// target, `time_s` = the renderer clock for the idle sway.
pub fn draw(proj: Mat4, tool: Option<ItemId>, mining: bool, time_s: f32, dt: f32) {
    /* Advance / relax the chop phase even when hidden so a tool swap
     * mid-swing doesn't pop. */
    let swing = SWING.with(|s| {
        let mut v = s.get();
        if mining {
            v += dt * SWING_SPEED;
        } else {
            v = 0.0;
        }
        s.set(v);
        v
    });

    let Some(model) = tool.and_then(model_for) else {
        return;
    };
    /* One-shot boot confirmation (mirrors the icon-atlas log style). */
    thread_local! {
        static LOGGED: Cell<bool> = const { Cell::new(false) };
    }
    LOGGED.with(|l| {
        if !l.get() {
            l.set(true);
            println!("[viewmodel] held-tool render active (item {})", tool.unwrap_or(0));
        }
    });

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_identity(); /* eye space: the tool rides the camera */

    let mut pip = PIP3D.with(|p| p.get());
    if pip.id == 0 {
        pip = sgl::make_pipeline(&sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: true,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        });
        PIP3D.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);

    /* Idle sway (breathing-ish) + the chop arc while mining. */
    let sway_x = (time_s * 1.3).sin() * 0.006;
    let sway_y = (time_s * 1.7).cos() * 0.005;
    let chop = if swing > 0.0 { swing.sin().max(-0.2) } else { 0.0 };

    sgl::push_matrix();
    sgl::translate(ANCHOR[0] + sway_x, ANCHOR[1] + sway_y - chop * 0.06, ANCHOR[2]);
    /* Base pose: handle diagonal across the lower right, head up toward
     * screen centre - mostly upright in view so it reads at a glance. */
    sgl::rotate(-0.38, 0.0, 0.0, 1.0); /* tilt the shaft toward centre */
    sgl::rotate(-0.35 - chop * 0.85, 1.0, 0.0, 0.0); /* pitch + chop arc */
    sgl::rotate(0.55, 0.0, 1.0, 0.0); /* head turned toward the view */
    sgl::scale(SCALE, SCALE, SCALE);
    baked_model::draw(&model, None);
    sgl::pop_matrix();
    /* No sgl_draw - single end-of-frame flush, same as the other sgl
     * entity layers. */
}
