#include "server/server.h"
#include "server/saves.h"
#include "core/blocks.h"
#include "core/job_system.h"
#include "core/math.h"
#include <math.h>   /* sqrt for the spawn-altitude diagnostic */
#include <stdarg.h> /* va_list for the HTTP dashboard's JSON builder */
#include <sys/resource.h>   /* getrusage for the /status CPU sampler */
#include <unistd.h>         /* sysconf for clock ticks + core count */
#include "core/config.h"
#include "core/net_transport.h"
#include "core/planet.h"
#include "core/proto.h"
#include "core/world.h"
#include "core/world_water.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>     /* strcasecmp - POSIX */
#include <time.h>

/* ------------------------------------------------------------------ */
/* Room management. Public room lives at rooms[0]; private rooms get
 * an index 1..MAX_ROOMS-1 on first join and are freed when the last
 * client leaves (public sticks around). Each room owns its own clones
 * of every world so chunk edits in one room don't leak to others. */
/* ------------------------------------------------------------------ */

/* Number of seconds an empty room hangs around before its clones
 * get freed. A refresh / brief drop within this window lands back
 * on the warm in-memory state instead of paying the disk reload. */
#define IDLE_ROOM_GRACE_S  300.0

static void room_alloc_worlds(server_t* s, server_room_t* room) {
    /* Lazy world model: a room starts with ZERO cloned worlds. The
     * shared baselines in s->worlds[] are the source of truth for
     * unedited terrain (procgen is deterministic from seed, every
     * client + the server agree without communication). A room
     * only ever clones a body when:
     *   1. There are persisted .col edits for that body on disk
     *      (loaded here so the join-time chunk replay can ship
     *      them to incoming clients).
     *   2. A PLAYER_CMD edits that body at runtime
     *      (room_ensure_world_for_body clones on demand).
     *
     * Previously every room eagerly cloned all 20 baseline worlds
     * (~370 MB of blocks + goldberg grids), which OOM-killed the
     * 1 GB Fly machine on the second simultaneous room. */
    room->world_count = 0;
    int bodies_with_edits = 0;
    int total_tiles_loaded = 0;
    for (int i = 0; i < s->world_count && i < SERVER_MAX_BODIES; ++i) {
        const world_t* baseline = s->worlds[i];
        if (!baseline || !baseline->body) continue;
        const uint32_t body_id = (uint32_t)baseline->body->id;
        if (!saves_room_body_has_edits(room->code, s->cfg.seed, body_id))
            continue;
        ++bodies_with_edits;
        world_t* w = world_clone(baseline);
        if (!w) {
            fprintf(stderr, "[server] room '%s': clone of body %u failed\n",
                    room->code, body_id);
            continue;
        }
        int loaded = saves_load_world(w, room->code, s->cfg.seed);
        /* Water-state columns: parallel .water files alongside .col,
         * restored right after the block layer so the simulator
         * picks up exactly where the previous server stop left off.
         * Pre-existing rooms with only .col files report 0 loaded
         * here; new water-state writes start on the next flush. */
        saves_load_world_water(w, room->code, s->cfg.seed);
        total_tiles_loaded += loaded;
        room->worlds[room->world_count++] = w;
    }
    printf("[server] room '%s' load: %d body(ies) had on-disk edits, "
           "restored %d tile column(s) total (seed=%llu, on-disk path=rooms/%s/world-%llx/)\n",
           room->code[0] ? room->code : "(empty-code/lobby)",
           bodies_with_edits, total_tiles_loaded,
           (unsigned long long)s->cfg.seed,
           room->code[0] ? room->code : "__public__",
           (unsigned long long)s->cfg.seed);
    fflush(stdout);
}

/* Look up a room's world for a body, cloning the shared baseline
 * on first reference (write path). Returns NULL if the body isn't
 * registered as a baseline (shouldn't happen for any valid
 * body_id). The clone is registered in room->worlds so subsequent
 * lookups hit the cached copy. */
static world_t* room_ensure_world_for_body(server_t* s, server_room_t* room,
                                              uint32_t body_id) {
    for (int i = 0; i < room->world_count; ++i) {
        world_t* w = room->worlds[i];
        if (w && w->body && (uint32_t)w->body->id == body_id) return w;
    }
    const world_t* baseline = NULL;
    for (int i = 0; i < s->world_count; ++i) {
        const world_t* b = s->worlds[i];
        if (b && b->body && (uint32_t)b->body->id == body_id) { baseline = b; break; }
    }
    if (!baseline) return NULL;
    if (room->world_count >= SERVER_MAX_BODIES) return NULL;
    world_t* w = world_clone(baseline);
    if (!w) return NULL;
    /* Load any persisted edits the first time we materialise this
     * body in-memory. Subsequent edits write through saves_write_tile
     * directly so we don't re-walk the directory. Same for the
     * water-state companion files - the simulator inherits the
     * settled state from disk. */
    saves_load_world(w, room->code, s->cfg.seed);
    saves_load_world_water(w, room->code, s->cfg.seed);
    room->worlds[room->world_count++] = w;
    printf("[server] room '%s': lazy-cloned body %u\n",
           room->code[0] ? room->code : "(public)", body_id);
    fflush(stdout);
    return w;
}

static void room_free_worlds(server_room_t* room) {
    for (int i = 0; i < room->world_count; ++i) {
        if (room->worlds[i]) world_destroy(room->worlds[i]);
        room->worlds[i] = NULL;
    }
    room->world_count = 0;
    /* Torch lists live in fixed-size arrays in server_room_t so there's
     * no allocation to free, but we do want to clear them so a freshly-
     * re-acquired slot starts empty rather than reusing stale state. */
    for (int i = 0; i < SERVER_MAX_BODIES; ++i) {
        room->torches[i].in_use  = false;
        room->torches[i].body_id = 0;
        room->torches[i].count   = 0;
    }
}

/* Find or allocate the per-body torch slot in this room. If the body
 * has never been touched in this room yet, this is the first call -
 * loads any persisted torches from disk into the slot's list. */
static server_torch_body_t*
room_torches_get_or_load(server_t* s, server_room_t* room, uint32_t body_id) {
    if (!room) return NULL;
    for (int i = 0; i < SERVER_MAX_BODIES; ++i) {
        if (room->torches[i].in_use && room->torches[i].body_id == body_id)
            return &room->torches[i];
    }
    /* New slot - find a free one and load any persisted state. */
    for (int i = 0; i < SERVER_MAX_BODIES; ++i) {
        if (room->torches[i].in_use) continue;
        room->torches[i].in_use  = true;
        room->torches[i].body_id = body_id;
        room->torches[i].count   = saves_torches_load(
            room->code, s->cfg.seed, body_id,
            room->torches[i].list, SAVES_TORCHES_MAX_COUNT);
        if (room->torches[i].count > 0) {
            printf("[server] room '%s' body=%u: %d torch(es) loaded from disk\n",
                   room->code[0] ? room->code : "(public)",
                   body_id, room->torches[i].count);
            fflush(stdout);
        }
        return &room->torches[i];
    }
    fprintf(stderr, "[server] room '%s': no free torch slot for body=%u\n",
            room->code[0] ? room->code : "(public)", body_id);
    return NULL;
}

/* Bulk-send the new client every body's current torch list as one
 * TORCH_DIFF per body (all entries marked TORCH_OP_PLACE). Sent direct
 * to the joining client, not broadcast, so existing peers don't
 * receive duplicates of state they already have. */
static void send_torch_replay(server_t* s, server_client_t* cl) {
    if (cl->room_idx < 0) return;
    server_room_t* room = &s->rooms[cl->room_idx];
    /* Iterate every baseline body the server knows about, lazily
     * loading the room's torch list for each. Bodies with no torches
     * on disk end up with count = 0 and we skip them. */
    int bodies_sent = 0;
    int torches_sent = 0;
    for (int bi = 0; bi < s->world_count; ++bi) {
        const world_t* baseline = s->worlds[bi];
        if (!baseline || !baseline->body) continue;
        uint32_t body_id = (uint32_t)baseline->body->id;
        server_torch_body_t* slot = room_torches_get_or_load(s, room, body_id);
        if (!slot || slot->count <= 0) continue;
        /* The list may exceed TORCH_DIFF_MAX_ENTRIES in theory (256
         * vs 64); chunk into multiple messages. In practice the
         * placement cap is 256 per body but the wire bound is 64 -
         * stays under MTU and matches how CHUNK_DIFF batches. */
        for (int off = 0; off < slot->count; off += TORCH_DIFF_MAX_ENTRIES) {
            int n = slot->count - off;
            if (n > TORCH_DIFF_MAX_ENTRIES) n = TORCH_DIFF_MAX_ENTRIES;
            msg_torch_diff_t diff = { 0 };
            diff.body_id     = body_id;
            diff.entry_count = (uint16_t)n;
            for (int i = 0; i < n; ++i) {
                const saves_torch_t* t = &slot->list[off + i];
                msg_torch_entry_t* e = &diff.entries[i];
                e->op       = TORCH_OP_PLACE;
                e->tile_idx = (uint32_t)t->tile_idx;
                e->pos_x = t->pos[0]; e->pos_y = t->pos[1]; e->pos_z = t->pos[2];
                e->up_x  = t->up [0]; e->up_y  = t->up [1]; e->up_z  = t->up [2];
            }
            uint8_t buf[MSG_HEADER_SIZE + MSG_TORCH_DIFF_HEADER
                        + TORCH_DIFF_MAX_ENTRIES * MSG_TORCH_ENTRY_SIZE];
            size_t wn = proto_write_torch_diff(buf, sizeof buf, &diff);
            if (wn == 0) {
                fprintf(stderr, "[server] torch replay encode failed body=%u\n",
                        body_id);
                continue;
            }
            net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, wn);
            torches_sent += n;
        }
        ++bodies_sent;
    }
    if (bodies_sent > 0) {
        printf("[server] TORCH replay -> player_id=%u room='%s': "
               "%d body(ies), %d torch(es) total\n",
               cl->player_id,
               room->code[0] ? room->code : "(public)",
               bodies_sent, torches_sent);
        fflush(stdout);
    }
}

static int room_find(server_t* s, const char* code) {
    for (int i = 0; i < SERVER_MAX_ROOMS; ++i) {
        if (s->rooms[i].in_use && strcmp(s->rooms[i].code, code) == 0)
            return i;
    }
    return -1;
}

/* Locate the room matching `code` or create a fresh one. Returns its
 * index in s->rooms[], or -1 if no slot was available. Increments
 * ref_count on success. */
static int room_acquire(server_t* s, const char* code) {
    int idx = room_find(s, code);
    if (idx < 0) {
        /* Find an empty slot. Public room (empty code) no longer
         * has a reserved slot - it's created on first empty-code
         * HELLO like any other room. */
        for (int i = 0; i < SERVER_MAX_ROOMS; ++i) {
            if (!s->rooms[i].in_use) { idx = i; break; }
        }
        if (idx < 0) {
            fprintf(stderr, "[server] no room slot free for code='%s'\n", code);
            return -1;
        }
        memset(&s->rooms[idx], 0, sizeof s->rooms[idx]);
        snprintf(s->rooms[idx].code, sizeof s->rooms[idx].code, "%s", code);
        s->rooms[idx].in_use = true;
        room_alloc_worlds(s, &s->rooms[idx]);
        printf("[server] room created '%s' (%d cloned worlds from disk)\n",
               s->rooms[idx].code[0] ? s->rooms[idx].code : "(public)",
               s->rooms[idx].world_count);
    } else if (s->rooms[idx].ref_count == 0) {
        /* Re-attaching to a still-allocated empty room within the
         * grace window. Clear the empty-time so the sweeper doesn't
         * free it underfoot. */
        s->rooms[idx].last_empty_time_s = 0.0;
        printf("[server] room re-attached '%s' (within idle grace)\n",
               s->rooms[idx].code[0] ? s->rooms[idx].code : "(public)");
    }
    s->rooms[idx].ref_count++;
    return idx;
}

static void room_release(server_t* s, int idx) {
    if (idx < 0 || idx >= SERVER_MAX_ROOMS) return;
    server_room_t* r = &s->rooms[idx];
    if (!r->in_use) return;
    if (r->ref_count > 0) r->ref_count--;
    /* Grace window: an empty room sticks around for IDLE_ROOM_GRACE_S
     * (~5 min) so a refresh / brief drop comes back to warm in-memory
     * state. The sweeper in server_tick frees rooms past the window.
     * If the player reconnects in time, room_acquire clears
     * last_empty_time_s. */
    if (r->ref_count == 0) {
        r->last_empty_time_s = ((double)time(NULL));
        printf("[server] room '%s' empty - retained for idle grace\n",
               r->code[0] ? r->code : "(public)");
    }
}

static world_t* client_world_for_body(server_t* s, const server_client_t* cl,
                                        uint32_t body_id) {
    if (cl->room_idx < 0) return NULL;
    const server_room_t* room = &s->rooms[cl->room_idx];
    for (int i = 0; i < room->world_count; ++i) {
        world_t* w = room->worlds[i];
        if (w && w->body && (uint32_t)w->body->id == body_id) return w;
    }
    return NULL;
}

/* ------------------------------------------------------------------ */
/* Per-client slot management. The clients[] array is searched
 * linearly — at SERVER_MAX_CLIENTS == 16 this is cheaper than any
 * hashmap and keeps the lifecycle obvious. */
/* ------------------------------------------------------------------ */

static server_client_t* find_free_client(server_t* s) {
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        if (s->clients[i].conn == NULL) return &s->clients[i];
    }
    return NULL;
}

static server_client_t* find_client_by_conn(server_t* s, net_conn_t* c) {
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        if (s->clients[i].conn == c) return &s->clients[i];
    }
    return NULL;
}

/* ------------------------------------------------------------------ */
/* Sanity check on incoming PLAYER_STATE. The server doesn't run player
 * physics yet, but it can spot "you're inside a wall" — a clear sign
 * of client/server worldgen drift, a chunk-update race, or a trivial
 * teleport-cheat. Throttled to once per second per client; the client
 * decides what to do with the DESYNC message (currently: HUD warning). */
/* ------------------------------------------------------------------ */

static void check_for_desync(server_t* s, server_client_t* cl) {
    /* DESYNC popup is disabled for now — the naive 'is the player
     * inside a solid block?' check fires for normally-grounded
     * players because player.position is the FEET anchor and a
     * grounded player's feet sit right at the surface grass block.
     * A real check needs to sample at head height (+1.6 m along the
     * surface normal). Until that lands, just no-op so we don't
     * spam the HUD. */
    (void)s; (void)cl;
    return;

    /* Disabled body, kept here so the eventual head-height fix is a
     * one-line edit (move the early return + tweak body_local to add
     * 1.6 m up the surface normal). #if 0 keeps the linker / dead
     * code analysers happy without making the function look bare. */
#if 0
    world_t* w = client_world_for_body(s, cl, cl->body_id);
    if (!w || !w->body) return;     /* unknown body — skip silently */

    /* world_block_at_pos takes body-local float coords. The wire pos is
     * world-space dvec; subtract the body's centre and downcast. */
    vec3_t body_local = {
        (float)(cl->pos_x - w->body->pos_x),
        (float)(cl->pos_y - w->body->pos_y),
        (float)(cl->pos_z - w->body->pos_z),
    };
    block_t b = world_block_at_pos(w, body_local, -1);
    if (!block_is_solid(b)) return;

    msg_desync_t d = {
        .reason       = DESYNC_INSIDE_SOLID,
        .body_id      = cl->body_id,
        .client_pos_x = cl->pos_x,
        .client_pos_y = cl->pos_y,
        .client_pos_z = cl->pos_z,
        .block_type   = (uint32_t)b,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_DESYNC_WIRE_SIZE];
    size_t n = proto_write_desync(buf, sizeof buf, &d);
    if (n == 0) return;
    net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, n);
    cl->last_desync_tick = s->tick;
    printf("[server] DESYNC sent to player_id=%u: inside block=%u at (%.1f, %.1f, %.1f)\n",
           cl->player_id, (unsigned)b, cl->pos_x, cl->pos_y, cl->pos_z);
#endif
}

