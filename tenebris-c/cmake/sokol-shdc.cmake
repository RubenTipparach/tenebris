# sokol-shdc integration.
#
# Compiles a shader source authored in sokol-shdc's annotated GLSL
# dialect (@vs / @fs / @program markers) into a C header with the
# matching sg_shader_desc reflection — so the runtime never has to
# hand-write `glsl_uniforms[]` tables, vertex-attribute names, or do
# its own std140 offset arithmetic. Same source compiles to GLSL
# (web GLES3 + native desktop), HLSL (Windows D3D11), MSL (macOS
# Metal), and WGSL (when we eventually flip to the WebGPU backend).
#
# Intended use from CMakeLists.txt:
#
#   include(cmake/sokol-shdc.cmake)
#   add_sokol_shader(tenebris src/shaders/water.glsl)
#
# Each call attaches a generated header `${NAME}.glsl.h` to TARGET_NAME
# and adds the generated/ dir to its include path; consumers do
# `#include "water.glsl.h"` and call e.g. `water_shader_desc(sg_query_backend())`.
#
# The sokol-shdc binary itself is fetched by scripts/fetch-deps.sh.
# We don't auto-download from CMake to keep configure-time hermetic.

if (CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows")
    set(SOKOL_SHDC "${CMAKE_SOURCE_DIR}/third_party/sokol-tools-bin/sokol-shdc.exe")
else()
    set(SOKOL_SHDC "${CMAKE_SOURCE_DIR}/third_party/sokol-tools-bin/sokol-shdc")
endif()

# Pick the slang that matches the configured sokol backend. EMSCRIPTEN
# uses GLES3 / WebGL2; native desktop uses Metal on Apple, D3D11 on
# Windows, GL 4.1+ elsewhere.
if (EMSCRIPTEN)
    set(SOKOL_SHDC_SLANG "glsl300es")
elseif (APPLE)
    set(SOKOL_SHDC_SLANG "metal_macos")
elseif (WIN32)
    set(SOKOL_SHDC_SLANG "hlsl5")
else()
    set(SOKOL_SHDC_SLANG "glsl410")
endif()

function(add_sokol_shader TARGET_NAME INPUT_FILE)
    if (NOT EXISTS "${SOKOL_SHDC}")
        message(FATAL_ERROR
            "sokol-shdc not found at ${SOKOL_SHDC}\n"
            "Run scripts/fetch-deps.sh from tenebris-c/ to download it.")
    endif()

    get_filename_component(NAME_WE  "${INPUT_FILE}" NAME_WE)
    get_filename_component(ABS_INPUT "${INPUT_FILE}" ABSOLUTE)
    set(OUTPUT_FILE "${CMAKE_BINARY_DIR}/generated/${NAME_WE}.glsl.h")

    file(MAKE_DIRECTORY "${CMAKE_BINARY_DIR}/generated")

    add_custom_command(
        OUTPUT  "${OUTPUT_FILE}"
        COMMAND "${SOKOL_SHDC}"
                --input  "${ABS_INPUT}"
                --output "${OUTPUT_FILE}"
                --slang  "${SOKOL_SHDC_SLANG}"
                --format sokol
        DEPENDS "${ABS_INPUT}" "${SOKOL_SHDC}"
        COMMENT "[sokol-shdc] ${NAME_WE}.glsl -> ${SOKOL_SHDC_SLANG}"
        VERBATIM
    )
    target_sources(${TARGET_NAME} PRIVATE "${OUTPUT_FILE}")
    target_include_directories(${TARGET_NAME} PRIVATE
        "${CMAKE_BINARY_DIR}/generated")
endfunction()
