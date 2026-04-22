/*
 * Single translation unit that owns the sokol single-header implementations.
 * Every other client/ .c file includes sokol_*.h for declarations only.
 * Keeping the impl isolated here stops SOKOL_IMPL from leaking into any
 * file that transitively pulls in sokol_app.h via a client header.
 */
#define SOKOL_IMPL
/* SOKOL_GLES3 is already forced from CMakeLists via target_compile_definitions. */
#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"
#include "sokol_gl.h"      /* immediate-mode 2D HUD for the mobile overlay */