/* ------------------------------------------------------------------ */
/* Handshake. M2 handles HELLO -> WELCOME; M4 adds PLAYER_STATE. */
/* ------------------------------------------------------------------ */

/* Replay every persisted column for the joining client's room.
 * Walks each world's saved-tile bitmap and emits CHUNK_DIFF
 * messages so the client overlays its procgen baseline with the
 * server-authoritative edits before the player can interact.
 *
 * We send the FULL column (all 128 depths) per saved tile rather
 * than diffing against the procgen baseline. Re-running procgen
 * to compute a true diff would cost real CPU on every join; the
 * client's procgen already matches the server's for unedited
 * depths, so identical-value overwrites are idempotent and the
 * only cost is wire bytes. CHUNK_DIFF carries 64 entries per
 * message, so a saved tile fans out to two messages. */
static void send_chunk_replay(server_t* s, server_client_t* cl) {
    if (cl->room_idx < 0 || cl->room_idx >= SERVER_MAX_ROOMS) return;
    server_room_t* room = &s->rooms[cl->room_idx];
    if (!room->in_use) return;

    int replayed_tiles = 0;
    int replayed_msgs  = 0;
    for (int wi = 0; wi < room->world_count; ++wi) {
        world_t* w = room->worlds[wi];
        if (!w || !w->saved || !w->body) continue;

        for (int tile = 0; tile < w->tile_count; ++tile) {
            if (!world_tile_saved(w, tile)) continue;
            const uint8_t* col = &w->blocks[(size_t)tile * WORLD_MAX_DEPTH];

            /* Emit ceil(WORLD_MAX_DEPTH / CHUNK_DIFF_MAX_EDITS) messages.
             * Each batch covers a contiguous depth range so the receiver
             * can apply them in any order without losing entries. */
            int depth = 0;
            while (depth < WORLD_MAX_DEPTH) {
                msg_chunk_diff_t diff = { 0 };
                diff.body_id = (uint32_t)w->body->id;
                int batch = WORLD_MAX_DEPTH - depth;
                if (batch > CHUNK_DIFF_MAX_EDITS) batch = CHUNK_DIFF_MAX_EDITS;
                diff.edit_count = (uint16_t)batch;
                for (int i = 0; i < batch; ++i) {
                    diff.edits[i].tile_idx   = (uint32_t)tile;
                    diff.edits[i].depth      = (uint16_t)(depth + i);
                    diff.edits[i].block_type = (uint16_t)col[depth + i];
                }
                depth += batch;

                uint8_t buf[MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE
                            + MSG_CHUNK_DIFF_ENTRY_SIZE * CHUNK_DIFF_MAX_EDITS];
                size_t n = proto_write_chunk_diff(buf, sizeof buf, &diff);
                if (n == 0) break;
                net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, n);
                ++replayed_msgs;
            }
            ++replayed_tiles;
        }
    }
    /* Always log the replay outcome - the 0-tile case ("nothing to
     * restore for you") is exactly the symptom we chase when a player
     * reports "my blocks are gone": it means the room had no cloned
     * worlds with saved bits set, which in turn means either the
     * .col files for this (room, seed, body) were not on disk at
     * room_alloc_worlds time, or the bodies they belonged to were
     * never registered as baselines on the server. */
    printf("[server] CHUNK replay -> player_id=%u room='%s': %d tile(s), %d msg(s) "
           "(room->world_count=%d)\n",
           cl->player_id,
           cl->room[0] ? cl->room : "(empty-code/lobby)",
           replayed_tiles, replayed_msgs, room->world_count);
    fflush(stdout);
}

static void send_welcome(server_t* s, server_client_t* cl) {
    const body_config_t* spawn_body = planet_get(BODY_TENEBRIS);
    if (!spawn_body) return;

    /* New players spawn on Tenebris's equator at (radius + 5, 0, 0)
     * relative to the body centre. The equator gives a warmer first
     * impression than the ice cap, and it's the same direction the
     * SP boot path uses (main_web.c spawns at dvec3_make(1, 0, 0)).
     * If the profile has a saved pose (M6 persistence), resume from
     * there instead - this is the 'logout at position, login back
     * to that spot' path. */
    msg_welcome_t w = {
        .player_id   = cl->player_id,
        .world_seed  = s->cfg.seed,
        .spawn_x     = spawn_body->pos_x + spawn_body->radius_m + 5.0,
        .spawn_y     = spawn_body->pos_y,
        .spawn_z     = spawn_body->pos_z,
        .body_id     = BODY_TENEBRIS,
        .spawn_yaw   = 0.0f,
        .spawn_pitch = 0.0f,
    };
    /* Resume the player at their last known pose. The save key is
     * the sanitized display name now (not the profile token), so
     * the same name reliably finds the same save across browser
     * swaps / profile re-creation / localStorage wipes. The server
     * already enforces unique names at HELLO, so two simultaneous
     * connections can't fight over the same file. */
    saves_player_pose_t resume;
    bool had_save = (cl->name[0] && saves_load_player(cl->name, &resume));
    if (had_save) {
        w.spawn_x     = resume.pos_x;
        w.spawn_y     = resume.pos_y;
        w.spawn_z     = resume.pos_z;
        w.body_id     = resume.body_id;
        w.spawn_yaw   = resume.yaw;
        w.spawn_pitch = resume.pitch;
        /* Stash the saved hotbar so it's authoritative until the
         * client sends its first MSG_INVENTORY_STATE. Otherwise an
         * inactive player whose game tab is idle could be flushed
         * back to disk with empty inventory before the client
         * uploads the live one. */
        memcpy(cl->inv_slot_type,  resume.inv_slot_type,  sizeof cl->inv_slot_type);
        memcpy(cl->inv_slot_count, resume.inv_slot_count, sizeof cl->inv_slot_count);
        cl->inv_selected = resume.inv_selected;
        cl->inv_known    = true;
    }
    /* HELLO/WELCOME spawn diagnostic. One line per join so we can
     * tell where the player got placed and why - 'DEFAULT' branch
     * means no save file, 'RESUME' means we loaded one. Includes
     * radial altitude (length(spawn - body_centre) - body_radius)
     * so the floating-spawn report has a concrete number to chase. */
    {
        const bool in_space = (w.body_id == BODY_ID_IN_SPACE);
        const body_config_t* dbg_body = in_space
            ? NULL : planet_get((body_id_t)w.body_id);
        double r = 0.0, alt = 0.0;
        if (dbg_body) {
            double dx = w.spawn_x - dbg_body->pos_x;
            double dy = w.spawn_y - dbg_body->pos_y;
            double dz = w.spawn_z - dbg_body->pos_z;
            r = sqrt(dx*dx + dy*dy + dz*dz);
            alt = r - dbg_body->radius_m;
        }
        printf("[server] WELCOME spawn name=%s %s body=%s pos=(%.2f, %.2f, %.2f) "
               "r=%.2f alt=%+.2f yaw=%.2f pitch=%.2f\n",
               cl->name,
               had_save ? "RESUME" : "DEFAULT",
               in_space ? "IN_SPACE" :
                   (dbg_body ? dbg_body->name : "unknown"),
               w.spawn_x, w.spawn_y, w.spawn_z,
               r, alt, w.spawn_yaw, w.spawn_pitch);
        fflush(stdout);
    }

    uint8_t buf[MSG_HEADER_SIZE + MSG_WELCOME_WIRE_SIZE];
    size_t n = proto_write_welcome(buf, sizeof buf, &w);
    if (n == 0) return;
    net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, n);
    cl->handshaked = true;
    printf("[server] WELCOME -> player_id=%u (spawn body=%u)\n",
           cl->player_id, w.body_id);
    fflush(stdout);

    /* Replay the saved hotbar right after WELCOME. The client's
     * inventory module zeroes itself at boot, so without this the
     * player would always come back with an empty / creative-default
     * hotbar even if they had stacks before logging out. */
    if (cl->inv_known) {
        msg_inventory_state_t inv = { .player_id = cl->player_id };
        memcpy(inv.slot_type,  cl->inv_slot_type,  sizeof inv.slot_type);
        memcpy(inv.slot_count, cl->inv_slot_count, sizeof inv.slot_count);
        inv.selected = cl->inv_selected;
        uint8_t ibuf[MSG_HEADER_SIZE + MSG_INVENTORY_STATE_WIRE_SIZE];
        size_t ni = proto_write_inventory_state(ibuf, sizeof ibuf, &inv);
        if (ni > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, ibuf, ni);
    }
    /* Replay every body's torch list. The client's torch module
     * starts empty at boot, so without this a player joining a
     * room with placed torches sees pitch-black caves until someone
     * else places / removes one. */
    send_torch_replay(s, cl);
}

static void handle_hello(server_t* s, server_client_t* cl,
                          const uint8_t* payload, size_t len,
                          uint16_t version) {
    if (version != MSG_HELLO_VERSION) {
        fprintf(stderr, "[server] HELLO version %u != %u, closing\n",
                version, MSG_HELLO_VERSION);
        net_close(cl->conn);
        return;
    }
    msg_hello_t h;
    if (proto_read_hello(payload, len, &h) != 0) {
        fprintf(stderr, "[server] malformed HELLO, closing\n");
        net_close(cl->conn);
        return;
    }
    if (h.client_version != TENEBRIS_PROTOCOL_VERSION) {
        fprintf(stderr, "[server] HELLO client_version %u != %u, kicking\n",
                h.client_version, TENEBRIS_PROTOCOL_VERSION);
        /* Tell the client WHY before dropping the socket so it can
         * show a 'refresh your browser' popup instead of looping
         * the auto-reconnect timer forever against a server it
         * will never be compatible with. */
        msg_kick_t kick = { .reason = KICK_VERSION_MISMATCH };
        snprintf((char*)kick.text, sizeof kick.text,
                 "Version mismatch (client %u, server %u). Refresh: Ctrl+Shift+R",
                 h.client_version, TENEBRIS_PROTOCOL_VERSION);
        uint8_t buf[MSG_HEADER_SIZE + MSG_KICK_WIRE_SIZE];
        size_t kn = proto_write_kick(buf, sizeof buf, &kick);
        if (kn > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, kn);
        net_close(cl->conn);
        return;
    }
    /* Stash profile token + name on the connection. Empty name gets
     * a fallback "guest-<id>" so the F1 list never shows blanks. */
    memcpy(cl->token, h.token, SERVER_TOKEN_LEN);
    cl->token[SERVER_TOKEN_LEN] = 0;
    /* Name on the wire is null-padded fixed-32; clip at the first
     * null or at SERVER_NAME_MAX, whichever is shorter. */
    int nlen = 0;
    while (nlen < (int)sizeof h.name && h.name[nlen]) ++nlen;
    if (nlen > SERVER_NAME_MAX) nlen = SERVER_NAME_MAX;
    memcpy(cl->name, h.name, (size_t)nlen);
    cl->name[nlen] = 0;
    if (cl->name[0] == 0) {
        snprintf(cl->name, sizeof cl->name, "guest-%u", cl->player_id);
    }
    /* Room code — fixed-8 on the wire; null-padded. Empty = public. */
    memcpy(cl->room, h.room_code, SERVER_ROOM_LEN);
    cl->room[SERVER_ROOM_LEN] = 0;

    /* Reject duplicate names (case-insensitive) across the whole
     * server. Two clients sharing a label would make chat ambiguous
     * ('who is Alice?'), break per-profile pose lookup downstream
     * if tokens were ever ambiguous, and confuse F1 / nameplates.
     * Picking the first-come wins is the simplest rule. The
     * incoming connection gets MSG_KICK with reason=KICK_NAME_TAKEN
     * so the client surfaces a real popup, not a silent drop. */
    {
        bool taken = false;
        for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
            const server_client_t* peer = &s->clients[i];
            if (peer == cl) continue;
            if (!peer->conn || !peer->handshaked) continue;
            if (peer->name[0] == 0) continue;
            if (strcasecmp(peer->name, cl->name) == 0) { taken = true; break; }
        }
        if (taken) {
            fprintf(stderr, "[server] HELLO name='%s' already in use, kicking player_id=%u\n",
                    cl->name, cl->player_id);
            msg_kick_t kick = { .reason = KICK_NAME_TAKEN };
            snprintf((char*)kick.text, sizeof kick.text,
                     "Name '%s' is already on the server. Pick another profile.",
                     cl->name);
            uint8_t buf[MSG_HEADER_SIZE + MSG_KICK_WIRE_SIZE];
            size_t kn = proto_write_kick(buf, sizeof buf, &kick);
            if (kn > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, kn);
            net_close(cl->conn);
            return;
        }
    }

    /* Acquire the room (find or create + clone worlds). If the slot
     * pool is full, the client gets dropped — we can't host them
     * cleanly without a room. */
    cl->room_idx = room_acquire(s, cl->room);
    if (cl->room_idx < 0) {
        fprintf(stderr, "[server] no room slot for player_id=%u, closing\n",
                cl->player_id);
        net_close(cl->conn);
        return;
    }

    printf("[server] HELLO from player_id=%u name='%s' room='%s' %s (client_version=%u)\n",
           cl->player_id, cl->name,
           cl->room[0] ? cl->room : "",
           cl->room[0] ? "(private-room)" : "(EMPTY-CODE -> empty-code/lobby room)",
           h.client_version);
    /* Audit-log the login so an operator can reconstruct who was on
     * the server at a given time via GET /logins. Only real (named,
     * room-attached) joins reach this point. */
    saves_session_log("login", cl->name, cl->room);
    send_welcome(s, cl);
    /* WebSocket CHUNK_DIFF replay disabled: the client now pulls the
     * room's persisted columns over HTTP via /saves/body on join +
     * body_load_detail. WS replay dropped messages at scale (the
     * client-side audit showed ~80% of saved tiles never arriving
     * on heavily edited planets), and the HTTP path is TCP with
     * retransmits so it's the reliable route. The replay function
     * stays in the file as a clearly-named no-call so a re-enable
     * is one-line diff if HTTP fetch ever needs a fallback.
     *
     *   send_chunk_replay(s, cl);  // disabled, see /saves/body
     *
     * Real-time CHUNK_DIFFs from peers' edits still flow over WS -
     * the disable is only for the boot-time bulk-load. */
    (void)send_chunk_replay;

    /* PLAYER_INFO fan-out, room-scoped: only clients in the same
     * room see each other's identities. Reliable channel — names
     * must stick. */
    {
        uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE];
        msg_player_info_t info_new = { .player_id = cl->player_id };
        memcpy(info_new.name, cl->name,
               strnlen(cl->name, MSG_PLAYER_INFO_NAME_LEN));
        size_t n = proto_write_player_info(buf, sizeof buf, &info_new);
        if (n > 0) {
            for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                const server_client_t* peer = &s->clients[j];
                if (!peer->conn) continue;
                if (strcmp(peer->room, cl->room) != 0) continue;
                net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, n);
            }
        }
        /* Existing same-room clients -> new arrival. */
        for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
            const server_client_t* other = &s->clients[j];
            if (!other->conn || !other->handshaked) continue;
            if (other == cl) continue;
            if (strcmp(other->room, cl->room) != 0) continue;
            msg_player_info_t info_other = { .player_id = other->player_id };
            memcpy(info_other.name, other->name,
                   strnlen(other->name, MSG_PLAYER_INFO_NAME_LEN));
            size_t m = proto_write_player_info(buf, sizeof buf, &info_other);
            if (m > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, m);
        }
    }

    /* Chat backlog: ship the last N messages from this room as
     * MSG_CHAT one at a time. player_id stays as the original
     * sender; if their session is gone the client's name cache may
     * not have a match — chat falls back to '?' and the message
     * still renders. */
    {
        saves_chat_msg_t backlog[SAVES_CHAT_BACKLOG];
        int n = saves_chat_load_backlog(cl->room, backlog, SAVES_CHAT_BACKLOG);
        for (int j = 0; j < n; ++j) {
            msg_chat_t cmsg = { .player_id = 0 };
            size_t tn = strnlen(backlog[j].text, MSG_CHAT_TEXT_LEN);
            memcpy(cmsg.text, backlog[j].text, tn);
            uint8_t buf2[MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE];
            size_t w = proto_write_chat(buf2, sizeof buf2, &cmsg);
            if (w == 0) continue;
            /* Pre-seed the recipient's name cache so the backlog row
             * doesn't render as '?'. We fake a PLAYER_INFO with the
             * historical sender name. player_id 0 collides with no
             * live session. */
            uint8_t pibuf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE];
            msg_player_info_t pi = { .player_id = 0 };
            memcpy(pi.name, backlog[j].name,
                   strnlen(backlog[j].name, MSG_PLAYER_INFO_NAME_LEN));
            size_t pw = proto_write_player_info(pibuf, sizeof pibuf, &pi);
            if (pw > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, pibuf, pw);
            net_send(cl->conn, NET_CHANNEL_RELIABLE, buf2, w);
        }
        if (n > 0) {
            printf("[server] sent %d chat backlog message(s) to player_id=%u room=%s\n",
                   n, cl->player_id, cl->room[0] ? cl->room : "(public)");
        }
    }
}

