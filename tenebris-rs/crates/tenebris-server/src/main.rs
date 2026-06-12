//! Port of `tenebris-c/src/server/`. See ../../PORTING.md for rules.

mod saves;
mod server;
mod transport;

fn main() {
    server::run();
}
