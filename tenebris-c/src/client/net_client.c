#include "client/net_client.h"
#include "client/chat.h"
#include "client/remote_players.h"
#include "client/renderer.h"
#include "core/net_transport.h"
#include "core/proto.h"
#include "core/world.h"

#include "sokol_time.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NET_NAME_MAX           32
#define NET_NAME_CACHE_SIZE    32

typedef struct {
    uint32_t player_id;
    char     name[NET_NAME_MAX];
} net_name_entry_t;

typedef struct {
    net_client_state_t   state;
    net_conn_t*          conn;
    net_client_welcome_t welcome;
    /* Profile sent in HELLO. Token is the persistent identifier;
     * name is the friendly display string other clients see. */
    char                 profile_token[33];
    char                 profile_name[NET_NAME_MAX];
    /* Room code to join (8 chars max). Empty = public room. */
    char                 room_code[9];
    /* Name cache: player_id → name, populated from MSG_PLAYER_INFO
     * (and from WELCOME for the local player). The F1 panel reads
     * net_client_name_for_id to render rows. */
    net_name_entry_t     names[NET_NAME_CACHE_SIZE];
    int                  name_count;
    /* Most recent DESYNC notice from the server. last_desync_time is
     * a sokol_time stamp (0 = never). The HUD compares against
     * stm_now() and fades the warning out after a few seconds. */
    net_desync_kind_t    last_desync;
    uint32_t             last_desync_block;
    uint64_t             last_desync_time;
    /* Last connection-failure reason, populated by on_close (or by
     * net_client_connect when net_connect returns NULL). Plain ASCII,
     * empty until something fails. The menu reads this to render the
     * in-game error dialog. */
    char                 error_message[96];
} net_client_t;

static net_client_t C;

/* ------------------------------------------------------------------ */
/* Transport callbacks. The transport's poll fires these on the main
 * thread (browser) or the tick thread (native loopback), so we can
 * mutate C directly. */
/* ------------------------------------------------------------------ */

static void cache_name(uint32_t player_id, const char* name) {
    if (!name || !*name) return;
    /* Update existing entry if present. */
    for (int i = 0; i < C.name_count; ++i) {
        if (C.names[i].player_id == player_id) {
            snprintf(C.names[i].name, sizeof C.names[i].name, "%s", name);
            return;
        }
    }
    if (C.name_count < NET_NAME_CACHE_SIZE) {
        C.names[C.name_count].player_id = player_id;
        snprintf(C.names[C.name_count].name,
                 sizeof C.names[C.name_count].name, "%s", name);
        ++C.name_count;
    }
}

const char* net_client_name_for_id(uint32_t player_id) {
    for (int i = 0; i < C.name_count; ++i) {
        if (C.names[i].player_id == player_id) return C.names[i].name;
    }
    return NULL;
}

void net_client_set_profile(const char* token, const char* name,
                              const char* room_code) {
    memset(C.profile_token, 0, sizeof C.profile_token);
    memset(C.profile_name,  0, sizeof C.profile_name);
    memset(C.room_code,     0, sizeof C.room_code);
    if (token)     snprintf(C.profile_token, sizeof C.profile_token, "%s", token);
    if (name)      snprintf(C.profile_name,  sizeof C.profile_name,  "%s", name);
    if (room_code) snprintf(C.room_code,     sizeof C.room_code,     "%s", room_code);
}

static void send_hello(void) {
    msg_hello_t h = { 0 };
    h.client_version = TENEBRIS_PROTOCOL_VERSION;
    /* token: copy at most MSG_HELLO_TOKEN_LEN bytes (no null on wire). */
    size_t tn = strnlen(C.profile_token, MSG_HELLO_TOKEN_LEN);
    memcpy(h.token, C.profile_token, tn);
    /* name: same — null-padded fixed-32. */
    size_t nn = strnlen(C.profile_name, MSG_HELLO_NAME_LEN);
    memcpy(h.name, C.profile_name, nn);
    /* room: null-padded fixed-8. Empty string = public room. */
    size_t rn = strnlen(C.room_code, MSG_HELLO_ROOM_LEN);
    memcpy(h.room_code, C.room_code, rn);
    uint8_t buf[MSG_HEADER_SIZE + MSG_HELLO_WIRE_SIZE];
    size_t n = proto_write_hello(buf, sizeof buf, &h);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
    C.state = NET_CLIENT_HANDSHAKE;
    printf("[net-client] HELLO sent (name='%s')\n",
           C.profile_name[0] ? C.profile_name : "(empty)");
}