/* ------------------------------------------------------------------ */
/* Transport callbacks. The transport calls these on the same thread
 * the server tick runs on, so we can mutate server_t directly. */
/* ------------------------------------------------------------------ */

static void on_open(net_conn_t* conn, void* user) {
    server_t* s = (server_t*)user;
    server_client_t* cl = find_free_client(s);
    if (!cl) {
        fprintf(stderr, "[server] max clients reached, closing new conn\n");
        net_close(conn);
        return;
    }
    cl->conn       = conn;
    cl->player_id  = ++s->next_player_id;
    cl->handshaked = false;
    /* No room until HELLO. -1 means 'unattached' so on_close knows not
     * to release a room ref that was never acquired. */
    cl->room_idx   = -1;
    /* Fresh save-debounce state for the new session - last_saved_tick
     * == 0 makes the first eligible flush write unconditionally. */
    cl->last_saved_pos_x = 0.0;
    cl->last_saved_pos_y = 0.0;
    cl->last_saved_pos_z = 0.0;
    cl->last_saved_tick  = 0;
    cl->last_msg_unix_s  = (int64_t)time(NULL);
    cl->timed_out_logged = false;
    net_conn_set_user(conn, cl);
    printf("[server] open: player_id=%u (slot %ld)\n",
           cl->player_id, (long)(cl - s->clients));
    fflush(stdout);
}

static void on_msg(net_conn_t* conn, net_channel_t ch,
                     const void* data, size_t len, void* user) {
    (void)ch;
    server_t* s = (server_t*)user;
    server_client_t* cl = (server_client_t*)net_conn_user(conn);
    if (!cl) cl = find_client_by_conn(s, conn);
    if (!cl) {
        net_close(conn);
        return;
    }
    /* Any inbound message counts as activity for the idle-timeout
     * sweeper. A handshake-stalled client (HELLO sent, never followed
     * by anything) gets its open-time stamp from on_open and ages
     * out the same way. */
    cl->last_msg_unix_s = (int64_t)time(NULL);

    msg_hdr_t hdr;
    if (proto_read_header((const uint8_t*)data, len, &hdr) != 0) {
        fprintf(stderr, "[server] short header from player_id=%u, closing\n",
                cl->player_id);
        net_close(conn);
        return;
    }
    if (len < MSG_HEADER_SIZE + hdr.length) {
        fprintf(stderr, "[server] truncated payload from player_id=%u "
                         "(have %zu, need %u), closing\n",
                cl->player_id, len, MSG_HEADER_SIZE + hdr.length);
        net_close(conn);
        return;
    }
    const uint8_t* payload = (const uint8_t*)data + MSG_HEADER_SIZE;

    switch ((msg_kind_t)hdr.kind) {
        case MSG_HELLO:
            handle_hello(s, cl, payload, hdr.length, hdr.version);
            break;
        case MSG_PLAYER_CMD: {
            if (hdr.version != MSG_PLAYER_CMD_VERSION) break;
            msg_player_cmd_t cmd;
            if (proto_read_player_cmd(payload, hdr.length, &cmd) != 0) break;
            /* Resolve the world inside the sender's room. World-per-
             * room isolation means edits never bleed across rooms even
             * for the same body id. First reference to a body in this
             * room triggers a lazy clone of the shared baseline so
             * unedited bodies cost zero memory. */
            world_t* w = client_world_for_body(s, cl, cmd.body_id);
            if (!w && cl->room_idx >= 0) {
                w = room_ensure_world_for_body(s, &s->rooms[cl->room_idx],
                                                  cmd.body_id);
            }
            if (!w) {
                fprintf(stderr, "[server] PLAYER_CMD unknown body=%u in room='%s' from player_id=%u\n",
                        cmd.body_id, cl->room[0] ? cl->room : "(public)",
                        cl->player_id);
                break;
            }
            /* PLACE = whatever block_type the client sent.
             * BREAK  = force BLOCK_AIR regardless of block_type. */
            block_t target = (cmd.cmd_kind == PLAYER_CMD_BREAK)
                ? BLOCK_AIR : (block_t)cmd.block_type;
            /* Place-on-flow override: mirror the client-side rule in
             * interact.c so the server's authoritative state agrees.
             * Placing water on an existing water cell (a flow cell)
             * promotes that cell to a sleeping source - origins
             * cleared, state = 0. world_set's WATER->WATER early-
             * return would otherwise leave the cell as a flow cell
             * still tied to whatever upstream source(s) created it,
             * undoing the player's "I want this to be a source now"
             * intent. */
            if (cmd.cmd_kind == PLAYER_CMD_PLACE && target == BLOCK_WATER) {
                block_t existing = (block_t)world_get(w, (int)cmd.tile_idx,
                                                     (int)cmd.depth);
                if (existing == BLOCK_WATER) {
                    world_water_origin_clear(w, (int)cmd.tile_idx,
                                              (int)cmd.depth);
                    world_water_set_state(w, (int)cmd.tile_idx,
                                          (int)cmd.depth, 0u);
                    world_water_enqueue(w, (int)cmd.tile_idx,
                                         (int)cmd.depth);
                }
            }
            world_set(w, (int)cmd.tile_idx, (int)cmd.depth, target);
            /* Persist immediately under the room's save path. world_set
             * marks the edited tile + neighbours dirty (for the
             * renderer's remesh seam logic), but only the EDITED tile's
             * column actually changed — saving via the dirty bitmap
             * would also persist 6-7 unchanged neighbour columns each
             * edit. Skip the wasted disk + write only the tile we
             * touched. */
            bool save_ok = saves_write_tile(w, cl->room, s->cfg.seed, (int)cmd.tile_idx);
            printf("[server] EDIT player_id=%u room='%s' %s body=%u tile=%u depth=%u block=%u "
                   "save=%s\n",
                   cl->player_id,
                   cl->room[0] ? cl->room : "(empty-code/lobby)",
                   (cmd.cmd_kind == PLAYER_CMD_BREAK) ? "BREAK" : "PLACE",
                   cmd.body_id, cmd.tile_idx, cmd.depth, (unsigned)target,
                   save_ok ? "ok" : "FAIL");
            fflush(stdout);

            /* Broadcast as a single-entry CHUNK_DIFF to same-room peers
             * (including the sender — idempotent since they already
             * applied locally). */
            msg_chunk_diff_t diff = { 0 };
            diff.body_id    = cmd.body_id;
            diff.edit_count = 1;
            diff.edits[0].tile_idx   = cmd.tile_idx;
            diff.edits[0].depth      = cmd.depth;
            diff.edits[0].block_type = (uint16_t)target;
            uint8_t buf[MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE
                        + MSG_CHUNK_DIFF_ENTRY_SIZE];
            size_t n = proto_write_chunk_diff(buf, sizeof buf, &diff);
            if (n > 0) {
                for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                    const server_client_t* peer = &s->clients[j];
                    if (!peer->conn) continue;
                    if (strcmp(peer->room, cl->room) != 0) continue;
                    net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, n);
                }
            }
            break;
        }
        case MSG_TORCH_DIFF: {
            if (hdr.version != MSG_TORCH_DIFF_VERSION) break;
            msg_torch_diff_t diff;
            if (proto_read_torch_diff(payload, hdr.length, &diff) != 0) break;
            if (cl->room_idx < 0) break;
            server_room_t* room = &s->rooms[cl->room_idx];
            server_torch_body_t* slot = room_torches_get_or_load(
                s, room, diff.body_id);
            if (!slot) break;
            /* Apply each entry to the in-memory list. PLACE appends if
             * there's no matching torch (by tile_idx + position
             * epsilon) already; REMOVE swap-removes the closest
             * torch by position within a generous range. Both ops
             * silently no-op on mismatch so a duplicate client
             * retry doesn't double-add. */
            int placed = 0, removed = 0;
            const float MATCH_EPSILON_M = 0.1f;
            const float REMOVE_RANGE_M  = 1.0f;
            const float MATCH_EPS2      = MATCH_EPSILON_M * MATCH_EPSILON_M;
            const float REMOVE_RANGE2   = REMOVE_RANGE_M  * REMOVE_RANGE_M;
            for (int i = 0; i < diff.entry_count; ++i) {
                const msg_torch_entry_t* e = &diff.entries[i];
                if (e->op == TORCH_OP_PLACE) {
                    /* Skip if a near-duplicate is already present. */
                    bool dup = false;
                    for (int j = 0; j < slot->count; ++j) {
                        float dx = slot->list[j].pos[0] - e->pos_x;
                        float dy = slot->list[j].pos[1] - e->pos_y;
                        float dz = slot->list[j].pos[2] - e->pos_z;
                        if (dx*dx + dy*dy + dz*dz <= MATCH_EPS2) { dup = true; break; }
                    }
                    if (dup) continue;
                    if (slot->count >= SAVES_TORCHES_MAX_COUNT) {
                        fprintf(stderr, "[server] torch list full for body=%u\n",
                                diff.body_id);
                        continue;
                    }
                    saves_torch_t* t = &slot->list[slot->count++];
                    t->tile_idx = (int32_t)e->tile_idx;
                    t->pos[0] = e->pos_x; t->pos[1] = e->pos_y; t->pos[2] = e->pos_z;
                    t->up [0] = e->up_x;  t->up [1] = e->up_y;  t->up [2] = e->up_z;
                    ++placed;
                } else if (e->op == TORCH_OP_REMOVE) {
                    int best = -1;
                    float best_d2 = REMOVE_RANGE2;
                    for (int j = 0; j < slot->count; ++j) {
                        float dx = slot->list[j].pos[0] - e->pos_x;
                        float dy = slot->list[j].pos[1] - e->pos_y;
                        float dz = slot->list[j].pos[2] - e->pos_z;
                        float d2 = dx*dx + dy*dy + dz*dz;
                        if (d2 < best_d2) { best_d2 = d2; best = j; }
                    }
                    if (best < 0) continue;
                    slot->list[best] = slot->list[slot->count - 1];
                    --slot->count;
                    ++removed;
                }
            }
            /* Persist if anything changed. saves_torches_write rewrites
             * the whole file (cheap - <8 KB) so partial state can't
             * end up on disk. */
            if (placed > 0 || removed > 0) {
                bool save_ok = saves_torches_write(cl->room, s->cfg.seed,
                                                     diff.body_id,
                                                     slot->list, slot->count);
                printf("[server] TORCH player_id=%u room='%s' body=%u "
                       "placed=%d removed=%d total=%d save=%s\n",
                       cl->player_id,
                       cl->room[0] ? cl->room : "(public)",
                       diff.body_id, placed, removed, slot->count,
                       save_ok ? "ok" : "FAIL");
                fflush(stdout);
            }
            /* Broadcast the diff verbatim to every room peer (including
             * sender; their local list deduplicates via tile + epsilon
             * position match). Forwarding the original entries keeps
             * the placement positions exact across the wire so the
             * dedup is reliable. */
            uint8_t buf[MSG_HEADER_SIZE + MSG_TORCH_DIFF_HEADER
                        + TORCH_DIFF_MAX_ENTRIES * MSG_TORCH_ENTRY_SIZE];
            size_t n = proto_write_torch_diff(buf, sizeof buf, &diff);
            if (n > 0) {
                for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                    const server_client_t* peer = &s->clients[j];
                    if (!peer->conn) continue;
                    if (strcmp(peer->room, cl->room) != 0) continue;
                    net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, n);
                }
            }
            break;
        }
        case MSG_CHAT: {
            if (hdr.version != MSG_CHAT_VERSION) break;
            msg_chat_t m;
            if (proto_read_chat(payload, hdr.length, &m) != 0) break;
            /* Stamp sender id so receivers know who sent it; keep
             * original text untouched (no trim, no censor). */
            m.player_id = cl->player_id;
            uint8_t buf[MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE];
            size_t n = proto_write_chat(buf, sizeof buf, &m);
            if (n == 0) break;
            /* Room-scoped broadcast — same filter as everything else. */
            for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                const server_client_t* peer = &s->clients[j];
                if (!peer->conn) continue;
                if (strcmp(peer->room, cl->room) != 0) continue;
                net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, n);
            }
            /* Persist + brief Fly log line. */
            char nz_text[MSG_CHAT_TEXT_LEN + 1];
            memcpy(nz_text, m.text, MSG_CHAT_TEXT_LEN);
            nz_text[MSG_CHAT_TEXT_LEN] = 0;
            /* chat.log is the single source of truth for both the
             * dashboard /chat endpoint and the in-game backlog
             * replay (the latter filters by room when loading).
             * saves_chat_append now forwards here, so we only
             * make one call. */
            saves_global_chat_append(cl->room, cl->name, nz_text);

            char short_text[33];
            memcpy(short_text, nz_text, 32); short_text[32] = 0;
            printf("[server] chat room=%s %s: %s\n",
                   cl->room[0] ? cl->room : "(public)",
                   cl->name, short_text);
            fflush(stdout);
            break;
        }
        case MSG_INVENTORY_STATE: {
            if (hdr.version != MSG_INVENTORY_STATE_VERSION) break;
            msg_inventory_state_t inv;
            if (proto_read_inventory_state(payload, hdr.length, &inv) != 0) break;
            memcpy(cl->inv_slot_type,  inv.slot_type,  sizeof cl->inv_slot_type);
            memcpy(cl->inv_slot_count, inv.slot_count, sizeof cl->inv_slot_count);
            cl->inv_selected = (inv.selected < 9) ? inv.selected : 0;
            cl->inv_known    = true;
            /* Force the next periodic flush to write even if the
             * player hasn't moved - inventory changes are otherwise
             * invisible to the 0.25 m pose-debounce. */
            cl->last_saved_tick = 0;
            break;
        }
        case MSG_PLAYER_INFO_REQUEST: {
            if (hdr.version != MSG_PLAYER_INFO_REQUEST_VERSION) break;
            msg_player_info_request_t req;
            if (proto_read_player_info_request(payload, hdr.length, &req) != 0)
                break;
            if (req.player_id == 0 || req.player_id == cl->player_id) break;
            /* Look up the target in the same room as the requester
             * so cross-room identities stay isolated. */
            const server_client_t* target = NULL;
            for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                const server_client_t* peer = &s->clients[j];
                if (!peer->conn || !peer->handshaked) continue;
                if (peer->player_id != req.player_id) continue;
                if (strcmp(peer->room, cl->room) != 0) continue;
                target = peer;
                break;
            }
            if (!target) {
                /* Tell the requester so they can log + stop retrying.
                 * Common when a peer disconnected between the snapshot
                 * frame and the request arriving. */
                msg_player_info_nack_t nack = {
                    .player_id = req.player_id,
                    .reason    = PLAYER_INFO_NACK_UNKNOWN_ID,
                };
                uint8_t nbuf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_NACK_WIRE_SIZE];
                size_t nn = proto_write_player_info_nack(nbuf, sizeof nbuf, &nack);
                if (nn > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, nbuf, nn);
                printf("[server] PLAYER_INFO_REQUEST from player_id=%u for unknown "
                       "id=%u in room='%s' -> NACK\n",
                       cl->player_id, req.player_id,
                       cl->room[0] ? cl->room : "(public)");
                break;
            }
            msg_player_info_t info = { .player_id = target->player_id };
            memcpy(info.name, target->name,
                   strnlen(target->name, MSG_PLAYER_INFO_NAME_LEN));
            uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE];
            size_t n = proto_write_player_info(buf, sizeof buf, &info);
            if (n > 0) net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, n);
            break;
        }
        case MSG_PLAYER_STATE: {
            if (hdr.version != MSG_PLAYER_STATE_VERSION) {
                fprintf(stderr, "[server] PLAYER_STATE version %u != %u, closing\n",
                        hdr.version, MSG_PLAYER_STATE_VERSION);
                net_close(conn);
                return;
            }
            msg_player_state_t st;
            if (proto_read_player_state(payload, hdr.length, &st) != 0) {
                fprintf(stderr, "[server] malformed PLAYER_STATE\n");
                return;
            }
            /* Drop out-of-order packets — keep only the freshest pose. */
            if (cl->has_state && st.client_tick <= cl->last_client_tick) break;
            /* (Server-side fall-through pose-correction removed - the
             * client's collision now keeps the player on the surface
             * via the ground-snap overshoot rescue, so a sub-surface
             * pose arriving here is no longer expected. If one
             * resurfaces it'll persist as-is and the diagnostic on
             * the client side will surface the bug.) */
            bool first = !cl->has_state;
            cl->has_state        = true;
            cl->body_id          = st.body_id;
            cl->pos_x            = st.pos_x;
            cl->pos_y            = st.pos_y;
            cl->pos_z            = st.pos_z;
            cl->yaw              = st.yaw;
            cl->pitch            = st.pitch;
            cl->is_grounded      =
                (st.flags & PLAYER_STATE_FLAG_GROUNDED) != 0;
            cl->last_client_tick = st.client_tick;
            if (first) {
                printf("[server] first PLAYER_STATE from player_id=%u at "
                       "(%.1f, %.1f, %.1f) body=%u\n",
                       cl->player_id, st.pos_x, st.pos_y, st.pos_z, st.body_id);
                fflush(stdout);
            }
            check_for_desync(s, cl);
            break;
        }
        case MSG_SYNC_ACK: {
            if (hdr.version != MSG_SYNC_ACK_VERSION) break;
            msg_sync_ack_t ack;
            if (proto_read_sync_ack(payload, hdr.length, &ack) != 0) break;
            /* Only count an ACK that matches the tick we most recently
             * sent. Out-of-order or replayed ACKs (e.g. client retried
             * a fetch with the same id) are ignored - the RTT sample
             * would be meaningless. */
            if (ack.seq_id != cl->sync_last_seq_id) break;
            double now = (double)time(NULL);
            cl->sync_last_rtt_s = now - cl->sync_last_sent_s;
            if (cl->sync_last_rtt_s < 0.0) cl->sync_last_rtt_s = 0.0;
            if (cl->sync_outstanding > 0) --cl->sync_outstanding;
            break;
        }
        default:
            /* Unknown / not-yet-implemented kinds: log and skip rather
             * than disconnect, so the client can ship new messages
             * before the server learns about them. */
            printf("[server] ignoring kind=%u from player_id=%u\n",
                   hdr.kind, cl->player_id);
            break;
    }
}

