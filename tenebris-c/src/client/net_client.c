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

/* Per-player throttle for PLAYER_INFO_REQUEST retries. Each unknown
 * id in the F1 / nameplate path triggers one request and re-sends
 * once every NET_NAME_REQUEST_RETRY_S seconds while still unknown.
 * Sized to match the snapshot cap; one slot per concurrently-unknown
 * peer is plenty for a 16-slot room.
 *
 * After NET_NAME_REQUEST_WARN_AT attempts with no PLAYER_INFO reply
 * the client logs a console.error so a player who's stuck on id-N
 * forever can see why. After NET_NAME_REQUEST_MAX_TRIES we give up
 * retrying and leave the id as id-N - the server is either dropping
 * the request or doesn't know that peer anymore. */
#define NET_NAME_REQ_TABLE_SIZE      16
#define NET_NAME_REQUEST_RETRY_S     2.0
#define NET_NAME_REQUEST_WARN_AT     3       /* ~6 s */
#define NET_NAME_REQUEST_MAX_TRIES   5       /* ~10 s */

/* Block-edit ack tracking. Every PLAYER_CMD we send is held here until
 * the server's CHUNK_DIFF echo confirms it; missing acks are logged as
 * errors so we surface "the server lost my edit" the moment it happens
 * instead of waiting for the player to log back in and notice missing
 * blocks. Cap is comfortably larger than any plausible burst within
 * the timeout window (creative-mode click spam tops out around 10/s). */
#define NET_PENDING_EDITS_MAX        128
#define NET_EDIT_ACK_TIMEOUT_S       5.0

/* Sized to one slot per body the server can replay edits for - matches
 * SERVER_MAX_BODIES on the server side. The counters are dense, not
 * sparse: every body the client ever sees a diff for gets one slot
 * for the rest of the session. */
#define NET_BODY_COVERAGE_MAX        32

typedef struct {
    uint32_t player_id;
    char     name[NET_NAME_MAX];
} net_name_entry_t;

typedef struct {
    uint32_t player_id;
    double   last_request_s;     /* 0 == never */
    int      attempts;           /* how many requests we've sent */
    bool     nacked;             /* server replied "unknown id" - stop retrying */
    bool     warned;             /* console.error already emitted, don't spam */
} net_name_request_t;

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
    /* Pending PLAYER_INFO_REQUEST throttle. */
    net_name_request_t   name_requests[NET_NAME_REQ_TABLE_SIZE];
    int                  name_request_count;
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
    /* True after a server-issued MSG_KICK with a terminal reason
     * (version mismatch, etc). The menu retry loop reads this and
     * goes straight to the disconnected popup rather than retrying
     * a connection that will never succeed. Cleared on every
     * net_client_connect call. */
    bool                 no_retry;
    /* Pending inventory restore from server. Set when MSG_INVENTORY_STATE
     * arrives; cleared by net_client_take_pending_inventory. */
    bool                 inv_pending;
    uint16_t             inv_slot_type [9];
    int16_t              inv_slot_count[9];
    uint8_t              inv_selected;
    /* Outstanding block-edit round-trip table. Every PLAYER_CMD push
     * goes in here so we can confirm the server applied + broadcast it
     * back via MSG_CHUNK_DIFF. An entry stays until either:
     *   - a CHUNK_DIFF for the same (body, tile, depth) acks it (RTT
     *     logged),
     *   - the timeout elapses (logged as an ERROR via stderr - the
     *     server silently dropped our edit, the persistence path will
     *     not pick it up on rejoin).
     * Sized to the worst-case place-spam burst within the timeout
     * window; older entries are evicted oldest-first if we ever fill,
     * which itself is logged as an error. */
    struct {
        uint32_t body_id;
        uint32_t tile_idx;
        uint16_t depth;
        uint16_t expected_block;
        uint8_t  cmd_kind;
        uint64_t sent_time;       /* sokol stm_now() - 0 means slot free */
        uint32_t seq;
    }                    pending_edits[NET_PENDING_EDITS_MAX];
    uint32_t             next_edit_seq;
    uint32_t             edits_sent_total;
    uint32_t             edits_acked_total;
    uint32_t             edits_timed_out_total;
    /* Per-body running tally of unique tile columns we've seen in
     * CHUNK_DIFF replays this session. One CHUNK_DIFF carries 64
     * (tile, depth) entries; a full column fans out across 2 messages
     * so a fresh-join replay for one tile = +2 messages but +1 unique
     * tile in this counter. The counter is keyed by body_id and
     * maintained as a small in-memory set of "last seen" tile ids
     * per body - good enough for the operator-facing log we use to
     * compare against /saves output, without paying for a real hash
     * table. */
    struct {
        uint32_t body_id;
        uint32_t edits_seen;      /* total entries across all diffs */
        uint32_t unique_tiles;    /* count of distinct tile ids seen */
        uint32_t last_tile_seen;  /* dedup tip for back-to-back same-tile diffs */
        bool     last_tile_valid;
    }                    body_coverage[NET_BODY_COVERAGE_MAX];
    int                  body_coverage_count;
} net_client_t;