static void on_open(net_conn_t* conn, void* user) {
    (void)conn; (void)user;
    printf("[net-client] socket open\n");
    send_hello();
}

static void on_msg(net_conn_t* conn, net_channel_t ch,
                     const void* data, size_t len, void* user) {
    (void)conn; (void)ch; (void)user;

    msg_hdr_t hdr;
    if (proto_read_header((const uint8_t*)data, len, &hdr) != 0) {
        fprintf(stderr, "[net-client] short header (%zu bytes)\n", len);
        return;
    }
    if (len < MSG_HEADER_SIZE + hdr.length) {
        fprintf(stderr, "[net-client] truncated payload (have %zu, need %u)\n",
                len, MSG_HEADER_SIZE + hdr.length);
        return;
    }
    const uint8_t* payload = (const uint8_t*)data + MSG_HEADER_SIZE;

    switch ((msg_kind_t)hdr.kind) {
        case MSG_WELCOME: {
            if (hdr.version != MSG_WELCOME_VERSION) {
                fprintf(stderr, "[net-client] WELCOME version %u != %u\n",
                        hdr.version, MSG_WELCOME_VERSION);
                C.state = NET_CLIENT_ERROR;
                return;
            }
            msg_welcome_t w;
            if (proto_read_welcome(payload, hdr.length, &w) != 0) {
                fprintf(stderr, "[net-client] malformed WELCOME\n");
                C.state = NET_CLIENT_ERROR;
                return;
            }
            C.welcome.player_id   = w.player_id;
            C.welcome.world_seed  = w.world_seed;
            C.welcome.spawn_x     = w.spawn_x;
            C.welcome.spawn_y     = w.spawn_y;
            C.welcome.spawn_z     = w.spawn_z;
            C.welcome.body_id     = w.body_id;
            C.state = NET_CLIENT_READY;
            /* Cache our own name so F1 can show it for the local
             * player too — the server has it from HELLO but doesn't
             * echo it in WELCOME; the locally-known profile name is
             * the ground truth. */
            cache_name(w.player_id, C.profile_name);
            printf("[net-client] READY: player_id=%u seed=%llu "
                   "spawn=(%.2f, %.2f, %.2f) body=%u\n",
                   w.player_id, (unsigned long long)w.world_seed,
                   w.spawn_x, w.spawn_y, w.spawn_z, w.body_id);
            break;
        }
        case MSG_CHAT: {
            if (hdr.version != MSG_CHAT_VERSION) break;
            msg_chat_t m;
            if (proto_read_chat(payload, hdr.length, &m) != 0) break;
            char text[MSG_CHAT_TEXT_LEN + 1];
            memcpy(text, m.text, MSG_CHAT_TEXT_LEN);
            text[MSG_CHAT_TEXT_LEN] = 0;
            const char* sender = net_client_name_for_id(m.player_id);
            chat_post_recv(m.player_id,
                            sender ? sender : "?",
                            text);
            break;
        }
        case MSG_PLAYER_INFO: {
            if (hdr.version != MSG_PLAYER_INFO_VERSION) break;
            msg_player_info_t info;
            if (proto_read_player_info(payload, hdr.length, &info) != 0) break;
            /* Server name is null-padded fixed-32; treat as C string. */
            char name[MSG_PLAYER_INFO_NAME_LEN + 1];
            memcpy(name, info.name, MSG_PLAYER_INFO_NAME_LEN);
            name[MSG_PLAYER_INFO_NAME_LEN] = 0;
            cache_name(info.player_id, name);
            break;
        }
        case MSG_DESYNC: {
            if (hdr.version != MSG_DESYNC_VERSION) break;
            msg_desync_t d;
            if (proto_read_desync(payload, hdr.length, &d) != 0) break;
            C.last_desync       = (net_desync_kind_t)d.reason;
            C.last_desync_block = d.block_type;
            C.last_desync_time  = stm_now();
            /* Loud console line — emscripten pipes printf to console.log,
             * so this lands in browser devtools. Two messages so it's
             * easy to spot among the rest of the per-frame chatter. */
            fprintf(stderr,
                    "============================================================\n"
                    "[DESYNC] server rejected pose at (%.1f, %.1f, %.1f)\n"
                    "         reason=%u  body=%u  block=%u\n"
                    "============================================================\n",
                    d.client_pos_x, d.client_pos_y, d.client_pos_z,
                    (unsigned)d.reason, (unsigned)d.body_id,
                    (unsigned)d.block_type);
            break;
        }
        case MSG_CHUNK_DIFF: {
            if (hdr.version != MSG_CHUNK_DIFF_VERSION) break;
            msg_chunk_diff_t diff;
            if (proto_read_chunk_diff(payload, hdr.length, &diff) != 0) {
                fprintf(stderr, "[net-client] malformed CHUNK_DIFF\n");
                break;
            }
            world_t* w = renderer_world_for_body(diff.body_id);
            if (!w) {
                fprintf(stderr, "[net-client] CHUNK_DIFF for unknown body %u\n",
                        diff.body_id);
                break;
            }
            for (int i = 0; i < diff.edit_count; ++i) {
                const msg_chunk_diff_entry_t* e = &diff.edits[i];
                /* world_set marks the tile dirty; the renderer's mesh
                 * dirty sweep remeshes it on the next frame. Same path
                 * as locally-applied edits. */
                world_set(w, (int)e->tile_idx, (int)e->depth,
                            (block_t)e->block_type);
            }
            break;
        }
        case MSG_SNAPSHOT: {
            if (hdr.version != MSG_SNAPSHOT_VERSION) break;
            msg_snapshot_t snap;
            if (proto_read_snapshot(payload, hdr.length, &snap) != 0) {
                fprintf(stderr, "[net-client] malformed SNAPSHOT\n");
                break;
            }
            remote_pose_t out[REMOTE_PLAYERS_MAX];
            int n_out = 0;
            for (int i = 0; i < snap.player_count; ++i) {
                const msg_snapshot_entry_t* e = &snap.players[i];
                /* Skip the local player so we don't draw our own
                 * marker on top of the camera. */
                if (e->player_id == C.welcome.player_id) continue;
                if (n_out >= REMOTE_PLAYERS_MAX) break;
                remote_pose_t* r = &out[n_out++];
                r->player_id = e->player_id;
                r->body_id   = e->body_id;
                r->pos.x     = e->pos_x;
                r->pos.y     = e->pos_y;
                r->pos.z     = e->pos_z;
                r->yaw       = e->yaw;
                r->pitch     = e->pitch;
            }
            remote_players_set_from_snapshot(out, n_out);
            /* Diagnostic: log every ~5 s (33 snapshots at 6.7 Hz) so
             * we can confirm the server's sending us peers. Quiet
             * enough not to drown out real warnings. */
            static uint64_t snap_recv = 0;
            if ((++snap_recv % 33) == 0) {
                printf("[net-client] snapshot #%llu: %u entries (kept %d remote)\n",
                       (unsigned long long)snap_recv,
                       (unsigned)snap.player_count, n_out);
            }
            break;
        }
        default:
            /* Ignore unknown kinds so the server can ship new ones
             * without breaking us. */
            break;
    }
}