static void on_close(net_conn_t* conn, net_close_reason_t reason, void* user) {
    server_t* s = (server_t*)user;
    server_client_t* cl = find_client_by_conn(s, conn);
    if (!cl) return;
    /* Persist the pose so the player resumes here on reconnect.
     * Name-keyed (sanitized display name) so the same identity
     * always lands on the same file. Gated on cl->token[0] so
     * server-stamped 'guest-N' connections don't pollute the
     * saves dir; only real profile-bearing sessions persist.
     * Also gated on cl->is_grounded so a tab-close during a fall /
     * jetpack hop can't write an in-air pose - the next RESUME
     * would drop the player back into the same fall, accumulating
     * velocity over the join-time remesh stalls, until the bedrock
     * rescue fires and lands them somewhere unrelated. */
    if (cl->has_state && cl->token[0] && cl->name[0] && cl->is_grounded) {
        saves_player_pose_t pose = {
            .body_id = cl->body_id,
            .pos_x   = cl->pos_x,
            .pos_y   = cl->pos_y,
            .pos_z   = cl->pos_z,
            .yaw     = cl->yaw,
            .pitch   = cl->pitch,
        };
        if (cl->inv_known) {
            memcpy(pose.inv_slot_type,  cl->inv_slot_type,  sizeof pose.inv_slot_type);
            memcpy(pose.inv_slot_count, cl->inv_slot_count, sizeof pose.inv_slot_count);
            pose.inv_selected = cl->inv_selected;
        }
        saves_write_player(cl->name, &pose);
    }
    printf("[server] close: player_id=%u name=%s (reason=%d)\n",
           cl->player_id, cl->name[0] ? cl->name : "(unnamed)", (int)reason);
    fflush(stdout);
    /* Pair the audit `login` from HELLO with a matching `logout` on
     * the way out. handshaked is the gate - half-open / version-
     * mismatch drops never wrote a login record, so we don't want a
     * spurious logout for them. */
    if (cl->handshaked && cl->name[0]) {
        saves_session_log("logout", cl->name, cl->room);
    }
    /* Release the room ref. Private rooms with zero refs get freed
     * to reclaim ~25 MB of cloned world data; the public room sticks. */
    if (cl->room_idx >= 0) {
        room_release(s, cl->room_idx);
        cl->room_idx = -1;
    }
    cl->conn       = NULL;
    cl->player_id  = 0;
    cl->handshaked = false;
    cl->name[0]    = 0;
    cl->token[0]   = 0;
    cl->room[0]    = 0;
    cl->has_state  = false;
}

/* ------------------------------------------------------------------ */
/* HTTP dashboard. The net_transport fires on_http for non-WebSocket
 * GETs against the listener port, which lets an operator hit the
 * server with `curl http://host:port/logins` (or /chat) without
 * needing a separate process. The bodies are JSON arrays built from
 * the audit logs that login/logout/chat write into the saves dir.
 *
 * Response bodies live in `HTTP_BODY` - a static buffer scoped to
 * the listener so it stays valid across the on_http return and the
 * transport's serve_http copy. Single-threaded server, so a static
 * is safe; if HTTP ever moves off the lws callback thread this
 * would need to be per-listener malloc'd. */
/* Bumped from 64 KiB to 4 MiB so the /saves/body endpoint can return
 * an entire planet's persisted .col files in one binary blob (the
 * client's lazy-load-on-approach path expects a single shot per
 * body, not chunked transfer). A typical 5-subdivision planet with
 * a few hundred edited tile columns lands at ~40-80 KiB; the headroom
 * accommodates someone who has terraformed an unreasonable amount of
 * a single planet. 4 MiB of static RAM out of a 1-2 GiB Fly machine
 * is in the noise. */
#define HTTP_BODY_CAP  (4 * 1024 * 1024)
static char  HTTP_BODY[HTTP_BODY_CAP];
static char  HTTP_RAW [HTTP_BODY_CAP];

/* Append `fmt...` to JSON_BODY starting at *pos. Caps at HTTP_BODY_CAP
 * with a trailing NUL. Returns true if everything fit, false if we
 * had to truncate (caller closes the array gracefully). */
static bool json_appendf(size_t* pos, const char* fmt, ...) {
    if (*pos + 2 >= HTTP_BODY_CAP) return false;
    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(HTTP_BODY + *pos, HTTP_BODY_CAP - *pos, fmt, ap);
    va_end(ap);
    if (n < 0) return false;
    if ((size_t)n >= HTTP_BODY_CAP - *pos) {
        /* Truncated - rewind to last good NUL. */
        HTTP_BODY[*pos] = 0;
        return false;
    }
    *pos += (size_t)n;
    return true;
}

/* JSON-escape `in` into `out`, capped at `cap-1` bytes + NUL. Only
 * handles the subset the audit logs can actually produce: tab/
 * newline have already been stripped by strip_log_chars, so we just
 * escape `"` and `\` here. */
static void json_escape(const char* in, char* out, size_t cap) {
    size_t o = 0;
    for (size_t i = 0; in[i] && o + 2 < cap; ++i) {
        char c = in[i];
        if (c == '"' || c == '\\') {
            if (o + 3 >= cap) break;
            out[o++] = '\\';
        }
        out[o++] = c;
    }
    out[o] = 0;
}

/* Parse `?n=NNN` out of `path`. Returns the parsed int clamped to
 * [1, SAVES_AUDIT_FILE_MAX], or `def` if absent / unparseable. */
/* Forward decl: definition lives near the chat/send endpoint below. */
static int http_query_str(const char* path, const char* key,
                            char* out, size_t cap);

static int http_query_int(const char* path, const char* key, int def) {
    const char* q = strchr(path, '?');
    if (!q) return def;
    size_t klen = strlen(key);
    const char* p = q + 1;
    while (*p) {
        if (strncmp(p, key, klen) == 0 && p[klen] == '=') {
            int v = atoi(p + klen + 1);
            if (v < 1) v = 1;
            if (v > SAVES_AUDIT_FILE_MAX) v = SAVES_AUDIT_FILE_MAX;
            return v;
        }
        const char* amp = strchr(p, '&');
        if (!amp) break;
        p = amp + 1;
    }
    return def;
}

/* `which` is "sessions" or "chat". Emits a JSON array of objects
 * built by splitting each audit-log TSV line on \t. The session
 * format is ts/event/name/room (4 fields); chat is ts/name/room/text
 * (also 4 but different keys). Unknown line shapes are skipped. */
/* Build a JSON page for /logins or /chat. The dashboard fetches an
 * initial page (newest entries, count = max_lines) then walks back
 * through history by re-issuing with before_ts set to the oldest
 * ts it already has - so the API returns "the newest `max_lines`
 * entries whose ts < before_ts". before_ts = 0 means "no filter".
 *
 * The response carries:
 *   "sessions" / "chat"  : array of entries, NEWEST FIRST in the
 *                          slice but oldest-first inside the array
 *                          (callers usually iterate in array order).
 *   "oldest_ts"          : the timestamp of the oldest entry returned;
 *                          callers pass this back as `before` to get
 *                          the next page. Missing when the response
 *                          is empty.
 *   "more"               : true iff at least one entry older than
 *                          oldest_ts exists on disk - callers stop
 *                          paginating when this is false. */
static size_t build_audit_json(const char* which, int max_lines,
                                  uint64_t before_ts) {
    size_t pos = 0;
    /* Pull the full file (capped at SAVES_AUDIT_FILE_MAX lines).
     * Filtering happens here, not in saves_audit_tail, so a single
     * disk read serves any page request. */
    size_t raw_len = saves_audit_tail(which, SAVES_AUDIT_FILE_MAX,
                                        HTTP_RAW, HTTP_BODY_CAP);
    if (!json_appendf(&pos, "{\"%s\":[", which)) return 0;

    /* First pass: find every line's start offset + parsed ts. */
    typedef struct { size_t off; size_t len; uint64_t ts; } line_t;
    /* SAVES_AUDIT_FILE_MAX is 5000; one entry per line is the
     * theoretical worst. Allocate on the stack scaled to that. */
    static line_t lines[SAVES_AUDIT_FILE_MAX + 8];
    int line_count = 0;
    {
        size_t off = 0;
        while (off < raw_len && line_count < SAVES_AUDIT_FILE_MAX) {
            const char* nl = (const char*)memchr(HTTP_RAW + off, '\n', raw_len - off);
            size_t lend = nl ? (size_t)(nl - HTTP_RAW) : raw_len;
            size_t llen = lend - off;
            if (llen == 0) { if (!nl) break; off = lend + 1; continue; }
            /* ts is the first field up to the first \t. */
            const char* tab = (const char*)memchr(HTTP_RAW + off, '\t', llen);
            uint64_t ts = tab ? strtoull(HTTP_RAW + off, NULL, 10) : 0;
            lines[line_count].off = off;
            lines[line_count].len = llen;
            lines[line_count].ts  = ts;
            ++line_count;
            if (!nl) break;
            off = lend + 1;
        }
    }

    /* Walk newest-to-oldest (= reverse), skip entries with ts >=
     * before_ts when before_ts is set, collect up to max_lines into
     * a "kept" array (most-recent-first). */
    static int kept[SAVES_AUDIT_FILE_MAX + 8];
    int kept_count = 0;
    bool has_older = false;
    for (int i = line_count - 1; i >= 0 && kept_count < max_lines; --i) {
        if (before_ts > 0 && lines[i].ts >= before_ts) continue;
        kept[kept_count++] = i;
    }
    /* After we've filled the page, check if anything older than the
     * oldest kept entry exists - drives the "more" flag. */
    if (kept_count > 0) {
        uint64_t oldest = lines[kept[kept_count - 1]].ts;
        for (int i = 0; i < line_count; ++i) {
            if (lines[i].ts < oldest) { has_older = true; break; }
        }
    }

    bool first = true;
    /* Emit oldest-first inside the array so callers can render in
     * natural reading order without reversing client-side. */
    for (int slot = kept_count - 1; slot >= 0; --slot) {
        const line_t* L = &lines[kept[slot]];
        char* line = HTTP_RAW + L->off;
        size_t len = L->len;
        /* Split into up to 4 tab-separated fields. */
        char fields[4][SAVES_CHAT_TEXT_MAX + 1];
        int fc = 0;
        size_t fstart = 0;
        for (size_t i = 0; i <= len && fc < 4; ++i) {
            if (i == len || line[i] == '\t') {
                size_t flen = i - fstart;
                if (flen > sizeof fields[0] - 1) flen = sizeof fields[0] - 1;
                memcpy(fields[fc], line + fstart, flen);
                fields[fc][flen] = 0;
                ++fc;
                fstart = i + 1;
            }
        }
        if (fc != 4) continue;
        char esc_a[256], esc_b[256], esc_c[256];
        const char* sep = first ? "" : ",";
        first = false;
        if (strcmp(which, "sessions") == 0) {
            json_escape(fields[1], esc_a, sizeof esc_a);
            json_escape(fields[2], esc_b, sizeof esc_b);
            json_escape(fields[3], esc_c, sizeof esc_c);
            if (!json_appendf(&pos,
                    "%s{\"ts\":%s,\"event\":\"%s\",\"name\":\"%s\",\"room\":\"%s\"}",
                    sep, fields[0], esc_a, esc_b, esc_c)) {
                break;
            }
        } else {
            json_escape(fields[1], esc_a, sizeof esc_a);
            json_escape(fields[2], esc_b, sizeof esc_b);
            json_escape(fields[3], esc_c, sizeof esc_c);
            if (!json_appendf(&pos,
                    "%s{\"ts\":%s,\"name\":\"%s\",\"room\":\"%s\",\"text\":\"%s\"}",
                    sep, fields[0], esc_a, esc_b, esc_c)) {
                break;
            }
        }
    }
    json_appendf(&pos, "]");
    if (kept_count > 0) {
        json_appendf(&pos, ",\"oldest_ts\":%llu",
                     (unsigned long long)lines[kept[kept_count - 1]].ts);
    }
    json_appendf(&pos, ",\"more\":%s,\"returned\":%d}",
                 has_older ? "true" : "false", kept_count);
    return pos;
}

/* Strip URL query from the path so the prefix compare hits regardless
 * of `?n=...`. Writes into `out`; returns `out`. */
static const char* strip_query(const char* path, char* out, size_t cap) {
    size_t i = 0;
    while (path[i] && path[i] != '?' && i + 1 < cap) {
        out[i] = path[i];
        ++i;
    }
    out[i] = 0;
    return out;
}

/* Process self-stats for /status. CPU usage is sampled across calls:
 * we record (utime+stime, wall) on each request and report the delta
 * since the previous one as a percentage of one core. Memory comes
 * straight from /proc/self/status. Linux-only, which matches the
 * deployment target (Fly.io runs a Debian-based image). */
typedef struct {
    double last_wall_s;
    double last_cpu_s;
    double cached_percent;
} cpu_sampler_t;
static cpu_sampler_t G_CPU = { 0 };
static double         G_START_WALL_S = 0.0;

static double monotonic_seconds_local(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}

static double cpu_seconds_used(void) {
    struct rusage ru;
    if (getrusage(RUSAGE_SELF, &ru) != 0) return 0.0;
    return (double)ru.ru_utime.tv_sec + (double)ru.ru_utime.tv_usec * 1e-6
         + (double)ru.ru_stime.tv_sec + (double)ru.ru_stime.tv_usec * 1e-6;
}

