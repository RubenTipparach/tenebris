//! Port of `tenebris-c/src/client/main_web.c` + module tree.
//! See ../../PORTING.md for rules.

mod animals;
mod app;
mod bag;
mod baked_model;
mod chat;
mod chest_screen;
mod client_kv;
mod crafting_screen;
mod crops;
mod furnace_screen;
mod power_ui;
mod rocket_screen;
mod egui_layer;
mod gfx_math;
mod hex_mesher;
mod hotbar_ui;
mod input;
mod interact;
mod inventory;
mod inventory_screen;
mod menu;
mod mobile_ui;
mod net_client;
mod net_transport;
mod persistence;
mod pixel_ui;
mod player_ctrl;
mod profile;
mod profiler;
mod remote_players;
mod renderer;
mod settings;
mod shaders;
mod teleport_menu;
mod viewmodel;
mod torch;
mod ui_icons;

fn main() {
    app::run();
}
