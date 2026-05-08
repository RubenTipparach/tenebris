cmake_minimum_required(VERSION 3.20)
project(tenebris C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# sokol-shdc shader cross-compiler integration. Defines
# add_sokol_shader(target path/to/shader.glsl) which attaches the
# generated header to `target` and exposes its directory on the
# include path. The binary itself is fetched by scripts/fetch-deps.sh.
include(cmake/sokol-shdc.cmake)

# ---------------------------------------------------------------------------
# core library — shared between client and server. MUST NOT depend on sokol.
# Enforced by the test in tools/check-core-deps.cmake (invoked in CI).
# ---------------------------------------------------------------------------
set(TENEBRIS_CORE_SOURCES
    src/core/blocks.c
    src/core/math.c
    src/core/physics.c
    src/core/proto.c
    src/core/rng.c
    src/core/planet.c
    src/core/planet_gen.c
    src/core/goldberg.c
    src/core/world.c
    src/core/job_system.c
    src/core/config.c
)

add_library(tenebris_core STATIC ${TENEBRIS_CORE_SOURCES})
target_include_directories(tenebris_core PUBLIC src)
if (MSVC)
    # MSVC's default /fp:precise already disables FP contraction and fast-math,
    # so we don't need explicit determinism flags. Keep warnings at /W3.
    target_compile_options(tenebris_core PRIVATE /W3)
else()
    target_compile_options(tenebris_core PRIVATE
        -Wall -Wextra -Wpedantic
        -ffp-contract=off -fno-fast-math    # determinism: same FP on native + wasm
    )
endif()

# ---------------------------------------------------------------------------
# third-party: vendored single-header libs (fetch via scripts/fetch-deps.sh)
# ---------------------------------------------------------------------------
add_library(tenebris_third_party INTERFACE)
target_include_directories(tenebris_third_party INTERFACE
    third_party/sokol
    third_party/sokol/util   # sokol_debugtext.h, sokol_gl.h
    third_party/stb
    third_party/HandmadeMath
)

# ---------------------------------------------------------------------------
# client build — different shape depending on target
# ---------------------------------------------------------------------------
set(TENEBRIS_CLIENT_SOURCES
    src/client/sokol_impl.c
    src/client/main_web.c
    src/client/renderer.c
    src/client/hex_mesher.c
    src/client/input.c
    src/client/player_ctrl.c
    src/client/interact.c
    src/client/inventory.c
    src/client/hotbar_ui.c
    src/client/mobile_ui.c
    src/client/teleport_menu.c
    src/client/torch.c
    src/client/gfx_math.c
)

# Populate assets/textures/ from the parent JS project's public/textures.
# Both web and native targets read these at runtime — the web build
# preloads the whole assets/ tree into the WASM filesystem, the native
# build reads them off disk relative to the working directory. Filenames
# must match the bake_atlas block in renderer.c.
set(TENEBRIS_PUBLIC_TEXTURES "${CMAKE_SOURCE_DIR}/../public/textures")
if (EXISTS "${TENEBRIS_PUBLIC_TEXTURES}/rocks.png")
    file(MAKE_DIRECTORY "${CMAKE_SOURCE_DIR}/assets/textures")
    foreach(name water sand dirt grass rocks ice snow dirt_grass dirt_snow torch moon wood)
        if (EXISTS "${TENEBRIS_PUBLIC_TEXTURES}/${name}.png")
            configure_file("${TENEBRIS_PUBLIC_TEXTURES}/${name}.png"
                           "${CMAKE_SOURCE_DIR}/assets/textures/${name}.png" COPYONLY)
        endif()
    endforeach()
    file(MAKE_DIRECTORY "${CMAKE_SOURCE_DIR}/assets/textures/planet_seq")
    foreach(name planet_seq_grass planet_seq_dirt planet_seq_grass_dirt planet_seq_sand planet_seq_snow planet_seq_snow_dirt)
        if (EXISTS "${TENEBRIS_PUBLIC_TEXTURES}/planet_seq/${name}.png")
            configure_file("${TENEBRIS_PUBLIC_TEXTURES}/planet_seq/${name}.png"
                           "${CMAKE_SOURCE_DIR}/assets/textures/planet_seq/${name}.png" COPYONLY)
        endif()
    endforeach()
endif()

if (EMSCRIPTEN)
    add_executable(tenebris ${TENEBRIS_CLIENT_SOURCES})
    target_link_libraries(tenebris PRIVATE tenebris_core tenebris_third_party)
    target_compile_definitions(tenebris PRIVATE CLIENT_BUILD SOKOL_GLES3)

    # Shaders compiled by sokol-shdc into <name>.glsl.h next to the
    # build artefacts. renderer.c #includes the generated header and
    # uses <name>_shader_desc(sg_query_backend()) instead of inlining
    # GLSL strings.
    add_sokol_shader(tenebris src/shaders/water.glsl)
    add_sokol_shader(tenebris src/shaders/composite.glsl)
    add_sokol_shader(tenebris src/shaders/starfield.glsl)
    add_sokol_shader(tenebris src/shaders/atmosphere.glsl)
    add_sokol_shader(tenebris src/shaders/hex.glsl)
    add_sokol_shader(tenebris src/shaders/distant.glsl)
    add_sokol_shader(tenebris src/shaders/sun.glsl)
    add_sokol_shader(tenebris src/shaders/torch.glsl)

    set(EMCC_LINK_FLAGS
        "-sUSE_WEBGL2=1"
        "-sFULL_ES3=1"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sSTACK_SIZE=1mb"
        "-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
        "--shell-file=${CMAKE_SOURCE_DIR}/web/shell.html"
        "--preload-file" "${CMAKE_SOURCE_DIR}/assets@/assets"
    )
    target_link_options(tenebris PRIVATE ${EMCC_LINK_FLAGS})
    set_target_properties(tenebris PROPERTIES SUFFIX ".html")

    # Copy assets next to the build output.
    add_custom_command(TARGET tenebris POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${CMAKE_SOURCE_DIR}/assets
                $<TARGET_FILE_DIR:tenebris>/assets
    )
else()
    # native dev build: Linux/macOS/Windows. Uses GL 3.3.
    add_executable(tenebris ${TENEBRIS_CLIENT_SOURCES})
    target_link_libraries(tenebris PRIVATE tenebris_core tenebris_third_party)
    target_compile_definitions(tenebris PRIVATE CLIENT_BUILD)

    add_sokol_shader(tenebris src/shaders/water.glsl)
    add_sokol_shader(tenebris src/shaders/composite.glsl)
    add_sokol_shader(tenebris src/shaders/starfield.glsl)
    add_sokol_shader(tenebris src/shaders/atmosphere.glsl)
    add_sokol_shader(tenebris src/shaders/hex.glsl)
    add_sokol_shader(tenebris src/shaders/distant.glsl)
    add_sokol_shader(tenebris src/shaders/sun.glsl)
    add_sokol_shader(tenebris src/shaders/torch.glsl)

    if (APPLE)
        target_compile_definitions(tenebris PRIVATE SOKOL_METAL)
        target_link_libraries(tenebris PRIVATE
            "-framework Cocoa" "-framework QuartzCore"
            "-framework Metal" "-framework MetalKit"
            "-framework AudioToolbox")
    elseif (WIN32)
        # Native Windows uses desktop GL. All shaders go through
        # sokol-shdc (slang glsl410 — see cmake/sokol-shdc.cmake) so the
        # backend is interchangeable with D3D11; GLCORE was the working
        # path while inline GLSL-ES shaders still existed in renderer.c
        # and is kept as the default.
        target_compile_definitions(tenebris PRIVATE SOKOL_GLCORE)
        target_link_libraries(tenebris PRIVATE opengl32)
    else()
        target_compile_definitions(tenebris PRIVATE SOKOL_GLCORE)
        find_package(OpenGL REQUIRED)
        target_link_libraries(tenebris PRIVATE
            OpenGL::GL X11 Xi Xcursor m dl pthread asound)
    endif()

    # server target — headless, native only. Empty shell for now; wired in Tier 5.
    # add_executable(tenebris_server src/server/main_server.c)
    # target_link_libraries(tenebris_server PRIVATE tenebris_core)
endif()