static double cpu_percent_sample(void) {
    double now = monotonic_seconds_local();
    double cpu = cpu_seconds_used();
    if (G_CPU.last_wall_s == 0.0) {
        G_CPU.last_wall_s = now;
        G_CPU.last_cpu_s = cpu;
        return 0.0;
    }
    double dt = now - G_CPU.last_wall_s;
    /* Below 50 ms the delta is too noisy - reuse the previous value. */
    if (dt < 0.05) return G_CPU.cached_percent;
    double dcpu = cpu - G_CPU.last_cpu_s;
    G_CPU.last_wall_s = now;
    G_CPU.last_cpu_s  = cpu;
    G_CPU.cached_percent = (dt > 0.0) ? (dcpu / dt * 100.0) : 0.0;
    return G_CPU.cached_percent;
}

/* Pull one named field (e.g. "VmRSS") out of /proc/self/status. The
 * format is `Name:\t<int> kB`. Returns the integer in kB, or -1 on
 * any error (file missing on a non-Linux host, key absent, etc.). */
static long proc_status_kb(const char* key) {
    FILE* f = fopen("/proc/self/status", "r");
    if (!f) return -1;
    size_t klen = strlen(key);
    char line[256];
    long out = -1;
    while (fgets(line, sizeof line, f)) {
        if (strncmp(line, key, klen) == 0 && line[klen] == ':') {
            out = strtol(line + klen + 1, NULL, 10);
            break;
        }
    }
    fclose(f);
    return out;
}

/* /saves: enumerate every persisted .col file on disk so an operator
 * can answer "is my volume actually persisting block edits?" without
 * shelling into the machine. Supports cheap filtering on
 *   ?room=ABCD23   (or ?room=__public__ for the empty-code lobby)
 *   ?seed=N        (decimal)
 *   ?body=N        (decimal body id)
 * Output: { "saves_dir": "...", "total_files": N,
 *           "filters": {...}, "matched": N,
 *           "tiles": [ { room, seed, body, tile, size, mtime }... ] }
 * Truncated cleanly when HTTP_BODY fills; total_files / matched still
 * reflect the real disk state so the operator sees "33429 on disk,
 * showing first N". */
typedef struct {
    const char* filter_room;
    bool        have_seed_filter;
    uint64_t    filter_seed;
    bool        have_body_filter;
    uint32_t    filter_body;
    size_t      json_pos;
    int         matched;
    int         emitted;
    bool        truncated;
} saves_walk_ctx_t;

static void saves_walk_cb(const char* room, uint64_t seed,
                            uint32_t body_id, int tile_idx,
                            size_t size_bytes, uint64_t mtime_unix_s,
                            void* user) {
    saves_walk_ctx_t* c = (saves_walk_ctx_t*)user;
    if (c->filter_room && c->filter_room[0]
        && strcmp(c->filter_room, room) != 0) return;
    if (c->have_seed_filter && seed != c->filter_seed) return;
    if (c->have_body_filter && body_id != c->filter_body) return;
    ++c->matched;
    if (c->truncated) return;
    char rname[64];
    json_escape(room, rname, sizeof rname);
    bool ok = json_appendf(&c->json_pos,
        "%s\n    {\"room\":\"%s\",\"seed\":%llu,\"body\":%u,"
        "\"tile\":%d,\"size\":%zu,\"mtime\":%llu}",
        c->emitted == 0 ? "" : ",",
        rname,
        (unsigned long long)seed,
        (unsigned)body_id,
        tile_idx, size_bytes,
        (unsigned long long)mtime_unix_s);
    if (!ok) {
        c->truncated = true;
        return;
    }
    ++c->emitted;
}

static size_t build_saves_json(const char* path) {
    char room_buf[16];
    room_buf[0] = 0;
    http_query_str(path, "room", room_buf, sizeof room_buf);
    /* "__public__" is the on-disk slug for the empty-code lobby; let
     * the operator filter using either spelling. */

    saves_walk_ctx_t ctx = { 0 };
    ctx.filter_room = room_buf[0] ? room_buf : NULL;
    {
        const char* q = strchr(path, '?');
        if (q) {
            const char* p = q + 1;
            while (*p) {
                if (strncmp(p, "seed=", 5) == 0) {
                    ctx.filter_seed = strtoull(p + 5, NULL, 10);
                    ctx.have_seed_filter = true;
                } else if (strncmp(p, "body=", 5) == 0) {
                    ctx.filter_body = (uint32_t)strtoul(p + 5, NULL, 10);
                    ctx.have_body_filter = true;
                }
                const char* amp = strchr(p, '&');
                if (!amp) break;
                p = amp + 1;
            }
        }
    }

    json_appendf(&ctx.json_pos, "{\n  \"filters\":{");
    bool first = true;
    if (ctx.filter_room) {
        char esc[64];
        json_escape(ctx.filter_room, esc, sizeof esc);
        json_appendf(&ctx.json_pos, "%s\"room\":\"%s\"",
                     first ? "" : ",", esc);
        first = false;
    }
    if (ctx.have_seed_filter) {
        json_appendf(&ctx.json_pos, "%s\"seed\":%llu",
                     first ? "" : ",",
                     (unsigned long long)ctx.filter_seed);
        first = false;
    }
    if (ctx.have_body_filter) {
        json_appendf(&ctx.json_pos, "%s\"body\":%u",
                     first ? "" : ",",
                     (unsigned)ctx.filter_body);
        first = false;
    }
    json_appendf(&ctx.json_pos, "},\n  \"tiles\":[");
    int total = saves_enumerate_tiles(saves_walk_cb, &ctx);
    json_appendf(&ctx.json_pos,
                 "\n  ],\n  \"total_files\":%d,\n  \"matched\":%d,"
                 "\n  \"emitted\":%d,\n  \"truncated\":%s\n}\n",
                 total, ctx.matched, ctx.emitted,
                 ctx.truncated ? "true" : "false");
    return ctx.json_pos;
}

static size_t build_status_json(server_t* s) {
    size_t pos = 0;
    double now = monotonic_seconds_local();
    if (G_START_WALL_S == 0.0) G_START_WALL_S = now;
    double uptime = now - G_START_WALL_S;
    double cpu_pct = cpu_percent_sample();
    long   rss_kb  = proc_status_kb("VmRSS");
    long   vm_kb   = proc_status_kb("VmSize");
    long   cores   = sysconf(_SC_NPROCESSORS_ONLN);
    if (cores < 1) cores = 1;

    json_appendf(&pos,
        "{\"uptime_s\":%.1f,\"tick\":%llu,\"tick_hz\":%.1f,"
        "\"cpu\":{\"percent\":%.2f,\"cores\":%ld},"
        "\"memory\":{\"rss_kb\":%ld,\"vm_kb\":%ld},",
        uptime, (unsigned long long)s->tick, s->cfg.tick_hz,
        cpu_pct, cores, rss_kb, vm_kb);

    /* Online players. Same handshaked gate as the rest of the server
     * uses for "real" clients - half-open sockets don't leak in. */
    json_appendf(&pos, "\"players\":[");
    bool first = true;
    int player_count = 0;
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        const server_client_t* cl = &s->clients[i];
        if (!cl->conn || !cl->handshaked) continue;
        char esc_name[SAVES_CHAT_NAME_MAX * 2 + 4];
        char esc_room[32];
        json_escape(cl->name, esc_name, sizeof esc_name);
        json_escape(cl->room[0] ? cl->room : "__public__",
                    esc_room, sizeof esc_room);
        json_appendf(&pos,
            "%s{\"player_id\":%u,\"name\":\"%s\",\"room\":\"%s\","
            "\"body_id\":%u,\"has_state\":%s}",
            first ? "" : ",",
            cl->player_id, esc_name, esc_room, cl->body_id,
            cl->has_state ? "true" : "false");
        first = false;
        ++player_count;
    }
    json_appendf(&pos, "],\"player_count\":%d,", player_count);

    /* Allocated rooms. Includes the public slot at index 0 once it
     * has been touched; idle private rooms within the grace window
     * still show up so the operator can see them age out. */
    json_appendf(&pos, "\"rooms\":[");
    first = true;
    for (int i = 0; i < SERVER_MAX_ROOMS; ++i) {
        const server_room_t* r = &s->rooms[i];
        if (!r->in_use) continue;
        char esc_code[32];
        json_escape(r->code[0] ? r->code : "__public__",
                    esc_code, sizeof esc_code);
        json_appendf(&pos,
            "%s{\"code\":\"%s\",\"clients\":%d}",
            first ? "" : ",", esc_code, r->ref_count);
        first = false;
    }
    json_appendf(&pos, "]}");
    return pos;
}

/* /rooms aggregator. Combines two sources:
 *   - sessions.log     for the full set of rooms that have ever hosted
 *                      a player + unique-user count per room
 *   - s->rooms[]       for the currently-live client counts
 * Output JSON: { rooms: [{code, unique_users, total_logins,
 *                          last_seen_ts, live_clients}, ...] }. */

#define RS_MAX_ROOMS           32
#define RS_MAX_UNIQUE_NAMES    64    /* per room */
#define RS_NAME_MAX            32
#define RS_ROOM_MAX            16    /* "__public__" + NUL fits */

typedef struct {
    char  room[RS_ROOM_MAX];
    int   total_logins;
    long  last_seen_ts;
    int   unique_count;
    char  names[RS_MAX_UNIQUE_NAMES][RS_NAME_MAX];
} rs_room_t;

static rs_room_t RS_ROOMS_BUF[RS_MAX_ROOMS];

/* Look up `room` in the aggregate buffer, allocating a new slot on
 * first sight. Returns the index, or -1 if the slot pool is exhausted. */
static int rs_find_or_add(const char* room, int* count) {
    for (int i = 0; i < *count; ++i) {
        if (strcmp(RS_ROOMS_BUF[i].room, room) == 0) return i;
    }
    if (*count >= RS_MAX_ROOMS) return -1;
    int idx = (*count)++;
    memset(&RS_ROOMS_BUF[idx], 0, sizeof RS_ROOMS_BUF[idx]);
    snprintf(RS_ROOMS_BUF[idx].room, sizeof RS_ROOMS_BUF[idx].room, "%s", room);
    return idx;
}

static size_t build_rooms_json(server_t* s) {
    int rs_count = 0;
    memset(RS_ROOMS_BUF, 0, sizeof RS_ROOMS_BUF);

    /* Walk every session record in the audit log, accumulating per-
     * room unique-user counts. Capped at SAVES_AUDIT_FILE_MAX, which
     * is also where the log auto-truncates. */
    size_t raw_len = saves_audit_tail("sessions", SAVES_AUDIT_FILE_MAX,
                                        HTTP_RAW, HTTP_BODY_CAP);
    char* line = HTTP_RAW;
    char* end  = HTTP_RAW + raw_len;
    while (line < end) {
        char* nl = (char*)memchr(line, '\n', (size_t)(end - line));
        size_t len = nl ? (size_t)(nl - line) : (size_t)(end - line);
        if (len == 0) { if (!nl) break; line = nl + 1; continue; }

        char fields[4][SAVES_CHAT_TEXT_MAX + 1];
        int fc = 0;
        size_t fstart = 0;
        for (size_t i = 0; i <= len && fc < 4; ++i) {
            if (i == len || line[i] == '\t') {
                size_t flen = i - fstart;
                if (flen > sizeof fields[0] - 1) flen = sizeof fields[0] - 1;
                memcpy(fields[fc], line + fstart, flen);
                fields[fc][flen] = 0;
                ++fc;
                fstart = i + 1;
            }
        }
        if (fc == 4) {
            long        ts    = strtol(fields[0], NULL, 10);
            const char* event = fields[1];
            const char* name  = fields[2];
            const char* room  = fields[3];
            int ri = rs_find_or_add(room, &rs_count);
            if (ri >= 0) {
                if (strcmp(event, "login") == 0) RS_ROOMS_BUF[ri].total_logins++;
                if (ts > RS_ROOMS_BUF[ri].last_seen_ts) RS_ROOMS_BUF[ri].last_seen_ts = ts;
                /* Unique-name probe. Linear scan is fine - the cap is
                 * 64 names per room and the audit log is 5k lines. */
                bool seen = false;
                for (int j = 0; j < RS_ROOMS_BUF[ri].unique_count; ++j) {
                    if (strcmp(RS_ROOMS_BUF[ri].names[j], name) == 0) {
                        seen = true; break;
                    }
                }
                if (!seen && RS_ROOMS_BUF[ri].unique_count < RS_MAX_UNIQUE_NAMES) {
                    snprintf(RS_ROOMS_BUF[ri].names[RS_ROOMS_BUF[ri].unique_count],
                             RS_NAME_MAX, "%s", name);
                    RS_ROOMS_BUF[ri].unique_count++;
                }
            }
        }
        if (!nl) break;
        line = nl + 1;
    }

    /* Live rooms not yet in the aggregate (brand-new room that hasn't
     * persisted a login event yet, or audit log was rotated past their
     * earliest history) still need to show up. */
    if (s) {
        for (int j = 0; j < SERVER_MAX_ROOMS; ++j) {
            const server_room_t* r = &s->rooms[j];
            if (!r->in_use) continue;
            const char* slug = r->code[0] ? r->code : "__public__";
            (void)rs_find_or_add(slug, &rs_count);
        }
    }

    /* Emit JSON. Cross-reference s->rooms for live_clients. */
    size_t pos = 0;
    json_appendf(&pos, "{\"rooms\":[");
    bool first = true;
    for (int i = 0; i < rs_count; ++i) {
        int live = 0;
        const char* room_internal =
            (strcmp(RS_ROOMS_BUF[i].room, "__public__") == 0) ? "" : RS_ROOMS_BUF[i].room;
        if (s) {
            for (int j = 0; j < SERVER_MAX_ROOMS; ++j) {
                const server_room_t* r = &s->rooms[j];
                if (!r->in_use) continue;
                if (strcmp(r->code, room_internal) == 0) {
                    live = r->ref_count;
                    break;
                }
            }
        }
        char esc_code[32];
        json_escape(RS_ROOMS_BUF[i].room, esc_code, sizeof esc_code);
        if (!json_appendf(&pos,
                "%s{\"code\":\"%s\",\"unique_users\":%d,\"total_logins\":%d,"
                "\"last_seen_ts\":%ld,\"live_clients\":%d}",
                first ? "" : ",",
                esc_code,
                RS_ROOMS_BUF[i].unique_count,
                RS_ROOMS_BUF[i].total_logins,
                RS_ROOMS_BUF[i].last_seen_ts,
                live)) {
            break;
        }
        first = false;
    }
    json_appendf(&pos, "]}");
    return pos;
}

/* URL-decode `in` into `out`, stopping at `&` or NUL. Handles `+`
 * (space) and `%XX` (hex). Returns the number of bytes written
 * (excluding the NUL); always NUL-terminates. */
static int hex_nybble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}
static size_t url_decode(const char* in, char* out, size_t out_cap) {
    if (out_cap == 0) return 0;
    size_t o = 0;
    for (size_t i = 0; in[i] && in[i] != '&' && o + 1 < out_cap; ++i) {
        char c = in[i];
        if (c == '+') {
            out[o++] = ' ';
        } else if (c == '%' && in[i + 1] && in[i + 2]) {
            int h1 = hex_nybble(in[i + 1]);
            int h2 = hex_nybble(in[i + 2]);
            if (h1 >= 0 && h2 >= 0) {
                out[o++] = (char)((h1 << 4) | h2);
                i += 2;
            } else {
                out[o++] = c;
            }
        } else {
            out[o++] = c;
        }
    }
    out[o] = 0;
    return o;
}

/* Pull a string-valued query parameter out of `path`. Writes the
 * URL-decoded value into `out`. Returns the byte count written, or
 * -1 if the key wasn't present. */
static int http_query_str(const char* path, const char* key,
                            char* out, size_t out_cap) {
    if (!out || out_cap == 0) return -1;
    out[0] = 0;
    const char* q = strchr(path, '?');
    if (!q) return -1;
    size_t klen = strlen(key);
    const char* p = q + 1;
    while (*p) {
        if (strncmp(p, key, klen) == 0 && p[klen] == '=') {
            return (int)url_decode(p + klen + 1, out, out_cap);
        }
        const char* amp = strchr(p, '&');
        if (!amp) break;
        p = amp + 1;
    }
    return -1;
}

