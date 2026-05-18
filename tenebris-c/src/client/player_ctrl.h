#ifndef TENEBRIS_CLIENT_PLAYER_CTRL_H
#define TENEBRIS_CLIENT_PLAYER_CTRL_H

#include "core/physics.h"
#include "core/planet.h"
#include "core/world.h"
#include "client/gfx_math.h"
#include "client/inventory.h"

#define EYE_HEIGHT 1.6f

typedef struct {
    dvec3_t     position;
    /* Drift velocity, world-space metres/s. Carries momentum across
     * frames for both space-mode flight (thrust + drag) and planet
     * mode where the radial component is the falling vy and the
     * tangential component carries any leftover orbital push. */
    dvec3_t     velocity;
    float       yaw;
    float       pitch;
    bool        grounded;
    /* True when the player is outside every body's gravity-falloff
     * radius. Drives 6DOF mouse-look + thrust-and-drag movement
     * (versus planet-mode walking), the camera.up choice, and the
     * HUD status tag. Edge transitions arm the roll-slerp timer
     * below for a smooth re-entry. */
    bool        is_in_space;
    /* Seconds remaining on the post-entry roll-to-level slerp. >0
     * means the basis is being smoothly aligned with the planet's
     * radial up while the player keeps mouse-look authority. Set on
     * space → planet edges and on teleport, decremented per frame. */
    float       transition_timer_s;
    int         last_tile;

    /* Jump/jetpack timing. jump_held_s counts seconds the jump key
     * has been held since its last 0→1 edge; jump_consumed flips
     * true the frame the impulse fires so it never fires twice for
     * one press. Together they let player_update keep tap-to-jump
     * distinct from hold-for-jetpack — jetpack thrust only kicks in
     * once jump_held_s passes the configured threshold. */
    float       jump_held_s;
    bool        jump_consumed;

    /* Hotbar inventory. selected_block is the type the right-click
     * place will use; survival_mode gates whether breaking accumulates
     * pickups + costs time, or is instantaneous + free (creative). */
    inventory_t inventory;
    bool        survival_mode;
    /* Fractional accumulator for mouse-wheel hotbar cycling. Trackpad
     * scrolls send small per-frame deltas; we only step a slot per
     * unit of accumulated scroll so high-resolution input doesn't
     * skip past every slot in one swipe. */
    float       hotbar_scroll_accum;

    /* Parallel-transported tangent frame, anchored to the *current*
     * body — up is the surface normal of `body`, not of the world
     * origin. Teleporting to another body re-anchors the basis. */
    tangent_basis_t basis;
    bool            basis_ready;

    /* Body we're orbiting / standing on. Gravity pulls toward its
     * center, surface normal comes from (position - body.pos). Swapped
     * by player_teleport_to; defaults to Tenebris at player_init. */
    const body_config_t* body;

    /* Last "safe" position - updated each frame the player is grounded
     * and well above the bedrock floor. Read by the bedrock-fall
     * rescue in player_update so a player who fell through the world
     * gets teleported back to where they were actually standing
     * instead of computing a surface point from a near-zero radial
     * (which degenerates into the body's prime-meridian default,
     * i.e. the spawn-at-origin bug the player keeps hitting).
     *
     * last_good_body tracks which body the last_good_position lives
     * on - the player may have been standing on a moon and the
     * rescue needs to teleport them back to that moon, not the
     * current body. NULL = no recorded safe pose yet, fall back to
     * the legacy unit-direction rescue. */
    dvec3_t              last_good_position;
    const body_config_t* last_good_body;
} player_ctrl_t;

void    player_init(player_ctrl_t* p, const body_config_t* body);
void    player_update(player_ctrl_t* p, world_t* w, float dt);

/* Teleport the player to a spot a few metres above the named body's
 * "prime meridian" surface (direction (1, 0, 0) relative to the
 * body). Sets velocity to zero and arms the roll-slerp timer so the
 * camera eases into level on arrival rather than popping. The
 * destination is well within the body's full-gravity radius, so the
 * gravity integrator pulls the player straight onto the surface —
 * no fly mode override, no no-clip drift. */
void    player_teleport_to(player_ctrl_t* p, const body_config_t* body);

/* Switch the player's frame of reference to a new body without
 * moving them. Used by the per-frame gravity tracker when the
 * dominant body changes mid-flight. Arms the roll-slerp timer if
 * we're entering a planet's gravity well (was-in-space → not-in-
 * space) so the basis aligns smoothly. No-op when body is already
 * current. */
void    player_set_body(player_ctrl_t* p, const body_config_t* body);

/* Cold-rebuild the basis from the player's current position relative
 * to p->body. Use after a teleport or MP-spawn lands the player at a
 * new pose without going through player_set_body (same body),
 * especially when the player will immediately enter space-mode
 * (is_in_space=true) - space-mode never calls sync_basis_to_planet,
 * so without an explicit rebuild the basis stays at the zero vectors
 * from player_init, producing a degenerate view matrix and zero-
 * length thrust axes. Safe to call any time p->body is non-NULL. */
void    player_rebuild_basis(player_ctrl_t* p);

dvec3_t player_world_pos(const player_ctrl_t* p);
mat4_t  player_view(const player_ctrl_t* p);

#endif
