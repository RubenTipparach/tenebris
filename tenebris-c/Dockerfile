# Multi-stage build for tenebris-server.
#
# Stage 1: build the binary from source against a full toolchain.
# Stage 2: copy the binary into a small runtime image. The runtime
# image has no compiler, no source, just glibc + the static asset
# tree the server reads (configs).
#
# Builds for linux/amd64 by default. Override with `--platform` to
# Fly's arm64 hosts.

FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential cmake ninja-build ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY CMakeLists.txt ./
COPY cmake ./cmake
COPY src ./src
COPY assets ./assets
COPY scripts ./scripts
COPY third_party ./third_party

RUN cmake -B build -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_C_FLAGS_RELEASE="-O2 -DNDEBUG" \
    && cmake --build build --target tenebris-server


FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /src/build/tenebris-server /app/tenebris-server
COPY --from=build /src/assets /app/assets

# Fly's internal port. Matches fly.toml. The server reads --port at
# runtime; CMD here is the in-container default.
ENV TENEBRIS_PORT=8080
EXPOSE 8080

# Saves live in /data, mounted as a Fly volume in production so the
# world survives redeploys.
VOLUME ["/data"]

ENTRYPOINT ["/app/tenebris-server"]
CMD ["--port", "8080", "--saves", "/data/saves"]