/* Broadcast a chat message AS THE SERVER to every client currently
 * in `room`. The sender renders as `~server~` on each client because
 * we pre-broadcast a PLAYER_INFO with id=SERVER_CHAT_ID + that name,
 * so the chat lookup resolves to it. The persisted audit logs use
 * the same display name so the dashboard's /chat view matches what
 * players actually see. */
#define SERVER_CHAT_ID 0xFFFFFFFFu
static void server_chat_say(server_t* s, const char* room, const char* text) {
    if (!s || !text) return;
    const char* room_real = room ? room : "";

    /* Strip any control chars from the message - the audit logs and
     * the chat protocol both expect plain printable bytes. */
    char clean_text[MSG_CHAT_TEXT_LEN + 1];
    snprintf(clean_text, sizeof clean_text, "%s", text);
    for (size_t i = 0; i < sizeof clean_text && clean_text[i]; ++i) {
        if (clean_text[i] == '\r' || clean_text[i] == '\n' ||
            clean_text[i] == '\t') {
            clean_text[i] = ' ';
        }
    }

    /* Build the PLAYER_INFO once. Same buffer reused per recipient. */
    uint8_t pi_buf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE];
    msg_player_info_t info = { .player_id = SERVER_CHAT_ID };
    const char* sname = "~server~";
    size_t snlen = strnlen(sname, MSG_PLAYER_INFO_NAME_LEN);
    memcpy(info.name, sname, snlen);
    size_t pin = proto_write_player_info(pi_buf, sizeof pi_buf, &info);

    msg_chat_t m = { .player_id = SERVER_CHAT_ID };
    size_t tlen = strnlen(clean_text, MSG_CHAT_TEXT_LEN);
    memcpy(m.text, clean_text, tlen);
    uint8_t cbuf[MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE];
    size_t cn = proto_write_chat(cbuf, sizeof cbuf, &m);

    int sent_to = 0;
    for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
        const server_client_t* peer = &s->clients[j];
        if (!peer->conn) continue;
        if (strcmp(peer->room, room_real) != 0) continue;
        if (pin > 0) net_send(peer->conn, NET_CHANNEL_RELIABLE, pi_buf, pin);
        if (cn  > 0) net_send(peer->conn, NET_CHANNEL_RELIABLE, cbuf,  cn);
        ++sent_to;
    }

    /* Single write path - chat.log feeds both the dashboard and the
     * in-game backlog now. saves_chat_append was a paired duplicate;
     * removed to avoid double entries. */
    saves_global_chat_append(room_real, sname, clean_text);

    printf("[server] dashboard chat room=%s ~server~: %s (-> %d client%s)\n",
           room_real[0] ? room_real : "(public)",
           clean_text, sent_to, sent_to == 1 ? "" : "s");
    fflush(stdout);
}

/* Operator action: wipe every BLOCK_WATER cell at depth >=
 * WORLD_SEA_LEVEL_DEPTH (i.e. anywhere above the natural ocean
 * column) across one or every room. Lets the operator reset the
 * playfield while iterating on the water sim without restarting the
 * dedicated server. Subsurface ocean / lake water (depth < sea level)
 * is left alone so the planet's natural water cap isn't destroyed.
 *
 * For each cleared cell the helper also drops the per-voxel flow
 * state byte to 0 (any pending falling / level metadata becomes
 * meaningless once the cell is air), persists the affected tile
 * columns to disk, and broadcasts the updates to every connected peer
 * in the matching room as batched CHUNK_DIFFs. Same write path the
 * PLAYER_CMD handler uses for normal block edits, so clients converge
 * via the existing diff replay without any new wire format.
 *
 * room_param semantics (mirrors /chat/send for consistency):
 *   ""        -> the public lobby (room code == "")
 *   __public__ -> alias for the public lobby
 *   __all__   -> fan out across every in-use room
 *   anything else -> that exact private room code
 *
 * Counts are written through to the out_* pointers (any may be NULL)
 * so the HTTP handler can put them in the JSON response. */
static void admin_clear_water_above_sea(server_t* s, const char* room_param,
                                         int* out_cleared, int* out_tiles,
                                         int* out_worlds, int* out_rooms) {
    int total_cleared = 0;
    int total_tiles   = 0;
    int total_worlds  = 0;
    int total_rooms   = 0;
    if (!s) {
        if (out_cleared) *out_cleared = 0;
        if (out_tiles)   *out_tiles   = 0;
        if (out_worlds)  *out_worlds  = 0;
        if (out_rooms)   *out_rooms   = 0;
        return;
    }
    const bool fan_all = (room_param && strcmp(room_param, "__all__") == 0);
    const char* room_target = NULL;
    if (!fan_all) {
        room_target =
            (room_param && strcmp(room_param, "__public__") == 0)
                ? "" : (room_param ? room_param : "");
    }

    for (int ri = 0; ri < SERVER_MAX_ROOMS; ++ri) {
        server_room_t* room = &s->rooms[ri];
        if (!room->in_use) continue;
        if (!fan_all && strcmp(room->code, room_target) != 0) continue;
        ++total_rooms;

        for (int wi = 0; wi < room->world_count; ++wi) {
            world_t* w = room->worlds[wi];
            if (!w || !w->body) continue;
            bool world_touched = false;

            for (int tile = 0; tile < w->tile_count; ++tile) {
                /* Collect every depth in this column that needs to
                 * change. Per-tile CHUNK_DIFF batching needs the list
                 * up front anyway, and skipping unchanged columns
                 * saves a saves_write_tile call (the slow part). */
                msg_chunk_diff_entry_t pending[CHUNK_DIFF_MAX_EDITS];
                int pending_n = 0;
                /* At most WORLD_MAX_DEPTH - WORLD_SEA_LEVEL_DEPTH = 64
                 * cells per column, which equals CHUNK_DIFF_MAX_EDITS.
                 * One CHUNK_DIFF can therefore carry an entire column's
                 * worth of clearings in a single message - no need to
                 * loop and flush mid-column. */
                for (int d = WORLD_SEA_LEVEL_DEPTH; d < WORLD_MAX_DEPTH; ++d) {
                    if (w->blocks[(size_t)tile * WORLD_MAX_DEPTH + d]
                            != (uint8_t)BLOCK_WATER) continue;
                    world_set(w, tile, d, BLOCK_AIR);
                    world_water_clear_state(w, tile, d);
                    if (pending_n < CHUNK_DIFF_MAX_EDITS) {
                        pending[pending_n].tile_idx   = (uint32_t)tile;
                        pending[pending_n].depth      = (uint16_t)d;
                        pending[pending_n].block_type = (uint16_t)BLOCK_AIR;
                        ++pending_n;
                    }
                    ++total_cleared;
                }
                if (pending_n == 0) continue;
                ++total_tiles;
                world_touched = true;

                /* Persist the new column to disk so a server restart
                 * (or a fresh client join) sees the cleared state. */
                saves_write_tile(w, room->code, s->cfg.seed, tile);

                /* Broadcast the column's worth of edits as one
                 * CHUNK_DIFF to every connected peer in this room. */
                msg_chunk_diff_t diff = { 0 };
                diff.body_id    = (uint32_t)w->body->id;
                diff.edit_count = (uint16_t)pending_n;
                for (int e = 0; e < pending_n; ++e) {
                    diff.edits[e] = pending[e];
                }
                uint8_t buf[MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE
                            + MSG_CHUNK_DIFF_ENTRY_SIZE * CHUNK_DIFF_MAX_EDITS];
                size_t bn = proto_write_chunk_diff(buf, sizeof buf, &diff);
                if (bn > 0) {
                    for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                        const server_client_t* peer = &s->clients[j];
                        if (!peer->conn) continue;
                        if (strcmp(peer->room, room->code) != 0) continue;
                        net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, bn);
                    }
                }
            }
            if (world_touched) ++total_worlds;
        }
    }

    if (out_cleared) *out_cleared = total_cleared;
    if (out_tiles)   *out_tiles   = total_tiles;
    if (out_worlds)  *out_worlds  = total_worlds;
    if (out_rooms)   *out_rooms   = total_rooms;
}

static int on_http(const char* path,
                    const uint8_t** out_body, size_t* out_body_len,
                    const char** out_mime, void* user) {
    server_t* s = (server_t*)user;
    if (!path) return 0;
    char clean[256];
    strip_query(path, clean, sizeof clean);

    if (strcmp(clean, "/status") == 0) {
        size_t len = s ? build_status_json(s) : 0;
        *out_body     = (const uint8_t*)HTTP_BODY;
        *out_body_len = len;
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/rooms") == 0) {
        size_t len = build_rooms_json(s);
        *out_body     = (const uint8_t*)HTTP_BODY;
        *out_body_len = len;
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/logins") == 0) {
        /* Default page size 100. The dashboard scrolls back by
         * passing ?before=<oldest_ts> from the previous page so
         * disk reads stay bounded even with thousands of events. */
        int n = http_query_int(path, "n", 100);
        uint64_t before_ts = 0;
        {
            const char* q = strchr(path, '?');
            if (q) {
                const char* p = q + 1;
                while (*p) {
                    if (strncmp(p, "before=", 7) == 0) {
                        before_ts = strtoull(p + 7, NULL, 10);
                    }
                    const char* amp = strchr(p, '&');
                    if (!amp) break;
                    p = amp + 1;
                }
            }
        }
        size_t len = build_audit_json("sessions", n, before_ts);
        *out_body     = (const uint8_t*)HTTP_BODY;
        *out_body_len = len;
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/chat") == 0) {
        int n = http_query_int(path, "n", 100);
        uint64_t before_ts = 0;
        {
            const char* q = strchr(path, '?');
            if (q) {
                const char* p = q + 1;
                while (*p) {
                    if (strncmp(p, "before=", 7) == 0) {
                        before_ts = strtoull(p + 7, NULL, 10);
                    }
                    const char* amp = strchr(p, '&');
                    if (!amp) break;
                    p = amp + 1;
                }
            }
        }
        size_t len = build_audit_json("chat", n, before_ts);
        *out_body     = (const uint8_t*)HTTP_BODY;
        *out_body_len = len;
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/chat/send") == 0) {
        /* Open endpoint - anyone hitting it can broadcast as ~server~.
         * If chat spam becomes a problem, add a token gate (env var
         * compared against ?token=X); until then the operator's
         * convenience wins. */
        char room[32];
        char text[MSG_CHAT_TEXT_LEN + 1];
        http_query_str(path, "room", room, sizeof room);
        int xn = http_query_str(path, "text", text, sizeof text);
        if (xn <= 0) {
            static const char body[] = "{\"error\":\"missing text\"}";
            *out_body     = (const uint8_t*)body;
            *out_body_len = sizeof body - 1;
            *out_mime     = "application/json; charset=utf-8";
            return 1;
        }
        /* Map the JSON view's slugs back to room codes the server
         * uses internally:
         *   __public__ -> ""  (single public room)
         *   __all__    -> fan out across every in-use room
         *   anything else is sent verbatim as a private room code. */
        if (s) {
            if (strcmp(room, "__all__") == 0) {
                for (int i = 0; i < SERVER_MAX_ROOMS; ++i) {
                    const server_room_t* r = &s->rooms[i];
                    if (!r->in_use) continue;
                    server_chat_say(s, r->code, text);
                }
            } else {
                const char* room_real = room;
                if (strcmp(room, "__public__") == 0) room_real = "";
                server_chat_say(s, room_real, text);
            }
        }

        static const char ok[] = "{\"ok\":true}";
        *out_body     = (const uint8_t*)ok;
        *out_body_len = sizeof ok - 1;
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/saves") == 0) {
        size_t len = build_saves_json(path);
        *out_body     = (const uint8_t*)HTTP_BODY;
        *out_body_len = len;
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/saves/body") == 0) {
        /* Bulk binary download of one body's persisted tile columns.
         * Used by the client's lazy-per-body fetch path, which calls
         * this whenever it's about to mesh a body (active body at
         * WELCOME, deferred bodies at body_load_detail). The WS
         * CHUNK_DIFF replay was unreliable for large bodies; this
         * is the source of truth at boot. */
        char room[16];
        room[0] = 0;
        http_query_str(path, "room", room, sizeof room);
        /* "__public__" maps to the empty-code lobby on disk; let
         * the client send either spelling. */
        const char* room_real =
            (strcmp(room, "__public__") == 0) ? "" : room;

        uint64_t seed = 0;
        uint32_t body_id = 0;
        bool have_body = false;
        {
            const char* q = strchr(path, '?');
            if (q) {
                const char* p = q + 1;
                while (*p) {
                    if (strncmp(p, "seed=", 5) == 0) {
                        seed = strtoull(p + 5, NULL, 10);
                    } else if (strncmp(p, "body=", 5) == 0) {
                        body_id = (uint32_t)strtoul(p + 5, NULL, 10);
                        have_body = true;
                    }
                    const char* amp = strchr(p, '&');
                    if (!amp) break;
                    p = amp + 1;
                }
            }
        }
        if (!have_body) {
            static const char err[] = "missing required ?body=N parameter";
            *out_body     = (const uint8_t*)err;
            *out_body_len = sizeof err - 1;
            *out_mime     = "text/plain; charset=utf-8";
            return 1;
        }
        /* Default the seed to whatever the server booted with so a
         * client that doesn't know the seed yet still gets the right
         * data. The server only runs one seed at a time. */
        if (seed == 0 && s) seed = s->cfg.seed;

        size_t blob_len = 0;
        bool   ok = saves_body_blob(room_real, seed, body_id,
                                       (uint8_t*)HTTP_BODY, HTTP_BODY_CAP,
                                       &blob_len);
        if (!ok) {
            /* Either the buffer was too small (blob_len = required size)
             * or the saves layer is offline. Surface a small JSON error
             * with the size so the operator can see what happened. */
            int n = snprintf(HTTP_RAW, HTTP_BODY_CAP,
                             "{\"error\":\"blob too large\",\"required_bytes\":%zu,"
                             "\"buffer_bytes\":%d}\n",
                             blob_len, HTTP_BODY_CAP);
            *out_body     = (const uint8_t*)HTTP_RAW;
            *out_body_len = (size_t)n;
            *out_mime     = "application/json; charset=utf-8";
            return 1;
        }
        printf("[server] /saves/body room='%s' body=%u seed=%llu -> %zu bytes\n",
               room && *room ? room : "(empty-code/lobby)",
               (unsigned)body_id, (unsigned long long)seed, blob_len);
        fflush(stdout);
        *out_body     = (const uint8_t*)HTTP_BODY;
        *out_body_len = blob_len;
        *out_mime     = "application/octet-stream";
        return 1;
    }
    if (strcmp(clean, "/admin/clear_water_above_sea") == 0) {
        /* Open endpoint, same convention as /chat/send. If admin
         * abuse becomes a problem, gate behind TENEBRIS_ADMIN_TOKEN
         * the same way; until then operator convenience wins. */
        char room[32];
        room[0] = 0;
        http_query_str(path, "room", room, sizeof room);
        int cleared = 0, tiles_touched = 0, worlds_touched = 0, rooms_touched = 0;
        admin_clear_water_above_sea(s, room,
                                     &cleared, &tiles_touched,
                                     &worlds_touched, &rooms_touched);
        int n = snprintf(HTTP_RAW, HTTP_BODY_CAP,
                         "{\"ok\":true,\"room\":\"%s\","
                         "\"rooms_touched\":%d,\"worlds_touched\":%d,"
                         "\"tiles_touched\":%d,\"cells_cleared\":%d}\n",
                         room[0] ? room : "__public__",
                         rooms_touched, worlds_touched,
                         tiles_touched, cleared);
        printf("[server] /admin/clear_water_above_sea room='%s' -> "
               "%d rooms, %d worlds, %d tiles, %d cells\n",
               room[0] ? room : "__public__",
               rooms_touched, worlds_touched, tiles_touched, cleared);
        fflush(stdout);
        *out_body     = (const uint8_t*)HTTP_RAW;
        *out_body_len = (size_t)(n > 0 ? n : 0);
        *out_mime     = "application/json; charset=utf-8";
        return 1;
    }
    if (strcmp(clean, "/") == 0 || strcmp(clean, "/health") == 0) {
        static const char msg[] =
            "tenebris-server alive\n"
            "  GET /status               - live JSON (players, CPU, RAM, rooms)\n"
            "  GET /rooms                - per-room unique-user + total-login counts\n"
            "  GET /logins[?n=N&before=TS] - newest N login/logout events older than TS\n"
            "                                (default n=100, no before filter -> tail)\n"
            "  GET /chat  [?n=N&before=TS] - newest N chat messages older than TS\n"
            "                                (default n=100; response carries oldest_ts +\n"
            "                                 more=true/false so callers can paginate)\n"
            "  GET /chat/send?text=...   - broadcast '~server~' chat to a room\n"
            "                              (&room=ABC123 for private,\n"
            "                               &room=__all__ to fan out, default public)\n"
            "  GET /saves                - JSON: every persisted .col file on disk\n"
            "                              filter with ?room=ABC123 / ?body=0 / ?seed=N\n"
            "  GET /saves/body?body=N    - BINARY: every persisted column for one body\n"
            "                              also ?room=ABC123 (default lobby) and ?seed=N\n"
            "  GET /admin/clear_water_above_sea[?room=X] - clear every BLOCK_WATER\n"
            "                              above sea level (depth >= 64). Default room is\n"
            "                              the public lobby; pass &room=__all__ to fan\n"
            "                              out across every in-use room. Persists +\n"
            "                              broadcasts CHUNK_DIFFs to connected peers.\n";
        *out_body     = (const uint8_t*)msg;
        *out_body_len = sizeof msg - 1;
        *out_mime     = "text/plain; charset=utf-8";
        return 1;
    }
    return 0;
}

