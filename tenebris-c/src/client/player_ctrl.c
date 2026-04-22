#include "client/player_ctrl.h"
#include "client/input.h"
#include <math.h>

#define MOUSE_SENS 0.002f
#define ORBIT_SPEED 0.3f       /* rad/s when WASD held — coarse Tier-1 affordance */
#define ALT_SPEED   200.0f     /* meters/sec on space/ctrl */

void player_init(player_ctrl_t* p, const body_config_t* body) {
    p->body_cfg = body;
    p->yaw = 0.0f;
    p->pitch = 0.0f;
    p->selected_block = 1;
    p->altitude_m = 200000.0;       /* spawn 200 km above the surface to see the planet */
    p->orbit_lon = 0.0;
    p->orbit_lat = 0.0;
    phys_init_body(&p->body, player_world_pos(p));
}

dvec3_t player_world_pos(const player_ctrl_t* p) {
    if (!p->body_cfg) return dvec3_make(0, 0, 0);
    double r = p->body_cfg->radius_m + p->altitude_m;
    double cl = cos(p->orbit_lat), sl = sin(p->orbit_lat);
    double co = cos(p->orbit_lon), so = sin(p->orbit_lon);
    return dvec3_make(r * cl * co, r * sl, r * cl * so);
}

void player_update(player_ctrl_t* p, void* world, float dt) {
    (void)world;
    const input_state_t* in = input_state();

    /* Mouse look — applied to camera yaw/pitch independently of the orbit. */
    p->yaw   -= in->mouse_dx * MOUSE_SENS;
    p->pitch -= in->mouse_dy * MOUSE_SENS;
    const float limit = 1.55334f;
    if (p->pitch >  limit) p->pitch =  limit;
    if (p->pitch < -limit) p->pitch = -limit;

    /* WASD orbits around the planet at the current altitude. */
    if (in->phys.left)     p->orbit_lon -= ORBIT_SPEED * dt;
    if (in->phys.right)    p->orbit_lon += ORBIT_SPEED * dt;
    if (in->phys.forward)  p->orbit_lat += ORBIT_SPEED * dt;
    if (in->phys.backward) p->orbit_lat -= ORBIT_SPEED * dt;
    if (p->orbit_lat >  1.55) p->orbit_lat =  1.55;
    if (p->orbit_lat < -1.55) p->orbit_lat = -1.55;

    /* Space/Ctrl raise/lower altitude. */
    if (in->phys.fly_up)   p->altitude_m += ALT_SPEED * dt;
    if (in->phys.fly_down) p->altitude_m -= ALT_SPEED * dt;
    if (p->altitude_m < 100.0) p->altitude_m = 100.0;

    p->body.position = player_world_pos(p);
}

mat4_t player_view(const player_ctrl_t* p, dvec3_t floating_origin) {
    /* Camera looks at the planet center, with optional yaw/pitch offset. */
    dvec3_t world_eye = player_world_pos(p);
    vec3_t  eye_local = dvec3_to_vec3(dvec3_sub(world_eye, floating_origin));
    vec3_t  origin_local = dvec3_to_vec3(dvec3_sub(dvec3_make(0,0,0), floating_origin));

    /* Default look-at the planet center; a real surface controller will
     * use the tangent basis. Tier 1 = orbit cam. */
    vec3_t up = { 0, 1, 0 };
    return mat4_look_at(eye_local, origin_local, up);
}
