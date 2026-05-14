#include "server/server.h"
#include "server/saves.h"
#include "core/blocks.h"
#include "core/job_system.h"
#include "core/math.h"
#include <math.h>   /* sqrt for the spawn-altitude diagnostic */
#include "core/net_transport.h"
#include "core/planet.h"
#include "core/proto.h"
#include "core/world.h"
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
    for (int i = 0; i < s->world_count && i < SERVER_MAX_BODIES; ++i) {
        const world_t* baseline = s->worlds[i];
        if (!baseline || !baseline->body) continue;
        const uint32_t body_id = (uint32_t)baseline->body->id;
        if (!saves_room_body_has_edits(room->code, s->cfg.seed, body_id))
            continue;
        world_t* w = world_clone(baseline);
        if (!w) {
            fprintf(stderr, "[server] room '%s': clone of body %u failed\n",
                    room->code, body_id);
            continue;
        }
        saves_load_world(w, room->code, s->cfg.seed);
        room->worlds[room->world_count++] = w;
    }
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
     * directly so we don't re-walk the directory. */
    saves_load_world(w, room->code, s->cfg.seed);
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
    if (replayed_tiles > 0) {
        printf("[server] CHUNK replay -> player_id=%u: %d tile(s), %d msg(s)\n",
               cl->player_id, replayed_tiles, replayed_msgs);
        fflush(stdout);
    }
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
    }
    /* HELLO/WELCOME spawn diagnostic. One line per join so we can
     * tell where the player got placed and why - 'DEFAULT' branch
     * means no save file, 'RESUME' means we loaded one. Includes
     * radial altitude (length(spawn - body_centre) - body_radius)
     * so the floating-spawn report has a concrete number to chase. */
    {
        const body_config_t* dbg_body = planet_get((body_id_t)w.body_id);
        double r = 0.0, alt = 0.0;
        if (dbg_body) {
            double dx = w.spawn_x - dbg_body->pos_x;
            double dy = w.spawn_y - dbg_body->pos_y;
            double dz = w.spawn_z - dbg_body->pos_z;
            r = sqrt(dx*dx + dy*dy + dz*dz);
            alt = r - dbg_body->radius_m;
        }
        printf("[server] WELCOME spawn name=%s %s body=%u pos=(%.2f, %.2f, %.2f) "
               "r=%.2f alt=%+.2f yaw=%.2f pitch=%.2f\n",
               cl->name,
               had_save ? "RESUME" : "DEFAULT",
               w.body_id, w.spawn_x, w.spawn_y, w.spawn_z,
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

    printf("[server] HELLO from player_id=%u name='%s' room='%s' (client_version=%u)\n",
           cl->player_id, cl->name,
           cl->room[0] ? cl->room : "(public)", h.client_version);
    send_welcome(s, cl);
    /* Bring the joining client up to date with the room's persisted
     * chunk edits before they can act, so the world they see matches
     * what was on disk when they last (or any previous player) left.
     * Idempotent for unedited depths - the server's procgen + client's
     * procgen agree there. */
    send_chunk_replay(s, cl);

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
            world_set(w, (int)cmd.tile_idx, (int)cmd.depth, target);
            /* Persist immediately under the room's save path. world_set
             * marks the edited tile + neighbours dirty (for the
             * renderer's remesh seam logic), but only the EDITED tile's
             * column actually changed — saving via the dirty bitmap
             * would also persist 6-7 unchanged neighbour columns each
             * edit. Skip the wasted disk + write only the tile we
             * touched. */
            saves_write_tile(w, cl->room, s->cfg.seed, (int)cmd.tile_idx);

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
            saves_chat_append(cl->room, cl->name, nz_text);

            char short_text[33];
            memcpy(short_text, nz_text, 32); short_text[32] = 0;
            printf("[server] chat room=%s %s: %s\n",
                   cl->room[0] ? cl->room : "(public)",
                   cl->name, short_text);
            fflush(stdout);
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
            bool first = !cl->has_state;
            cl->has_state        = true;
            cl->body_id          = st.body_id;
            cl->pos_x            = st.pos_x;
            cl->pos_y            = st.pos_y;
            cl->pos_z            = st.pos_z;
            cl->yaw              = st.yaw;
            cl->pitch            = st.pitch;
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
     * saves dir; only real profile-bearing sessions persist. */
    if (cl->has_state && cl->token[0] && cl->name[0]) {
        saves_player_pose_t pose = {
            .body_id = cl->body_id,
            .pos_x   = cl->pos_x,
            .pos_y   = cl->pos_y,
            .pos_z   = cl->pos_z,
            .yaw     = cl->yaw,
            .pitch   = cl->pitch,
        };
        saves_write_player(cl->name, &pose);
    }
    printf("[server] close: player_id=%u name=%s (reason=%d)\n",
           cl->player_id, cl->name[0] ? cl->name : "(unnamed)", (int)reason);
    fflush(stdout);
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
/* Server lifecycle.                                                   */
/* ------------------------------------------------------------------ */

bool server_init(server_t* s, const server_config_t* cfg) {
    memset(s, 0, sizeof(*s));
    s->cfg = *cfg;
    if (s->cfg.tick_hz <= 0.0) s->cfg.tick_hz = 20.0;
    if (s->cfg.log_every_n <= 0) s->cfg.log_every_n = (int)s->cfg.tick_hz;

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
        saves_player_pose_t pose = {
            .body_id = cl->body_id,
            .pos_x   = cl->pos_x, .pos_y = cl->pos_y, .pos_z = cl->pos_z,
            .yaw     = cl->yaw,   .pitch = cl->pitch,
        };
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
