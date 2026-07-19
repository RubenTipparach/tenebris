//! Configurable keyboard bindings: raw keycodes -> named game [`Action`]s.
//!
//! The whole point is that controls are *data*, not hard-coded `match`
//! arms. Bindings load from `assets/config/controls.yaml` at boot, so
//! remapping a key is a one-line edit and future controller support just
//! binds the same [`Action`]s to pads instead of keys. Consumers
//! (`input::set_key`, the E-interact dispatch in `app.rs`) act on
//! `Action`s, never on physical `Keycode`s.
//!
//! A compiled-in default binding set is always available, so a missing or
//! partial config file never leaves the game uncontrollable - the file
//! overrides the defaults it names and leaves the rest alone.

use std::cell::RefCell;

use sokol::app::Keycode;

/// A named player action. Physical keys map onto these; gameplay code
/// reads the action, not the key that produced it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Action {
    MoveForward,
    MoveBack,
    MoveLeft,
    MoveRight,
    Jump,
    Sprint,
    FlyDown,
    ToggleFly,
    /// Roll the view left / right (space flight only).
    RollLeft,
    RollRight,
    /// Context action: open the machine under the reticle, else the inventory.
    Interact,
    /// Jettison the current rocket stage (while flying a staged rocket).
    Stage,
    /// Climb out of the rocket, handing the remaining parts back.
    ExitRocket,
    /// Reset the rocket to a full tank back on its launch pad.
    RespawnRocket,
    /// Toggle the rocket chase camera between rocket-frame and
    /// planet-equatorial alignment.
    CamAlign,
    Eat,
    Plant,
    SurvivalToggle,
    /// Open / close the pause menu.
    Pause,
    /// Open / close the tech-tree progression screen.
    OpenTechTree,
    /// Open / close the crafting screen.
    OpenCrafting,
    /// Open / close the solar-system map.
    OpenSolarMap,
    /// Debug: toggle terrain / water / skybox visibility.
    ToggleTerrain,
    ToggleWater,
    ToggleSkybox,
    /// Debug: open / close the teleport menu.
    OpenTeleport,
    /// Master toggle for the debug UI (hamburger menu, teleport button).
    ToggleDebugUi,
    /// Toggle the multiplayer players roster panel.
    PlayersPanel,
    /// Toggle the frame profiler overlay.
    ToggleProfiler,
    /// Toggle the pixel-art UI demo panel.
    PixelUiDemo,
    /// Print a block snapshot of the aimed column to the console (debug).
    BlockSnapshot,
    /// Toggle the water-flow debug overlay (debug).
    FlowDebug,
    /// Select hotbar slot 0..=9 (the "1".."0" keys).
    Hotbar(u8),
}

/// Ordered, grouped list of the bindable actions for the Inputs settings
/// panel: (group, display name, action). Hotbar slots are summarised as one
/// row rather than ten. This is the single source of truth for what the
/// panel shows and in what order.
pub const BINDING_ROWS: &[(&str, &str, Action)] = &[
    ("Movement", "Move forward", Action::MoveForward),
    ("Movement", "Move back", Action::MoveBack),
    ("Movement", "Move left", Action::MoveLeft),
    ("Movement", "Move right", Action::MoveRight),
    ("Movement", "Jump / up", Action::Jump),
    ("Movement", "Sprint", Action::Sprint),
    ("Movement", "Fly down", Action::FlyDown),
    ("Movement", "Toggle fly", Action::ToggleFly),
    ("Camera", "Roll left", Action::RollLeft),
    ("Camera", "Roll right", Action::RollRight),
    ("Interact", "Interact / inventory", Action::Interact),
    ("Interact", "Eat", Action::Eat),
    ("Interact", "Plant / till", Action::Plant),
    ("Rocket", "Stage / jettison", Action::Stage),
    ("Rocket", "Exit rocket", Action::ExitRocket),
    ("Rocket", "Respawn rocket", Action::RespawnRocket),
    ("Rocket", "Camera alignment", Action::CamAlign),
    ("Menus", "Pause menu", Action::Pause),
    ("Menus", "Tech tree", Action::OpenTechTree),
    ("Menus", "Crafting", Action::OpenCrafting),
    ("Menus", "Solar system map", Action::OpenSolarMap),
    ("Toggles", "Survival / creative", Action::SurvivalToggle),
    ("Debug", "Debug UI", Action::ToggleDebugUi),
    ("Debug", "Players panel", Action::PlayersPanel),
    ("Debug", "Profiler", Action::ToggleProfiler),
    ("Debug", "Pixel UI demo", Action::PixelUiDemo),
    ("Debug", "Block snapshot", Action::BlockSnapshot),
    ("Debug", "Flow debug", Action::FlowDebug),
    ("Debug", "Hide terrain", Action::ToggleTerrain),
    ("Debug", "Hide water", Action::ToggleWater),
    ("Debug", "Hide skybox", Action::ToggleSkybox),
    ("Debug", "Teleport menu", Action::OpenTeleport),
];

