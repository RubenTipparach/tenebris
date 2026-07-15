//! Slot drag-and-drop: the shared gesture, generic over slot address.
//!
//! The inventory screen grew the first drag-and-drop (bag <-> hotbar); the
//! machine panels then wanted the same thing for their input / fuel / output
//! slots. This module is the gesture half of that, factored out so there is
//! one implementation rather than one per panel - the mistake `screens.rs`
//! documents, made again a level down.
//!
//! Deliberately split: the *gesture* is generic and lives here, the *meaning*
//! of a drop stays with the panel that owns the slots. A bonfire knows fuel
//! goes in the fuel slot; this module only knows something was dragged from
//! address A to address B.
//!
//! Each panel defines its own `Addr` enum and calls [`wire`] on every slot's
//! `Response`, collecting one pending `(from, to)` per frame, then applies it
//! after the UI pass (mutating the world mid-layout would need the borrow the
//! panel is already holding). egui keys drag payloads by TYPE, so each panel's
//! distinct `Addr` type can't be dropped onto another's - two panels are never
//! open at once anyway (`screens::take_focus`).

/// Make `resp` both a drag source and a drop target for slot `addr`.
///
/// Records the first `(from, to)` of the frame into `pending`; the caller
/// applies it after the UI pass. Later drops in the same frame are ignored -
/// one gesture, one move.
pub fn wire<A>(resp: &egui::Response, addr: A, pending: &mut Option<(A, A)>)
where
    A: std::any::Any + Copy + Send + Sync,
{
    /* Re-interact for drag: ui_icons::slot allocates with Sense::click, and a
     * click-only Response never reports a drag. */
    let resp = resp.clone().interact(egui::Sense::click_and_drag());
    resp.dnd_set_drag_payload(addr);
    if let Some(src) = resp.dnd_release_payload::<A>() {
        pending.get_or_insert((*src, addr));
    }
}

/// While a drag of `A` is live, ghost the dragged item's icon at the pointer.
///
/// `resolve` maps the dragged address to the `(item, count)` to draw; return
/// `None` for an address with nothing to show. `id` namespaces the ghost's
/// paint layer per panel.
pub fn ghost<A>(ctx: &egui::Context, id: &str, resolve: impl Fn(A) -> Option<(u16, u16)>)
where
    A: std::any::Any + Copy + Send + Sync,
{
    let Some(src) = egui::DragAndDrop::payload::<A>(ctx) else {
        return;
    };
    let Some((item, count)) = resolve(*src) else {
        return;
    };
    if count == 0 {
        return;
    }
    let Some(pos) = ctx.pointer_interact_pos() else {
        return;
    };
    let painter =
        ctx.layer_painter(egui::LayerId::new(egui::Order::Tooltip, egui::Id::new(id)));
    let rect = egui::Rect::from_center_size(pos, egui::vec2(30.0, 30.0));
    crate::ui_icons::draw_icon(&painter, item, count, rect);
}
