//! Port of `tenebris-c/src/client/main_web.c` + module tree.
//! See ../../PORTING.md for rules.

mod animals;
mod fishing;
mod app;
mod bag;
mod baked_model;
mod bonfire_fx;
mod bonfire_screen;
mod chat;
mod chest_screen;
mod client_kv;
mod clouds;
mod crafting_screen;
mod crops;
mod drops;
mod falling_stage;
mod furnace_screen;
mod power_ui;
mod rocket_screen;
mod rocket_fx;
mod station_fx;
mod rocket_ride;
mod reentry_fx;
mod station_screen;
mod egui_layer;
mod gfx_math;
mod hex_mesher;
mod hotbar_ui;
mod controls;
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
mod screens;
mod settings;
mod slot_dnd;
mod shaders;
mod tech_tree;
mod teleport_menu;
mod viewmodel;
mod weather_fx;
mod torch;
mod ui_icons;

fn main() {
    app::run();
}
