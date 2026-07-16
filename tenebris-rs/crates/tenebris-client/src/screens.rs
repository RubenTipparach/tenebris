//! The modal-screen roster - the one list of screens that take over the UI.
//!
//! Every screen here is a thread-local singleton exposing `is_open()` and
//! `close()`. What this module owns is the *list of them*, once.
//!
//! Before this existed each caller kept its own hand-written chain of
//! `foo_screen::is_open()` / `foo_screen::close()` calls, and they drifted -
//! six near-identical lists, each missing a different screen. The bug that
//! motivated the roster: opening a bonfire with E releases the pointer so
//! its slots are clickable, but the pointer-lock-loss guard in `app.rs` -
//! which turns a browser-eaten Esc into a pause-open - only knew about the
//! inventory, crafting and tech-tree screens. It read the bonfire's own
//! pointer release as an Esc and popped the pause menu on top of the
//! bonfire panel. The furnace, chest, power, rocket and station screens all
//! release the pointer the same way and were all missing from that guard
//! too. Separately, the "one survival panel up at a time" rule was six
//! copy-pasted close-lists that each closed only the screens that happened
//! to predate it, so E-ing a bonfire left an open chest behind it.
//!
//! Derived queries, all off the single `roster!` below:
//!
//! - [`any_open`]     - is a modal screen up? Hide the HUD, eat the scroll
//!                      wheel, and don't mistake a panel's own pointer
//!                      release for an Esc.
//! - [`take_focus`]   - a screen just opened: close the other eight and
//!                      release the pointer so its widgets are clickable.
//!                      Every screen's `open()` / `toggle()` ends with this.
//! - [`close_all`]    - drop every panel (the pause modal taking over).
//! - [`grab_pointer`] - the last panel closed; back to FPS mouse-look.
//!
//! Adding a screen is ONE line in `roster!`. Do not hand-roll another
//! `is_open()` chain at a call site - that is what drifted last time.

/// Expand the roster into the enum plus every query derived from it.
macro_rules! roster {
    ($($variant:ident => $module:ident),+ $(,)?) => {
        /// One variant per modal screen. Passed to [`take_focus`] by the
        /// screen's own `open()` so it doesn't close itself.
        #[derive(Copy, Clone, PartialEq, Eq, Debug)]
        pub enum Screen { $($variant),+ }

        /// Is any modal screen up?
        pub fn any_open() -> bool {
            $(crate::$module::is_open() ||)+ false
        }

        /// Is this specific screen up?
        #[cfg_attr(not(test), allow(dead_code))]
        pub fn is_open(s: Screen) -> bool {
            match s { $(Screen::$variant => crate::$module::is_open()),+ }
        }

        /// Close every panel. The pause modal calls this so nothing draws
        /// over it.
        pub fn close_all() {
            $(crate::$module::close();)+
        }

        fn close_others(keep: Screen) {
            $(if keep != Screen::$variant { crate::$module::close(); })+
        }

        #[cfg(test)]
        pub const ALL: &[Screen] = &[$(Screen::$variant),+];
    };
}

roster! {
    Inventory => inventory_screen,
    Crafting  => crafting_screen,
    TechTree  => tech_tree,
    SolarMap  => solar_map,
    Chest     => chest_screen,
    Furnace   => furnace_screen,
    Bonfire   => bonfire_screen,
    Power     => power_ui,
    Rocket    => rocket_screen,
    Station   => station_screen,
    Slot      => slot_screen,
}

/// `s` just opened: it owns the screen now. Closes every other panel (one
/// survival panel at a time) and releases the pointer so `s`'s widgets are
/// clickable.
///
/// Order matters: the close pass runs first because some `close()` impls
/// re-grab the pointer for FPS mouse-look (station), and `s` needs it
/// released. Closing last would leave `s` up with a captured cursor.
pub fn take_focus(s: Screen) {
    close_others(s);
    release_pointer();
}

#[cfg(not(test))]
fn release_pointer() {
    sokol::app::lock_mouse(false);
    sokol::app::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Hand the pointer back to FPS mouse-look. Called by a screen's own close
/// path (Esc / the Close button), not by [`close_all`] - the pause modal
/// wants the cursor to stay free for its own buttons.
#[cfg(not(test))]
pub fn grab_pointer() {
    sokol::app::lock_mouse(true);
}
#[cfg(test)]
pub fn grab_pointer() {}

#[cfg(test)]
mod tests {
    use super::*;

    /// Every variant round-trips through `is_open`, and nothing is open at
    /// rest. Guards against a `roster!` line whose variant and module get
    /// mismatched.
    #[test]
    fn roster_starts_closed() {
        for &s in ALL {
            assert!(!is_open(s), "{s:?} open at rest");
        }
        assert!(!any_open());
    }

    /// The drift regression: a screen taking focus closes the others -
    /// including ones added to the roster after it. This is the invariant
    /// the six copy-pasted close-lists kept getting wrong.
    #[test]
    fn take_focus_closes_the_others() {
        crate::inventory_screen::toggle();
        assert!(is_open(Screen::Inventory));
        assert!(any_open(), "any_open must see the inventory");

        /* A bonfire opening must drop the inventory. The old hand-rolled
         * list in bonfire_screen::open did close the inventory - but not
         * power_ui or the tech tree. Now it can't miss one. */
        take_focus(Screen::Bonfire);
        assert!(!is_open(Screen::Inventory), "inventory survived take_focus");
        for &s in ALL {
            assert!(!is_open(s), "{s:?} survived take_focus");
        }
    }

    /// `take_focus` must not close the screen that is taking focus.
    #[test]
    fn take_focus_keeps_its_own_screen() {
        crate::inventory_screen::toggle();
        take_focus(Screen::Inventory);
        assert!(is_open(Screen::Inventory), "take_focus closed its own screen");
    }

    #[test]
    fn close_all_drops_everything() {
        crate::inventory_screen::toggle();
        crate::tech_tree::toggle();
        close_all();
        for &s in ALL {
            assert!(!is_open(s), "{s:?} survived close_all");
        }
        assert!(!any_open());
    }
}
