# Multi-stage build for tenebris-server (Rust port).
#
# Stage 1: build the binary from source against the Rust toolchain.
# Stage 2: copy the binary into a small runtime image. The runtime
# image has no compiler, no source, just glibc + the static asset
# tree the server reads (configs).
#
# Builds for linux/amd64 by default. Override with `--platform` to
# Fly's arm64 hosts.
#
# The build context is tenebris-rs/ - the image is fully
# self-contained per the repo rule (the Rust port never references the
# C or JS trees; its config tree lives at tenebris-rs/assets/config).
# Build / deploy from tenebris-rs/:
#
#   docker build -f Dockerfile -t tenebris-server .
#   fly deploy --config fly.toml
#
# The Dockerfile.dockerignore next to this file whitelists the few
# paths the build needs so local target/ output never enters the
# context (BuildKit picks up per-Dockerfile ignore files).

# Full (non-slim) image: includes git, which cargo needs if it has to
# fetch the workspace's git-pinned dependency (sokol-rust, used by the
# client crate) while resolving the lockfile.
FROM rust:bookworm AS build

WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

RUN cargo build --release --locked -p tenebris-server


FROM debian:bookworm-slim AS runtime
# No libwebsockets here - tokio + tokio-tungstenite replace it and are
# statically linked into the binary. ca-certificates kept for outbound
# TLS parity with the C image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /src/target/release/tenebris-server /app/tenebris-server
# The Rust port's own YAML config tree. Config paths follow the repo
# convention of cwd-relative "assets/config/*.yaml" (see the
# config::load_* call sites), so WORKDIR /app + /app/assets/config
# makes them resolvable. The server reads time.yaml (authoritative
# day/night clock) and farming.yaml (crop growth) at boot; missing
# files fall back to compiled-in defaults.
COPY assets/config /app/assets/config

# Fly's internal port. Matches fly.toml. The server reads --port at
# runtime; CMD here is the in-container default.
ENV TENEBRIS_PORT=8080
EXPOSE 8080

# Saves live in /data, mounted as a Fly volume in production so the
# world survives redeploys. The volume carries the saves the C server
# wrote - the format is byte-compatible (PORTING.md hard rule 1), so
# the Rust server extends them in place.
VOLUME ["/data"]

ENTRYPOINT ["/app/tenebris-server"]
CMD ["--port", "8080", "--saves", "/data/saves"]