static net_client_t C;

/* Forward decls so on_msg (above) can call into the pending-edit
 * helpers (defined further down next to net_client_send_edit). */
static bool pending_edit_try_ack(uint32_t body_id, uint32_t tile_idx,
                                   uint16_t depth, uint16_t block_seen);
static void pending_edit_check_timeouts(void);

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

/* Fire a PLAYER_INFO_REQUEST for player_id, but only if our last
 * request for that id is older than NET_NAME_REQUEST_RETRY_S. The
 * F1 panel can therefore call net_client_name_for_id every frame on
 * a missing id without spamming the server. */
static void request_name(uint32_t player_id) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (player_id == 0) return;
    double now = stm_sec(stm_now());
    net_name_request_t* slot = NULL;
    for (int i = 0; i < C.name_request_count; ++i) {
        if (C.name_requests[i].player_id == player_id) {
            slot = &C.name_requests[i];
            break;
        }
    }
    if (!slot) {
        if (C.name_request_count >= NET_NAME_REQ_TABLE_SIZE) return;
        slot = &C.name_requests[C.name_request_count++];
        slot->player_id      = player_id;
        slot->last_request_s = 0.0;
        slot->attempts       = 0;
        slot->nacked         = false;
        slot->warned         = false;
    }
    if (slot->nacked) return;                 /* server already said "unknown" */
    if (slot->attempts >= NET_NAME_REQUEST_MAX_TRIES) return;
    if (slot->last_request_s != 0.0
        && now - slot->last_request_s < NET_NAME_REQUEST_RETRY_S) {
        return;
    }
    slot->last_request_s = now;
    ++slot->attempts;
    if (!slot->warned && slot->attempts >= NET_NAME_REQUEST_WARN_AT) {
        fprintf(stderr,
                "[net-client] WARN: no PLAYER_INFO for player_id=%u after %d "
                "requests (~%.0fs). Server may not know this peer or "
                "responses are being dropped.\n",
                player_id, slot->attempts,
                (double)slot->attempts * NET_NAME_REQUEST_RETRY_S);
        slot->warned = true;
    }
    msg_player_info_request_t req = { .player_id = player_id, .reserved = 0 };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_REQUEST_WIRE_SIZE];
    size_t n = proto_write_player_info_request(buf, sizeof buf, &req);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