/* ------------------------------------------------------------------ */
/* Server lifecycle.                                                   */
/* ------------------------------------------------------------------ */

bool server_init(server_t* s, const server_config_t* cfg) {
    memset(s, 0, sizeof(*s));
    s->cfg = *cfg;
    if (s->cfg.tick_hz <= 0.0) s->cfg.tick_hz = 20.0;
    if (s->cfg.log_every_n <= 0) s->cfg.log_every_n = (int)s->cfg.tick_hz;

    /* Sync coordination defaults. Initial interval = 30 s per user
     * spec; sync_next_seq starts at 1 so seq_id=0 stays reserved as
     * "no tick yet seen" on the client side. */
    s->sync_interval_s = 30.0;
    s->sync_next_seq   = 1;

    job_system_init(0);

    /* Open the saves dir (creates if missing). Failures here are
     * non-fatal — the server still runs, edits just won't persist. */
    if (s->cfg.saves_dir) saves_init(s->cfg.saves_dir);

    const body_config_t* main_body = planet_get(BODY_TENEBRIS);
    if (!main_body) {
        fprintf(stderr, "[server] planet_get(BODY_TENEBRIS) returned NULL\n");
        return false;
    }
    /* Baseline worlds are the immutable procgen output. We never load
     * saves onto them and never mutate them post-init — room clones
     * own all the room-specific state (saves overlay, chunk edits).
     * Building baselines is two phases per body:
     *   1. world_create + world_stream_gen — procgen fills tiles.
     *      world_set is called during gen, so every gen-touched tile
     *      is in world->dirty.
     *   2. Clear dirty bits so clones start clean. */
    world_t* main_world = world_create(main_body,
                                         planet_subdivisions_for_radius(main_body->radius_m));
    while (!world_gen_complete(main_world)) {
        world_stream_gen(main_world, main_world->tile_count);
    }
    for (int t = 0; t < main_world->tile_count; ++t)
        world_tile_clear_dirty(main_world, t);
    s->worlds[s->world_count++] = main_world;

    for (int id = BODY_LUNA; id < BODY_COUNT; ++id) {
        if (s->world_count >= SERVER_MAX_BODIES) break;
        const body_config_t* b = planet_get((body_id_t)id);
        if (!b) continue;
        world_t* w = world_create(b, planet_subdivisions_for_radius(b->radius_m));
        while (!world_gen_complete(w)) world_stream_gen(w, w->tile_count);
        for (int t = 0; t < w->tile_count; ++t)
            world_tile_clear_dirty(w, t);
        s->worlds[s->world_count++] = w;
    }

    /* Mark every client slot as unattached to a room (-1 sentinel).
     * room_idx is set by handle_hello once a slot exists. */
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) s->clients[i].room_idx = -1;

    /* The public room is NO LONGER pre-cloned at boot. The previous
     * design eagerly cloned all 20 baseline worlds into a public
     * room slot so the first joiner skipped a cold-start cost - but
     * each clone set is ~370 MB (5 subs-7 worlds at ~54 MB each
     * plus mids + asteroids), and the 1 GB Fly machine OOM-killed
     * the moment a second room was acquired (baseline + public +
     * first private = ~1.1 GB). Public room is now created on
     * demand by room_acquire("") on the first empty-code HELLO,
     * same path as private rooms. Servers with only private-room
     * traffic never pay the public-room memory cost. */

    printf("[server] init: %d baseline worlds, "
           "tick_hz=%.1f, port=%d, saves=%s, seed=%llu\n",
           s->world_count, s->cfg.tick_hz, s->cfg.port,
           s->cfg.saves_dir ? s->cfg.saves_dir : "(none)",
           (unsigned long long)s->cfg.seed);

    net_callbacks_t cb = {
        .on_open  = on_open,
        .on_msg   = on_msg,
        .on_close = on_close,
        .on_http  = on_http,
        .user     = s,
    };
    s->listener = net_listen("0.0.0.0", s->cfg.port, cb);
    if (!s->listener) {
        fprintf(stderr, "[server] failed to bind WebSocket listener on port %d\n",
                s->cfg.port);
        return false;
    }

    fflush(stdout);
    return true;
}

static void broadcast_snapshot(server_t* s) {
    /* Room-scoped: each unique room code gets its own snapshot built
     * from same-room poses, then sent to same-room clients only.
     * O(rooms * clients) on a tiny SERVER_MAX_CLIENTS=16 — trivial.
     * Public room (empty code) is just another room key. */
    static uint8_t buf[MSG_HEADER_SIZE + MSG_SNAPSHOT_HEADER_SIZE
                       + SNAPSHOT_MAX_PLAYERS * MSG_SNAPSHOT_ENTRY_SIZE];

    bool seen[SERVER_MAX_CLIENTS] = { false };
    int total_sent = 0;
    int total_players = 0;
    int rooms = 0;

    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        if (seen[i] || !s->clients[i].conn) continue;
        const char* room = s->clients[i].room;
        seen[i] = true;

        msg_snapshot_t snap = { 0 };
        snap.server_tick = (uint32_t)s->tick;
        for (int j = i; j < SERVER_MAX_CLIENTS; ++j) {
            const server_client_t* cl = &s->clients[j];
            if (!cl->conn) continue;
            if (strcmp(cl->room, room) != 0) continue;
            seen[j] = true;
            if (!cl->has_state) continue;
            if (snap.player_count >= SNAPSHOT_MAX_PLAYERS) break;
            msg_snapshot_entry_t* e = &snap.players[snap.player_count++];
            e->player_id = cl->player_id;
            e->body_id   = cl->body_id;
            e->pos_x     = cl->pos_x;
            e->pos_y     = cl->pos_y;
            e->pos_z     = cl->pos_z;
            e->yaw       = cl->yaw;
            e->pitch     = cl->pitch;
        }
        if (snap.player_count == 0) continue;
        size_t n = proto_write_snapshot(buf, sizeof buf, &snap);
        if (n == 0) continue;
        for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
            const server_client_t* cl = &s->clients[j];
            if (!cl->conn) continue;
            if (strcmp(cl->room, room) != 0) continue;
            net_send(cl->conn, NET_CHANNEL_UNRELIABLE, buf, n);
            ++total_sent;
        }
        total_players += snap.player_count;
        ++rooms;
    }

    /* Heartbeat log every ~5 s. */
    static uint64_t snap_count = 0;
    if (rooms > 0 && (++snap_count % 33) == 0) {
        printf("[server] snapshots #%llu across %d room(s): %d total players, %d sends\n",
               (unsigned long long)snap_count, rooms, total_players, total_sent);
        fflush(stdout);
    }
}

/* Player idle timeout (seconds). After this much wall-clock silence
 * from a connected client, we write a "timeout" event to sessions.log
 * so the dashboard's session-pairing isn't stuck showing them as
 * live forever. The connection itself stays open - a slow link or a
 * mobile tab put to sleep should not be kicked - and on_close still
 * writes a "logout" if/when the socket actually dies. */
#define CLIENT_IDLE_TIMEOUT_S  300

static void client_sweep_idle(server_t* s) {
    int64_t now = (int64_t)time(NULL);
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        server_client_t* cl = &s->clients[i];
        if (!cl->conn) continue;
        if (!cl->handshaked) continue;          /* never had a login event */
        if (cl->timed_out_logged) continue;     /* already flagged */
        if (cl->last_msg_unix_s == 0) continue; /* uninitialised guard */
        int64_t silent_s = now - cl->last_msg_unix_s;
        if (silent_s < CLIENT_IDLE_TIMEOUT_S) continue;
        cl->timed_out_logged = true;
        saves_session_log("timeout", cl->name, cl->room);
        printf("[server] timeout: player_id=%u name='%s' room='%s' silent_s=%lld\n",
               cl->player_id,
               cl->name[0] ? cl->name : "(unnamed)",
               cl->room[0] ? cl->room : "(empty-code/lobby)",
               (long long)silent_s);
        fflush(stdout);
    }
}

static void room_sweep_idle(server_t* s) {
    /* Free rooms that have been empty for longer than the grace
     * window. Cheap: scan SERVER_MAX_ROOMS slots once a second
     * (caller throttles via tick modulus). */
    const double now = ((double)time(NULL));
    for (int i = 0; i < SERVER_MAX_ROOMS; ++i) {
        server_room_t* r = &s->rooms[i];
        if (!r->in_use || r->ref_count > 0) continue;
        if (r->last_empty_time_s <= 0.0) continue;
        if (now - r->last_empty_time_s < IDLE_ROOM_GRACE_S) continue;
        printf("[server] room '%s' freed after %.0fs idle\n",
               r->code[0] ? r->code : "(public)",
               now - r->last_empty_time_s);
        room_free_worlds(r);
        memset(r, 0, sizeof *r);
    }
}