/// True for the categories in [`BINDING_ROWS`] that are developer tools, so
/// the Inputs panel can visually fence them off from the normal controls.
pub fn is_debug_group(group: &str) -> bool {
    group == "Debug"
}

/// (config key name, action). Hotbar slots use their own name form
/// (`hotbar_1`..`hotbar_10`) handled in [`action_from_name`].
fn action_from_name(name: &str) -> Option<Action> {
    Some(match name {
        "move_forward" => Action::MoveForward,
        "move_back" => Action::MoveBack,
        "move_left" => Action::MoveLeft,
        "move_right" => Action::MoveRight,
        "jump" => Action::Jump,
        "sprint" => Action::Sprint,
        "fly_down" => Action::FlyDown,
        "toggle_fly" => Action::ToggleFly,
        "roll_left" => Action::RollLeft,
        "roll_right" => Action::RollRight,
        "interact" => Action::Interact,
        "stage" => Action::Stage,
        "exit_rocket" => Action::ExitRocket,
        "respawn_rocket" => Action::RespawnRocket,
        "cam_align" => Action::CamAlign,
        "eat" => Action::Eat,
        "plant" => Action::Plant,
        "survival_toggle" => Action::SurvivalToggle,
        "pause" => Action::Pause,
        "tech_tree" => Action::OpenTechTree,
        "crafting" => Action::OpenCrafting,
        "solar_map" => Action::OpenSolarMap,
        "hide_terrain" => Action::ToggleTerrain,
        "hide_water" => Action::ToggleWater,
        "hide_skybox" => Action::ToggleSkybox,
        "teleport_menu" => Action::OpenTeleport,
        "debug_ui" => Action::ToggleDebugUi,
        "players_panel" => Action::PlayersPanel,
        "profiler" => Action::ToggleProfiler,
        "pixel_ui_demo" => Action::PixelUiDemo,
        "block_snapshot" => Action::BlockSnapshot,
        "flow_debug" => Action::FlowDebug,
        _ => {
            if let Some(n) = name.strip_prefix("hotbar_") {
                let slot: u8 = n.parse().ok()?;
                if (1..=10).contains(&slot) {
                    return Some(Action::Hotbar(slot - 1));
                }
            }
            return None;
        }
    })
}

/// Map a config key NAME (as written in controls.yaml) to a sokol keycode.
/// Only the keys the game actually binds are listed; an unknown name is a
/// no-op binding (logged by the loader).
fn keycode_from_name(name: &str) -> Option<Keycode> {
    use Keycode::*;
    Some(match name {
        "A" => A, "B" => B, "C" => C, "D" => D, "E" => E, "F" => F, "G" => G,
        "H" => H, "I" => I, "J" => J, "K" => K, "L" => L, "M" => M, "N" => N,
        "O" => O, "P" => P, "Q" => Q, "R" => R, "S" => S, "T" => T, "U" => U,
        "V" => V, "W" => W, "X" => X, "Y" => Y, "Z" => Z,
        "Num0" => Num0, "Num1" => Num1, "Num2" => Num2, "Num3" => Num3,
        "Num4" => Num4, "Num5" => Num5, "Num6" => Num6, "Num7" => Num7,
        "Num8" => Num8, "Num9" => Num9,
        "Space" => Space,
        "LeftShift" => LeftShift, "RightShift" => RightShift,
        "LeftControl" => LeftControl, "RightControl" => RightControl,
        "Tab" => Tab, "Enter" => Enter, "Escape" => Escape,
        "F1" => F1, "F2" => F2, "F3" => F3, "F4" => F4, "F5" => F5,
        "F6" => F6, "F7" => F7, "F8" => F8, "F9" => F9, "F10" => F10,
        "F11" => F11, "F12" => F12,
        _ => return None,
    })
}