void net_client_send_chat(const char* text) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (!text || !*text) return;
    msg_chat_t m = { 0 };
    /* player_id is filled by the server when it broadcasts; we leave
     * it zero on the wire. */
    size_t n = strnlen(text, MSG_CHAT_TEXT_LEN);
    memcpy(m.text, text, n);
    uint8_t buf[MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE];
    size_t w = proto_write_chat(buf, sizeof buf, &m);
    if (w == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, w);
}

void net_client_send_edit(int kind, uint32_t body_id,
                            int tile, int depth, int block_type) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (tile < 0 || depth < 0) return;
    msg_player_cmd_t cmd = {
        .cmd_kind    = (uint8_t)kind,
        .reserved8a  = 0,
        .reserved16a = 0,
        .body_id     = body_id,
        .tile_idx    = (uint32_t)tile,
        .depth       = (uint16_t)depth,
        .block_type  = (uint16_t)block_type,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_CMD_WIRE_SIZE];
    size_t n = proto_write_player_cmd(buf, sizeof buf, &cmd);
    if (n == 0) return;
    /* Reliable channel — block edits are ordered & cannot be dropped. */
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

void net_client_send_player_state(uint32_t client_tick,
                                    uint32_t body_id,
                                    double pos_x, double pos_y, double pos_z,
                                    float yaw, float pitch) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    msg_player_state_t st = {
        .client_tick = client_tick,
        .body_id     = body_id,
        .pos_x       = pos_x,
        .pos_y       = pos_y,
        .pos_z       = pos_z,
        .yaw         = yaw,
        .pitch       = pitch,
        .buttons     = 0,
        .reserved    = 0,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_STATE_WIRE_SIZE];
    size_t n = proto_write_player_state(buf, sizeof buf, &st);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_UNRELIABLE, buf, n);
}