void server_tick(server_t* s) {
    s->tick++;
    /* Drain inbound socket events; callbacks (on_open, on_msg, on_close)
     * fire synchronously from inside net_poll. */
    net_poll(s->listener);

    /* Idle-room sweeper: runs once a second. Cheap O(rooms). */
    if ((s->tick % (uint64_t)s->cfg.tick_hz) == 0) room_sweep_idle(s);
    /* Idle-client sweeper: same cadence, writes a "timeout" session
     * audit entry for any client silent past CLIENT_IDLE_TIMEOUT_S.
     * The connection isn't closed - just logged, so the dashboard
     * stops showing forever-live sessions. */
    if ((s->tick % (uint64_t)s->cfg.tick_hz) == 0) client_sweep_idle(s);

    /* Sync coordination: push a SYNC_TICK to any client whose
     * personal next-send timer has elapsed, and adapt the fleet-wide
     * interval based on the previous round's RTT samples. Runs once
     * per second - the interval itself is in tens of seconds, so a
     * per-tick (50 ms) walk would be overkill. */
    if ((s->tick % (uint64_t)s->cfg.tick_hz) == 0) {
        const double now = (double)time(NULL);
        /* First: average the last-seen RTT across handshaked clients
         * to decide whether to bump the interval up or down. Skips
         * clients without an RTT sample yet (sync_last_rtt_s == 0)
         * so a single new joiner doesn't dominate the average. */
        double rtt_sum = 0.0;
        int    rtt_n   = 0;
        int    behind  = 0;
        for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
            const server_client_t* cl = &s->clients[i];
            if (!cl->conn || !cl->handshaked) continue;
            if (cl->sync_outstanding > 1) ++behind;
            if (cl->sync_last_rtt_s > 0.0) {
                rtt_sum += cl->sync_last_rtt_s;
                ++rtt_n;
            }
        }
        double avg_rtt = (rtt_n > 0) ? (rtt_sum / (double)rtt_n) : 0.0;
        if (behind > 0 || (rtt_n > 0 && avg_rtt > s->sync_interval_s)) {
            /* At least one client missed its deadline OR the fleet
             * average RTT crept above the current interval. Step up
             * by 30 s per user spec; cap at 10 min so the interval
             * can't run away. */
            if (s->sync_interval_s < 600.0) {
                s->sync_interval_s += 30.0;
                printf("[sync] interval up to %.0fs (behind=%d avg_rtt=%.1fs)\n",
                       s->sync_interval_s, behind, avg_rtt);
                fflush(stdout);
            }
        } else if (rtt_n > 0 && avg_rtt * 2.0 < s->sync_interval_s
                   && s->sync_interval_s > 30.0) {
            /* RTTs are comfortably under half the interval - the
             * fleet has caught up, slowly step back down so a
             * temporary blip doesn't pin the interval at minutes
             * forever. Step down half as fast as we step up, so
             * we converge cleanly without oscillation. */
            s->sync_interval_s -= 15.0;
            if (s->sync_interval_s < 30.0) s->sync_interval_s = 30.0;
            printf("[sync] interval down to %.0fs (avg_rtt=%.1fs)\n",
                   s->sync_interval_s, avg_rtt);
            fflush(stdout);
        }

        /* Second: per-client, send a SYNC_TICK if the personal timer
         * has elapsed. Each new client's first send happens one
         * interval after handshake (initialized when sync_next_send_s
         * is 0). The seq_id comes from the global generator so
         * duplicate ACKs from a stale tick can be detected at the
         * server.
         *
         * If the client still has an outstanding (unacked) tick,
         * fire-and-forget anyway - the new tick supersedes the old
         * (the client's ACK for the previous one will be dropped
         * because seq_id won't match the most recent send). The
         * outstanding counter is what pushes the interval upward. */
        for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
            server_client_t* cl = &s->clients[i];
            if (!cl->conn || !cl->handshaked) continue;
            if (cl->sync_next_send_s == 0.0) {
                cl->sync_next_send_s = now + s->sync_interval_s;
                continue;
            }
            if (now < cl->sync_next_send_s) continue;
            uint32_t seq = s->sync_next_seq++;
            if (s->sync_next_seq == 0) s->sync_next_seq = 1;
            msg_sync_tick_t tick = { .seq_id = seq };
            uint8_t buf[MSG_HEADER_SIZE + MSG_SYNC_TICK_WIRE_SIZE];
            size_t bn = proto_write_sync_tick(buf, sizeof buf, &tick);
            if (bn > 0) {
                net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, bn);
                cl->sync_last_seq_id   = seq;
                cl->sync_last_sent_s   = now;
                cl->sync_next_send_s   = now + s->sync_interval_s;
                ++cl->sync_outstanding;

                /* Origin join-sync: alongside each SYNC_TICK, flood
                 * this client with one MSG_WATER_ORIGINS_DIFF per
                 * tile in its room that has any active origin
                 * entries. /saves/body only carries blocks (built
                 * from disk .col files); origins live in server
                 * memory and aren't persisted yet, so without this
                 * push a freshly-joined client sees zero flow
                 * direction on all pre-existing flow cells. The
                 * SYNC_TICK timer fires within ~30 s of join (and
                 * periodically thereafter), so the client converges
                 * to the right view shortly after joining.
                 *
                 * Per-client targeting (not room broadcast) because
                 * the cost is paid once per fresh client - other
                 * clients in the room already have their origin
                 * state caught up via the realtime PASS 3 broadcast. */
                for (int wi = 0; cl->room[0] && wi < SERVER_MAX_ROOMS; ++wi) {
                    if (!s->rooms[wi].in_use) continue;
                    if (strcmp(s->rooms[wi].code, cl->room) != 0) continue;
                    for (int rwi = 0; rwi < s->rooms[wi].world_count; ++rwi) {
                        world_t* w = s->rooms[wi].worlds[rwi];
                        if (!w || !w->body) continue;
                        for (int t = 0; t < w->tile_count; ++t) {
                            water_origin_diff_entry_t buf_entries[
                                MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES];
                            int written = world_water_origin_enum_tile(
                                w, t, buf_entries,
                                MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES);
                            if (written <= 0) continue;
                            if (written > MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES) {
                                written = MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES;
                            }
                            msg_water_origins_diff_t od = { 0 };
                            od.body_id  = (uint32_t)w->body->id;
                            od.tile_idx = (uint32_t)t;
                            od.entry_count = (uint16_t)written;
                            memcpy(od.entries, buf_entries,
                                   (size_t)written * sizeof buf_entries[0]);
                            uint8_t obuf[MSG_HEADER_SIZE
                                         + MSG_WATER_ORIGINS_DIFF_MAX_SIZE];
                            size_t obn = proto_write_water_origins_diff(
                                obuf, sizeof obuf, &od);
                            if (obn > 0) {
                                net_send(cl->conn, NET_CHANNEL_RELIABLE,
                                         obuf, obn);
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    /* M4 (position relay): broadcast every 3rd tick. At 20 Hz that's
     * ~6.7 snapshots/sec — visibly smooth with client-side interp
     * landing in a follow-up. */
    if ((s->tick % 3) == 0) broadcast_snapshot(s);

    /* M6 periodic flush: chunk edits are saved immediately on
     * PLAYER_CMD now, so the only thing this loop persists is
     * player poses. Runs every 0.5 s so a hard tab-close that
     * skips on_close at most loses half a second of movement.
     * A position-debounce inside skips the write when the player
     * hasn't moved >= 0.25 m since the last save, so an idle
     * lobby doesn't churn the disk. */
    const uint64_t flush_interval = (uint64_t)(s->cfg.tick_hz * 0.5);
    if (flush_interval > 0 && (s->tick % flush_interval) == 0) {
        int saved_poses = 0;
        for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
            server_client_t* cl = &s->clients[i];
            if (!cl->conn || !cl->has_state || !cl->token[0] || !cl->name[0]) continue;
            /* Skip mid-fall / mid-jetpack saves. The "client says not
             * grounded" gate means the next RESUME can always trust
             * the saved pose to be a place the player can stand. */
            if (!cl->is_grounded) continue;
            const double dx = cl->pos_x - cl->last_saved_pos_x;
            const double dy = cl->pos_y - cl->last_saved_pos_y;
            const double dz = cl->pos_z - cl->last_saved_pos_z;
            const double moved2 = dx*dx + dy*dy + dz*dz;
            if (cl->last_saved_tick != 0 && moved2 < 0.0625) continue;  /* 0.25 m */
            saves_player_pose_t pose = {
                .body_id = cl->body_id,
                .pos_x   = cl->pos_x, .pos_y = cl->pos_y, .pos_z = cl->pos_z,
                .yaw     = cl->yaw,   .pitch = cl->pitch,
            };
            if (cl->inv_known) {
                memcpy(pose.inv_slot_type,  cl->inv_slot_type,  sizeof pose.inv_slot_type);
                memcpy(pose.inv_slot_count, cl->inv_slot_count, sizeof pose.inv_slot_count);
                pose.inv_selected = cl->inv_selected;
            }
            if (saves_write_player(cl->name, &pose)) {
                ++saved_poses;
                cl->last_saved_pos_x = cl->pos_x;
                cl->last_saved_pos_y = cl->pos_y;
                cl->last_saved_pos_z = cl->pos_z;
                cl->last_saved_tick  = s->tick;
            }
        }
        if (saved_poses > 0 && (s->tick % (flush_interval * 20)) == 0) {
            /* Throttled log (every ~10 s of saves) to keep stdout calm. */
            printf("[server] flush: %d player poses\n", saved_poses);
            fflush(stdout);
        }
    }

    /* Water-flow simulation. Steps every flow_ticks_per_step server
     * ticks, processing up to flow_max_ticks_per_step cells per world.
     * Idle worlds with empty queues cost ~nothing. The schedule is
     * coupled to the server's authoritative tick clock so an MP world
     * advances flow at exactly the rate water.yaml prescribes - any
     * future server-to-client water-state sync inherits that cadence.
     *
     * Immediately after each step, drain the per-world persist-dirty
     * bitset and flush touched water-state columns to disk via
     * saves_write_water_state. The state changes pile up between
     * scheduler calls so one drain per step is enough; the falling-
     * cell skip lives inside world_water itself (gated on YAML
     * flow_persist_falling) so this loop doesn't have to know. */
    {
        const water_flow_config_t* wf = config_water_flow();
        int period = wf->ticks_per_step;
        if (period < 1) period = 1;
        if ((s->tick % (uint64_t)period) == 0) {
            int budget = wf->max_ticks_per_step;
            if (budget < 1) budget = 1;
            /* Per-flush tile-index buffer. Sized to handle the largest
             * subdivision in flight (~164k tiles) without spilling. */
            static int dirty_tiles[8192];
            for (int r = 0; r < SERVER_MAX_ROOMS; ++r) {
                if (!s->rooms[r].in_use) continue;
                server_room_t* room = &s->rooms[r];
                for (int wi = 0; wi < room->world_count; ++wi) {
                    world_t* w = room->worlds[wi];
                    if (!w) continue;
                    world_water_step(w, budget);
                    /* persist_dirty is the list of tiles where the
                     * water sim actually mutated state. That's the
                     * authoritative list of "what changed this step".
                     * The previous version of this broadcast loop
                     * iterated world_tile_dirty instead, which gets
                     * marked by world_set for the edited tile AND
                     * its 5-6 neighbours (for renderer seam logic) -
                     * so a single water cell change cascaded into 7
                     * broadcasts, and clients ended up remeshing all
                     * 32 chunks every step. Sticking to persist_dirty
                     * collapses the storm down to actually-edited
                     * tiles only.
                     *
                     * Per edited tile we send three things:
                     *   1. saves_write_water_state - durable copy of
                     *      the state-byte column.
                     *   2. MSG_WATER_STATE_DIFF broadcast - so client
                     *      cap heights / bell-curve / falling-flag
                     *      visuals mirror the authoritative sim.
                     *   3. MSG_CHUNK_DIFF broadcast + saves_write_tile -
                     *      so the block-level AIR/WATER changes the
                     *      sim drives reach clients and disk.
                     *
                     * neighbour tiles dirtied by world_set's seam
                     * logic are left in tile_dirty on the server but
                     * never iterated; that's harmless (the server
                     * doesn't render). */
                    int n = world_water_drain_persist_dirty(
                        w, dirty_tiles,
                        (int)(sizeof dirty_tiles / sizeof dirty_tiles[0]));
                    if (!w->body) {
                        n = 0;  /* no broadcasts without a body id */
                    }
                    /* Cross-tile block-diff batcher. Each tile
                     * contributes 128 entries (one per voxel depth)
                     * and CHUNK_DIFF_MAX_EDITS is 64, so the previous
                     * one-tile-at-a-time code sent 2 messages for the
                     * blocks alone, regardless of how empty the wire
                     * budget was. With N dirty tiles per step that's
                     * 2N + N = 3N messages, and water flooding makes
                     * N large - the resulting message storm is where
                     * clients drop frames.
                     *
                     * Pack entries from multiple tiles into one
                     * CHUNK_DIFF: the protocol already keys each entry
                     * by tile_idx + depth so mixed-tile batching is a
                     * one-line protocol change. We flush whenever the
                     * buffer hits CHUNK_DIFF_MAX_EDITS. State-diff
                     * messages stay per-tile (they carry a full 128-
                     * byte state column, no protocol slot to share). */
                    msg_chunk_diff_t batch_diff = { 0 };
                    batch_diff.body_id = (uint32_t)w->body->id;
                    int batch_count = 0;

                    #define WATER_FLUSH_BATCH() do {                                       \
                        if (batch_count > 0) {                                              \
                            batch_diff.edit_count = (uint16_t)batch_count;                  \
                            uint8_t bbuf[MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE        \
                                         + MSG_CHUNK_DIFF_ENTRY_SIZE * CHUNK_DIFF_MAX_EDITS];\
                            size_t bbn = proto_write_chunk_diff(bbuf, sizeof bbuf,          \
                                                                 &batch_diff);              \
                            if (bbn > 0) {                                                   \
                                for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {              \
                                    const server_client_t* peer = &s->clients[j];           \
                                    if (!peer->conn) continue;                              \
                                    if (strcmp(peer->room, room->code) != 0) continue;     \
                                    net_send(peer->conn, NET_CHANNEL_RELIABLE,              \
                                             bbuf, bbn);                                    \
                                }                                                            \
                            }                                                                \
                            batch_count = 0;                                                \
                        }                                                                    \
                    } while (0)

                    /* PASS 1: persist + accumulate block edits across
                     * all dirty tiles, flushing the cross-tile batcher
                     * to the wire as it fills up. State diffs are NOT
                     * sent in this pass.
                     *
                     * The two passes are deliberate: state diffs sent
                     * interleaved with block edits create a window where
                     * the client has applied the new state column for a
                     * tile but the block edits for the same tile are
                     * still sitting in the batcher waiting for the
                     * buffer to fill. The mesher rebuilds with new
                     * state + old blocks and draws phantom walls that
                     * vanish on relog (because /saves/body re-syncs
                     * atomically). Sending blocks first guarantees
                     * blocks-then-state ordering on the wire and the
                     * client always sees a consistent (block, state)
                     * pair when it remeshes. */
                    for (int i = 0; i < n; ++i) {
                        int tile = dirty_tiles[i];
                        const uint8_t* col =
                            &w->blocks[(size_t)tile * WORLD_MAX_DEPTH];
                        for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
                            batch_diff.edits[batch_count].tile_idx   = (uint32_t)tile;
                            batch_diff.edits[batch_count].depth      = (uint16_t)d;
                            batch_diff.edits[batch_count].block_type = (uint16_t)col[d];
                            ++batch_count;
                            if (batch_count >= CHUNK_DIFF_MAX_EDITS) {
                                WATER_FLUSH_BATCH();
                            }
                        }
                        saves_write_tile(w, room->code, s->cfg.seed, tile);
                        world_tile_clear_dirty(w, tile);
                    }
                    /* Drain any partial batch before we move on to
                     * state diffs - any state diff sent before this
                     * flush could land on the client ahead of its
                     * block updates. */
                    WATER_FLUSH_BATCH();

                    /* PASS 2: persist + broadcast state-column diffs.
                     * Now that every dirty tile's block updates are on
                     * the wire, the state diffs land on top of a
                     * consistent block layout. State columns can't be
                     * cross-tile batched - each diff carries the full
                     * 128-byte column for a single tile - so this
                     * stays one message per tile, but that's the
                     * smaller of the two message types and only fires
                     * once the block ordering invariant holds. */
                    for (int i = 0; i < n; ++i) {
                        int tile = dirty_tiles[i];
                        saves_write_water_state(w, room->code, s->cfg.seed,
                                                 tile);
                        const uint8_t* state_col =
                            world_water_state_column(w, tile);
                        if (!state_col) continue;
                        msg_water_state_diff_t wsd = { 0 };
                        wsd.body_id  = (uint32_t)w->body->id;
                        wsd.tile_idx = (uint32_t)tile;
                        memcpy(wsd.state, state_col, sizeof wsd.state);
                        uint8_t buf[MSG_HEADER_SIZE
                                    + MSG_WATER_STATE_DIFF_WIRE_SIZE];
                        size_t bn = proto_write_water_state_diff(buf,
                                                                  sizeof buf,
                                                                  &wsd);
                        if (bn == 0) continue;
                        for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                            const server_client_t* peer = &s->clients[j];
                            if (!peer->conn) continue;
                            if (strcmp(peer->room, room->code) != 0) continue;
                            net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, bn);
                        }
                    }

                    /* PASS 3: broadcast flow-origin entries for each
                     * dirty tile so MP clients can compute the same
                     * per-cell flow_direction the server has and pan
                     * the top-cap UV accordingly. Without this, MP
                     * clients see flow blocks with no recorded origin
                     * and the top cap stays static, contradicting the
                     * server's authoritative "flow points away from
                     * spawn" rule. Same ordering invariant as PASS 2:
                     * blocks (PASS 1) -> state (PASS 2) -> origins
                     * (PASS 3) so the client's mesh always rebuilds
                     * against a consistent (block, state, origins)
                     * triple. */
                    for (int i = 0; i < n; ++i) {
                        int tile = dirty_tiles[i];
                        msg_water_origins_diff_t od = { 0 };
                        od.body_id  = (uint32_t)w->body->id;
                        od.tile_idx = (uint32_t)tile;
                        int written = world_water_origin_enum_tile(
                            w, tile,
                            (water_origin_diff_entry_t*)od.entries,
                            MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES);
                        if (written < 0) written = 0;
                        if (written > MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES) {
                            written = MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES;
                        }
                        /* Always broadcast, even when written == 0, so
                         * a tile whose last origin just got removed
                         * (source destroyed -> downstream cells lost
                         * their last origin entry) tells the client
                         * to clear stale flow data for that tile. */
                        od.entry_count = (uint16_t)written;
                        uint8_t buf[MSG_HEADER_SIZE
                                    + MSG_WATER_ORIGINS_DIFF_MAX_SIZE];
                        size_t bn = proto_write_water_origins_diff(
                            buf, sizeof buf, &od);
                        if (bn == 0) continue;
                        for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                            const server_client_t* peer = &s->clients[j];
                            if (!peer->conn) continue;
                            if (strcmp(peer->room, room->code) != 0) continue;
                            net_send(peer->conn, NET_CHANNEL_RELIABLE, buf, bn);
                        }
                    }
                    #undef WATER_FLUSH_BATCH
                }
            }
        }
    }

    if ((s->tick % (uint64_t)s->cfg.log_every_n) == 0) {
        int connected = 0;
        for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
            if (s->clients[i].conn) ++connected;
        }
        printf("[server] tick %llu (%d connected)\n",
               (unsigned long long)s->tick, connected);
        fflush(stdout);
    }
}

void server_shutdown(server_t* s) {
    printf("[server] shutdown after %llu ticks\n",
           (unsigned long long)s->tick);
    fflush(stdout);
    /* Final flush before tearing down. Block edits already hit disk
     * the moment they happened, so only player poses need a last
     * write here. SIGTERM from Fly on redeploy lands here. */
    int final_poses = 0;
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        server_client_t* cl = &s->clients[i];
        if (!cl->conn || !cl->has_state || !cl->token[0] || !cl->name[0]) continue;
        /* Same grounded gate as the periodic flush. On SIGTERM during a
         * fall we keep the previous good pose rather than overwriting
         * it with a mid-air snapshot. */
        if (!cl->is_grounded) continue;
        saves_player_pose_t pose = {
            .body_id = cl->body_id,
            .pos_x   = cl->pos_x, .pos_y = cl->pos_y, .pos_z = cl->pos_z,
            .yaw     = cl->yaw,   .pitch = cl->pitch,
        };
        if (cl->inv_known) {
            memcpy(pose.inv_slot_type,  cl->inv_slot_type,  sizeof pose.inv_slot_type);
            memcpy(pose.inv_slot_count, cl->inv_slot_count, sizeof pose.inv_slot_count);
            pose.inv_selected = cl->inv_selected;
        }
        if (saves_write_player(cl->name, &pose)) ++final_poses;
    }
    printf("[server] final flush: %d poses\n", final_poses);
    fflush(stdout);

    if (s->listener) {
        net_close_listener(s->listener);
        s->listener = NULL;
    }
    /* Free every room (clones included) before the baselines. The
     * order matters: clones reference no baseline memory, but freeing
     * baselines first would invalidate any debug iteration we'd do
     * across rooms during shutdown. */
    for (int i = 0; i < SERVER_MAX_ROOMS; ++i) {
        if (!s->rooms[i].in_use) continue;
        room_free_worlds(&s->rooms[i]);
        memset(&s->rooms[i], 0, sizeof s->rooms[i]);
    }
    for (int i = 0; i < s->world_count; ++i) {
        world_destroy(s->worlds[i]);
        s->worlds[i] = NULL;
    }
    s->world_count = 0;
    saves_shutdown();
    job_system_shutdown();
}

void server_request_shutdown(server_t* s) {
    s->shutdown_requested = true;
}