/// Short label for a keycode, for on-screen prompts (`"[E] open chest"`).
/// ASCII only (CLAUDE.md in-game-text rule).
pub fn key_label(k: Keycode) -> &'static str {
    use Keycode::*;
    match k {
        A => "A", B => "B", C => "C", D => "D", E => "E", F => "F", G => "G",
        H => "H", I => "I", J => "J", K => "K", L => "L", M => "M", N => "N",
        O => "O", P => "P", Q => "Q", R => "R", S => "S", T => "T", U => "U",
        V => "V", W => "W", X => "X", Y => "Y", Z => "Z",
        Num0 => "0", Num1 => "1", Num2 => "2", Num3 => "3", Num4 => "4",
        Num5 => "5", Num6 => "6", Num7 => "7", Num8 => "8", Num9 => "9",
        Space => "Space",
        LeftShift | RightShift => "Shift",
        LeftControl | RightControl => "Ctrl",
        Tab => "Tab", Enter => "Enter", Escape => "Esc",
        F1 => "F1", F2 => "F2", F3 => "F3", F4 => "F4", F5 => "F5",
        F6 => "F6", F7 => "F7", F8 => "F8", F9 => "F9", F10 => "F10",
        F11 => "F11", F12 => "F12",
        _ => "?",
    }
}

/// Compiled-in default bindings. The controls.yaml file overrides these
/// per action; anything it omits keeps the default here, so the game is
/// always controllable.
fn default_bindings() -> Vec<(Keycode, Action)> {
    use Keycode::*;
    let mut b = vec![
        (W, Action::MoveForward),
        (S, Action::MoveBack),
        (A, Action::MoveLeft),
        (D, Action::MoveRight),
        (Space, Action::Jump),
        (LeftShift, Action::Sprint),
        (RightShift, Action::Sprint),
        (LeftControl, Action::FlyDown),
        (RightControl, Action::FlyDown),
        (C, Action::FlyDown),
        (F, Action::ToggleFly),
        (G, Action::SurvivalToggle),
        (V, Action::Eat),
        (T, Action::Plant),
        (Q, Action::RollLeft),
        (E, Action::RollRight),
        (Tab, Action::Interact),
        (X, Action::Stage),
        /* Beside X so the rocket keys cluster. Not V (the JS's exit key) -
         * V is Eat here, and the bindings are the player's muscle memory,
         * not the reference implementation's. */
        (Z, Action::ExitRocket),
        (P, Action::RespawnRocket),
        (L, Action::CamAlign),
        /* Menus + debug. */
        (Escape, Action::Pause),
        (K, Action::OpenTechTree),
        (B, Action::OpenCrafting),
        /* O = orbit chart. Free key (V is Eat, M is Teleport). */
        (O, Action::OpenSolarMap),
        (F2, Action::ToggleDebugUi),
        (F1, Action::PlayersPanel),
        (F3, Action::ToggleProfiler),
        (F8, Action::PixelUiDemo),
        (F4, Action::BlockSnapshot),
        (F5, Action::FlowDebug),
        /* Debug render toggles (only while the debug UI is on). Skybox moved
         * off K - K opens the tech tree, which used to shadow it dead. */
        (H, Action::ToggleTerrain),
        (J, Action::ToggleWater),
        (Y, Action::ToggleSkybox),
        /* Teleport menu on M (T is Plant - dropped the old T overload). */
        (M, Action::OpenTeleport),
    ];
    let nums = [Num1, Num2, Num3, Num4, Num5, Num6, Num7, Num8, Num9, Num0];
    for (i, k) in nums.into_iter().enumerate() {
        b.push((k, Action::Hotbar(i as u8)));
    }
    b
}

thread_local! {
    static BINDINGS: RefCell<Vec<(Keycode, Action)>> = RefCell::new(default_bindings());
}

/// The action a physical key is bound to (first match), if any.
pub fn action_for_key(k: Keycode) -> Option<Action> {
    BINDINGS.with(|b| {
        b.borrow()
            .iter()
            .find(|(kc, _)| *kc == k)
            .map(|(_, a)| *a)
    })
}

/// The first key bound to an action, for prompts ("press [E]"). Returns
/// `None` if the action is unbound.
pub fn key_for_action(a: Action) -> Option<Keycode> {
    BINDINGS.with(|b| {
        b.borrow()
            .iter()
            .find(|(_, act)| *act == a)
            .map(|(kc, _)| *kc)
    })
}

/// Short key label bound to an action, e.g. `"E"` for [`Action::Interact`].
/// Falls back to `"?"` if the action is unbound.
pub fn action_label(a: Action) -> &'static str {
    key_for_action(a).map(key_label).unwrap_or("?")
}