static void on_close(net_conn_t* conn, net_close_reason_t reason, void* user) {
    (void)conn; (void)user;
    printf("[net-client] socket closed (reason=%d, state=%d)\n",
           (int)reason, (int)C.state);
    /* Pick a message based on whether the handshake had completed. A
     * close before READY means we never reached the server (refused,
     * DNS, blocked); after READY means the link dropped mid-session. */
    const char* msg;
    if (C.state == NET_CLIENT_READY) {
        msg = "lost connection to server";
    } else if (reason == NET_CLOSE_TIMEOUT) {
        msg = "connection timed out";
    } else if (reason == NET_CLOSE_PROTOCOL_ERR) {
        msg = "could not reach server";
    } else {
        msg = "server is unreachable";
    }
    snprintf(C.error_message, sizeof C.error_message, "%s", msg);
    C.state = NET_CLIENT_ERROR;
    /* Null the conn so a follow-up net_client_connect (auto-reconnect
     * path) doesn't early-return on the stale handle. The transport
     * already owns the close; we just drop our pointer. */
    C.conn = NULL;
}

/* ------------------------------------------------------------------ */
/* Public surface.                                                     */
/* ------------------------------------------------------------------ */

void net_client_connect(const char* url) {
    if (!url) return;
    if (C.conn) return;     /* already connected / connecting */

    memset(&C, 0, sizeof C);
    C.state = NET_CLIENT_CONNECTING;

    net_callbacks_t cb = {
        .on_open  = on_open,
        .on_msg   = on_msg,
        .on_close = on_close,
        .user     = NULL,
    };
    C.conn = net_connect(url, cb);
    if (!C.conn) {
        fprintf(stderr, "[net-client] net_connect(%s) failed\n", url);
        snprintf(C.error_message, sizeof C.error_message,
                 "could not start connection");
        C.state = NET_CLIENT_ERROR;
        return;
    }
    printf("[net-client] connecting to %s\n", url);
}

void net_client_tick(void) {
    if (C.conn) net_poll_client(C.conn);
}

void net_client_disconnect(void) {
    if (!C.conn) return;
    net_close(C.conn);
    C.conn  = NULL;
    C.state = NET_CLIENT_IDLE;
}

net_client_state_t          net_client_state  (void) { return C.state; }
const net_client_welcome_t* net_client_welcome(void) { return &C.welcome; }

const char* net_client_error_message(void) {
    return C.error_message[0] ? C.error_message : NULL;
}

net_desync_kind_t net_client_last_desync(double* out_seconds_ago,
                                            uint32_t* out_block_type) {
    if (out_block_type) *out_block_type = C.last_desync_block;
    if (out_seconds_ago) {
        *out_seconds_ago = (C.last_desync_time == 0)
            ? -1.0
            : stm_sec(stm_diff(stm_now(), C.last_desync_time));
    }
    return C.last_desync;
}