const char* net_client_name_for_id(uint32_t player_id) {
    for (int i = 0; i < C.name_count; ++i) {
        if (C.names[i].player_id == player_id) return C.names[i].name;
    }
    /* Cache miss: kick off a (throttled) PLAYER_INFO_REQUEST so the
     * next render after the server replies has a real name. Returning
     * NULL right now is fine - callers already render id-N fallback. */
    request_name(player_id);
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
    printf("[net-client] HELLO sent (name='%s' room='%s' %s)\n",
           C.profile_name[0] ? C.profile_name : "(empty)",
           C.room_code[0]    ? C.room_code    : "",
           C.room_code[0]    ? "private-room" : "EMPTY-CODE -> lobby room");
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
            C.welcome.spawn_yaw   = w.spawn_yaw;
            C.welcome.spawn_pitch = w.spawn_pitch;
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
        case MSG_INVENTORY_STATE: {
            if (hdr.version != MSG_INVENTORY_STATE_VERSION) break;
            msg_inventory_state_t inv;
            if (proto_read_inventory_state(payload, hdr.length, &inv) != 0) break;
            memcpy(C.inv_slot_type,  inv.slot_type,  sizeof C.inv_slot_type);
            memcpy(C.inv_slot_count, inv.slot_count, sizeof C.inv_slot_count);
            C.inv_selected = (inv.selected < 9) ? inv.selected : 0;
            C.inv_pending  = true;
            printf("[net-client] inventory restored from server (selected=%u)\n",
                   (unsigned)C.inv_selected);
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
            /* Clear any pending-request slot for this id so a peer
             * who reconnects later can be re-resolved cleanly. */
            for (int i = 0; i < C.name_request_count; ++i) {
                if (C.name_requests[i].player_id == info.player_id) {
                    C.name_requests[i].attempts       = 0;
                    C.name_requests[i].nacked         = false;
                    C.name_requests[i].warned         = false;
                    C.name_requests[i].last_request_s = 0.0;
                    break;
                }
            }
            break;
        }
        case MSG_PLAYER_INFO_NACK: {
            if (hdr.version != MSG_PLAYER_INFO_NACK_VERSION) break;
            msg_player_info_nack_t nack;
            if (proto_read_player_info_nack(payload, hdr.length, &nack) != 0) break;
            const char* reason_str =
                (nack.reason == PLAYER_INFO_NACK_UNKNOWN_ID) ? "unknown_id"
                                                              : "unspecified";
            fprintf(stderr,
                    "[net-client] ERROR: server cannot resolve name for "
                    "player_id=%u (reason=%s). Will stop retrying this id.\n",
                    nack.player_id, reason_str);
            /* Mark the slot so future net_client_name_for_id calls
             * don't trigger more requests. Create the slot if it
             * doesn't exist (e.g. a stale NACK from before we asked). */
            net_name_request_t* slot = NULL;
            for (int i = 0; i < C.name_request_count; ++i) {
                if (C.name_requests[i].player_id == nack.player_id) {
                    slot = &C.name_requests[i];
                    break;
                }
            }
            if (!slot && C.name_request_count < NET_NAME_REQ_TABLE_SIZE) {
                slot = &C.name_requests[C.name_request_count++];
                slot->player_id      = nack.player_id;
                slot->last_request_s = 0.0;
                slot->attempts       = 0;
                slot->warned         = false;
            }
            if (slot) slot->nacked = true;
            break;
        }
        case MSG_KICK: {
            if (hdr.version != MSG_KICK_VERSION) break;
            msg_kick_t k;
            if (proto_read_kick(payload, hdr.length, &k) != 0) break;
            /* Copy the server-supplied text into the error slot the
             * menu reads when it promotes ERROR -> popup. Truncate
             * cleanly at the smaller buffer. */
            char text[MSG_KICK_TEXT_LEN + 1];
            memcpy(text, k.text, MSG_KICK_TEXT_LEN);
            text[MSG_KICK_TEXT_LEN] = 0;
            snprintf(C.error_message, sizeof C.error_message, "%s",
                     text[0] ? text : "kicked");
            C.no_retry = true;
            C.state    = NET_CLIENT_ERROR;
            printf("[net-client] KICK reason=%u text='%s'\n",
                   k.reason, text);
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
                /* Replay diffs land here for bodies the renderer has
                 * never seen - that's silently dropped by world_set,
                 * but the diff itself is real persistence data we just
                 * lost. Loud error. */
                fprintf(stderr,
                        "[net-client] ERROR: CHUNK_DIFF for body=%u not registered "
                        "with renderer (edits=%u DROPPED). If this fires at join "
                        "time, the server-replayed persisted blocks will not show.\n",
                        diff.body_id, (unsigned)diff.edit_count);
                break;
            }
            int matched_acks = 0;
            uint32_t first_tile = 0;
            uint16_t first_depth = 0;
            uint16_t first_block = 0;
            uint32_t last_tile  = 0;
            uint16_t last_depth = 0;
            for (int i = 0; i < diff.edit_count; ++i) {
                const msg_chunk_diff_entry_t* e = &diff.edits[i];
                if (i == 0) {
                    first_tile  = e->tile_idx;
                    first_depth = e->depth;
                    first_block = e->block_type;
                }
                last_tile  = e->tile_idx;
                last_depth = e->depth;
                /* world_set marks the tile dirty; the renderer's mesh
                 * dirty sweep remeshes it on the next frame. Same path
                 * as locally-applied edits. */
                world_set(w, (int)e->tile_idx, (int)e->depth,
                            (block_t)e->block_type);
                /* Round-trip ack: try to pair this entry with one of
                 * our outstanding sends. Replays at join time and
                 * peer-driven edits will simply not match anything in
                 * the table (no error - we never sent them). */
                if (pending_edit_try_ack(diff.body_id, e->tile_idx,
                                           e->depth, e->block_type)) {
                    ++matched_acks;
                }
            }
            /* Per-body running tally: find / allocate a slot, add this
             * diff's entry count, bump unique-tile counter when the
             * leading tile id changes (server's chunk-replay path emits
             * each tile as a contiguous run of one or two messages, so
             * the leading-tile dedup matches reality). */
            int slot = -1;
            for (int s = 0; s < C.body_coverage_count; ++s) {
                if (C.body_coverage[s].body_id == diff.body_id) { slot = s; break; }
            }
            if (slot < 0 && C.body_coverage_count < NET_BODY_COVERAGE_MAX) {
                slot = C.body_coverage_count++;
                C.body_coverage[slot].body_id         = diff.body_id;
                C.body_coverage[slot].edits_seen      = 0;
                C.body_coverage[slot].unique_tiles    = 0;
                C.body_coverage[slot].last_tile_valid = false;
            }
            if (slot >= 0) {
                C.body_coverage[slot].edits_seen += diff.edit_count;
                if (!C.body_coverage[slot].last_tile_valid
                    || C.body_coverage[slot].last_tile_seen != first_tile) {
                    ++C.body_coverage[slot].unique_tiles;
                    C.body_coverage[slot].last_tile_seen  = last_tile;
                    C.body_coverage[slot].last_tile_valid = true;
                } else {
                    /* Same leading tile as last message - this is the
                     * 64..127 continuation of the same column. Not a
                     * new unique tile. */
                    C.body_coverage[slot].last_tile_seen = last_tile;
                }
            }
            /* Per-message detail: leading + trailing (tile, depth) and
             * the block id of the first entry so the operator can
             * compare against /saves output line by line. Trailing pair
             * helps tell apart "1 column, 64 entries" from "64 separate
             * tiles" (the server's reply currently uses run-by-tile, so
             * leading == trailing tile means a single-column batch). */
            const char* body_name =
                (w && w->body && w->body->name) ? w->body->name : "?";
            printf("[net-client] CHUNK_DIFF recv body=%u (%s) edits=%u "
                   "first=(tile=%u,d=%u,block=%u) last=(tile=%u,d=%u) "
                   "(%d acks, %d replay/peer) | body-totals: edits=%u unique_tiles=%u\n",
                   diff.body_id, body_name, (unsigned)diff.edit_count,
                   first_tile, (unsigned)first_depth, (unsigned)first_block,
                   last_tile,  (unsigned)last_depth,
                   matched_acks, diff.edit_count - matched_acks,
                   slot >= 0 ? C.body_coverage[slot].edits_seen : 0,
                   slot >= 0 ? C.body_coverage[slot].unique_tiles : 0);
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
            ++snap_recv;
            /* if ((snap_recv % 33) == 0) {
             *     printf("[net-client] snapshot #%llu: %u entries (kept %d remote)\n",
             *            (unsigned long long)snap_recv,
             *            (unsigned)snap.player_count, n_out);
             * } */
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

/* ------------------------------------------------------------------ */
/* Block-edit round-trip tracking.
 *
 * The wire protocol has no explicit ACK; the server's authoritative
 * answer is the MSG_CHUNK_DIFF it broadcasts back to the same room
 * after applying the edit. That broadcast is our ack: when a CHUNK_DIFF
 * entry matches a (body, tile, depth) we still have outstanding, the
 * round-trip is closed and the RTT logged. Anything that ages past
 * NET_EDIT_ACK_TIMEOUT_S is dumped to stderr as an error - the server
 * lost it, the persistence path will not save it, and the next time
 * the player joins the block will be missing. We want that loud now.
 * ------------------------------------------------------------------ */

static int pending_edit_alloc_slot(void) {
    /* First free slot wins. Returns -1 only when the table is full,
     * which itself is logged by the caller. */
    for (int i = 0; i < NET_PENDING_EDITS_MAX; ++i) {
        if (C.pending_edits[i].sent_time == 0) return i;
    }
    return -1;
}

static const char* edit_kind_name(uint8_t kind) {
    return (kind == PLAYER_CMD_BREAK) ? "BREAK" : "PLACE";
}

/* Try to ack the oldest outstanding edit matching (body, tile, depth).
 * Returns true on a hit. block_seen is what the server says the cell
 * actually holds now; if it disagrees with what we asked for, we log
 * a WARN (the server overrode us, e.g. survival range / inventory
 * check) but still treat the slot as acked - the round trip itself
 * completed, the disagreement is a separate concern. */
static bool pending_edit_try_ack(uint32_t body_id, uint32_t tile_idx,
                                   uint16_t depth, uint16_t block_seen) {
    int found = -1;
    uint64_t oldest_t = 0;
    for (int i = 0; i < NET_PENDING_EDITS_MAX; ++i) {
        if (C.pending_edits[i].sent_time == 0) continue;
        if (C.pending_edits[i].body_id  != body_id)  continue;
        if (C.pending_edits[i].tile_idx != tile_idx) continue;
        if (C.pending_edits[i].depth    != depth)    continue;
        if (found < 0 || C.pending_edits[i].sent_time < oldest_t) {
            found = i;
            oldest_t = C.pending_edits[i].sent_time;
        }
    }
    if (found < 0) return false;
    double rtt_ms = stm_sec(stm_diff(stm_now(), C.pending_edits[found].sent_time)) * 1000.0;
    uint16_t expected = C.pending_edits[found].expected_block;
    uint8_t  kind     = C.pending_edits[found].cmd_kind;
    uint32_t seq      = C.pending_edits[found].seq;
    if (block_seen != expected) {
        fprintf(stderr,
                "[net-client] WARN: EDIT seq=%u %s body=%u tile=%u depth=%u: "
                "expected block=%u, server applied block=%u (server overrode)\n",
                seq, edit_kind_name(kind), body_id, tile_idx, depth,
                (unsigned)expected, (unsigned)block_seen);
    } else {
        printf("[net-client] EDIT-ACK seq=%u %s body=%u tile=%u depth=%u block=%u rtt=%.1fms\n",
               seq, edit_kind_name(kind), body_id, tile_idx, depth,
               (unsigned)block_seen, rtt_ms);
    }
    C.pending_edits[found].sent_time = 0;
    ++C.edits_acked_total;
    return true;
}

static void pending_edit_check_timeouts(void) {
    /* Linear scan; capped at NET_PENDING_EDITS_MAX (=128). Cheap. */
    if (C.state != NET_CLIENT_READY) return;
    uint64_t now = stm_now();
    for (int i = 0; i < NET_PENDING_EDITS_MAX; ++i) {
        if (C.pending_edits[i].sent_time == 0) continue;
        double age = stm_sec(stm_diff(now, C.pending_edits[i].sent_time));
        if (age < NET_EDIT_ACK_TIMEOUT_S) continue;
        ++C.edits_timed_out_total;
        fprintf(stderr,
                "[net-client] ERROR: EDIT seq=%u %s body=%u tile=%u depth=%u block=%u "
                "NOT ACKED after %.1fs - server dropped this edit; it WILL be missing on next login. "
                "(stats: sent=%u acked=%u timed_out=%u)\n",
                C.pending_edits[i].seq,
                edit_kind_name(C.pending_edits[i].cmd_kind),
                C.pending_edits[i].body_id,
                C.pending_edits[i].tile_idx,
                (unsigned)C.pending_edits[i].depth,
                (unsigned)C.pending_edits[i].expected_block,
                age,
                C.edits_sent_total, C.edits_acked_total, C.edits_timed_out_total);
        C.pending_edits[i].sent_time = 0;
    }
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

    /* Push into the ack table BEFORE sending so a fast loopback echo
     * can't outrun the bookkeeping. Survival BREAK uses BLOCK_AIR as
     * the expected value (matches what the server forces), even though
     * the wire field is ignored on BREAK - keeps the ack-match path
     * uniform. */
    uint32_t seq = ++C.next_edit_seq;
    int slot = pending_edit_alloc_slot();
    if (slot < 0) {
        fprintf(stderr,
                "[net-client] ERROR: pending-edit table full (cap=%d) - "
                "cannot track EDIT seq=%u %s body=%u tile=%u depth=%u. "
                "Round-trip ack will not fire for this edit.\n",
                NET_PENDING_EDITS_MAX, seq, edit_kind_name((uint8_t)kind),
                body_id, (unsigned)tile, (unsigned)depth);
    } else {
        uint16_t expected = (kind == PLAYER_CMD_BREAK)
            ? 0  /* BLOCK_AIR */
            : (uint16_t)block_type;
        C.pending_edits[slot].body_id        = body_id;
        C.pending_edits[slot].tile_idx       = (uint32_t)tile;
        C.pending_edits[slot].depth          = (uint16_t)depth;
        C.pending_edits[slot].expected_block = expected;
        C.pending_edits[slot].cmd_kind       = (uint8_t)kind;
        C.pending_edits[slot].sent_time      = stm_now();
        C.pending_edits[slot].seq            = seq;
    }
    ++C.edits_sent_total;
    printf("[net-client] EDIT-SEND seq=%u %s body=%u tile=%u depth=%u block=%u\n",
           seq, edit_kind_name((uint8_t)kind), body_id,
           (unsigned)tile, (unsigned)depth, (unsigned)block_type);

    /* Reliable channel — block edits are ordered & cannot be dropped. */
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

void net_client_send_inventory_state(const uint16_t* slot_type,
                                        const int16_t* slot_count,
                                        int selected) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (!slot_type || !slot_count) return;
    msg_inventory_state_t inv = { .player_id = 0 };
    memcpy(inv.slot_type,  slot_type,  sizeof inv.slot_type);
    memcpy(inv.slot_count, slot_count, sizeof inv.slot_count);
    inv.selected = (selected >= 0 && selected < 9) ? (uint8_t)selected : 0;
    uint8_t buf[MSG_HEADER_SIZE + MSG_INVENTORY_STATE_WIRE_SIZE];
    size_t n = proto_write_inventory_state(buf, sizeof buf, &inv);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

bool net_client_take_pending_inventory(uint16_t* out_slot_type,
                                          int16_t* out_slot_count,
                                          int* out_selected) {
    if (!C.inv_pending) return false;
    if (out_slot_type)  memcpy(out_slot_type,  C.inv_slot_type,
                               sizeof C.inv_slot_type);
    if (out_slot_count) memcpy(out_slot_count, C.inv_slot_count,
                               sizeof C.inv_slot_count);
    if (out_selected)   *out_selected = C.inv_selected;
    C.inv_pending = false;
    return true;
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

    /* Preserve the profile/room set by net_client_set_profile across
     * the state reset. The memset below clears every field of C; if
     * we don't snapshot these first, HELLO ships an empty name and
     * the server falls back to 'guest-N' even when the player has
     * a real profile selected. */
    char saved_token[sizeof C.profile_token];
    char saved_name [sizeof C.profile_name];
    char saved_room [sizeof C.room_code];
    memcpy(saved_token, C.profile_token, sizeof saved_token);
    memcpy(saved_name,  C.profile_name,  sizeof saved_name);
    memcpy(saved_room,  C.room_code,     sizeof saved_room);

    memset(&C, 0, sizeof C);
    C.state = NET_CLIENT_CONNECTING;
    memcpy(C.profile_token, saved_token, sizeof C.profile_token);
    memcpy(C.profile_name,  saved_name,  sizeof C.profile_name);
    memcpy(C.room_code,     saved_room,  sizeof C.room_code);

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
    pending_edit_check_timeouts();
}

void net_client_disconnect(void) {
    if (!C.conn) return;
    net_close(C.conn);
    C.conn  = NULL;
    C.state = NET_CLIENT_IDLE;
}

net_client_state_t          net_client_state  (void) { return C.state; }
bool                        net_client_can_retry(void) { return !C.no_retry; }
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