/// Parse a controls.yaml body: `action_name: KeyName` lines, value may be a
/// comma-separated list to bind several keys to one action. Starts from the
/// compiled-in defaults and REPLACES every key currently mapped to an action
/// the file names, so a file line fully re-binds that action (no stale
/// default key lingers). Unknown action / key names are skipped (returned in
/// the warning list) rather than aborting the whole file.
pub fn parse(src: &str) -> (Vec<(Keycode, Action)>, Vec<String>) {
    let mut bindings = default_bindings();
    let mut warnings = Vec::new();
    for raw in src.lines() {
        let line = raw.split('#').next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }
        let Some((key_name, val)) = line.split_once(':') else {
            continue;
        };
        let action = match action_from_name(key_name.trim()) {
            Some(a) => a,
            None => {
                warnings.push(format!("unknown action '{}'", key_name.trim()));
                continue;
            }
        };
        /* A named action fully replaces its default keys. */
        bindings.retain(|(_, a)| *a != action);
        for tok in val.split(',') {
            let tok = tok.trim();
            if tok.is_empty() {
                continue;
            }
            match keycode_from_name(tok) {
                Some(k) => {
                    /* A physical key does exactly one thing: assigning it here
                     * unbinds it from whatever else it was on (last wins), so a
                     * remap can't silently leave the key double-bound. */
                    bindings.retain(|(kc, _)| *kc != k);
                    bindings.push((k, action));
                }
                None => warnings.push(format!("unknown key '{}' for '{}'", tok, key_name.trim())),
            }
        }
    }
    (bindings, warnings)
}

/// Install a parsed binding set as the active controls.
pub fn set_bindings(bindings: Vec<(Keycode, Action)>) {
    BINDINGS.with(|b| *b.borrow_mut() = bindings);
}

/// Restore the compiled-in default bindings. Used by input tests to isolate
/// from any custom bindings a controls test left in the thread-local.
pub fn reset_to_defaults() {
    set_bindings(default_bindings());
}

/// Load and install bindings from a controls.yaml file. Missing / unreadable
/// file keeps the compiled-in defaults. Native reads off disk for
/// edit-and-rerun; call once at boot.
pub fn load(path: &str) {
    match std::fs::read_to_string(path) {
        Ok(src) => {
            let (bindings, warnings) = parse(&src);
            for w in &warnings {
                println!("[controls] {}: {}", path, w);
            }
            let n = bindings.len();
            set_bindings(bindings);
            println!("[controls] loaded {} ({} bindings)", path, n);
        }
        Err(_) => {
            println!("[controls] {} not found - using default bindings", path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_bind_the_core_scheme() {
        set_bindings(default_bindings());
        assert_eq!(action_for_key(Keycode::W), Some(Action::MoveForward));
        assert_eq!(action_for_key(Keycode::Tab), Some(Action::Interact));
        assert_eq!(action_for_key(Keycode::Q), Some(Action::RollLeft));
        assert_eq!(action_for_key(Keycode::E), Some(Action::RollRight));
        assert_eq!(action_for_key(Keycode::Num1), Some(Action::Hotbar(0)));
        assert_eq!(action_for_key(Keycode::Num0), Some(Action::Hotbar(9)));
        /* Roll is Q/E; inventory/interact moved to Tab so E frees up for roll. */
        assert_ne!(action_for_key(Keycode::E), Some(Action::Interact));
    }

    #[test]
    fn prompt_label_follows_the_binding() {
        set_bindings(default_bindings());
        assert_eq!(action_label(Action::Interact), "Tab");
        /* E is roll-right in the default scheme, not interact. */
        assert_eq!(action_for_key(Keycode::E), Some(Action::RollRight));
        /* Rebinding interact moves the prompt with it. */
        let (b, warn) = parse("interact: F\n");
        assert!(warn.is_empty(), "{warn:?}");
        set_bindings(b);
        assert_eq!(action_label(Action::Interact), "F");
        assert_eq!(action_for_key(Keycode::F), Some(Action::Interact));
    }

    #[test]
    fn parse_rebinds_and_reports_unknowns() {
        let (b, warn) = parse(
            "# comment\nroll_left: Z\nroll_right: X\neat: B\nbogus_action: Q\ninteract: Bogus\n",
        );
        set_bindings(b);
        assert_eq!(action_for_key(Keycode::Z), Some(Action::RollLeft));
        assert_eq!(action_for_key(Keycode::X), Some(Action::RollRight));
        assert_eq!(action_for_key(Keycode::B), Some(Action::Eat));
        /* Q was the default roll_left; rebinding roll_left to Z clears it. */
        assert_eq!(action_for_key(Keycode::Q), None);
        assert!(warn.iter().any(|w| w.contains("bogus_action")));
        assert!(warn.iter().any(|w| w.contains("Bogus")));
    }

    #[test]
    fn hotbar_names_parse() {
        assert_eq!(action_from_name("hotbar_1"), Some(Action::Hotbar(0)));
        assert_eq!(action_from_name("hotbar_10"), Some(Action::Hotbar(9)));
        assert_eq!(action_from_name("hotbar_11"), None);
    }
}
