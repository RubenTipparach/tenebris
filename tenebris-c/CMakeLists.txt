cmake_minimum_required(VERSION 3.20)
project(tenebris C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

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
)

add_library(tenebris_core STATIC ${TENEBRIS_CORE_SOURCES})
target_include_directories(tenebris_core PUBLIC src)
target_compile_options(tenebris_core PRIVATE
    -Wall -Wextra -Wpedantic
    -ffp-contract=off -fno-fast-math    # determinism: same FP on native + wasm
)

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
    src/client/mobile_ui.c
    src/client/teleport_menu.c
    src/client/gfx_math.c
)

if (EMSCRIPTEN)
    add_executable(tenebris ${TENEBRIS_CLIENT_SOURCES})
    target_link_libraries(tenebris PRIVATE tenebris_core tenebris_third_party)
    target_compile_definitions(tenebris PRIVATE CLIENT_BUILD SOKOL_GLES3)

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

    # Populate assets/ from the parent project's public/textures when the
    # C project is built standalone (no scripts/build-wasm.sh in the loop).
    # Filenames must match the bake_atlas block in renderer.c.
    set(TENEBRIS_PUBLIC_TEXTURES "${CMAKE_SOURCE_DIR}/../public/textures")
    if (EXISTS "${TENEBRIS_PUBLIC_TEXTURES}/rocks.png")
        file(MAKE_DIRECTORY "${CMAKE_SOURCE_DIR}/assets/textures")
        foreach(name water sand dirt grass rocks ice snow dirt_grass dirt_snow torch moon)
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

    if (APPLE)
        target_compile_definitions(tenebris PRIVATE SOKOL_METAL)
        target_link_libraries(tenebris PRIVATE
            "-framework Cocoa" "-framework QuartzCore"
            "-framework Metal" "-framework MetalKit"
            "-framework AudioToolbox")
    elseif (WIN32)
        target_compile_definitions(tenebris PRIVATE SOKOL_D3D11)
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
