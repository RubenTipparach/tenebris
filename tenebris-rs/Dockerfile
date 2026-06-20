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
# IMPORTANT: the build context is the REPO ROOT, not tenebris-rs/.
# The YAML config tree is shared with the C port at
# tenebris-c/assets/config (PORTING.md: "shared asset tree, not
# duplicated"), which sits outside a tenebris-rs/-rooted context.
# Build / deploy from the repo root:
#
#   docker build -f tenebris-rs/Dockerfile -t tenebris-rs .
#   fly deploy . --config tenebris-rs/fly.toml
#
# The Dockerfile.dockerignore next to this file whitelists the few
# paths the build needs so the rest of the repo never enters the
# context (BuildKit picks up per-Dockerfile ignore files).

# Full (non-slim) image: includes git, which cargo needs if it has to
# fetch the workspace's git-pinned dependency (sokol-rust, used by the
# client crate) while resolving the lockfile.
FROM rust:bookworm AS build

WORKDIR /src
COPY tenebris-rs/Cargo.toml tenebris-rs/Cargo.lock ./
COPY tenebris-rs/crates ./crates

RUN cargo build --release -p tenebris-server


FROM debian:bookworm-slim AS runtime
# No libwebsockets here - tokio + tokio-tungstenite replace it and are
# statically linked into the binary. ca-certificates kept for outbound
# TLS parity with the C image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /src/target/release/tenebris-server /app/tenebris-server
# Shared YAML config tree. Config paths follow the repo convention of
# cwd-relative "assets/config/*.yaml" (see config::load_* /
# config_load_* call sites), so WORKDIR /app + /app/assets/config makes
# them resolvable. Note the server currently boots on compiled-in
# defaults - the YAML loaders are only invoked client-side today - but
# the tree ships anyway for parity with the C image and so a future
# server-side config load lands without an image change.
COPY tenebris-c/assets/config /app/assets/config

# Fly's internal port. Matches fly.toml. The server reads --port at
# runtime; CMD here is the in-container default.
ENV TENEBRIS_PORT=8080
EXPOSE 8080

# Saves live in /data, mounted as a Fly volume in production so the
# world survives redeploys.
VOLUME ["/data"]

ENTRYPOINT ["/app/tenebris-server"]
CMD ["--port", "8080", "--saves", "/data/saves"]
