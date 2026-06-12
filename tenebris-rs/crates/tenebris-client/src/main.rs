//! Port of `tenebris-c/src/client/main_web.c` + module tree.
//! See ../../PORTING.md for rules. Entry point becomes real when the
//! main_web port lands (final client wave).

mod chat;
mod client_kv;
mod gfx_math;
mod hex_mesher;
mod hotbar_ui;
mod input;
mod interact;
mod inventory;
mod menu;
mod mobile_ui;
mod net_client;
mod net_transport;
mod persistence;
mod player_ctrl;
mod profile;
mod profiler;
mod remote_players;
mod renderer;
mod settings;
mod shaders;
mod teleport_menu;
mod torch;

fn main() {
    println!("tenebris-client (rust port) - app loop pending");
}
